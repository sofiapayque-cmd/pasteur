'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { exigirDocenteActiva } from '@/datos/docente';
import { esUuid, obtenerAula } from '@/datos/aulas';
import { obtenerAlumno } from '@/datos/alumno';
import {
  desbloqueosDe,
  esActividadDisponible,
  esEtapa,
  esUltimaEtapa,
  limpiarDesbloqueos,
  limpiarOpciones,
  opcionesDe,
} from '@/lib/aulas/tareas';

/*
  ACCIONES DE TAREAS (etapa 5, parte 1).
  · La maestra manda una actividad a su aula, la cierra o la reabre, y
    habilita lo que la actividad deja para después (por ejemplo, antibióticos).
  · El alumno guarda su avance mientras trabaja.
  Todo con la sesión de quien llama: las reglas RLS de la base deciden
  (la maestra solo toca SUS aulas; el alumno solo SU avance, y solo en
  tareas abiertas de su aula). Lo que manda el formulario se limpia contra
  las opciones reales de cada actividad.
*/
export type EstadoTareaForm = { mensaje: string; ok?: boolean };

const MAX_DATOS = 60_000; // la base acepta hasta 64 KB
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function db() {
  return (await crearClienteServidor())!;
}

// ---------------------------------------------------------------------
// La maestra
// ---------------------------------------------------------------------
export async function mandarActividad(aulaId: string, _previo: EstadoTareaForm, datos: FormData): Promise<EstadoTareaForm> {
  await exigirDocenteActiva();
  const aula = await obtenerAula(aulaId); // con su sesión: si no es suya, no vuelve
  if (!aula) return { mensaje: 'No encontramos esa aula.' };
  if (aula.archivada_en) return { mensaje: 'El aula está archivada.' };
  const act = leer(datos, 'actividad');
  if (!esActividadDisponible(act)) return { mensaje: 'Elegí una actividad.' };

  const pedidas = Object.fromEntries(opcionesDe(act).map((o) => [o.clave, datos.getAll(`op:${o.clave}`).map(String)]));
  const opciones = limpiarOpciones(act, pedidas);
  const vacia = opcionesDe(act).find((o) => opciones[o.clave].length === 0);
  if (vacia) return { mensaje: `Elegí al menos una opción en "${vacia.etiqueta}".` };
  const desbloqueos = limpiarDesbloqueos(
    act,
    Object.fromEntries(desbloqueosDe(act).map((d) => [d.clave, leer(datos, `des:${d.clave}`) !== 'despues'])),
  );

  const { data, error } = await (await db())
    .from('asignaciones')
    .insert({ aula_id: aula.id, actividad: act, opciones, desbloqueos, estado: 'activa' })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[tareas] no se pudo mandar:', error?.code);
    return { mensaje: 'No se pudo mandar la actividad. Probá de nuevo.' };
  }
  redirect(`/maestra/aulas/${aula.id}/tareas/${data.id}`);
}

export async function cambiarEstadoTarea(tareaId: string, estado: 'activa' | 'cerrada'): Promise<EstadoTareaForm> {
  await exigirDocenteActiva();
  if (!esUuid(tareaId) || (estado !== 'activa' && estado !== 'cerrada')) return { mensaje: 'Pedido raro.' };
  const { data, error } = await (await db())
    .from('asignaciones')
    .update({ estado, cerrada_en: estado === 'cerrada' ? new Date().toISOString() : null })
    .eq('id', tareaId)
    .select('id');
  if (error || !data?.length) return { mensaje: 'No se pudo cambiar.' };
  refresh();
  return { ok: true, mensaje: estado === 'cerrada' ? 'Cerrada: los chicos la ven, pero ya no pueden seguir.' : 'Abierta otra vez.' };
}

export async function cambiarDesbloqueo(tareaId: string, clave: string, habilitado: boolean): Promise<EstadoTareaForm> {
  await exigirDocenteActiva();
  if (!esUuid(tareaId)) return { mensaje: 'Pedido raro.' };
  const supabase = await db();
  const { data: tarea } = await supabase.from('asignaciones').select('actividad, desbloqueos').eq('id', tareaId).maybeSingle();
  if (!tarea) return { mensaje: 'No encontramos esa tarea.' };
  if (!desbloqueosDe(tarea.actividad).some((d) => d.clave === clave)) return { mensaje: 'Esa actividad no tiene eso.' };
  const desbloqueos = limpiarDesbloqueos(tarea.actividad, { ...(tarea.desbloqueos ?? {}), [clave]: habilitado });
  const { error } = await supabase.from('asignaciones').update({ desbloqueos }).eq('id', tareaId);
  if (error) return { mensaje: 'No se pudo cambiar.' };
  refresh();
  return { ok: true, mensaje: habilitado ? 'Habilitado.' : 'Vuelve a estar cerrado.' };
}

// ---------------------------------------------------------------------
// El alumno
// ---------------------------------------------------------------------
export type Guardado = { ok: true } | { ok: false; motivo: 'sesion' | 'cerrada' | 'grande' | 'red' };

export async function guardarAvance(tareaId: string, etapa: string, datos: Record<string, unknown>): Promise<Guardado> {
  const alumno = await obtenerAlumno();
  if (!alumno) return { ok: false, motivo: 'sesion' };
  if (!esUuid(tareaId)) return { ok: false, motivo: 'red' };
  const supabase = await db();
  const { data: tarea } = await supabase.from('asignaciones').select('actividad, estado').eq('id', tareaId).maybeSingle();
  if (!tarea) return { ok: false, motivo: 'red' };
  if (tarea.estado !== 'activa') return { ok: false, motivo: 'cerrada' };
  if (!esEtapa(tarea.actividad, etapa)) return { ok: false, motivo: 'red' };
  let tamanio = 0;
  try {
    tamanio = JSON.stringify(datos ?? {}).length;
  } catch {
    return { ok: false, motivo: 'red' };
  }
  if (tamanio > MAX_DATOS) return { ok: false, motivo: 'grande' };

  const cambios: Record<string, unknown> = { etapa, datos: datos ?? {} };
  if (esUltimaEtapa(tarea.actividad, etapa)) cambios.completada_en = new Date().toISOString();
  const { data, error } = await supabase
    .from('progreso')
    .update(cambios)
    .eq('asignacion_id', tareaId)
    .eq('alumno_id', alumno.id)
    .is('completada_en', null)
    .select('alumno_id');
  if (error) {
    console.error('[tareas] avance:', error.code);
    return { ok: false, motivo: 'red' };
  }
  if (!data?.length) {
    // Ya la había terminado: se sigue guardando lo que hace, sin tocar cuándo terminó
    const { error: otro } = await supabase.from('progreso').update({ etapa, datos: datos ?? {} }).eq('asignacion_id', tareaId).eq('alumno_id', alumno.id);
    if (otro) return { ok: false, motivo: 'red' };
  }
  return { ok: true };
}
