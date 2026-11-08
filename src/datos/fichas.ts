import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/*
  LECTURAS DE FICHAS (solo servidor, con la sesión del miembro: RLS).
  Tablas de la migración 9: fichas, ficha_versiones, version_fuentes,
  fuentes, temas, revisiones, eventos_editoriales.
*/
export type EstadoVersion = 'borrador' | 'en_revision' | 'publicada' | 'reemplazada' | 'rechazada';
import type { Formato } from '@/lib/equipo/comun';
export type { Formato };

export type Ficha = {
  id: string;
  slug: string;
  formato: Formato;
  tema_id: string | null;
  actividad: string | null;
  estado: 'borrador' | 'publicada' | 'retirada';
  version_publicada_id: string | null;
  creada_por: string;
  creada_en: string;
  retirada_en: string | null;
  motivo_retiro: string | null;
};

export type Version = {
  id: string;
  ficha_id: string;
  numero: number;
  pregunta: string;
  variantes: string[];
  explicacion_cientifica: string;
  version_infantil: string;
  grado_min: number;
  grado_max: number;
  asistida_por_ia: boolean;
  nota_interna: string;
  estado: EstadoVersion;
  autor_id: string;
  huella: string | null;
  creada_en: string;
  enviada_en: string | null;
  decidida_en: string | null;
};

export type PublicacionCorta = { id: string; titulo: string; anio: number | null; revista: string; estado: string; licencia_codigo: string | null };
export type Fuente = { id: string; tipo: string; cita: string; url: string | null; anio: number | null; es_del_instituto: boolean };

export type Cita = {
  id: string;
  version_id: string;
  publicacion_id: string | null;
  fuente_id: string | null;
  pasaje: string;
  pasaje_textual: boolean;
  ubicacion: string;
  parafrasis: string;
  orden: number;
  publicaciones: PublicacionCorta | null;
  fuentes: Fuente | null;
};

export type Revision = {
  id: string;
  objeto_id: string;
  revisor_id: string;
  decision: 'aprobar' | 'pedir_cambios' | 'rechazar';
  comentario: string;
  autoaprobada: boolean;
  creada_en: string;
};

export type Tema = { id: string; slug: string; nombre: string; actividad: string | null };

const COLUMNAS_VERSION =
  'id, ficha_id, numero, pregunta, variantes, explicacion_cientifica, version_infantil, grado_min, grado_max, asistida_por_ia, nota_interna, estado, autor_id, huella, creada_en, enviada_en, decidida_en';

export type FichaEnLista = Ficha & {
  ficha_versiones: Pick<Version, 'id' | 'numero' | 'estado' | 'pregunta' | 'version_infantil' | 'autor_id' | 'enviada_en' | 'creada_en'>[];
};

export async function listarFichas(): Promise<FichaEnLista[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!
    .from('fichas')
    .select(
      '*, ficha_versiones!ficha_versiones_ficha_id_fkey(id, numero, estado, pregunta, version_infantil, autor_id, enviada_en, creada_en)',
    )
    .order('creada_en', { ascending: false })
    .limit(500);
  return (data ?? []) as FichaEnLista[];
}

export type FichaCompleta = {
  ficha: Ficha;
  versiones: Version[];
  citas: Record<string, Cita[]>;
  revisiones: Revision[];
};

export async function obtenerFicha(id: string): Promise<FichaCompleta | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await crearClienteServidor();
  const { data: ficha } = await supabase!.from('fichas').select('*').eq('id', id).maybeSingle();
  if (!ficha) return null;
  const { data: versiones } = await supabase!
    .from('ficha_versiones')
    .select(COLUMNAS_VERSION)
    .eq('ficha_id', id)
    .order('numero', { ascending: false });
  const ids = (versiones ?? []).map((v) => v.id);
  const [{ data: citas }, { data: revisiones }] = await Promise.all([
    supabase!
      .from('version_fuentes')
      .select(
        'id, version_id, publicacion_id, fuente_id, pasaje, pasaje_textual, ubicacion, parafrasis, orden, publicaciones(id, titulo, anio, revista, estado, licencia_codigo), fuentes(id, tipo, cita, url, anio, es_del_instituto)',
      )
      .in('version_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      .order('orden')
      .order('id'),
    supabase!
      .from('revisiones')
      .select('id, objeto_id, revisor_id, decision, comentario, autoaprobada, creada_en')
      .eq('objeto', 'ficha_version')
      .in('objeto_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      .order('creada_en', { ascending: false }),
  ]);
  const porVersion: Record<string, Cita[]> = {};
  for (const c of (citas ?? []) as unknown as Cita[]) (porVersion[c.version_id] ??= []).push(c);
  return { ficha: ficha as Ficha, versiones: (versiones ?? []) as Version[], citas: porVersion, revisiones: (revisiones ?? []) as Revision[] };
}

export async function obtenerVersion(id: string): Promise<{ version: Version; ficha: Ficha; citas: Cita[]; publicada: Version | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await crearClienteServidor();
  const { data: version } = await supabase!.from('ficha_versiones').select(COLUMNAS_VERSION).eq('id', id).maybeSingle();
  if (!version) return null;
  const { data: ficha } = await supabase!.from('fichas').select('*').eq('id', version.ficha_id).maybeSingle();
  if (!ficha) return null;
  const { data: citas } = await supabase!
    .from('version_fuentes')
    .select(
      'id, version_id, publicacion_id, fuente_id, pasaje, pasaje_textual, ubicacion, parafrasis, orden, publicaciones(id, titulo, anio, revista, estado, licencia_codigo), fuentes(id, tipo, cita, url, anio, es_del_instituto)',
    )
    .eq('version_id', id)
    .order('orden')
    .order('id');
  let publicada: Version | null = null;
  if (ficha.version_publicada_id && ficha.version_publicada_id !== id) {
    const { data } = await supabase!.from('ficha_versiones').select(COLUMNAS_VERSION).eq('id', ficha.version_publicada_id).maybeSingle();
    publicada = (data as Version) ?? null;
  }
  return { version: version as Version, ficha: ficha as Ficha, citas: (citas ?? []) as unknown as Cita[], publicada };
}

export async function listarTemas(): Promise<Tema[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!.from('temas').select('id, slug, nombre, actividad').eq('activo', true).order('orden').order('nombre');
  return (data ?? []) as Tema[];
}

export async function listarFuentes(): Promise<Fuente[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!.from('fuentes').select('id, tipo, cita, url, anio, es_del_instituto').order('creada_en', { ascending: false }).limit(300);
  return (data ?? []) as Fuente[];
}

/** Publicaciones que se pueden elegir al citar: aprobadas primero; las candidatas se pueden citar en borrador. */
export async function publicacionesCitables(): Promise<PublicacionCorta[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!
    .from('publicaciones')
    .select('id, titulo, anio, revista, estado, licencia_codigo')
    .in('estado', ['aprobada', 'en_revision', 'candidata'])
    .order('estado')
    .order('titulo')
    .limit(500);
  const orden: Record<string, number> = { aprobada: 0, en_revision: 1, candidata: 2 };
  return ((data ?? []) as PublicacionCorta[]).sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9));
}

/** Nombres del equipo, para mostrar quién escribió o aprobó. */
export async function nombresDelEquipo(): Promise<Record<string, string>> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!.from('equipo').select('id, nombre_visible, rol');
  return Object.fromEntries((data ?? []).map((m) => [m.id, m.nombre_visible || 'Sin nombre']));
}

/** Lo que espera una validadora: versiones y publicaciones en revisión. */
export async function pendientesDeRevision() {
  const supabase = await crearClienteServidor();
  const [{ data: versiones }, { data: publicaciones }] = await Promise.all([
    supabase!
      .from('ficha_versiones')
      .select('id, numero, pregunta, version_infantil, autor_id, enviada_en, fichas!ficha_versiones_ficha_id_fkey(id, slug, formato)')
      .eq('estado', 'en_revision')
      .order('enviada_en'),
    supabase!.from('publicaciones').select('id, titulo, anio, revista, agregada_por, enviada_en, licencia_codigo, retractada').eq('estado', 'en_revision').order('enviada_en'),
  ]);
  return {
    versiones: (versiones ?? []) as unknown as (Pick<Version, 'id' | 'numero' | 'pregunta' | 'version_infantil' | 'autor_id' | 'enviada_en'> & {
      fichas: Pick<Ficha, 'id' | 'slug' | 'formato'>;
    })[],
    publicaciones: (publicaciones ?? []) as {
      id: string;
      titulo: string;
      anio: number | null;
      revista: string;
      agregada_por: string | null;
      enviada_en: string | null;
      licencia_codigo: string | null;
      retractada: boolean;
    }[],
  };
}

