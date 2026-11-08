import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { embeber, MODELO_RAPIDO, pedirJson } from './openai';
import { candidatas, decidir, entradaControl, ESQUEMA_CONTROL, INSTRUCCIONES_CONTROL, leerEleccion, type Decision, type Encontrado } from './asistente';

/*
  BUSCAR UNA RESPUESTA APROBADA (solo servidor, clave secreta). Lo usan el
  asistente de la maestra y la pantalla de prueba del equipo, para que la
  prueba mida exactamente lo mismo que ve la maestra.
    1. embedding de la pregunta (o el que ya viene calculado);
    2. las preguntas y variantes aprobadas más parecidas (buscar_fragmentos:
       solo versiones publicadas y vigentes);
    3. doble control con el modelo rápido, que lee el TEXTO de cada candidata;
    4. decidir() (src/lib/ia/asistente.ts).
*/
export type CandidataLeida = { fichaId: string; similitud: number; pregunta: string };
export type Busqueda = { decision: Decision; candidatas: CandidataLeida[]; eleccion: number | null; motivo: string; error?: string };

export async function buscarRespuesta(admin: SupabaseClient, pregunta: string, vector?: number[]): Promise<Busqueda> {
  const vacia = (error?: string): Busqueda => ({ decision: { tipo: 'nada' }, candidatas: [], eleccion: null, motivo: '', error });
  const v = vector ?? (await embeber([pregunta]))?.[0];
  if (!v) return vacia('no se pudo calcular el embedding');
  const { data: filas, error } = await admin.rpc('buscar_fragmentos', { p_embedding: v, p_limite: 20 });
  if (error) {
    console.error('[asistente] buscar:', error.code);
    return vacia('no se pudo buscar');
  }
  const cands = candidatas((filas ?? []) as Encontrado[]);
  if (!cands.length) return vacia();

  const { data: fichas } = await admin
    .from('fichas_validadas')
    .select('ficha_id, pregunta, version_infantil')
    .in(
      'ficha_id',
      cands.map((c) => c.fichaId),
    );
  const porId = new Map(((fichas ?? []) as { ficha_id: string; pregunta: string; version_infantil: string }[]).map((f) => [f.ficha_id, f]));
  const leidas = cands.filter((c) => porId.has(c.fichaId));
  if (!leidas.length) return vacia();

  const control = await pedirJson<{ eleccion: number; motivo: string }>({
    modelo: MODELO_RAPIDO,
    instrucciones: INSTRUCCIONES_CONTROL,
    entrada: entradaControl(
      pregunta,
      leidas.map((c) => ({ pregunta: porId.get(c.fichaId)!.pregunta, texto: porId.get(c.fichaId)!.version_infantil })),
    ),
    nombre: 'control',
    esquema: ESQUEMA_CONTROL,
    maxTokens: 1500,
    segundos: 25,
  });
  if (!control.ok) console.error('[asistente] control:', control.error);
  const eleccion = control.ok ? leerEleccion(control.datos, leidas.length) : null;
  return {
    decision: decidir(leidas, eleccion),
    candidatas: leidas.map((c) => ({ ...c, pregunta: porId.get(c.fichaId)!.pregunta })),
    eleccion,
    motivo: control.ok ? String(control.datos.motivo ?? '').slice(0, 300) : '',
  };
}
