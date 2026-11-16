import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugDe } from '@/lib/equipo/comun';
import { deA } from '@/lib/formularios';
import { embeber, MODELO_RAPIDO, pedirJson } from '@/lib/ia/openai';
import { dividirOraciones } from '@/lib/ia/redaccion';
import {
  agruparPreguntas,
  coseno,
  ESQUEMA_ELEGIR_ORACIONES,
  ESQUEMA_NOMBRAR_TEMA,
  INSTRUCCIONES_ELEGIR_ORACIONES,
  INSTRUCCIONES_NOMBRAR_TEMA,
  oracionesElegidas,
  oracionesNumeradas,
  temaNombrado,
  UMBRAL_PADRE,
  type PreguntaSinTema,
} from '@/lib/curiosidades/automaticas';
import { indexarTemas, UMBRAL_TEMA } from './curiosidades';

/*
  CURIOSIDADES AUTOMÁTICAS · el trabajo de cada día (solo servidor, con la
  clave secreta; lo llama /api/latido y el botón "Actualizar ahora" del
  panel). Migración 23. Tres pasos, y si uno falla siguen los otros:
  1. Temas nuevos: agrupa las preguntas sin tema que se parecen entre sí
     (hasta MAX_TEMAS_NUEVOS por día) y les pone nombre con la IA.
  2. Curiosidades: de cada respuesta aprobada que todavía no se miró, la IA
     elige hasta 2 oraciones de su versión para chicos que sirvan solas. El
     texto es el de la respuesta aprobada, tal cual.
  3. Temas de cada curiosidad: el más parecido a la pregunta de su respuesta
     (se recalcula cada día: puede haber temas nuevos).
*/
export type Informe = { temasNuevos: string[]; respuestasMiradas: number; curiosidadesNuevas: number; conTema: number; errores: string[] };

const MAX_TEMAS_NUEVOS = 3;
const MAX_RESPUESTAS_POR_VEZ = 80;

/** 1. Temas nuevos con las preguntas sin tema que se parecen entre sí. */
async function temasNuevos(admin: SupabaseClient, informe: Informe): Promise<void> {
  const { data } = await admin.from('consultas_sin_tema').select('id, texto, actividad, veces').order('veces', { ascending: false }).limit(300);
  const filas = (data ?? []) as { id: string; texto: string; actividad: string | null; veces: number }[];
  if (filas.length < 2) return;
  const vectores = await embeber(filas.map((f) => f.texto));
  if (!vectores) return void informe.errores.push('no se pudieron comparar las preguntas sin tema');
  const preguntas: PreguntaSinTema[] = filas.map((f, i) => ({ ...f, vector: vectores[i] }));
  const grupos = agruparPreguntas(preguntas).slice(0, MAX_TEMAS_NUEVOS);
  if (!grupos.length) return;

  const { data: temas } = await admin.from('temas').select('id, slug, embedding').eq('activo', true);
  const existentes = ((temas ?? []) as { id: string; slug: string; embedding: string | number[] | null }[]).map((t) => ({
    id: t.id,
    slug: t.slug,
    vector: typeof t.embedding === 'string' ? (JSON.parse(t.embedding) as number[]) : t.embedding,
  }));
  const slugs = new Set(existentes.map((t) => t.slug));

  for (const g of grupos) {
    const r = await pedirJson<unknown>({
      modelo: MODELO_RAPIDO,
      instrucciones: INSTRUCCIONES_NOMBRAR_TEMA,
      entrada: g.preguntas.slice(0, 15).map((p) => `- ${p.texto}`).join('\n'),
      nombre: 'tema',
      esquema: ESQUEMA_NOMBRAR_TEMA,
      maxTokens: 600,
      segundos: 30,
    });
    const nombrado = r.ok ? temaNombrado(r.datos) : null;
    if (!nombrado) continue;
    // Subtema del tema más parecido, si hay uno bastante cerca (los temas "de separación")
    const cerca = existentes
      .filter((t) => t.vector)
      .map((t) => ({ id: t.id, sim: coseno(g.centro, t.vector as number[]) }))
      .sort((a, b) => b.sim - a.sim)[0];
    const base = slugDe(nombrado.nombre).slice(0, 52) || 'tema';
    let slug = base;
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`;
    const { data: nuevo, error } = await admin
      .from('temas')
      .insert({ slug, nombre: nombrado.nombre, descripcion: nombrado.descripcion, actividad: g.actividad, padre_id: cerca && cerca.sim >= UMBRAL_PADRE ? cerca.id : null, orden: 900, activo: true, automatico: true })
      .select('id')
      .single();
    if (error || !nuevo) {
      informe.errores.push(`no se pudo crear el tema "${nombrado.nombre}" (${error?.code ?? 'sin datos'})`);
      continue;
    }
    slugs.add(slug);
    informe.temasNuevos.push(nombrado.nombre);
    // Sus preguntas pasan a contar para el tema nuevo
    for (const p of g.preguntas) await admin.rpc('ubicar_consulta_sin_tema', { p_id: p.id, p_tema: nuevo.id });
  }
  await indexarTemas(admin, 10).catch(() => 0);
}

/** 2. Curiosidades de las respuestas aprobadas que todavía no se miraron. */
async function sacarCuriosidades(admin: SupabaseClient, informe: Informe): Promise<void> {
  const [{ data: aprobadas }, { data: miradas }] = await Promise.all([
    admin.from('fichas_validadas').select('ficha_id, version_id, pregunta, version_infantil').eq('formato', 'pregunta'),
    admin.from('curiosidades_origen').select('version_id'),
  ]);
  const vistas = new Set(((miradas ?? []) as { version_id: string }[]).map((m) => m.version_id));
  const pendientes = ((aprobadas ?? []) as { ficha_id: string; version_id: string; pregunta: string; version_infantil: string }[])
    .filter((a) => !vistas.has(a.version_id))
    .slice(0, MAX_RESPUESTAS_POR_VEZ);

  await deA(5, pendientes, async (a) => {
    const oraciones = dividirOraciones(a.version_infantil);
    if (!oraciones.length) return;
    const r = await pedirJson<{ oraciones: number[] }>({
      modelo: MODELO_RAPIDO,
      instrucciones: INSTRUCCIONES_ELEGIR_ORACIONES,
      entrada: `Pregunta: ${a.pregunta}\n\nRespuesta para chicos, en oraciones numeradas:\n${oracionesNumeradas(oraciones)}`,
      nombre: 'oraciones',
      esquema: ESQUEMA_ELEGIR_ORACIONES,
      maxTokens: 400,
      segundos: 30,
    });
    if (!r.ok) return void informe.errores.push(`"${a.pregunta.slice(0, 50)}": ${r.error}`); // se vuelve a intentar mañana
    const elegidas = oracionesElegidas(oraciones, r.datos.oraciones);
    const { error } = await admin.from('curiosidades_origen').insert({ version_id: a.version_id, cuantas: elegidas.length });
    if (error) return void informe.errores.push(`"${a.pregunta.slice(0, 50)}": ${error.code}`);
    informe.respuestasMiradas++;
    if (!elegidas.length) return;
    const { error: errorCur } = await admin
      .from('curiosidades_auto')
      .insert(elegidas.map((e) => ({ version_id: a.version_id, ficha_id: a.ficha_id, oracion: e.oracion, texto: e.texto })));
    if (errorCur) {
      await admin.from('curiosidades_origen').delete().eq('version_id', a.version_id); // que se intente de nuevo
      return void informe.errores.push(`"${a.pregunta.slice(0, 50)}": ${errorCur.code}`);
    }
    informe.curiosidadesNuevas += elegidas.length;
  });
}

/** 3. El tema de cada curiosidad: el más parecido a la pregunta de su respuesta. */
async function ponerTemas(admin: SupabaseClient, informe: Informe): Promise<void> {
  const [{ data: temas, error }, { data: curiosidades }] = await Promise.all([
    admin.rpc('temas_de_respuestas'),
    admin.from('curiosidades_auto').select('id, version_id, tema_id'),
  ]);
  if (error) return void informe.errores.push(`temas de las respuestas: ${error.code}`);
  const porVersion = new Map(((temas ?? []) as { version_id: string; tema_id: string; similitud: number }[]).map((t) => [t.version_id, t]));
  for (const c of (curiosidades ?? []) as { id: string; version_id: string; tema_id: string | null }[]) {
    const t = porVersion.get(c.version_id);
    const tema = t && t.similitud >= UMBRAL_TEMA ? t.tema_id : null;
    if (tema) informe.conTema++;
    if (tema === c.tema_id) continue;
    await admin.from('curiosidades_auto').update({ tema_id: tema, similitud: t?.similitud ?? null }).eq('id', c.id);
  }
}

export async function actualizarCuriosidades(admin: SupabaseClient): Promise<Informe> {
  const informe: Informe = { temasNuevos: [], respuestasMiradas: 0, curiosidadesNuevas: 0, conTema: 0, errores: [] };
  // Primero el índice de los temas que todavía no lo tienen (por ejemplo, los 6 de la migración 24):
  // sin él no se puede saber a qué tema se parece cada pregunta o curiosidad
  await indexarTemas(admin, 40).catch(() => 0);
  for (const [nombre, paso] of [
    ['temas nuevos', temasNuevos],
    ['curiosidades', sacarCuriosidades],
    ['temas de las curiosidades', ponerTemas],
  ] as const) {
    try {
      await paso(admin, informe);
    } catch (e) {
      informe.errores.push(`${nombre}: ${e instanceof Error ? e.message : 'falló'}`);
    }
  }
  console.info(
    `[curiosidades] automáticas: ${informe.temasNuevos.length} temas nuevos, ${informe.respuestasMiradas} respuestas miradas, ${informe.curiosidadesNuevas} curiosidades nuevas, ${informe.conTema} con tema` +
      (informe.errores.length ? `; errores: ${informe.errores.slice(0, 5).join(' | ')}` : ''),
  );
  return informe;
}
