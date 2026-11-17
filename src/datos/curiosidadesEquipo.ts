import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { indexarTemas, limpiarCuriosidades } from '@/datos/curiosidades';
import { DIAS, VIDA_MEDIA } from '@/lib/curiosidades/elegir';

/*
  Datos de /equipo/curiosidades, leídos con la sesión del miembro (las
  reglas de la base deciden qué ve). De paso, con la clave secreta:
  embeddings de temas nuevos y limpieza de conteos viejos.
*/
export type TemaPanel = { id: string; nombre: string; descripcion: string; actividad: string | null; activo: boolean; conIndice: boolean; automatico: boolean; padreId: string | null };
/** Una curiosidad automática: una oración tal cual de una respuesta aprobada (migración 23). */
export type AutoPanel = { id: string; temaId: string | null; texto: string; pregunta: string; fichaId: string; oculta: boolean; vigente: boolean };
export type EstadoAutomaticas = { total: number; respuestasMiradas: number; aprobadas: number; ultima: string | null; disponible: boolean };
export type TendenciaPanel = { temaId: string; nombre: string; actividad: string | null; puntaje: number; consultas: number; curiosidades: number };
export type CuriosidadPanel = { id: string; temaId: string | null; actividad: string | null; estado: 'publicada' | 'espera' | 'borrador' | 'rechazada' | 'retirada'; titulo: string; texto: string; ia: boolean };
export type SinTema = { id: string; texto: string; actividad: string | null; veces: number; ultimaVez: string };

/** Cuántas curiosidades publicadas tiene que tener un tema en tendencia para no pedir más. */
export const MINIMO_POR_TEMA = 3;

export async function panelCuriosidades() {
  const admin = crearClienteAdmin();
  if (admin) {
    await indexarTemas(admin).catch(() => 0);
    await limpiarCuriosidades(admin).catch(() => undefined);
  }
  const db = (await crearClienteServidor())!;
  const [temasR, tendR, fichasR, sinTemaR] = await Promise.all([
    // Con "*": anda con y sin la migración 23 (columna automatico)
    db.from('temas').select('*').order('actividad').order('orden').order('nombre'),
    db.rpc('tendencia_temas', { p_dias: DIAS, p_vida_media: VIDA_MEDIA }),
    db
      .from('fichas')
      .select('id, tema_id, actividad, estado, ficha_versiones!ficha_versiones_ficha_id_fkey(numero, estado, pregunta, version_infantil, asistida_por_ia)')
      .eq('formato', 'dato')
      .order('creada_en', { ascending: false })
      .limit(300),
    db
      .from('preguntas_pendientes')
      .select('id, texto, actividad, veces:veces_sin_tema, ultima_vez')
      .gt('veces_sin_tema', 0)
      .order('ultima_vez', { ascending: false })
      .order('veces_sin_tema', { ascending: false })
      .limit(60),
  ]);

  const temas: TemaPanel[] = (
    (temasR.data ?? []) as { id: string; nombre: string; descripcion: string; actividad: string | null; activo: boolean; embedding: unknown; automatico?: boolean; padre_id: string | null }[]
  ).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion,
    actividad: t.actividad,
    activo: t.activo,
    conIndice: t.embedding != null,
    automatico: Boolean(t.automatico),
    padreId: t.padre_id,
  }));
  const tendencia: TendenciaPanel[] = ((tendR.data ?? []) as { tema_id: string; nombre: string; actividad: string | null; puntaje: number; consultas: number; curiosidades: number }[]).map((t) => ({
    temaId: t.tema_id,
    nombre: t.nombre,
    actividad: t.actividad,
    puntaje: Number(t.puntaje) || 0,
    consultas: Number(t.consultas) || 0,
    curiosidades: Number(t.curiosidades) || 0,
  }));
  type Version = { numero: number; estado: string; pregunta: string; version_infantil: string; asistida_por_ia: boolean };
  const curiosidades: CuriosidadPanel[] = ((fichasR.data ?? []) as unknown as { id: string; tema_id: string | null; actividad: string | null; estado: string; ficha_versiones: Version[] }[]).map((f) => {
    const v = [...(f.ficha_versiones ?? [])].sort((a, b) => b.numero - a.numero)[0];
    const estado: CuriosidadPanel['estado'] =
      f.estado === 'publicada'
        ? 'publicada'
        : f.estado === 'retirada'
          ? 'retirada'
          : v?.estado === 'en_revision'
            ? 'espera'
            : v?.estado === 'rechazada'
                ? 'rechazada'
                : 'borrador';
    return { id: f.id, temaId: f.tema_id, actividad: f.actividad, estado, titulo: v?.pregunta ?? '', texto: v?.version_infantil ?? '', ia: Boolean(v?.asistida_por_ia) };
  });
  const sinTema: SinTema[] = ((sinTemaR.data ?? []) as { id: string; texto: string; actividad: string | null; veces: number; ultima_vez: string }[]).map((s) => ({
    id: s.id,
    texto: s.texto,
    actividad: s.actividad,
    veces: s.veces,
    ultimaVez: s.ultima_vez,
  }));
  const { automaticas, estadoAutomaticas } = await panelAutomaticas(db);
  return { temas, tendencia, curiosidades, sinTema, automaticas, estadoAutomaticas };
}

/** Las curiosidades automáticas, para el equipo (con su sesión). Sin la migración 23: vacío. */
async function panelAutomaticas(db: SupabaseClient): Promise<{ automaticas: AutoPanel[]; estadoAutomaticas: EstadoAutomaticas }> {
  const [autosR, origenR, aprobadasR] = await Promise.all([
    db.from('curiosidades_auto').select('id, version_id, ficha_id, tema_id, texto, oculta').order('creada_en', { ascending: false }).limit(600),
    db.from('curiosidades_origen').select('version_id, analizada_en').order('analizada_en', { ascending: false }).limit(1000),
    db.from('fichas_validadas').select('version_id, pregunta').eq('formato', 'pregunta'),
  ]);
  const vacio = { automaticas: [], estadoAutomaticas: { total: 0, respuestasMiradas: 0, aprobadas: 0, ultima: null, disponible: false } };
  if (autosR.error || origenR.error) return vacio;
  const vigentes = new Map(((aprobadasR.data ?? []) as { version_id: string; pregunta: string }[]).map((v) => [v.version_id, v.pregunta]));
  const filas = (autosR.data ?? []) as { id: string; version_id: string; ficha_id: string; tema_id: string | null; texto: string; oculta: boolean }[];
  // La pregunta de las que ya no están vigentes (se retiró la respuesta o hay otra versión)
  const faltan = [...new Set(filas.filter((f) => !vigentes.has(f.version_id)).map((f) => f.version_id))];
  const { data: viejas } = faltan.length ? await db.from('ficha_versiones').select('id, pregunta').in('id', faltan) : { data: [] };
  const preguntaDe = new Map([...vigentes, ...((viejas ?? []) as { id: string; pregunta: string }[]).map((v) => [v.id, v.pregunta] as const)]);
  const origen = (origenR.data ?? []) as { version_id: string; analizada_en: string }[];
  return {
    automaticas: filas.map((f) => ({
      id: f.id,
      temaId: f.tema_id,
      texto: f.texto,
      pregunta: preguntaDe.get(f.version_id) ?? '',
      fichaId: f.ficha_id,
      oculta: f.oculta,
      vigente: vigentes.has(f.version_id),
    })),
    estadoAutomaticas: {
      total: filas.filter((f) => !f.oculta && vigentes.has(f.version_id)).length,
      respuestasMiradas: origen.filter((o) => vigentes.has(o.version_id)).length,
      aprobadas: vigentes.size,
      ultima: origen[0]?.analizada_en ?? null,
      disponible: true,
    },
  };
}
