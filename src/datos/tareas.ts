import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { exigirDocenteActiva } from './docente';
import { esUuid } from './aulas';
import { obtenerAlumno } from './alumno';
import { primeraEtapa } from '@/lib/aulas/tareas';

/*
  TAREAS (asignaciones) Y AVANCE (progreso) · solo servidor.
  Siempre con la sesión de quien mira: las reglas RLS dejan a la maestra ver
  las tareas y el avance de SUS aulas, y al alumno las tareas de SU aula
  (salvo borradores) y SU avance.
*/
export type EstadoTarea = 'borrador' | 'activa' | 'cerrada';
export type Tarea = {
  id: string;
  aula_id: string;
  actividad: string;
  opciones: Record<string, string[]>;
  desbloqueos: Record<string, boolean>;
  estado: EstadoTarea;
  creada_en: string;
  cerrada_en: string | null;
};
export type Avance = {
  alumno_id: string;
  etapa: string;
  datos: Record<string, unknown>;
  actualizado_en: string;
  completada_en: string | null;
};
export type TareaConCuentas = Tarea & { empezaron: number; terminaron: number };

const COLUMNAS = 'id, aula_id, actividad, opciones, desbloqueos, estado, creada_en, cerrada_en';

async function db() {
  const supabase = await crearClienteServidor();
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

// ---------------------------------------------------------------------
// La maestra
// ---------------------------------------------------------------------

/** Tareas de un aula de la maestra, con cuántos empezaron y terminaron. */
export async function listarTareas(aulaId: string): Promise<TareaConCuentas[]> {
  await exigirDocenteActiva();
  if (!esUuid(aulaId)) return [];
  const supabase = await db();
  const { data } = await supabase.from('asignaciones').select(COLUMNAS).eq('aula_id', aulaId).order('creada_en', { ascending: false });
  const tareas = (data ?? []) as Tarea[];
  if (!tareas.length) return [];
  const { data: avances } = await supabase
    .from('progreso')
    .select('asignacion_id, completada_en')
    .in(
      'asignacion_id',
      tareas.map((t) => t.id),
    );
  return tareas.map((t) => {
    const suyos = (avances ?? []).filter((a) => a.asignacion_id === t.id);
    return { ...t, empezaron: suyos.length, terminaron: suyos.filter((a) => a.completada_en).length };
  });
}

/** Una tarea de un aula de la maestra con el avance de cada alumno (null si no es suya). */
export async function obtenerTareaDeMaestra(aulaId: string, tareaId: string): Promise<{ tarea: Tarea; avances: Avance[] } | null> {
  await exigirDocenteActiva();
  if (!esUuid(aulaId) || !esUuid(tareaId)) return null;
  const supabase = await db();
  const { data } = await supabase.from('asignaciones').select(COLUMNAS).eq('id', tareaId).eq('aula_id', aulaId).maybeSingle();
  if (!data) return null;
  const { data: avances } = await supabase
    .from('progreso')
    .select('alumno_id, etapa, datos, actualizado_en, completada_en')
    .eq('asignacion_id', tareaId);
  return { tarea: data as Tarea, avances: (avances ?? []) as Avance[] };
}

// ---------------------------------------------------------------------
// El alumno
// ---------------------------------------------------------------------

/** Las tareas del aula del alumno (abiertas primero) con su avance. */
export async function tareasDelAlumno(): Promise<(Tarea & { avance: Avance | null })[]> {
  const alumno = await obtenerAlumno();
  if (!alumno) return [];
  const supabase = await db();
  const [{ data: tareas }, { data: avances }] = await Promise.all([
    supabase.from('asignaciones').select(COLUMNAS).neq('estado', 'borrador').order('creada_en', { ascending: false }).limit(30),
    supabase.from('progreso').select('asignacion_id, alumno_id, etapa, datos, actualizado_en, completada_en').eq('alumno_id', alumno.id),
  ]);
  return ((tareas ?? []) as Tarea[])
    .map((t) => ({ ...t, avance: ((avances ?? []).find((a) => a.asignacion_id === t.id) as Avance | undefined) ?? null }))
    .sort((a, b) => Number(b.estado === 'activa') - Number(a.estado === 'activa'));
}

/**
 * Una tarea del alumno para trabajar. Si está abierta y todavía no empezó,
 * crea su fila de avance (la regla RLS solo lo deja en tareas abiertas de su aula).
 */
export async function abrirTareaDelAlumno(tareaId: string): Promise<{ tarea: Tarea; avance: Avance } | null> {
  const alumno = await obtenerAlumno();
  if (!alumno || !esUuid(tareaId)) return null;
  const supabase = await db();
  const { data } = await supabase.from('asignaciones').select(COLUMNAS).eq('id', tareaId).neq('estado', 'borrador').maybeSingle();
  if (!data) return null;
  const tarea = data as Tarea;
  const columnas = 'alumno_id, etapa, datos, actualizado_en, completada_en';
  const { data: existente } = await supabase.from('progreso').select(columnas).eq('asignacion_id', tarea.id).eq('alumno_id', alumno.id).maybeSingle();
  if (existente) return { tarea, avance: existente as Avance };
  if (tarea.estado !== 'activa') return null;
  const { data: nuevo, error } = await supabase
    .from('progreso')
    .insert({ asignacion_id: tarea.id, aula_id: tarea.aula_id, actividad: tarea.actividad, etapa: primeraEtapa(tarea.actividad), datos: {} })
    .select(columnas)
    .single();
  if (error || !nuevo) {
    // Dos pestañas a la vez: la otra ya la creó
    const { data: otra } = await supabase.from('progreso').select(columnas).eq('asignacion_id', tarea.id).eq('alumno_id', alumno.id).maybeSingle();
    return otra ? { tarea, avance: otra as Avance } : null;
  }
  return { tarea, avance: nuevo as Avance };
}
