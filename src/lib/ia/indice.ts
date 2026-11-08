import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { embeber } from './openai';

/*
  ÍNDICE DE RESPUESTAS APROBADAS (tabla fragmentos, migración 9). Solo
  servidor, con la clave secreta. De cada versión publicada se guardan la
  pregunta, sus variantes y la versión para chicos, cada una con su
  embedding (para encontrar preguntas parecidas por el significado).
  La base solo acepta fragmentos de la versión publicada y vigente, y los
  apaga sola si la ficha se retira o se publica otra versión.
*/
export async function indexarVersion(admin: SupabaseClient, versionId: string): Promise<number> {
  const { data: v } = await admin
    .from('ficha_versiones')
    .select('id, ficha_id, estado, pregunta, variantes, version_infantil')
    .eq('id', versionId)
    .maybeSingle<{ id: string; ficha_id: string; estado: string; pregunta: string; variantes: string[] | null; version_infantil: string }>();
  if (!v || v.estado !== 'publicada') return 0;
  const { count } = await admin.from('fragmentos').select('id', { count: 'exact', head: true }).eq('version_id', v.id).eq('activo', true);
  if (count) return 0;
  const piezas = [
    { tipo: 'pregunta', texto: v.pregunta },
    ...(v.variantes ?? []).map((t) => ({ tipo: 'variante', texto: t })),
    { tipo: 'infantil', texto: v.version_infantil },
  ]
    .map((p) => ({ ...p, texto: (p.texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 4000) }))
    .filter((p) => p.texto.length > 0);
  if (!piezas.length) return 0;
  const vectores = await embeber(piezas.map((p) => p.texto));
  if (!vectores) return 0;
  const { error } = await admin
    .from('fragmentos')
    .insert(piezas.map((p, i) => ({ ficha_id: v.ficha_id, version_id: v.id, tipo: p.tipo, texto: p.texto, embedding: vectores[i] })));
  if (error) {
    console.error('[ia] índice:', error.code);
    return 0;
  }
  return piezas.length;
}

/** Indexa las fichas publicadas que todavía no están en el índice (por ejemplo, aprobadas antes de que existiera). */
export async function indexarPendientes(admin: SupabaseClient, limite = 10): Promise<number> {
  const { data: fichas } = await admin.from('fichas').select('version_publicada_id').eq('estado', 'publicada').not('version_publicada_id', 'is', null).limit(500);
  const ids = (fichas ?? []).map((f) => f.version_publicada_id as string);
  if (!ids.length) return 0;
  const { data: hechas } = await admin.from('fragmentos').select('version_id').in('version_id', ids).eq('activo', true);
  const ya = new Set((hechas ?? []).map((h) => h.version_id as string));
  let total = 0;
  for (const id of ids.filter((x) => !ya.has(x)).slice(0, limite)) total += await indexarVersion(admin, id);
  return total;
}
