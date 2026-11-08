import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/*
  LECTURAS DE LA BIBLIOTECA (solo servidor, con la sesión del miembro: RLS).
  Tablas de las migraciones 13 y 14. Solo el equipo las ve.
*/
export type EstadoPublicacion = 'candidata' | 'en_revision' | 'aprobada' | 'rechazada' | 'retirada';

export type Publicacion = {
  id: string;
  titulo: string;
  anio: number | null;
  tipo: string;
  revista: string;
  idioma: string;
  autores: { nombre?: string; apellido?: string; orcid?: string }[];
  temas_externos: string[];
  mesh: string[];
  citas: number;
  oa_estado: string;
  retractada: boolean;
  del_instituto: boolean;
  resumen_interno: string | null;
  resumen_origen: string | null;
  licencia_codigo: string | null;
  licencia_revisar: boolean;
  estado: EstadoPublicacion;
  huella: string | null;
  agregada_por: string | null;
  creada_en: string;
  enviada_en: string | null;
  decidida_en: string | null;
  retirada_en: string | null;
  motivo_retiro: string | null;
  vence_en: string | null;
};

export type Licencia = { codigo: string; nombre: string; url: string | null; pasaje: 'textual' | 'breve' | 'solo_ubicacion'; orden: number; nota: string };

const COLUMNAS =
  'id, titulo, anio, tipo, revista, idioma, autores, temas_externos, mesh, citas, oa_estado, retractada, del_instituto, resumen_interno, resumen_origen, licencia_codigo, licencia_revisar, estado, huella, agregada_por, creada_en, enviada_en, decidida_en, retirada_en, motivo_retiro, vence_en';

export type PublicacionEnLista = Pick<
  Publicacion,
  'id' | 'titulo' | 'anio' | 'revista' | 'estado' | 'licencia_codigo' | 'licencia_revisar' | 'retractada' | 'del_instituto' | 'creada_en' | 'vence_en'
>;

export async function listarPublicaciones(): Promise<PublicacionEnLista[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!
    .from('publicaciones')
    .select('id, titulo, anio, revista, estado, licencia_codigo, licencia_revisar, retractada, del_instituto, creada_en, vence_en')
    .order('creada_en', { ascending: false })
    .limit(500);
  return (data ?? []) as PublicacionEnLista[];
}

export async function listarLicencias(): Promise<Licencia[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase!.from('licencias').select('codigo, nombre, url, pasaje, orden, nota').order('orden');
  return (data ?? []) as Licencia[];
}

export type PublicacionCompleta = {
  publicacion: Publicacion;
  identificadores: { tipo: string; valor: string }[];
  accesos: { id: string; tipo: string; url: string; version: string; es_oa: boolean; licencia_texto: string; proveedor: string | null }[];
  procedencias: { id: string; proveedor: string; id_externo: string; campos_aportados: string[]; obtenida_en: string }[];
  verificaciones: { id: number; senal_origen: string; senal_texto: string; licencia_detectada: string; resultado: string; verificada_por: string | null; verificada_en: string }[];
  relaciones: { id: string; tipo: string; estado: string; motivo: string; otra: { id: string; titulo: string; anio: number | null; estado: string } | null }[];
  revisiones: { id: string; revisor_id: string; decision: string; comentario: string; autoaprobada: boolean; licencia_al_aprobar: string | null; creada_en: string }[];
  citadaEn: number;
  temas: { tema_id: string }[];
};

export async function obtenerPublicacion(id: string): Promise<PublicacionCompleta | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await crearClienteServidor();
  const { data: publicacion } = await supabase!.from('publicaciones').select(COLUMNAS).eq('id', id).maybeSingle();
  if (!publicacion) return null;
  const [ids, accesos, procedencias, verificaciones, relaciones, revisiones, citas, temas] = await Promise.all([
    supabase!.from('publicacion_identificadores').select('tipo, valor').eq('publicacion_id', id).order('tipo'),
    supabase!.from('publicacion_accesos').select('id, tipo, url, version, es_oa, licencia_texto, proveedor').eq('publicacion_id', id),
    supabase!.from('publicacion_procedencias').select('id, proveedor, id_externo, campos_aportados, obtenida_en').eq('publicacion_id', id).order('obtenida_en', { ascending: false }).limit(20),
    supabase!.from('verificaciones_licencia').select('id, senal_origen, senal_texto, licencia_detectada, resultado, verificada_por, verificada_en').eq('publicacion_id', id).order('id', { ascending: false }).limit(20),
    supabase!.from('publicacion_relaciones').select('id, tipo, estado, motivo, origen_id, destino_id').or(`origen_id.eq.${id},destino_id.eq.${id}`),
    supabase!.from('revisiones').select('id, revisor_id, decision, comentario, autoaprobada, licencia_al_aprobar, creada_en').eq('objeto', 'publicacion').eq('objeto_id', id).order('creada_en', { ascending: false }),
    supabase!.from('version_fuentes').select('id', { count: 'exact', head: true }).eq('publicacion_id', id),
    supabase!.from('publicacion_temas').select('tema_id').eq('publicacion_id', id),
  ]);
  const otrasIds = (relaciones.data ?? []).map((r) => (r.origen_id === id ? r.destino_id : r.origen_id));
  const { data: otras } = otrasIds.length
    ? await supabase!.from('publicaciones').select('id, titulo, anio, estado').in('id', otrasIds)
    : { data: [] as { id: string; titulo: string; anio: number | null; estado: string }[] };
  const porId = new Map((otras ?? []).map((o) => [o.id, o]));
  return {
    publicacion: publicacion as Publicacion,
    identificadores: ids.data ?? [],
    accesos: accesos.data ?? [],
    procedencias: procedencias.data ?? [],
    verificaciones: verificaciones.data ?? [],
    relaciones: (relaciones.data ?? []).map((r) => ({
      id: r.id,
      tipo: r.tipo,
      estado: r.estado,
      motivo: r.motivo,
      otra: porId.get(r.origen_id === id ? r.destino_id : r.origen_id) ?? null,
    })),
    revisiones: revisiones.data ?? [],
    citadaEn: citas.count ?? 0,
    temas: temas.data ?? [],
  };
}

/** ¿Cuáles de estos identificadores ya están en la biblioteca? (para marcar resultados de búsqueda) */
export async function yaEnBiblioteca(pares: { tipo: string; valor: string }[]): Promise<Map<string, { id: string; estado: string }>> {
  const resultado = new Map<string, { id: string; estado: string }>();
  if (pares.length === 0) return resultado;
  const supabase = await crearClienteServidor();
  const porTipo = new Map<string, string[]>();
  for (const p of pares) (porTipo.get(p.tipo) ?? porTipo.set(p.tipo, []).get(p.tipo)!).push(p.valor);
  for (const [tipo, valores] of porTipo) {
    const { data } = await supabase!
      .from('publicacion_identificadores')
      .select('valor, publicaciones(id, estado)')
      .eq('tipo', tipo)
      .in('valor', valores.slice(0, 200));
    for (const fila of (data ?? []) as unknown as { valor: string; publicaciones: { id: string; estado: string } | null }[]) {
      if (fila.publicaciones) resultado.set(`${tipo}:${fila.valor}`, fila.publicaciones);
    }
  }
  return resultado;
}
