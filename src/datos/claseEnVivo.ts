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
const COLUMNAS_PROGRESO = 'alumno_id, etapa, datos, etapa_desde, actualizado_en, completada_en';

async function db() {
  const supabase = await crearClienteServidor();
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

/** La clase abierta (no cerrada) de un aula de la maestra, si hay una. */
export async function claseAbiertaDeAula(aulaId: string): Promise<SesionFila | null> {
  if (!esUuid(aulaId)) return null;
  const { data } = await (await db()).from('sesiones').select(COLUMNAS_SESION).eq('aula_id', aulaId).neq('estado', 'cerrada').maybeSingle();
  return (data as SesionFila | null) ?? null;
}

/**
 * Todo lo que necesita el tablero de la maestra. Con `desde`, solo los
 * avances que cambiaron después (para las consultas de respaldo).
 */
export async function instantaneaMaestra(sesionId: string, desde?: string): Promise<Instantanea | null> {
  if (!esUuid(sesionId)) return null;
  const supabase = await db();
  const { data: sesion } = await supabase.from('sesiones').select(COLUMNAS_SESION).eq('id', sesionId).maybeSingle();
  if (!sesion) return null;
  const s = sesion as SesionFila;
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
  const { data: sesion } = await supabase.from('sesiones').select(COLUMNAS_SESION).neq('estado', 'cerrada').order('iniciada_en', { ascending: false }).limit(1).maybeSingle();
  if (!sesion) return null;
  const s = sesion as SesionFila;
  const { data: asignacion } = await supabase.from('asignaciones').select('id, actividad, opciones, desbloqueos, estado').eq('id', s.asignacion_id).maybeSingle();
  return asignacion ? { sesion: s, asignacion: asignacion as AsignacionClase } : null;
}
