'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { miembroCon } from '@/datos/equipo';
import { mensajeDeError } from '@/datos/errores';
import { yaEnBiblioteca } from '@/datos/biblioteca';
import { claveDe, type Proveedor, type Registro } from '@/lib/ciencia/normalizar';
import { buscarEuropePmc, buscarOpenAlex, obtener, porDoiEnLaOtra, type Consulta, type Respuesta } from '@/lib/ciencia/proveedores';

/*
  ACCIONES DE LA BIBLIOTECA CIENTÍFICA (Server Actions del equipo).

  · Buscar NO guarda: consulta OpenAlex y Europe PMC en vivo y solo anota la
    consulta en la bitácora (ejecuciones_busqueda, sin la clave).
  · Agregar: el navegador manda solo la fuente y el id. El servidor vuelve a
    pedir el registro a la fuente (no se confía en lo que muestra la
    pantalla), lo completa con la otra fuente por DOI y lo guarda con
    guardar_registro() y registrar_licencia(), que solo puede llamar el
    servidor (clave secreta) y siempre con el miembro que lo pidió.
  · El resto (mandar a revisión, revisar, retirar, relaciones, temas) va con
    la sesión del miembro: deciden las reglas de la base.
*/
export type Estado = { mensaje: string; ok?: boolean };

export type Resultado = {
  clave: string;
  titulo: string;
  anio: number | null;
  revista: string;
  autores: string;
  tipo: Registro['tipo'];
  doi: string;
  fuentes: { proveedor: Proveedor; id_externo: string }[];
  abierto: boolean;
  licencia: string;
  retractada: boolean;
  del_instituto: boolean;
  resumen: string;
  enBiblioteca: { id: string; estado: string } | null;
};
export type EstadoBusqueda = Estado & { resultados?: Resultado[]; totales?: Partial<Record<Proveedor, number>>; avisos?: string[]; consulta?: Record<string, string> };

const SIN_PERMISO: Estado = { mensaje: 'No tenés permiso para hacer eso.' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const supabase = async () => (await crearClienteServidor())!;
const NOMBRE_FUENTE: Record<Proveedor, string> = { openalex: 'OpenAlex', europepmc: 'Europe PMC' };

// ---------------------------------------------------------------------
// Buscar en vivo
// ---------------------------------------------------------------------
export async function buscarPublicaciones(_p: EstadoBusqueda, datos: FormData): Promise<EstadoBusqueda> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  const texto = leer(datos, 'q');
  const desde = Number(leer(datos, 'desde')) || undefined;
  const hasta = Number(leer(datos, 'hasta')) || undefined;
  const consulta = { q: texto, desde: leer(datos, 'desde'), hasta: leer(datos, 'hasta'), abierto: leer(datos, 'abierto'), instituto: leer(datos, 'instituto') };
  if (texto.length < 3 || texto.length > 300) return { mensaje: 'Escribí qué buscar (de 3 a 300 letras), en inglés si podés: casi todo está en inglés.', consulta };
  for (const a of [desde, hasta]) if (a !== undefined && !(Number.isInteger(a) && a >= 1800 && a <= 2100)) return { mensaje: 'Revisá los años.', consulta };

  const c: Consulta = { texto, desde, hasta, soloAbierto: consulta.abierto === 'on', soloInstituto: consulta.instituto === 'on', max: 15 };
  const respuestas = await Promise.all([buscarOpenAlex(c), buscarEuropePmc(c)]);
  await anotarEjecuciones(respuestas, yo.id);

  // Juntar el mismo trabajo de las dos fuentes (por DOI)
  const porClave = new Map<string, Resultado>();
  for (const r of respuestas.flatMap((x) => x.registros)) {
    const clave = claveDe(r);
    const ya = porClave.get(clave);
    if (ya) {
      ya.fuentes.push({ proveedor: r.proveedor, id_externo: r.id_externo });
      ya.abierto ||= r.oa_estado !== '' && r.oa_estado !== 'closed';
      ya.licencia ||= r.licencia;
      ya.retractada ||= r.retractada;
      ya.del_instituto ||= r.del_instituto;
      if (!ya.resumen && r.resumen) ya.resumen = r.resumen.slice(0, 600);
      continue;
    }
    porClave.set(clave, {
      clave,
      titulo: r.titulo,
      anio: r.anio,
      revista: r.revista,
      autores: r.autores.slice(0, 3).map((a) => a.nombre).join(', ') + (r.autores.length > 3 ? ' y otros' : ''),
      tipo: r.tipo,
      doi: r.identificadores.doi ?? '',
      fuentes: [{ proveedor: r.proveedor, id_externo: r.id_externo }],
      abierto: r.oa_estado !== '' && r.oa_estado !== 'closed',
      licencia: r.licencia,
      retractada: r.retractada,
      del_instituto: r.del_instituto,
      resumen: (r.resumen ?? '').slice(0, 600),
      enBiblioteca: null,
    });
  }
  const resultados = [...porClave.values()];

  // Marcar lo que ya está en la biblioteca
  const pares = resultados.flatMap((r) => [
    ...(r.doi ? [{ tipo: 'doi', valor: r.doi }] : []),
    ...r.fuentes.map((f) => ({ tipo: f.proveedor, valor: f.id_externo })),
  ]);
  const ya = await yaEnBiblioteca(pares);
  for (const r of resultados) {
    r.enBiblioteca = (r.doi && ya.get(`doi:${r.doi}`)) || r.fuentes.map((f) => ya.get(`${f.proveedor}:${f.id_externo}`)).find(Boolean) || null;
  }

  const avisos = respuestas.filter((x) => x.error).map((x) => `${NOMBRE_FUENTE[x.proveedor]} no respondió (${x.error}).`);
  return {
    mensaje: resultados.length ? '' : 'No apareció nada. Probá con otras palabras, en inglés.',
    ok: true,
    resultados,
    totales: Object.fromEntries(respuestas.map((x) => [x.proveedor, x.total])),
    avisos,
    consulta,
  };
}

async function anotarEjecuciones(respuestas: Respuesta[], miembroId: string) {
  const admin = crearClienteAdmin();
  if (!admin) return;
  const ahora = new Date().toISOString();
  await admin.from('ejecuciones_busqueda').insert(
    respuestas.map((r) => ({
      proveedor: r.proveedor,
      consulta_enviada: r.consultaEnviada.slice(0, 2000),
      pedida_por: miembroId,
      estado: r.error ? 'error' : 'ok',
      recibidos: r.registros.length,
      costo_usd: r.costoUsd,
      error: r.error ?? null,
      terminada_en: ahora,
    })),
  );
}

// ---------------------------------------------------------------------
// Agregar a la biblioteca (como candidata)
// ---------------------------------------------------------------------
export async function agregarPublicacion(proveedor: string, idExterno: string): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (proveedor !== 'openalex' && proveedor !== 'europepmc') return { mensaje: 'Fuente desconocida.' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta en el servidor (SUPABASE_SECRET_KEY).' };

  // Se vuelve a pedir a la fuente: no se guarda lo que manda el navegador
  const principal = await obtener(proveedor, idExterno);
  if (!principal) return { mensaje: `${NOMBRE_FUENTE[proveedor]} no devolvió ese trabajo. Probá de nuevo en un rato.` };
  const otra = principal.identificadores.doi ? await porDoiEnLaOtra(proveedor, principal.identificadores.doi) : null;

  let publicacionId: string | null = null;
  for (const registro of [principal, otra].filter((r): r is Registro => r !== null)) {
    const { data, error } = await admin.rpc('guardar_registro', { p_registro: registro, p_ejecucion: null, p_actor: yo.id });
    if (error) return { mensaje: mensajeDeError(error, 'No se pudo guardar la publicación.') };
    publicacionId ??= (data as { publicacion_id?: string })?.publicacion_id ?? null;
  }
  if (!publicacionId) return { mensaje: 'No se pudo guardar la publicación.' };

  const senales = [principal, otra]
    .filter((r): r is Registro => r !== null && r.licencia !== '')
    .map((r) => ({ origen: r.proveedor, texto: r.licencia }));
  const { error: errorLicencia } = await admin.rpc('registrar_licencia', { p_publicacion: publicacionId, p_senales: senales, p_actor: yo.id });
  if (errorLicencia) console.error('[biblioteca] licencia:', errorLicencia.code);
  redirect(`/equipo/biblioteca/${publicacionId}`);
}

// ---------------------------------------------------------------------
// Estado de una publicación
// ---------------------------------------------------------------------
async function cambiarEstado(id: string, estado: 'en_revision' | 'candidata'): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(id)) return SIN_PERMISO;
  const db = await supabase();
  const { data, error } = await db.from('publicaciones').update({ estado }).eq('id', id).select('id').maybeSingle();
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data) return SIN_PERMISO;
  refresh();
  return { ok: true, mensaje: estado === 'en_revision' ? 'Enviada a revisión.' : 'Volvió a candidata.' };
}
export async function enviarPublicacion(id: string) {
  return cambiarEstado(id, 'en_revision');
}
export async function sacarDeRevision(id: string) {
  return cambiarEstado(id, 'candidata');
}

export async function revisarPublicacion(id: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('validador');
  if (!yo || !UUID.test(id)) return { mensaje: 'Solo una validadora revisa.' };
  const decision = leer(datos, 'decision');
  const comentario = leer(datos, 'comentario').slice(0, 2000);
  const huella = leer(datos, 'huella');
  if (!['aprobar', 'pedir_cambios', 'rechazar'].includes(decision)) return { mensaje: 'Elegí una decisión.' };
  if (!/^[0-9a-f]{64}$/.test(huella)) return { mensaje: 'Volvé a cargar la página: falta la huella.' };
  if (decision !== 'aprobar' && comentario.length < 5) return { mensaje: 'Para pedir cambios o rechazar, escribí un comentario.' };
  const db = await supabase();
  const { error } = await db.from('revisiones').insert({ objeto: 'publicacion', objeto_id: id, decision, comentario, huella_revisada: huella });
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: decision === 'aprobar' ? 'Aprobada como fuente: ya se puede citar.' : decision === 'rechazar' ? 'Rechazada.' : 'Volvió a candidata con tu comentario.' };
}

export async function retirarPublicacion(id: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('validador', 'admin');
  if (!yo || !UUID.test(id)) return SIN_PERMISO;
  const motivo = leer(datos, 'motivo').slice(0, 600);
  if (motivo.length < 5) return { mensaje: 'Escribí el motivo del retiro.' };
  const db = await supabase();
  const { error } = await db.from('publicaciones').update({ estado: 'retirada', motivo_retiro: motivo }).eq('id', id);
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: 'Retirada. Las fichas que la tenían como única fuente también se retiraron.' };
}

/** Licencia fijada a mano (después de mirar la página de la revista). Solo validadora o admin. */
export async function fijarLicencia(id: string, _p: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('validador', 'admin');
  if (!yo || !UUID.test(id)) return SIN_PERMISO;
  const codigo = leer(datos, 'licencia');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(codigo)) return { mensaje: 'Elegí una licencia.' };
  // Que la publicación exista y la vea este miembro (RLS) antes de usar la clave secreta
  const db = await supabase();
  const { data: p } = await db.from('publicaciones').select('id').eq('id', id).maybeSingle();
  if (!p) return SIN_PERMISO;
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta en el servidor (SUPABASE_SECRET_KEY).' };
  const { error } = await admin.rpc('registrar_licencia', { p_publicacion: id, p_senales: [{ origen: 'manual', texto: codigo }], p_actor: yo.id });
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: 'Licencia fijada. Lo automático ya no la cambia.' };
}

export async function resolverRelacion(relacionId: string, estado: 'confirmada' | 'descartada'): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(relacionId) || !['confirmada', 'descartada'].includes(estado)) return SIN_PERMISO;
  const db = await supabase();
  const { data, error } = await db.from('publicacion_relaciones').update({ estado }).eq('id', relacionId).select('id').maybeSingle();
  if (error) return { mensaje: mensajeDeError(error) };
  if (!data) return SIN_PERMISO;
  refresh();
  return { ok: true, mensaje: estado === 'descartada' ? 'Descartado: no son la misma.' : 'Marcadas como la misma publicación.' };
}
