'use server';

import { aulasReales } from '@/lib/supabase/config';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { exigirDocenteActiva } from '@/datos/docente';
import { esUuid } from '@/datos/aulas';
import { embeber, iaConfigurada, moderar } from '@/lib/ia/openai';
import { indexarPendientes } from '@/lib/ia/indice';
import { decidir, limpiarPregunta, normalizarPregunta, type Encontrado } from '@/lib/ia/asistente';
import type { SupabaseClient } from '@supabase/supabase-js';

/*
  ASISTENTE PARA LA CLASE (modo clase, IA-3). Lo usa la maestra.
  1. Maestra activa, cupo del día (40) y pregunta limpia (sin mails, links ni teléfonos).
  2. Moderación de OpenAI: si toca algo delicado, no se busca ni se guarda nada,
     y se sugiere conversarlo en clase.
  3. Se busca entre las respuestas APROBADAS (embeddings): si es la misma
     pregunta, se muestra tal cual, con el sello y sus fuentes; si hay parecidas,
     se ofrecen; si no hay nada, se dice que todavía no la tenemos.
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
  const vector = await embeber([pregunta]);
  if (!vector) return { pregunta, mensaje: 'No se pudo buscar ahora. Probá de nuevo en un ratito.' };
  const { data: filas, error } = await admin.rpc('buscar_fragmentos', { p_embedding: vector[0], p_limite: 8 });
  if (error) {
    console.error('[asistente] buscar:', error.code);
    return { pregunta, mensaje: 'No se pudo buscar ahora. Probá de nuevo en un ratito.' };
  }
  const decision = decidir((filas ?? []) as Encontrado[]);
  console.info(`[asistente] ${decision.tipo}`);

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
    if (respuesta) return { pregunta, resultado: { tipo: 'respuesta', respuesta } };
    return { pregunta, resultado: { tipo: 'nada' } };
  }
  if (decision.tipo === 'parecidas') {
    const { data: fichas } = await admin
      .from('fichas_validadas')
      .select('ficha_id, pregunta')
      .in(
        'ficha_id',
        decision.fichas.map((f) => f.fichaId),
      );
    const opciones = decision.fichas
      .map((f) => ({ fichaId: f.fichaId, pregunta: (fichas ?? []).find((x) => x.ficha_id === f.fichaId)?.pregunta as string | undefined }))
      .filter((o): o is { fichaId: string; pregunta: string } => Boolean(o.pregunta));
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
  return respuesta ? { pregunta: respuesta.pregunta, resultado: { tipo: 'respuesta', respuesta } } : { mensaje: 'Esa respuesta ya no está disponible.' };
}
