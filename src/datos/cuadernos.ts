import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { cuadernoDe, SECCIONES } from '@/actividades/cuaderno';
import { buscarRespuesta } from '@/lib/ia/buscarRespuesta';
import { iaConfigurada } from '@/lib/ia/openai';
import { diarioDeClase, pasoDePregunta, type EntradaDiario, type EstadoNota, type NotaDiario, type Paso, type SesionDiario } from '@/lib/cuadernos';
import { tareasDelAlumno } from './tareas';
import type { Alumno } from './alumno';

/*
  CUADERNOS (migración 25, pedido de Sofia del 16/11). Solo servidor.
  · El del chico: sus investigaciones (lo que guardó cada actividad, ordenado
    como un investigador), sus notas y preguntas, y las preguntas de su
    clase que ya tienen respuesta. Con SU sesión: las reglas de la base solo
    le dejan ver lo suyo y lo respondido de su aula.
  · El de cada clase, para la maestra: el diario (clases en vivo, cuánto
    duraron y lo que anotó), las preguntas de los chicos y las que ella le
    hizo al Pasteur. Con SU sesión.
  · Las respuestas aprobadas (texto para chicos) se leen con la clave
    secreta, solo por id y solo las publicadas.
  · Respuestas que llegan después: marcar_preguntas_respondidas (al abrir el
    panel) y, una vez por día, una búsqueda nueva de las pendientes.
  Sin la migración 25 todo devuelve vacío y "disponible: false".
*/
export type RespuestaCorta = { fichaId: string; pregunta: string; infantil: string };

async function respuestasPorId(ids: (string | null | undefined)[]): Promise<Map<string, RespuestaCorta>> {
  const lista = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const salida = new Map<string, RespuestaCorta>();
  const admin = crearClienteAdmin();
  if (!admin || !lista.length) return salida;
  const { data } = await admin.from('fichas_validadas').select('ficha_id, pregunta, version_infantil').in('ficha_id', lista);
  for (const f of (data ?? []) as { ficha_id: string; pregunta: string; version_infantil: string }[]) {
    salida.set(f.ficha_id, { fichaId: f.ficha_id, pregunta: f.pregunta, infantil: f.version_infantil });
  }
  return salida;
}

/** Las que quedaron sin respuesta y el equipo ya respondió (aprobada): pasan a respondidas. */
async function marcarRespondidas(docenteId: string | null): Promise<void> {
  const admin = crearClienteAdmin();
  if (!admin) return;
  const { error } = await admin.rpc('marcar_preguntas_respondidas', { p_docente: docenteId });
  if (error && error.code !== 'PGRST202') console.error('[cuadernos] marcar respondidas:', error.code);
}

// ---------------------------------------------------------------------
// El cuaderno del chico
// ---------------------------------------------------------------------
export type NotaAlumno = {
  id: string;
  tipo: 'nota' | 'pregunta';
  texto: string;
  actividad: string | null;
  estado: EstadoNota;
  creadaEn: string;
  paso: { paso: Paso; texto: string } | null;
  respuesta: RespuestaCorta | null;
};
export type Investigacion = { tareaId: string; actividad: string; terminada: boolean; secciones: { id: string; nombre: string; items: string[] }[] };
export type CuadernoAlumno = {
  disponible: boolean;
  preguntas: NotaAlumno[];
  notas: NotaAlumno[];
  investigaciones: Investigacion[];
  deLaClase: { id: string; texto: string; respuesta: RespuestaCorta }[];
  actividades: string[];
};

type FilaNota = { id: string; tipo: 'nota' | 'pregunta'; texto: string; actividad: string | null; estado: EstadoNota; pregunta_maestra_id: string | null; creada_en: string };

export async function cuadernoDelAlumno(alumno: Alumno): Promise<CuadernoAlumno> {
  const db = (await crearClienteServidor())!;
  const [tareas, notasR, claseR] = await Promise.all([
    tareasDelAlumno(),
    db.from('notas_alumnos').select('id, tipo, texto, actividad, estado, pregunta_maestra_id, creada_en').order('creada_en', { ascending: false }).limit(200),
    // Las reglas solo le muestran las respondidas de su aula
    db.from('preguntas_maestras').select('id, texto, ficha_id, creada_en').eq('aula_id', alumno.aulaId).order('creada_en', { ascending: false }).limit(60),
  ]);
  const investigaciones: Investigacion[] = tareas
    .filter((t) => t.avance)
    .map((t) => {
      const c = cuadernoDe(t.actividad, t.avance!.datos) as Record<string, string[]>;
      return {
        tareaId: t.id,
        actividad: t.actividad,
        terminada: Boolean(t.avance!.completada_en),
        secciones: SECCIONES.map((s) => ({ id: s.id, nombre: s.nombre, items: c?.[s.id] ?? [] })).filter((s) => s.items.length),
      };
    })
    .filter((i) => i.secciones.length);
  const actividades = [...new Set(tareas.map((t) => t.actividad))];
  if (notasR.error) return { disponible: false, preguntas: [], notas: [], investigaciones, deLaClase: [], actividades };

  const notas = (notasR.data ?? []) as FilaNota[];
  const clase = (claseR.data ?? []) as { id: string; texto: string; ficha_id: string | null; creada_en: string }[];
  // Sus preguntas que la maestra mandó: ¿ya tienen respuesta? (las reglas solo devuelven las respondidas)
  const enviadas = notas.map((n) => n.pregunta_maestra_id).filter((x): x is string => Boolean(x));
  const { data: suyas } = enviadas.length ? await db.from('preguntas_maestras').select('id, ficha_id').in('id', enviadas) : { data: [] };
  const fichaDe = new Map(((suyas ?? []) as { id: string; ficha_id: string | null }[]).map((p) => [p.id, p.ficha_id]));
  const respuestas = await respuestasPorId([...fichaDe.values(), ...clase.map((c) => c.ficha_id)]);

  const armar = (n: FilaNota): NotaAlumno => {
    const ficha = n.pregunta_maestra_id ? fichaDe.get(n.pregunta_maestra_id) : null;
    const respuesta = ficha ? (respuestas.get(ficha) ?? null) : null;
    return {
      id: n.id,
      tipo: n.tipo,
      texto: n.texto,
      actividad: n.actividad,
      estado: n.estado,
      creadaEn: n.creada_en,
      paso: n.tipo === 'pregunta' ? pasoDePregunta(n.estado, Boolean(respuesta)) : null,
      respuesta,
    };
  };
  const propias = new Set([...fichaDe.values()].filter(Boolean));
  const vistas = new Set<string>();
  const deLaClase = clase
    .filter((c) => c.ficha_id && respuestas.has(c.ficha_id) && !propias.has(c.ficha_id))
    .filter((c) => (vistas.has(c.ficha_id!) ? false : (vistas.add(c.ficha_id!), true)))
    .map((c) => ({ id: c.id, texto: c.texto, respuesta: respuestas.get(c.ficha_id!)! }));
  return {
    disponible: true,
    preguntas: notas.filter((n) => n.tipo === 'pregunta').map(armar),
    notas: notas.filter((n) => n.tipo === 'nota').map(armar),
    investigaciones,
    deLaClase,
    actividades,
  };
}

// ---------------------------------------------------------------------
// El cuaderno de cada clase y el de la maestra
// ---------------------------------------------------------------------
export type PreguntaMaestra = {
  id: string;
  texto: string;
  actividad: string | null;
  aulaId: string | null;
  resultado: 'respuesta' | 'parecidas' | 'sin_respuesta';
  respuesta: RespuestaCorta | null;
  /** La respuesta llegó después y la maestra todavía no la había visto. */
  nueva: boolean;
  creadaEn: string;
};
export type NotaDeChico = {
  id: string;
  tipo: 'nota' | 'pregunta';
  texto: string;
  actividad: string | null;
  estado: EstadoNota;
  creadaEn: string;
  alumno: string;
  respuesta: RespuestaCorta | null;
  esperando: boolean;
};
export type CuadernoClase = {
  disponible: boolean;
  diario: EntradaDiario[];
  preguntasChicos: NotaDeChico[];
  notasChicos: NotaDeChico[];
  preguntas: PreguntaMaestra[];
  actividades: string[];
};

type FilaPregunta = {
  id: string;
  texto: string;
  actividad: string | null;
  aula_id: string | null;
  resultado: PreguntaMaestra['resultado'];
  ficha_id: string | null;
  respondida_en: string | null;
  vista_en: string | null;
  creada_en: string;
};
const COLUMNAS_PREGUNTA = 'id, texto, actividad, aula_id, resultado, ficha_id, respondida_en, vista_en, creada_en';

function armarPreguntas(filas: FilaPregunta[], respuestas: Map<string, RespuestaCorta>): PreguntaMaestra[] {
  return filas.map((p) => ({
    id: p.id,
    texto: p.texto,
    actividad: p.actividad,
    aulaId: p.aula_id,
    resultado: p.resultado,
    respuesta: p.ficha_id ? (respuestas.get(p.ficha_id) ?? null) : null,
    nueva: Boolean(p.respondida_en && !p.vista_en),
    creadaEn: p.creada_en,
  }));
}

/** Marca como vistos los avisos de respuesta (después de leerlos: esta vez todavía se muestran como nuevos). */
async function marcarVistas(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return;
  const { error } = await db.from('preguntas_maestras').update({ vista_en: new Date().toISOString() }).in('id', ids).is('vista_en', null);
  if (error) console.error('[cuadernos] vistas:', error.code);
}

export async function cuadernoDeLaClase(aulaId: string, docenteId: string): Promise<CuadernoClase> {
  await marcarRespondidas(docenteId);
  const db = (await crearClienteServidor())!;
  const [sesionesR, asignacionesR, diarioR, notasR, alumnosR, preguntasR] = await Promise.all([
    db.from('sesiones').select('id, asignacion_id, estado, iniciada_en, cerrada_en').eq('aula_id', aulaId).order('iniciada_en', { ascending: false }).limit(80),
    db.from('asignaciones').select('id, actividad').eq('aula_id', aulaId),
    db.from('notas_maestras').select('id, fecha, actividad, minutos, texto, sesion_id').eq('aula_id', aulaId).order('fecha', { ascending: false }).limit(200),
    db.from('notas_alumnos').select('id, alumno_id, tipo, texto, actividad, estado, pregunta_maestra_id, creada_en').eq('aula_id', aulaId).order('creada_en', { ascending: false }).limit(400),
    db.from('alumnos').select('id, numero, apodo').eq('aula_id', aulaId),
    db.from('preguntas_maestras').select(COLUMNAS_PREGUNTA).eq('aula_id', aulaId).order('creada_en', { ascending: false }).limit(200),
  ]);
  const actividadDe = new Map(((asignacionesR.data ?? []) as { id: string; actividad: string }[]).map((a) => [a.id, a.actividad]));
  const sesiones: SesionDiario[] = ((sesionesR.data ?? []) as { id: string; asignacion_id: string; estado: string; iniciada_en: string; cerrada_en: string | null }[]).map((s) => ({
    id: s.id,
    actividad: actividadDe.get(s.asignacion_id) ?? null,
    iniciada_en: s.iniciada_en,
    cerrada_en: s.cerrada_en,
    estado: s.estado,
  }));
  const actividades = [...new Set(actividadDe.values())].sort();
  if (diarioR.error || notasR.error || preguntasR.error) {
    return { disponible: false, diario: diarioDeClase(sesiones, []), preguntasChicos: [], notasChicos: [], preguntas: [], actividades };
  }

  const preguntasFilas = (preguntasR.data ?? []) as FilaPregunta[];
  const fichaDePregunta = new Map(preguntasFilas.map((p) => [p.id, p.ficha_id]));
  const respuestas = await respuestasPorId(preguntasFilas.map((p) => p.ficha_id));
  const nombre = new Map(((alumnosR.data ?? []) as { id: string; numero: number; apodo: string | null }[]).map((a) => [a.id, a.apodo || `Alumno ${a.numero}`]));
  const notas = ((notasR.data ?? []) as (FilaNota & { alumno_id: string })[]).map((n) => {
    const ficha = n.pregunta_maestra_id ? fichaDePregunta.get(n.pregunta_maestra_id) : null;
    return {
      id: n.id,
      tipo: n.tipo,
      texto: n.texto,
      actividad: n.actividad,
      estado: n.estado,
      creadaEn: n.creada_en,
      alumno: nombre.get(n.alumno_id) ?? 'Un alumno',
      respuesta: ficha ? (respuestas.get(ficha) ?? null) : null,
      esperando: n.estado === 'enviada' && !ficha,
    };
  });
  const preguntas = armarPreguntas(preguntasFilas, respuestas);
  await marcarVistas(
    db,
    preguntas.filter((p) => p.nueva).map((p) => p.id),
  );
  return {
    disponible: true,
    diario: diarioDeClase(sesiones, (diarioR.data ?? []) as NotaDiario[]),
    preguntasChicos: notas.filter((n) => n.tipo === 'pregunta'),
    notasChicos: notas.filter((n) => n.tipo === 'nota'),
    preguntas,
    actividades,
  };
}

export type CuadernoMaestra = {
  disponible: boolean;
  preguntas: PreguntaMaestra[];
  /** Por clase: cuántas preguntas nuevas de los chicos hay. */
  preguntasNuevasPorAula: Record<string, number>;
};

/** Todas sus preguntas al Pasteur (de cualquier clase o de ninguna), y avisos. */
export async function cuadernoDeLaMaestra(docenteId: string): Promise<CuadernoMaestra> {
  await marcarRespondidas(docenteId);
  const db = (await crearClienteServidor())!;
  const [preguntasR, nuevasR] = await Promise.all([
    db.from('preguntas_maestras').select(COLUMNAS_PREGUNTA).order('creada_en', { ascending: false }).limit(300),
    db.from('notas_alumnos').select('aula_id').eq('tipo', 'pregunta').eq('estado', 'nueva').limit(1000),
  ]);
  if (preguntasR.error) return { disponible: false, preguntas: [], preguntasNuevasPorAula: {} };
  const filas = (preguntasR.data ?? []) as FilaPregunta[];
  const preguntas = armarPreguntas(filas, await respuestasPorId(filas.map((p) => p.ficha_id)));
  const preguntasNuevasPorAula: Record<string, number> = {};
  for (const n of (nuevasR.data ?? []) as { aula_id: string }[]) preguntasNuevasPorAula[n.aula_id] = (preguntasNuevasPorAula[n.aula_id] ?? 0) + 1;
  await marcarVistas(
    db,
    preguntas.filter((p) => p.nueva).map((p) => p.id),
  );
  return { disponible: true, preguntas, preguntasNuevasPorAula };
}

/** Para el panel de la maestra: respuestas que llegaron y preguntas nuevas de sus chicos. */
export async function avisosDeLaMaestra(docenteId: string): Promise<{ respuestasNuevas: number; preguntasDeChicos: number }> {
  try {
    await marcarRespondidas(docenteId);
    const db = (await crearClienteServidor())!;
    const [r, p] = await Promise.all([
      db.from('preguntas_maestras').select('id', { count: 'exact', head: true }).not('respondida_en', 'is', null).is('vista_en', null),
      db.from('notas_alumnos').select('id', { count: 'exact', head: true }).eq('tipo', 'pregunta').eq('estado', 'nueva'),
    ]);
    return { respuestasNuevas: r.error ? 0 : (r.count ?? 0), preguntasDeChicos: p.error ? 0 : (p.count ?? 0) };
  } catch {
    return { respuestasNuevas: 0, preguntasDeChicos: 0 };
  }
}

/**
 * Una vez por día (/api/latido): las preguntas de maestras que siguen sin
 * respuesta se buscan de nuevo entre las aprobadas (puede haber una nueva
 * que diga lo mismo con otras palabras). Hasta `max`, de los últimos 60 días.
 */
export async function revisarPreguntasPendientes(admin: SupabaseClient, max = 25): Promise<{ respondidas: number }> {
  let respondidas = 0;
  const { data: marcadas, error } = await admin.rpc('marcar_preguntas_respondidas', { p_docente: null });
  if (error) return { respondidas };
  respondidas += Number(marcadas) || 0;
  if (!iaConfigurada()) return { respondidas };
  const desde = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data } = await admin.from('preguntas_maestras').select('id, texto').is('ficha_id', null).gte('creada_en', desde).order('creada_en', { ascending: false }).limit(max);
  for (const p of (data ?? []) as { id: string; texto: string }[]) {
    try {
      const b = await buscarRespuesta(admin, p.texto);
      if (b.error || b.decision.tipo !== 'respuesta') continue;
      const { error: e } = await admin
        .from('preguntas_maestras')
        .update({ ficha_id: b.decision.fichaId, respondida_en: new Date().toISOString() })
        .eq('id', p.id)
        .is('ficha_id', null);
      if (!e) respondidas++;
    } catch (e) {
      console.error('[cuadernos] buscar de nuevo:', e instanceof Error ? e.message : e);
    }
  }
  if (respondidas) console.info(`[cuadernos] ${respondidas} pregunta(s) de maestras con respuesta nueva`);
  return { respondidas };
}
