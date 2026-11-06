import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugDe } from '@/lib/equipo/comun';
import { mensajeDeError } from '@/datos/errores';
import { buscarEuropePmc, buscarOpenAlex } from '@/lib/ciencia/proveedores';
import type { Registro } from '@/lib/ciencia/normalizar';
import { MODELO_RAPIDO, MODELO_REDACCION, pedirJson, type Uso } from './openai';
import {
  DESCRIPCION_ACTIVIDAD,
  ESQUEMA_CONSULTAS,
  ESQUEMA_PREGUNTAS,
  ESQUEMA_REDACCION,
  INSTRUCCIONES_CONSULTAS,
  INSTRUCCIONES_PREGUNTAS,
  citaContraResumen,
  elegirArticulos,
  instruccionesRedaccion,
  revisarSalida,
  textoDeArticulos,
  type Borrador,
  type Candidato,
  type Politica,
  type SalidaRedaccion,
} from './redaccion';

/*
  REDACTORA AUTOMÁTICA (solo servidor). Para cada pregunta:
    1. arma búsquedas en inglés (modelo rápido);
    2. busca en OpenAlex y Europe PMC y elige hasta 6 artículos con resumen;
    3. redacta la respuesta citando oraciones numeradas (modelo de redacción),
       con un reintento si se pasa de palabras o las citas no sirven;
    4. guarda los artículos en la biblioteca (clave secreta, como el botón
       "Agregar") y los manda a revisión con la sesión de quien lo pidió;
    5. crea la ficha marcada "asistida por IA", con cada cita comprobada
       contra el resumen guardado, y la manda a revisión.
  Todo lo que escribe en fichas y citas va con la sesión del miembro: deciden
  las reglas de la base, igual que si lo hiciera a mano.
*/
export type Resultado = {
  pregunta: string;
  ok: boolean;
  mensaje: string;
  fichaId?: string;
  enRevision?: boolean;
  uso?: Uso;
};

type Contexto = { db: SupabaseClient; admin: SupabaseClient; actorId: string; actividad: string | null };
const sumar = (a: Uso, b?: Uso): Uso => ({ entrada: a.entrada + (b?.entrada ?? 0), salida: a.salida + (b?.salida ?? 0) });

async function consultasPara(pregunta: string, actividad: string | null) {
  const r = await pedirJson<{ consultas: string[] }>({
    modelo: MODELO_RAPIDO,
    instrucciones: INSTRUCCIONES_CONSULTAS,
    entrada: `Pregunta: ${pregunta}${actividad ? `\nTema de la actividad: ${DESCRIPCION_ACTIVIDAD[actividad] ?? ''}` : ''}`,
    nombre: 'consultas',
    esquema: ESQUEMA_CONSULTAS,
    maxTokens: 1500,
    segundos: 40,
  });
  if (!r.ok) return { consultas: [] as string[], error: r.error };
  const consultas = [...new Set((r.datos.consultas ?? []).map((c) => String(c).replace(/["'()]/g, ' ').replace(/\s+/g, ' ').trim()).filter((c) => c.length >= 3 && c.length <= 120))].slice(0, 3);
  return { consultas, uso: r.uso };
}

async function buscar(consultas: string[]) {
  const pedidos = consultas.flatMap((texto) => [buscarOpenAlex({ texto, max: 8 }), buscarEuropePmc({ texto, max: 8 })]);
  const respuestas = await Promise.all(pedidos);
  return elegirArticulos(respuestas.map((r) => r.registros));
}

async function redactar(pregunta: string, actividad: string | null, cs: Candidato[]) {
  const base = `Pregunta: ${pregunta}${actividad ? `\nActividad: ${DESCRIPCION_ACTIVIDAD[actividad] ?? ''}` : ''}\n\nArtículos (resúmenes divididos en oraciones numeradas):\n\n${textoDeArticulos(cs)}`;
  let uso: Uso = { entrada: 0, salida: 0 };
  let entrada = base;
  for (let intento = 1; intento <= 2; intento++) {
    const r = await pedirJson<SalidaRedaccion>({
      modelo: MODELO_REDACCION,
      instrucciones: instruccionesRedaccion(),
      entrada,
      nombre: 'respuesta',
      esquema: ESQUEMA_REDACCION,
      maxTokens: 8000,
      segundos: 120,
    });
    if (!r.ok) return { ok: false as const, motivo: r.error, uso };
    uso = sumar(uso, r.uso);
    const revision = revisarSalida(r.datos, cs);
    if (revision.ok) return { ok: true as const, borrador: revision.borrador, avisos: revision.avisos, uso, modelo: r.modelo };
    if (!revision.reintentar || intento === 2) return { ok: false as const, motivo: revision.motivo, uso };
    entrada = `${base}\n\nTu respuesta anterior no sirvió: ${revision.motivo}. Corregilo y respondé de nuevo siguiendo todas las reglas.`;
  }
  return { ok: false as const, motivo: 'no se pudo redactar', uso };
}

type Guardada = { id: string; estado: string; resumen_interno: string | null; licencia_codigo: string | null };

/** Guarda el artículo en la biblioteca (o lo encuentra si ya estaba) y lo deja listo para citar. */
async function guardarArticulo(c: Contexto, registros: Registro[]): Promise<{ pub?: Guardada; error?: string }> {
  let id: string | null = null;
  // OpenAlex primero y Europe PMC después: así queda el resumen de Europe PMC, el que vio el modelo
  for (const r of [...registros].sort((a, b) => (a.proveedor === 'openalex' ? -1 : 1) - (b.proveedor === 'openalex' ? -1 : 1))) {
    const { data, error } = await c.admin.rpc('guardar_registro', { p_registro: r, p_ejecucion: null, p_actor: c.actorId });
    if (error) return { error: mensajeDeError(error, 'no se pudo guardar un artículo') };
    id ??= (data as { publicacion_id?: string })?.publicacion_id ?? null;
  }
  if (!id) return { error: 'no se pudo guardar un artículo' };
  const senales = registros.filter((r) => r.licencia).map((r) => ({ origen: r.proveedor, texto: r.licencia }));
  const { error: errorLicencia } = await c.admin.rpc('registrar_licencia', { p_publicacion: id, p_senales: senales, p_actor: c.actorId });
  if (errorLicencia) console.error('[ia] licencia:', errorLicencia.code);

  const { data: pub } = await c.db.from('publicaciones').select('id, estado, resumen_interno, licencia_codigo').eq('id', id).maybeSingle<Guardada>();
  if (!pub) return { error: 'no se pudo leer un artículo guardado' };
  if (pub.estado === 'candidata') {
    const { error } = await c.db.from('publicaciones').update({ estado: 'en_revision' }).eq('id', id);
    if (error) return { error: mensajeDeError(error) };
    pub.estado = 'en_revision';
  }
  return { pub };
}

async function crearFicha(c: Contexto, b: Borrador, nota: string): Promise<{ fichaId?: string; versionId?: string; error?: string }> {
  const base = slugDe(b.pregunta) || 'respuesta';
  let fichaId: string | null = null;
  for (let intento = 1; intento <= 8 && !fichaId; intento++) {
    const slug = intento === 1 ? base : `${base.slice(0, 55)}-${intento}`;
    const { data, error } = await c.db.from('fichas').insert({ slug, formato: 'pregunta', actividad: c.actividad }).select('id').single();
    if (data) fichaId = data.id;
    else if (!/duplicate key/i.test(error?.message ?? '')) return { error: mensajeDeError(error) };
  }
  if (!fichaId) return { error: 'ya hay varias fichas con esa pregunta' };
  const { data: v, error } = await c.db
    .from('ficha_versiones')
    .insert({
      ficha_id: fichaId,
      pregunta: b.pregunta,
      variantes: b.variantes,
      explicacion_cientifica: b.explicacion_cientifica,
      version_infantil: b.version_infantil,
      asistida_por_ia: true,
      nota_interna: nota.slice(0, 2000),
    })
    .select('id')
    .single();
  if (error || !v) return { fichaId, error: mensajeDeError(error, 'no se pudo crear la versión') };
  return { fichaId, versionId: v.id };
}

export async function responderPregunta(c: Contexto, pregunta: string): Promise<Resultado> {
  const q = await consultasPara(pregunta, c.actividad);
  if (q.error) return { pregunta, ok: false, mensaje: `No se pudo preparar la búsqueda: ${q.error}.` };
  if (!q.consultas.length) return { pregunta, ok: false, mensaje: 'No parece una pregunta de ciencia. Probá escribirla de otra manera.', uso: q.uso };
  const candidatos = await buscar(q.consultas);
  if (!candidatos.length) return { pregunta, ok: false, mensaje: `No encontré artículos con resumen (busqué: ${q.consultas.join(' · ')}).`, uso: q.uso };

  const red = await redactar(pregunta, c.actividad, candidatos);
  const uso = sumar(q.uso ?? { entrada: 0, salida: 0 }, red.uso);
  if (!red.ok) return { pregunta, ok: false, mensaje: `No la redacté: ${red.motivo}.`, uso };

  // Artículos: guardar los citados y comprobar cada cita contra el resumen guardado
  const { data: politicas } = await c.db.from('licencias').select('codigo, pasaje');
  const politicaDe = (codigo: string | null): Politica =>
    ((politicas ?? []).find((l: { codigo: string; pasaje: Politica }) => l.codigo === codigo)?.pasaje ?? 'solo_ubicacion') as Politica;
  const citas: { publicacion_id: string; pasaje: string; pasaje_textual: boolean; ubicacion: string; parafrasis: string; orden: number }[] = [];
  const descartes: string[] = [...red.avisos];
  for (const cita of red.borrador.citas) {
    const art = candidatos[cita.articulo];
    const { pub, error } = await guardarArticulo(c, art.registros);
    if (!pub) {
      descartes.push(`"${art.principal.titulo.slice(0, 60)}…": ${error}`);
      continue;
    }
    if (pub.estado !== 'en_revision' && pub.estado !== 'aprobada') {
      descartes.push(`"${art.principal.titulo.slice(0, 60)}…" está ${pub.estado} en la biblioteca`);
      continue;
    }
    const lista = citaContraResumen(cita.frases, pub.resumen_interno, politicaDe(pub.licencia_codigo), cita.parafrasis);
    if (!lista) {
      descartes.push(`"${art.principal.titulo.slice(0, 60)}…": la oración citada no está tal cual en el resumen guardado`);
      continue;
    }
    if (citas.some((x) => x.publicacion_id === pub.id)) continue;
    citas.push({ publicacion_id: pub.id, ...lista, orden: citas.length + 1 });
  }
  if (!citas.length) return { pregunta, ok: false, mensaje: `No la guardé: ninguna cita pasó el control (${descartes.join('; ')}).`, uso };

  const fecha = new Date().toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' });
  const nota = [
    `Redactada con IA (${red.modelo}) el ${fecha}. Revisá cada idea contra la oración del artículo que la respalda.`,
    `Pregunta pedida: ${pregunta}`,
    `Búsquedas: ${q.consultas.join(' · ')}`,
    ...red.borrador.citas.map((x) => (x.respalda ? `A${x.articulo + 1} respalda: ${x.respalda}` : '')).filter(Boolean),
    descartes.length ? `Descartado por el control: ${descartes.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const f = await crearFicha(c, red.borrador, nota);
  if (!f.versionId) return { pregunta, ok: false, mensaje: `No se pudo crear la ficha: ${f.error}.`, fichaId: f.fichaId, uso };

  const { error: errorCitas } = await c.db.from('version_fuentes').insert(citas.map((x) => ({ version_id: f.versionId, ...x })));
  if (errorCitas) return { pregunta, ok: true, fichaId: f.fichaId, enRevision: false, uso, mensaje: `Quedó en borrador sin fuentes: ${mensajeDeError(errorCitas)}.` };

  const { error: errorEnvio } = await c.db.from('ficha_versiones').update({ estado: 'en_revision' }).eq('id', f.versionId);
  if (errorEnvio) return { pregunta, ok: true, fichaId: f.fichaId, enRevision: false, uso, mensaje: `Quedó en borrador: ${mensajeDeError(errorEnvio)}.` };
  return { pregunta, ok: true, fichaId: f.fichaId, enRevision: true, uso, mensaje: `Lista y esperando revisión, con ${citas.length} ${citas.length === 1 ? 'fuente' : 'fuentes'}.` };
}

/** Ideas de preguntas para una actividad (sin guardar nada). */
export async function proponer(actividad: string, enfoque: string, existentes: string[]) {
  const r = await pedirJson<{ preguntas: string[] }>({
    modelo: MODELO_RAPIDO,
    instrucciones: INSTRUCCIONES_PREGUNTAS,
    entrada: [
      `Actividad: ${DESCRIPCION_ACTIVIDAD[actividad] ?? actividad}`,
      enfoque ? `Enfoque pedido por el equipo: ${enfoque}` : '',
      existentes.length ? `Ya existen (no las repitas):\n${existentes.slice(0, 60).map((p) => `- ${p}`).join('\n')}` : '',
      'Proponé 8 preguntas.',
    ]
      .filter(Boolean)
      .join('\n\n'),
    nombre: 'preguntas',
    esquema: ESQUEMA_PREGUNTAS,
    maxTokens: 2000,
    segundos: 40,
  });
  if (!r.ok) return { error: r.error, preguntas: [] as string[] };
  const vistas = new Set(existentes.map((p) => slugDe(p)));
  const preguntas = [...new Set((r.datos.preguntas ?? []).map((p) => String(p).replace(/\s+/g, ' ').trim()).filter((p) => p.length >= 8 && p.length <= 200 && !vistas.has(slugDe(p))))].slice(0, 10);
  return { preguntas };
}
