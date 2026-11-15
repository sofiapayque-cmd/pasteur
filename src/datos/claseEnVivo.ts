import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { esUuid } from './aulas';
import { obtenerAlumno } from './alumno';
import type { AlumnoClase, AsignacionClase, Instantanea, ProgresoClase, SesionFila } from '@/lib/aulas/clase';

/*
  CLASE EN VIVO · datos (solo servidor), siempre con la sesión de quien mira:
  las reglas RLS dejan a la maestra ver las clases, alumnos y avances de SUS
  aulas, y al alumno solo la clase de SU aula (migración 2).
*/
export const COLUMNAS_SESION = 'id, asignacion_id, aula_id, estado, pausada, desbloqueos, iniciada_en, cerrada_en';
// El timer (migración 21, 8/11)
export const COLUMNAS_TIEMPO = 'tiempo_estado, tiempo_duracion, tiempo_fin, tiempo_restante, tiempo_terminado_en, cierre';

/**
 * Lee la sesión con su timer. Si la base todavía no tiene la migración 21
 * (columna inexistente, 42703), la lee sin timer: así esta versión de la web
 * anda igual antes y después de aplicarla, en pruebas y en producción.
 */
export async function leerSesion<T>(
  consulta: (columnas: string) => PromiseLike<{ data: T | null; error: { code?: string } | null }>,
): Promise<T | null> {
  const conTiempo = await consulta(`${COLUMNAS_SESION}, ${COLUMNAS_TIEMPO}`);
  if (conTiempo.error?.code === '42703') return (await consulta(COLUMNAS_SESION)).data ?? null;
  return conTiempo.data ?? null;
}
const COLUMNAS_PROGRESO = 'alumno_id, etapa, datos, etapa_desde, actualizado_en, completada_en';

async function db() {
  const supabase = await crearClienteServidor();
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

/** La clase abierta (no cerrada) de un aula de la maestra, si hay una. */
export async function claseAbiertaDeAula(aulaId: string): Promise<SesionFila | null> {
  if (!esUuid(aulaId)) return null;
  const supabase = await db();
  return leerSesion<SesionFila>((c) => supabase.from('sesiones').select(c).eq('aula_id', aulaId).neq('estado', 'cerrada').maybeSingle());
}

/**
 * Todo lo que necesita el tablero de la maestra. Con `desde`, solo los
 * avances que cambiaron después (para las consultas de respaldo).
 */
export async function instantaneaMaestra(sesionId: string, desde?: string): Promise<Instantanea | null> {
  if (!esUuid(sesionId)) return null;
  const supabase = await db();
  const s = await leerSesion<SesionFila>((c) => supabase.from('sesiones').select(c).eq('id', sesionId).maybeSingle());
  if (!s) return null;
  let consultaProgreso = supabase.from('progreso').select(COLUMNAS_PROGRESO).eq('asignacion_id', s.asignacion_id);
  if (desde && !Number.isNaN(Date.parse(desde))) consultaProgreso = consultaProgreso.gt('actualizado_en', desde);
  const [{ data: asignacion }, { data: aula }, { data: alumnos }, { data: progresos }] = await Promise.all([
    supabase.from('asignaciones').select('id, actividad, opciones, desbloqueos, estado').eq('id', s.asignacion_id).maybeSingle(),
    supabase.from('aulas').select('id, nombre, codigo').eq('id', s.aula_id).maybeSingle(),
    supabase.from('alumnos').select('id, numero, apodo, color, activo').eq('aula_id', s.aula_id).order('numero'),
    consultaProgreso,
  ]);
  if (!asignacion || !aula) return null;
  return {
    sesion: s,
    asignacion: asignacion as AsignacionClase,
    aula: aula as Instantanea['aula'],
    alumnos: (alumnos ?? []) as AlumnoClase[],
    progresos: (progresos ?? []) as ProgresoClase[],
  };
}

/** La clase en vivo abierta del aula del alumno (la base no le muestra otras). */
export async function claseDelAlumno(): Promise<{ sesion: SesionFila; asignacion: AsignacionClase } | null> {
  const alumno = await obtenerAlumno();
  if (!alumno) return null;
  const supabase = await db();
  const s = await leerSesion<SesionFila>((c) =>
    supabase.from('sesiones').select(c).neq('estado', 'cerrada').order('iniciada_en', { ascending: false }).limit(1).maybeSingle(),
  );
  if (!s) return null;
  const { data: asignacion } = await supabase.from('asignaciones').select('id, actividad, opciones, desbloqueos, estado').eq('id', s.asignacion_id).maybeSingle();
  return asignacion ? { sesion: s, asignacion: asignacion as AsignacionClase } : null;
}
