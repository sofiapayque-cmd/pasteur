import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugDe } from '@/lib/equipo/comun';
import { mensajeDeError } from '@/datos/errores';
import { buscarEuropePmc, buscarOpenAlex, buscarPubMed, ORDEN_GUARDADO } from '@/lib/ciencia/proveedores';
import type { Registro } from '@/lib/ciencia/normalizar';
import { MODELO_RAPIDO, MODELO_REDACCION, pedirJson, type Uso } from './openai';
import {
  DESCRIPCION_ACTIVIDAD,
  candidatosDeGuardados,
  faltanteDe,
  MARCA_BUSCO,
  notaSinFaltante,
  pedidoDeCorreccion,
  type PublicacionGuardada,
  ESQUEMA_CONSULTAS,
  ESQUEMA_PREGUNTAS,
  ESQUEMA_REDACCION,
  INSTRUCCIONES_CONSULTAS,
  INSTRUCCIONES_PREGUNTAS,
  citaContraResumen,
  elegirArticulos,
  instruccionesCuriosidad,
  instruccionesRedaccion,
  LIMITE_DATO,
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
    2. busca en PubMed (la fuente principal), OpenAlex y Europe PMC y elige
       hasta 8 artículos con resumen;
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
/** Qué se redacta: una respuesta (por defecto) o una curiosidad (ficha "dato") de un tema. */
type Modo = { formato: 'pregunta' } | { formato: 'dato'; temaId: string; tema: string; existentes: string[] };
const RESPUESTA: Modo = { formato: 'pregunta' };
const sumar = (a: Uso, b?: Uso): Uso => ({ entrada: a.entrada + (b?.entrada ?? 0), salida: a.salida + (b?.salida ?? 0) });

async function consultasPara(pregunta: string, actividad: string | null, falta = '') {
  const r = await pedirJson<{ consultas: string[] }>({
    modelo: MODELO_RAPIDO,
    instrucciones: INSTRUCCIONES_CONSULTAS,
    entrada: `Pregunta: ${pregunta}${falta ? `\nLo que hay que agregar o corregir (las búsquedas tienen que encontrar esto): ${falta.slice(0, 800)}` : ''}${actividad ? `\nTema de la actividad: ${DESCRIPCION_ACTIVIDAD[actividad] ?? ''}` : ''}`,
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
  // Cada consulta en las tres fuentes, y la primera (el concepto central) también solo entre revisiones,
  // que son las que explican lo básico. elegirArticulos les da más peso a las revisiones y a lo que está en PubMed.
  const pedidos = [
    buscarPubMed({ texto: consultas[0], max: 8, soloRevisiones: true }),
    buscarOpenAlex({ texto: consultas[0], max: 8, soloRevisiones: true }),
    buscarEuropePmc({ texto: consultas[0], max: 8, soloRevisiones: true }),
    ...consultas.flatMap((texto) => [buscarPubMed({ texto, max: 8 }), buscarOpenAlex({ texto, max: 8 }), buscarEuropePmc({ texto, max: 8 })]),
  ];
  const respuestas = await Promise.all(pedidos);
  return elegirArticulos(respuestas.map((r) => r.registros));
}

async function redactar(pregunta: string, actividad: string | null, cs: Candidato[], modo: Modo = RESPUESTA, extra = '') {
  const pedido =
    modo.formato === 'dato'
      ? `Tema de la curiosidad: ${modo.tema}${modo.existentes.length ? `\nCuriosidades que ya existen (no las repitas):\n${modo.existentes.slice(0, 30).map((e) => `- ${e}`).join('\n')}` : ''}`
      : `Pregunta: ${pregunta}`;
  const base = `${pedido}${actividad ? `\nActividad: ${DESCRIPCION_ACTIVIDAD[actividad] ?? ''}` : ''}${extra ? `\n\n${extra}` : ''}\n\nArtículos (resúmenes divididos en oraciones numeradas):\n\n${textoDeArticulos(cs)}`;
  let uso: Uso = { entrada: 0, salida: 0 };
  let entrada = base;
  for (let intento = 1; intento <= 2; intento++) {
    const r = await pedirJson<SalidaRedaccion>({
      modelo: MODELO_REDACCION,
      instrucciones: modo.formato === 'dato' ? instruccionesCuriosidad() : instruccionesRedaccion(),
      entrada,
      nombre: 'respuesta',
      esquema: ESQUEMA_REDACCION,
      maxTokens: 8000,
      segundos: 120,
    });
    if (!r.ok) return { ok: false as const, motivo: r.error, uso };
    uso = sumar(uso, r.uso);
    const revision = modo.formato === 'dato' ? revisarSalida(r.datos, cs, LIMITE_DATO) : revisarSalida(r.datos, cs);
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
  // OpenAlex primero, Europe PMC y PubMed al final: así queda guardado el resumen que vio el modelo
  // (el de PubMed si está; si no, el de Europe PMC; si no, el de OpenAlex)
  for (const r of [...registros].sort((a, b) => ORDEN_GUARDADO[a.proveedor] - ORDEN_GUARDADO[b.proveedor])) {
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

async function crearFicha(c: Contexto, b: Borrador, nota: string, modo: Modo = RESPUESTA): Promise<{ fichaId?: string; versionId?: string; error?: string }> {
  const base = (modo.formato === 'dato' ? slugDe(`dato ${b.pregunta}`) : slugDe(b.pregunta)) || (modo.formato === 'dato' ? 'curiosidad' : 'respuesta');
  let fichaId: string | null = null;
  for (let intento = 1; intento <= 8 && !fichaId; intento++) {
    const slug = intento === 1 ? base : `${base.slice(0, 55)}-${intento}`;
    const fila: { slug: string; formato: string; actividad: string | null; tema_id: string | null } = {
      slug,
      formato: modo.formato,
      actividad: c.actividad,
      tema_id: modo.formato === 'dato' ? modo.temaId : null,
    };
    const { data, error } = await c.db.from('fichas').insert(fila).select('id').single();
    if (data) fichaId = data.id;
    else if (!/duplicate key/i.test(error?.message ?? '')) return { error: mensajeDeError(error) };
  }
  if (!fichaId) return { error: 'ya hay varias fichas con esa pregunta' };
  const { data: v, error } = await c.db
    .from('ficha_versiones')
    .insert({
      ficha_id: fichaId,
      pregunta: b.pregunta,
      variantes: modo.formato === 'dato' ? [] : b.variantes,
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

export async function responderPregunta(c: Contexto, pregunta: string, modo: Modo = RESPUESTA): Promise<Resultado> {
  const q = await consultasPara(pregunta, c.actividad);
  if (q.error) return { pregunta, ok: false, mensaje: `No se pudo preparar la búsqueda: ${q.error}.` };
  if (!q.consultas.length) return { pregunta, ok: false, mensaje: 'No parece una pregunta de ciencia. Probá escribirla de otra manera.', uso: q.uso };
  const candidatos = await buscar(q.consultas);
  if (!candidatos.length) return { pregunta, ok: false, mensaje: `No encontré artículos con resumen (busqué: ${q.consultas.join(' · ')}).`, uso: q.uso };

  const red = await redactar(pregunta, c.actividad, candidatos, modo);
  const uso = sumar(q.uso ?? { entrada: 0, salida: 0 }, red.uso);
  if (!red.ok) return { pregunta, ok: false, mensaje: `No la redacté: ${red.motivo.replace(/\.+$/, '')}. (Busqué: ${q.consultas.join(' · ')}.)`, uso };

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
    modo.formato === 'dato' ? `Curiosidad pedida para el tema: ${modo.tema}` : `Pregunta pedida: ${pregunta}`,
    `Búsquedas: ${q.consultas.join(' · ')}`,
    red.borrador.faltante ? `Respuesta parcial. Quedó afuera: ${red.borrador.faltante}` : '',
    ...red.borrador.citas.map((x) => (x.respalda ? `A${x.articulo + 1} respalda: ${x.respalda}` : '')).filter(Boolean),
    descartes.length ? `Descartado por el control: ${descartes.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const f = await crearFicha(c, red.borrador, nota, modo);
  if (!f.versionId) return { pregunta, ok: false, mensaje: `No se pudo crear la ficha: ${f.error}.`, fichaId: f.fichaId, uso };

  const { error: errorCitas } = await c.db.from('version_fuentes').insert(citas.map((x) => ({ version_id: f.versionId, ...x })));
  if (errorCitas) return { pregunta, ok: true, fichaId: f.fichaId, enRevision: false, uso, mensaje: `Quedó en borrador sin fuentes: ${mensajeDeError(errorCitas)}.` };

  const { error: errorEnvio } = await c.db.from('ficha_versiones').update({ estado: 'en_revision' }).eq('id', f.versionId);
  if (errorEnvio) return { pregunta, ok: true, fichaId: f.fichaId, enRevision: false, uso, mensaje: `Quedó en borrador: ${mensajeDeError(errorEnvio)}.` };
  return {
    pregunta,
    ok: true,
    fichaId: f.fichaId,
    enRevision: true,
    uso,
    mensaje: `Lista y esperando revisión, con ${citas.length} ${citas.length === 1 ? 'fuente' : 'fuentes'}.${red.borrador.faltante ? ` Es parcial: ${red.borrador.faltante.replace(/\.+$/, '')}.` : ''}`,
  };
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

/**
 * Curiosidad (ficha "dato") para un tema: busca artículos sobre el tema,
 * elige un dato que esté en los resúmenes y lo deja esperando revisión, con
 * el tema puesto. Nada se publica solo.
 */
export async function proponerCuriosidad(
  c: Contexto,
  tema: { id: string; nombre: string; descripcion: string },
  existentes: string[],
): Promise<Resultado> {
  const pedido = `Un dato curioso sobre: ${tema.nombre}${tema.descripcion ? `. ${tema.descripcion}` : ''}`;
  const r = await responderPregunta(c, pedido, { formato: 'dato', temaId: tema.id, tema: `${tema.nombre}${tema.descripcion ? ` (${tema.descripcion})` : ''}`, existentes });
  return { ...r, pregunta: tema.nombre };
}

// ---------------------------------------------------------------------
// Corregir con la IA (15/11, pedido de Sofia)
// ---------------------------------------------------------------------
/*
  Dos casos, el mismo camino:
  · Cambios pedidos: la validadora pidió cambios (la versión volvió a
    borrador). La IA la reescribe siguiendo su comentario.
  · Completar: está esperando revisión pero quedó incompleta (la nota dice
    qué le faltó porque no estaba en sus artículos). Se ofrece una sola vez.
  En los dos usa los artículos que ya cita (sus resúmenes guardados) y,
  además, busca artículos nuevos para lo que pidió o lo que faltó (las
  revisiones primero: son las que explican lo básico). Cada cita se vuelve a
  comprobar contra el resumen guardado, como al redactarla; los artículos
  nuevos se guardan en la biblioteca y se aprueban con la respuesta. Se
  cambian textos y citas de la misma versión y queda esperando revisión.
  Decide la validadora, como siempre. Todo con la sesión del miembro.
*/
type ContextoCorreccion = { db: SupabaseClient; admin: SupabaseClient; actorId: string };
type FilaVersion = {
  id: string;
  estado: string;
  pregunta: string;
  explicacion_cientifica: string;
  version_infantil: string;
  nota_interna: string | null;
  ficha_id: string;
};
type FilaPub = PublicacionGuardada & { licencia_codigo: string | null };
/** Cuántos artículos nuevos se le suman como mucho a los que ya tenía. */
const MAX_NUEVOS = 6;
const claveTitulo = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

export async function corregirConComentario(c: ContextoCorreccion, versionId: string, preguntaConocida = ''): Promise<Resultado> {
  /*
    La versión y su ficha por separado: entre ficha_versiones y fichas hay dos
    relaciones (la ficha de cada versión y la versión publicada de cada ficha),
    y un "fichas(...)" sin decir cuál hace fallar la consulta entera.
  */
  const { data: v, error: errorVersion } = await c.db
    .from('ficha_versiones')
    .select('id, estado, pregunta, explicacion_cientifica, version_infantil, nota_interna, ficha_id')
    .eq('id', versionId)
    .maybeSingle<FilaVersion>();
  const pregunta = v?.pregunta || preguntaConocida;
  if (errorVersion) return { pregunta, ok: false, mensaje: `No pude leerla: ${mensajeDeError(errorVersion)}.` };
  if (!v) return { pregunta, ok: false, mensaje: 'Ya no existe o no tenés permiso para verla.' };
  const { data: ficha, error: errorFicha } = await c.db
    .from('fichas')
    .select('formato, actividad')
    .eq('id', v.ficha_id)
    .maybeSingle<{ formato: 'pregunta' | 'dato'; actividad: string | null }>();
  if (errorFicha || !ficha) return { pregunta, ok: false, mensaje: `No pude leer su ficha: ${mensajeDeError(errorFicha, 'no aparece')}.` };

  const { data: rev } = await c.db
    .from('revisiones')
    .select('decision, comentario')
    .eq('objeto', 'ficha_version')
    .eq('objeto_id', versionId)
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle<{ decision: string; comentario: string | null }>();
  const comentario = rev?.decision === 'pedir_cambios' ? (rev.comentario ?? '').trim() : '';
  const { falta, yaBusco } = faltanteDe(v.nota_interna);
  const completar = v.estado === 'en_revision';
  if (v.estado === 'borrador') {
    if (!comentario) return { pregunta, ok: false, mensaje: 'No hay un pedido de cambios con comentario para seguir.' };
  } else if (completar) {
    if (!falta) return { pregunta, ok: false, mensaje: 'No le falta nada: ya está esperando revisión.' };
    if (yaBusco) return { pregunta, ok: false, mensaje: 'Ya se buscaron artículos nuevos para esta: ahora decide la validadora.' };
  } else return { pregunta, ok: false, mensaje: 'Esta respuesta ya no está esperando cambios.' };

  // Los artículos que ya cita, con su resumen guardado
  const { data: viejas } = await c.db.from('version_fuentes').select('*').eq('version_id', versionId).order('orden');
  const ids = [...new Set((viejas ?? []).map((x: { publicacion_id: string | null }) => x.publicacion_id).filter((x): x is string => Boolean(x)))];
  const { data: pubs } = ids.length
    ? await c.db.from('publicaciones').select('id, titulo, anio, revista, tipo, resumen_interno, licencia_codigo, estado, retractada').in('id', ids)
    : { data: [] };
  const { candidatos, usadas } = candidatosDeGuardados((pubs ?? []) as FilaPub[]);
  const usables = usadas as FilaPub[];

  // Artículos nuevos, buscados para lo que pidió o lo que faltó
  const loQueFalta = [comentario, completar ? falta : ''].filter(Boolean).join('\n');
  const q = await consultasPara(pregunta, ficha.actividad, loQueFalta);
  if (q.error) console.warn(`[ia] corrección ${versionId}: no se pudo preparar la búsqueda (${q.error}); sigue con sus artículos`);
  const vistas = new Set(usables.map((p) => claveTitulo(p.titulo)));
  const nuevos = q.consultas.length ? (await buscar(q.consultas)).filter((x) => !vistas.has(claveTitulo(x.principal.titulo))).slice(0, MAX_NUEVOS) : [];
  const todos = [...candidatos, ...nuevos];
  if (!todos.length) return { pregunta, ok: false, mensaje: 'No encontré artículos para corregirla: ni los que tenía ni nuevos.', uso: q.uso };

  const formato = ficha.formato;
  const modo: Modo = formato === 'dato' ? { formato: 'dato', temaId: '', tema: pregunta, existentes: [] } : RESPUESTA;
  const pedido = pedidoDeCorreccion({ formato, comentario, faltaba: completar ? (falta ?? '') : '', infantil: v.version_infantil, explicacion: v.explicacion_cientifica });
  const red = await redactar(pregunta, ficha.actividad, todos, modo, pedido);
  const uso = sumar(q.uso ?? { entrada: 0, salida: 0 }, red.uso);
  if (!red.ok) return { pregunta, ok: false, mensaje: `No la pude corregir: ${red.motivo.replace(/\.+$/, '')}.`, uso };

  // Cada cita, comprobada contra el resumen guardado (los artículos nuevos se guardan antes)
  const { data: politicas } = await c.db.from('licencias').select('codigo, pasaje');
  const politicaDe = (codigo: string | null): Politica =>
    ((politicas ?? []).find((l: { codigo: string; pasaje: Politica }) => l.codigo === codigo)?.pasaje ?? 'solo_ubicacion') as Politica;
  const contexto: Contexto = { db: c.db, admin: c.admin, actorId: c.actorId, actividad: ficha.actividad };
  const citas: { publicacion_id: string; pasaje: string; pasaje_textual: boolean; ubicacion: string; parafrasis: string; orden: number }[] = [];
  const descartes: string[] = [...red.avisos];
  let sumadas = 0;
  for (const cita of red.borrador.citas) {
    const art = todos[cita.articulo];
    if (!art) continue;
    let pub: { id: string; resumen_interno: string | null; licencia_codigo: string | null } | undefined = usables[cita.articulo];
    const nueva = cita.articulo >= usables.length;
    if (nueva) {
      const g = await guardarArticulo(contexto, art.registros);
      if (!g.pub) {
        descartes.push(`"${art.principal.titulo.slice(0, 60)}…": ${g.error}`);
        continue;
      }
      if (g.pub.estado !== 'en_revision' && g.pub.estado !== 'aprobada') {
        descartes.push(`"${art.principal.titulo.slice(0, 60)}…" está ${g.pub.estado} en la biblioteca`);
        continue;
      }
      pub = g.pub;
    }
    if (!pub) continue;
    const lista = citaContraResumen(cita.frases, pub.resumen_interno, politicaDe(pub.licencia_codigo), cita.parafrasis);
    if (!lista) {
      descartes.push(`"${art.principal.titulo.slice(0, 60)}…": la oración citada no está tal cual en el resumen guardado`);
      continue;
    }
    if (citas.some((x) => x.publicacion_id === pub.id)) continue;
    if (nueva && !ids.includes(pub.id)) sumadas++;
    citas.push({ publicacion_id: pub.id, ...lista, orden: citas.length + 1 });
  }
  if (!citas.length) return { pregunta, ok: false, mensaje: 'No la guardé: ninguna cita de la corrección pasó el control.', uso };

  const fecha = new Date().toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' });
  const sigueFaltando = red.borrador.faltante;
  const nota = [
    completar
      ? `Completada con IA (${red.modelo}) el ${fecha}, ${MARCA_BUSCO} para lo que le faltaba.`
      : `Corregida con IA (${red.modelo}) el ${fecha}, siguiendo el pedido de cambios de la validadora, con sus artículos y ${MARCA_BUSCO}.`,
    sumadas ? `Suma ${sumadas} ${sumadas === 1 ? 'artículo nuevo' : 'artículos nuevos'} (se aprueban con la respuesta).` : 'No sumó artículos nuevos.',
    q.consultas.length ? `Búsquedas: ${q.consultas.join(' · ')}` : '',
    sigueFaltando ? (completar ? `Respuesta parcial. Quedó afuera: ${sigueFaltando}` : `Lo que pidió y no está en los resúmenes: ${sigueFaltando}`) : '',
    descartes.length ? `Descartado por el control: ${descartes.join('; ')}` : '',
    notaSinFaltante(v.nota_interna),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 2000);
  const { data: cambiada, error } = await c.db
    .from('ficha_versiones')
    .update({ explicacion_cientifica: red.borrador.explicacion_cientifica, version_infantil: red.borrador.version_infantil, asistida_por_ia: true, nota_interna: nota })
    .eq('id', versionId)
    .eq('estado', v.estado)
    .select('id')
    .maybeSingle();
  if (error || !cambiada) return { pregunta, ok: false, mensaje: `No se pudo guardar la corrección: ${mensajeDeError(error, 'no tenés permiso para cambiarla')}.`, uso };

  // Las citas nuevas reemplazan a las viejas (si algo falla, vuelven las viejas)
  const { error: errorBorrar } = await c.db.from('version_fuentes').delete().eq('version_id', versionId);
  if (errorBorrar) return { pregunta, ok: true, uso, enRevision: completar, mensaje: `El texto quedó corregido pero no pude cambiar sus fuentes: ${mensajeDeError(errorBorrar)}.` };
  const { error: errorCitas } = await c.db.from('version_fuentes').insert(citas.map((x) => ({ version_id: versionId, ...x })));
  if (errorCitas) {
    const CAMPOS = ['version_id', 'publicacion_id', 'fuente_id', 'pasaje', 'pasaje_textual', 'ubicacion', 'parafrasis', 'orden'];
    const restaurar = (viejas ?? []).map((fila: Record<string, unknown>) => Object.fromEntries(CAMPOS.filter((k) => k in fila).map((k) => [k, fila[k]])));
    if (restaurar.length) await c.db.from('version_fuentes').insert(restaurar);
    return { pregunta, ok: true, uso, enRevision: completar, mensaje: `El texto quedó corregido con sus fuentes de antes: ${mensajeDeError(errorCitas)}.` };
  }

  const resumen = `${sumadas ? ` Sumó ${sumadas} ${sumadas === 1 ? 'artículo nuevo' : 'artículos nuevos'}.` : ''}${sigueFaltando ? ' Todavía le falta algo (está anotado para la validadora).' : ''}`;
  if (!completar) {
    const { error: errorEnvio } = await c.db.from('ficha_versiones').update({ estado: 'en_revision' }).eq('id', versionId);
    if (errorEnvio) return { pregunta, ok: true, uso, enRevision: false, mensaje: `Quedó corregida en borrador: ${mensajeDeError(errorEnvio)}.` };
  }
  return { pregunta, ok: true, enRevision: true, uso, mensaje: `${completar ? 'Completada' : 'Corregida'} y esperando revisión.${resumen}` };
}
