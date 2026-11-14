import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { embeber } from '@/lib/ia/openai';
import { DIAS, NO_REPETIR_DIAS, VIDA_MEDIA, elegir, type Curiosidad, type Tendencia } from '@/lib/curiosidades/elegir';

/*
  CURIOSIDADES (etapa 4 de "Ajustes de producto", migración 22).
  Solo servidor. Tres cosas:
  1. Contar consultas por tema, sin guardar quién: cada pregunta al asistente
     (con o sin respuesta) y cada respuesta vista en una actividad. La pregunta
     va al tema más parecido; si no se parece a ninguno, queda "sin tema" para
     que el equipo la ubique.
  2. Elegir curiosidades (fichas "dato" publicadas) según la tendencia de los
     últimos 30 días, con variedad (src/lib/curiosidades/elegir.ts) y sin
     repetirle una a la misma aula en 14 días.
  3. Calcular el embedding de los temas nuevos, cuando hace falta.
  Si algo falla, no se rompe nada: no se cuenta o no se muestra curiosidad.
*/

/** Parecido mínimo para que una pregunta cuente para un tema (calibrar con datos reales). */
export const UMBRAL_TEMA = Number(process.env.CURIOSIDADES_UMBRAL_TEMA) || 0.45;

export type CuriosidadVisible = { id: string; titulo: string; texto: string; actividad: string | null; tema: string | null; fuentes: string[] };

const hoyUY = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' });

/** Calcula el embedding de los temas activos que todavía no tienen (como mucho `max`). */
export async function indexarTemas(admin: SupabaseClient, max = 40): Promise<number> {
  const { data } = await admin.from('temas').select('id, nombre, descripcion').eq('activo', true).is('embedding', null).limit(max);
  const temas = (data ?? []) as { id: string; nombre: string; descripcion: string }[];
  if (!temas.length) return 0;
  const vectores = await embeber(temas.map((t) => `${t.nombre}. ${t.descripcion}`.trim()));
  if (!vectores) return 0;
  let n = 0;
  for (const [i, t] of temas.entries()) {
    const { error } = await admin.from('temas').update({ embedding: vectores[i] }).eq('id', t.id);
    if (error) console.error('[curiosidades] tema:', error.code);
    else n++;
  }
  return n;
}

/**
 * Cuenta una pregunta hecha al asistente. Si tuvo respuesta, cuenta para el
 * tema de esa respuesta; si no (o la respuesta no tiene tema), para el tema
 * más parecido a la pregunta; si no hay ninguno parecido, queda sin tema.
 */
export async function contarPreguntaAsistente(
  admin: SupabaseClient,
  p: { vector: number[] | null; texto: string; normalizada: string; actividad: string | null; fichaId: string | null },
): Promise<void> {
  try {
    await indexarTemas(admin, 10);
    if (p.fichaId) {
      const { data: tema } = await admin.rpc('contar_consulta_de_ficha', { p_ficha: p.fichaId, p_origen: 'asistente', p_umbral: UMBRAL_TEMA });
      if (tema) return;
    }
    const origen = p.fichaId ? 'asistente' : 'sin_respuesta';
    if (p.vector) {
      const { data: filas } = await admin.rpc('tema_parecido', { p_embedding: p.vector });
      const cerca = ((filas ?? []) as { tema_id: string; similitud: number }[])[0];
      if (cerca && cerca.similitud >= UMBRAL_TEMA) {
        const { error } = await admin.rpc('contar_consulta_tema', { p_tema: cerca.tema_id, p_origen: origen });
        if (error) console.error('[curiosidades] contar:', error.code);
        return;
      }
    }
    const { error } = await admin.rpc('anotar_consulta_sin_tema', { p_texto: p.texto, p_normalizada: p.normalizada, p_actividad: p.actividad });
    if (error) console.error('[curiosidades] sin tema:', error.code);
  } catch (e) {
    console.error('[curiosidades] contar:', e instanceof Error ? e.message : e);
  }
}

/** Cuenta una respuesta aprobada que alguien abrió dentro de una actividad. */
export async function contarRespuestaVista(admin: SupabaseClient, fichaId: string): Promise<void> {
  const { error } = await admin.rpc('contar_consulta_de_ficha', { p_ficha: fichaId, p_origen: 'actividad', p_umbral: UMBRAL_TEMA });
  if (error) console.error('[curiosidades] vista:', error.code);
}

/**
 * Curiosidades para mostrar. Con aula: no repite lo que esa aula vio en 14
 * días y anota lo que se le muestra. Sin aula (panel de la maestra, fichas
 * públicas): solo tendencia y variedad.
 */
export async function curiosidadesPara(o: { aulaId?: string | null; actividad?: string | null; cuantas?: number }): Promise<CuriosidadVisible[]> {
  const admin = crearClienteAdmin();
  if (!admin) return [];
  try {
    const cuantas = Math.min(Math.max(o.cuantas ?? 1, 1), 6);
    const actividad = o.actividad && /^a[1-4]$/.test(o.actividad) ? o.actividad : null;
    let q = admin.from('fichas_validadas').select('ficha_id, version_id, tema_id, actividad, pregunta, version_infantil').eq('formato', 'dato');
    if (actividad) q = q.or(`actividad.eq.${actividad},actividad.is.null`);
    const { data: fichas } = await q;
    const lista = (fichas ?? []) as { ficha_id: string; version_id: string; tema_id: string | null; actividad: string | null; pregunta: string; version_infantil: string }[];
    if (!lista.length) return [];

    const { data: tend } = await admin.rpc('tendencia_temas', { p_dias: DIAS, p_vida_media: VIDA_MEDIA });
    const tendencias: Tendencia[] = ((tend ?? []) as { tema_id: string; puntaje: number }[]).map((t) => ({ temaId: t.tema_id, puntaje: Number(t.puntaje) || 0 }));

    const vistas = new Map<string, number>();
    let ultimoTema: string | null = null;
    if (o.aulaId) {
      const desde = new Date(Date.now() - NO_REPETIR_DIAS * 86_400_000).toISOString().slice(0, 10);
      const { data: vio } = await admin.from('curiosidades_vistas').select('ficha_id, dia').eq('aula_id', o.aulaId).gte('dia', desde).order('dia', { ascending: false });
      const hoy = Date.parse(`${hoyUY()}T00:00:00Z`);
      for (const v of (vio ?? []) as { ficha_id: string; dia: string }[]) {
        if (!vistas.has(v.ficha_id)) vistas.set(v.ficha_id, Math.round((hoy - Date.parse(`${v.dia}T00:00:00Z`)) / 86_400_000));
      }
      const ultima = (vio ?? [])[0] as { ficha_id: string } | undefined;
      ultimoTema = ultima ? (lista.find((f) => f.ficha_id === ultima.ficha_id)?.tema_id ?? null) : null;
    }

    const curiosidades: Curiosidad[] = lista.map((f) => ({ id: f.ficha_id, temaId: f.tema_id, actividad: f.actividad }));
    const ids = elegir(tendencias, curiosidades, { cuantas, actividad, vistas, ultimoTema });
    if (!ids.length) return [];

    const elegidas = ids.map((id) => lista.find((f) => f.ficha_id === id)!).filter(Boolean);
    const [{ data: temas }, { data: citas }] = await Promise.all([
      admin.from('temas').select('id, nombre').in('id', elegidas.map((f) => f.tema_id).filter((x): x is string => Boolean(x))),
      admin.from('version_fuentes').select('version_id, orden, publicaciones(titulo), fuentes(cita)').in('version_id', elegidas.map((f) => f.version_id)).order('orden'),
    ]);
    const fuentes = new Map<string, string[]>();
    for (const c of (citas ?? []) as unknown as { version_id: string; publicaciones: { titulo: string } | null; fuentes: { cita: string } | null }[]) {
      const t = c.publicaciones?.titulo ?? c.fuentes?.cita;
      if (t) fuentes.set(c.version_id, [...(fuentes.get(c.version_id) ?? []), t]);
    }
    if (o.aulaId) {
      const { error } = await admin
        .from('curiosidades_vistas')
        .upsert(elegidas.map((f) => ({ aula_id: o.aulaId, ficha_id: f.ficha_id, dia: hoyUY() })), { onConflict: 'aula_id,ficha_id,dia', ignoreDuplicates: true });
      if (error) console.error('[curiosidades] vistas del aula:', error.code);
    }
    return elegidas.map((f) => ({
      id: f.ficha_id,
      titulo: f.pregunta,
      texto: f.version_infantil,
      actividad: f.actividad,
      tema: ((temas ?? []) as { id: string; nombre: string }[]).find((t) => t.id === f.tema_id)?.nombre ?? null,
      fuentes: (fuentes.get(f.version_id) ?? []).slice(0, 3),
    }));
  } catch (e) {
    console.error('[curiosidades] elegir:', e instanceof Error ? e.message : e);
    return [];
  }
}

/** Borra conteos viejos (90 días) y lo que vio cada aula (30 días). Lo llama el latido diario. */
export async function limpiarCuriosidades(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.rpc('limpiar_curiosidades');
  if (error) console.error('[curiosidades] limpiar:', error.code);
}
