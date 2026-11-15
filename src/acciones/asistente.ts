'use server';

import { aulasReales } from '@/lib/supabase/config';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { exigirDocenteActiva } from '@/datos/docente';
import { esUuid } from '@/datos/aulas';
import { embeber, iaConfigurada, moderar } from '@/lib/ia/openai';
import { indexarPendientes } from '@/lib/ia/indice';
import { limpiarPregunta, normalizarPregunta } from '@/lib/ia/asistente';
import { after } from 'next/server';
import { contarPreguntaAsistente } from '@/datos/curiosidades';
import { buscarRespuesta } from '@/lib/ia/buscarRespuesta';
import type { SupabaseClient } from '@supabase/supabase-js';

/*
  ASISTENTE PARA LA CLASE (modo clase, IA-3). Lo usa la maestra.
  1. Maestra activa, cupo del día (40) y pregunta limpia (sin mails, links ni teléfonos).
  2. Moderación de OpenAI: si toca algo delicado, no se busca ni se guarda nada,
     y se sugiere conversarlo en clase.
  3. Se busca entre las respuestas APROBADAS (embeddings) y un segundo modelo
     confirma cuál la responde de verdad (src/lib/ia/buscarRespuesta.ts). Si
     la confirma, se muestra tal cual, con el sello y sus fuentes; si no, se
     ofrecen las parecidas; si no hay nada, se dice que todavía no la tenemos.
  4. Si no fue "la misma", la pregunta se anota para el equipo del Pasteur
     (sin maestra, sin aula, sin hora). Nunca se inventa una respuesta.
  Usa la clave secreta (lee la vista del sello y el índice), siempre después
  de verificar que quien llama es una maestra activa.
*/
const CUPO_DIARIO = 40;

export type Fuente = { titulo: string; anio: number | null; revista: string | null };
export type Respuesta = { fichaId: string; pregunta: string; infantil: string; aprobadaEn: string; fuentes: Fuente[] };
export type Resultado =
  | { tipo: 'respuesta'; respuesta: Respuesta }
  | { tipo: 'parecidas'; opciones: { fichaId: string; pregunta: string }[] }
  | { tipo: 'nada' }
  | { tipo: 'cuidado' };
export type EstadoAsistente = { mensaje?: string; pregunta?: string; resultado?: Resultado };

/** Historial anónimo (migración 20): solo la ficha y el día. Si falla, no importa. */
async function contarVista(admin: SupabaseClient, fichaId: string) {
  const { error } = await admin.rpc('contar_vista_respuesta', { p_ficha: fichaId, p_origen: 'asistente' });
  if (error) console.error('[asistente] vista:', error.code);
}

async function tarjeta(admin: SupabaseClient, fichaId: string): Promise<Respuesta | null> {
  const { data: f } = await admin
    .from('fichas_validadas')
    .select('ficha_id, version_id, pregunta, version_infantil, aprobada_en')
    .eq('ficha_id', fichaId)
    .maybeSingle<{ ficha_id: string; version_id: string; pregunta: string; version_infantil: string; aprobada_en: string }>();
  if (!f) return null;
  const { data: citas } = await admin
    .from('version_fuentes')
    .select('orden, publicaciones(titulo, anio, revista), fuentes(cita)')
    .eq('version_id', f.version_id)
    .order('orden');
  const fuentes = ((citas ?? []) as unknown as { publicaciones: Fuente | null; fuentes: { cita: string } | null }[]).map((c) =>
    c.publicaciones ? { titulo: c.publicaciones.titulo, anio: c.publicaciones.anio, revista: c.publicaciones.revista } : { titulo: c.fuentes?.cita ?? 'Fuente', anio: null, revista: null },
  );
  return { fichaId: f.ficha_id, pregunta: f.pregunta, infantil: f.version_infantil, aprobadaEn: f.aprobada_en, fuentes };
}

export async function preguntarAlPasteur(_previo: EstadoAsistente, datos: FormData): Promise<EstadoAsistente> {
  if (!aulasReales) return { mensaje: 'El asistente todavía no está activado.' };
  const docente = await exigirDocenteActiva();
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor.' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor.' };

  const pregunta = limpiarPregunta(String(datos.get('pregunta') ?? ''));
  if (pregunta.length < 5) return { mensaje: 'Escribí la pregunta de la clase.' };
  const act = String(datos.get('actividad') ?? '');
  const actividad = /^a[1-4]$/.test(act) ? act : null;

  const { data: hayCupo, error: errorCupo } = await admin.rpc('usar_cupo_asistente', { p_docente: docente.id, p_limite: CUPO_DIARIO });
  if (errorCupo) {
    console.error('[asistente] cupo:', errorCupo.code);
    return { pregunta, mensaje: 'No se pudo preguntar ahora. Probá en un rato.' };
  }
  if (!hayCupo) return { pregunta, mensaje: `Llegaste a las ${CUPO_DIARIO} preguntas de hoy. Mañana podés seguir.` };

  // Algo delicado: no se busca ni se guarda (y no se dice qué fue lo que lo marcó)
  const moderacion = await moderar(pregunta);
  if (moderacion?.marcada) return { pregunta, resultado: { tipo: 'cuidado' } };

  try {
    await indexarPendientes(admin, 10);
  } catch (e) {
    console.error('[asistente] índice:', e instanceof Error ? e.message : e);
  }
  // El mismo embedding sirve para buscar la respuesta y para contar el tema (curiosidades)
  const vector = (await embeber([pregunta]))?.[0] ?? null;
  const busqueda = await buscarRespuesta(admin, pregunta, vector ?? undefined);
  if (busqueda.error) return { pregunta, mensaje: 'No se pudo buscar ahora. Probá de nuevo en un ratito.' };
  const { decision } = busqueda;
  console.info(`[asistente] ${decision.tipo} (control: ${busqueda.eleccion ?? 'sin respuesta'})`);
  // Conteo anónimo por tema (migración 22), después de contestar: no demora a la maestra
  after(() =>
    contarPreguntaAsistente(admin, {
      vector,
      texto: pregunta,
      normalizada: normalizarPregunta(pregunta),
      actividad,
      fichaId: decision.tipo === 'respuesta' ? decision.fichaId : null,
    }),
  );

  if (decision.tipo !== 'respuesta') {
    const { error: errorAnotar } = await admin.rpc('anotar_pregunta_sin_respuesta', {
      p_texto: pregunta,
      p_normalizada: normalizarPregunta(pregunta),
      p_actividad: actividad,
    });
    if (errorAnotar) console.error('[asistente] anotar:', errorAnotar.code);
  }
  if (decision.tipo === 'respuesta') {
    const respuesta = await tarjeta(admin, decision.fichaId);
    if (respuesta) {
      await contarVista(admin, respuesta.fichaId);
      return { pregunta, resultado: { tipo: 'respuesta', respuesta } };
    }
    return { pregunta, resultado: { tipo: 'nada' } };
  }
  if (decision.tipo === 'parecidas') {
    const opciones = decision.fichas
      .map((f) => busqueda.candidatas.find((c) => c.fichaId === f.fichaId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ fichaId: c.fichaId, pregunta: c.pregunta }));
    if (opciones.length) return { pregunta, resultado: { tipo: 'parecidas', opciones } };
  }
  return { pregunta, resultado: { tipo: 'nada' } };
}

/** Una respuesta aprobada elegida entre las parecidas (no gasta cupo). */
export async function verRespuesta(fichaId: string): Promise<EstadoAsistente> {
  await exigirDocenteActiva();
  const admin = crearClienteAdmin();
  if (!admin || !esUuid(fichaId)) return { mensaje: 'No se encontró esa respuesta.' };
  const respuesta = await tarjeta(admin, fichaId);
  if (respuesta) await contarVista(admin, respuesta.fichaId);
  return respuesta ? { pregunta: respuesta.pregunta, resultado: { tipo: 'respuesta', respuesta } } : { mensaje: 'Esa respuesta ya no está disponible.' };
}
