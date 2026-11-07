'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { miembroCon } from '@/datos/equipo';
import { mensajeDeError } from '@/datos/errores';
import { slugDe } from '@/lib/equipo/comun';

/*
  ACCIONES DE FICHAS (Server Actions del equipo).
  Todo con la sesión del miembro: las reglas de la base (migraciones 9, 13 y
  14) deciden quién puede qué. Acá solo se validan formatos y se traducen los
  errores. Cada acción vuelve a verificar quién llama.
*/
export type Estado = { mensaje: string; ok?: boolean };

const SIN_PERMISO: Estado = { mensaje: 'No tenés permiso para hacer eso.' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const texto = (f: FormData, k: string, max: number) => leer(f, k).replace(/\r\n/g, '\n').slice(0, max);
const supabase = async () => (await crearClienteServidor())!;

// ---------------------------------------------------------------------
// Ficha nueva
// ---------------------------------------------------------------------
export async function crearFicha(_previo: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  const formato = leer(datos, 'formato');
  const titulo = leer(datos, 'titulo').replace(/\s+/g, ' ');
  const actividad = leer(datos, 'actividad') || null;
  const tema = leer(datos, 'tema') || null;
  if (formato !== 'pregunta' && formato !== 'dato') return { mensaje: 'Elegí si es una pregunta o un dato.' };
  if (titulo.length < 3 || titulo.length > 300) return { mensaje: formato === 'pregunta' ? 'Escribí la pregunta (de 3 a 300 letras).' : 'Escribí de qué trata el dato (de 3 a 300 letras).' };
  if (actividad && !/^a[1-4]$/.test(actividad)) return { mensaje: 'Actividad desconocida.' };
  if (tema && !UUID.test(tema)) return { mensaje: 'Tema desconocido.' };

  const db = await supabase();
  const base = slugDe(titulo) || 'ficha';
  let fichaId: string | null = null;
  for (let intento = 1; intento <= 6 && !fichaId; intento++) {
    const slug = intento === 1 ? base : `${base.slice(0, 55)}-${intento}`;
    const { data, error } = await db.from('fichas').insert({ slug, formato, actividad, tema_id: tema }).select('id').single();
    if (data) fichaId = data.id;
    else if (!/duplicate key/i.test(error?.message ?? '')) return { mensaje: mensajeDeError(error) };
  }
  if (!fichaId) return { mensaje: 'Ya hay varias fichas con ese nombre. Probá con otro.' };

  const { error } = await db
    .from('ficha_versiones')
    .insert(formato === 'pregunta' ? { ficha_id: fichaId, pregunta: titulo } : { ficha_id: fichaId, nota_interna: `Dato: ${titulo}` });
  if (error) return { mensaje: mensajeDeError(error) };
  redirect(`/equipo/fichas/${fichaId}`);
}

// ---------------------------------------------------------------------
// Texto de la versión abierta (borrador o en revisión)
// ---------------------------------------------------------------------
export async function guardarVersion(versionId: string, _previo: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(versionId)) return SIN_PERMISO;
  const variantes = texto(datos, 'variantes', 6000)
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  if (variantes.length > 20) return { mensaje: 'Hasta 20 formas de preguntar lo mismo.' };
  if (variantes.some((v) => v.length > 300)) return { mensaje: 'Cada forma de preguntar puede tener hasta 300 letras.' };
  const gradoMin = Number(leer(datos, 'grado_min'));
  const gradoMax = Number(leer(datos, 'grado_max'));
  if (![gradoMin, gradoMax].every((g) => Number.isInteger(g) && g >= 4 && g <= 6) || gradoMin > gradoMax) return { mensaje: 'Revisá los años escolares (de 4° a 6°).' };

  const cambios = {
    pregunta: texto(datos, 'pregunta', 300),
    variantes,
    explicacion_cientifica: texto(datos, 'explicacion', 4000),
    version_infantil: texto(datos, 'infantil', 1000),
    grado_min: gradoMin,
    grado_max: gradoMax,
    // Solo se manda para marcarla: una vez marcada, la base no deja sacarla (migración 15)
    ...(datos.get('asistida_por_ia') === 'on' ? { asistida_por_ia: true } : {}),
    nota_interna: texto(datos, 'nota', 2000),
  };
  const db = await supabase();
  const { data, error } = await db.from('ficha_versiones').update(cambios).eq('id', versionId).select('estado').maybeSingle();
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data) return { mensaje: 'No podés editar esta versión (no es tuya, o ya se decidió).' };
  refresh();
  return {
    ok: true,
    mensaje: data.estado === 'en_revision' ? 'Guardado. Como está en revisión, quien la revise va a ver este texto nuevo.' : 'Guardado.',
  };
}

async function cambiarEstadoVersion(versionId: string, estado: 'en_revision' | 'borrador'): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(versionId)) return SIN_PERMISO;
  const db = await supabase();
  const { data, error } = await db.from('ficha_versiones').update({ estado }).eq('id', versionId).select('id').maybeSingle();
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data) return { mensaje: 'No podés cambiar esta versión.' };
  refresh();
  return { ok: true, mensaje: estado === 'en_revision' ? 'Enviada a revisión.' : 'Volvió a borrador: podés seguir editando.' };
}

export async function enviarARevision(versionId: string) {
  return cambiarEstadoVersion(versionId, 'en_revision');
}
export async function retirarEnvio(versionId: string) {
  return cambiarEstadoVersion(versionId, 'borrador');
}

/** Para cambiar una ficha publicada: una versión nueva, copia de la publicada (los chicos siguen viendo la anterior). */
export async function abrirVersionNueva(fichaId: string): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(fichaId)) return SIN_PERMISO;
  const db = await supabase();
  const { data: ficha } = await db.from('fichas').select('id, version_publicada_id').eq('id', fichaId).maybeSingle();
  if (!ficha?.version_publicada_id) return { mensaje: 'Esta ficha no tiene una versión publicada para copiar.' };
  const { data: base } = await db
    .from('ficha_versiones')
    .select('pregunta, variantes, explicacion_cientifica, version_infantil, grado_min, grado_max, asistida_por_ia, nota_interna')
    .eq('id', ficha.version_publicada_id)
    .single();
  const { data: nueva, error } = await db.from('ficha_versiones').insert({ ficha_id: fichaId, ...base }).select('id').single();
  if (error || !nueva) return { mensaje: /duplicate key/i.test(error?.message ?? '') ? 'Ya hay una versión abierta de esta ficha.' : mensajeDeError(error) };
  const { data: citas } = await db
    .from('version_fuentes')
    .select('publicacion_id, fuente_id, pasaje, pasaje_textual, ubicacion, parafrasis, orden')
    .eq('version_id', ficha.version_publicada_id);
  if (citas?.length) {
    const { error: errorCitas } = await db.from('version_fuentes').insert(citas.map((c) => ({ ...c, version_id: nueva.id })));
    if (errorCitas) return { mensaje: `Se abrió la versión nueva, pero no se copiaron todas las citas: ${mensajeDeError(errorCitas)}` };
  }
  refresh();
  return { ok: true, mensaje: 'Versión nueva abierta. La publicada sigue igual hasta que se apruebe esta.' };
}

export async function cambiarDatosFicha(fichaId: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(fichaId)) return SIN_PERMISO;
  const actividad = leer(datos, 'actividad') || null;
  const tema = leer(datos, 'tema') || null;
  if (actividad && !/^a[1-4]$/.test(actividad)) return { mensaje: 'Actividad desconocida.' };
  if (tema && !UUID.test(tema)) return { mensaje: 'Tema desconocido.' };
  const db = await supabase();
  const { data, error } = await db.from('fichas').update({ actividad, tema_id: tema }).eq('id', fichaId).select('id').maybeSingle();
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data) return SIN_PERMISO;
  refresh();
  return { ok: true, mensaje: 'Guardado.' };
}

export async function retirarFicha(fichaId: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('validador', 'admin');
  if (!yo || !UUID.test(fichaId)) return SIN_PERMISO;
  const motivo = leer(datos, 'motivo').slice(0, 600);
  if (motivo.length < 5) return { mensaje: 'Escribí el motivo del retiro.' };
  const db = await supabase();
  const { error } = await db.from('fichas').update({ estado: 'retirada', motivo_retiro: motivo }).eq('id', fichaId);
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: 'Ficha retirada: ya no la usa el asistente.' };
}

// ---------------------------------------------------------------------
// Citas
// ---------------------------------------------------------------------
function datosDeCita(datos: FormData) {
  return {
    pasaje: texto(datos, 'pasaje', 600),
    pasaje_textual: datos.get('textual') === 'on',
    ubicacion: texto(datos, 'ubicacion', 120),
    parafrasis: texto(datos, 'parafrasis', 600),
  };
}

export async function agregarCita(versionId: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(versionId)) return SIN_PERMISO;
  const db = await supabase();
  const origen = leer(datos, 'origen');
  let publicacion_id: string | null = null;
  let fuente_id: string | null = null;

  if (origen === 'publicacion') {
    publicacion_id = leer(datos, 'publicacion');
    if (!UUID.test(publicacion_id)) return { mensaje: 'Elegí la publicación.' };
  } else if (origen === 'fuente') {
    fuente_id = leer(datos, 'fuente');
    if (!UUID.test(fuente_id)) return { mensaje: 'Elegí la fuente.' };
  } else if (origen === 'nueva') {
    const tipo = leer(datos, 'tipo');
    const cita = texto(datos, 'cita', 600);
    const url = leer(datos, 'url');
    const anio = leer(datos, 'anio');
    if (!['libro', 'sitio', 'comunicacion', 'material_docente', 'otro'].includes(tipo)) return { mensaje: 'Elegí el tipo de fuente.' };
    if (cita.length < 3) return { mensaje: 'Escribí la cita de la fuente (autor, título, año…).' };
    if (url && !/^https:\/\/\S{1,490}$/.test(url)) return { mensaje: 'El enlace tiene que empezar con https://' };
    if (anio && !/^\d{4}$/.test(anio)) return { mensaje: 'El año va con 4 números.' };
    const { data, error } = await db
      .from('fuentes')
      .insert({ tipo, cita, url: url || null, anio: anio ? Number(anio) : null, es_del_instituto: datos.get('del_instituto') === 'on' })
      .select('id')
      .single();
    if (error || !data) return { mensaje: mensajeDeError(error) };
    fuente_id = data.id;
  } else {
    return { mensaje: 'Elegí de dónde sale la cita.' };
  }

  const { count } = await db.from('version_fuentes').select('id', { count: 'exact', head: true }).eq('version_id', versionId);
  const { error } = await db.from('version_fuentes').insert({ version_id: versionId, publicacion_id, fuente_id, orden: count ?? 0, ...datosDeCita(datos) });
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: 'Cita agregada.' };
}

export async function actualizarCita(citaId: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(citaId)) return SIN_PERMISO;
  const db = await supabase();
  const { data, error } = await db.from('version_fuentes').update(datosDeCita(datos)).eq('id', citaId).select('id').maybeSingle();
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data) return SIN_PERMISO;
  refresh();
  return { ok: true, mensaje: 'Cita guardada.' };
}

export async function quitarCita(citaId: string): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(citaId)) return SIN_PERMISO;
  const db = await supabase();
  const { data, error } = await db.from('version_fuentes').delete().eq('id', citaId).select('id');
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data?.length) return SIN_PERMISO;
  refresh();
  return { ok: true, mensaje: 'Cita quitada.' };
}

// ---------------------------------------------------------------------
// Revisión (solo validadoras; la base exige la huella de lo que se ve)
// ---------------------------------------------------------------------
export async function revisarVersion(versionId: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('validador');
  if (!yo || !UUID.test(versionId)) return { mensaje: 'Solo una validadora revisa.' };
  const decision = leer(datos, 'decision');
  const comentario = texto(datos, 'comentario', 2000);
  const huella = leer(datos, 'huella');
  if (!['aprobar', 'pedir_cambios', 'rechazar'].includes(decision)) return { mensaje: 'Elegí una decisión.' };
  if (!/^[0-9a-f]{64}$/.test(huella)) return { mensaje: 'Volvé a cargar la página: falta la huella del texto.' };
  if (decision !== 'aprobar' && comentario.length < 5) return { mensaje: 'Para pedir cambios o rechazar, escribí un comentario.' };

  // Artículos citados que esperan revisión, con la huella que la validadora tiene en pantalla
  let articulos: Record<string, string> = {};
  try {
    const crudo = JSON.parse(leer(datos, 'articulos') || '{}') as unknown;
    if (crudo && typeof crudo === 'object' && !Array.isArray(crudo)) {
      articulos = Object.fromEntries(
        Object.entries(crudo as Record<string, unknown>).filter(([k, h]) => UUID.test(k) && typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)),
      ) as Record<string, string>;
    }
  } catch {
    return { mensaje: 'Volvé a cargar la página: faltan los datos de los artículos.' };
  }

  const db = await supabase();
  const { error } =
    decision === 'aprobar' && Object.keys(articulos).length
      ? // Ficha y artículos juntos, en una sola transacción (migración 15)
        await db.rpc('aprobar_con_articulos', { p_version: versionId, p_huella: huella, p_articulos: articulos, p_comentario: comentario })
      : await db.from('revisiones').insert({ objeto: 'ficha_version', objeto_id: versionId, decision, comentario, huella_revisada: huella });
  if (error) return { mensaje: mensajeDeError(error) };

  const { data: v } = await db.from('ficha_versiones').select('ficha_id, asistida_por_ia').eq('id', versionId).maybeSingle();
  // Una respuesta de la IA rechazada: sus artículos que nadie más cita salen de la fila de revisión
  if (decision === 'rechazar' && v?.asistida_por_ia) await devolverArticulosSueltos(versionId);
  const volver = leer(datos, 'volver');
  if (volver === '/equipo/respuestas') redirect(`/equipo/respuestas?revisada=${decision}`);
  redirect(v ? `/equipo/fichas/${v.ficha_id}?revisada=${decision}` : '/equipo/revisar');
}

/** Vuelve a candidatos los artículos en revisión que solo citaba esta versión (con la sesión de la validadora). */
async function devolverArticulosSueltos(versionId: string) {
  const db = await supabase();
  const { data: propias } = await db.from('version_fuentes').select('publicacion_id').eq('version_id', versionId).not('publicacion_id', 'is', null);
  const ids = [...new Set((propias ?? []).map((c) => c.publicacion_id as string))];
  if (!ids.length) return;
  const { data: otras } = await db
    .from('version_fuentes')
    .select('publicacion_id, ficha_versiones!inner(estado)')
    .in('publicacion_id', ids)
    .neq('version_id', versionId)
    .in('ficha_versiones.estado', ['borrador', 'en_revision', 'publicada']);
  const citadas = new Set((otras ?? []).map((c) => c.publicacion_id as string));
  const sueltas = ids.filter((id) => !citadas.has(id));
  if (sueltas.length) await db.from('publicaciones').update({ estado: 'candidata' }).in('id', sueltas).eq('estado', 'en_revision');
}
