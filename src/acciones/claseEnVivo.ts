'use server';

import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { exigirDocenteActiva } from '@/datos/docente';
import { esUuid, obtenerAula } from '@/datos/aulas';
import { obtenerAlumno } from '@/datos/alumno';
import { claseAbiertaDeAula, COLUMNAS_SESION, instantaneaMaestra } from '@/datos/claseEnVivo';
import { desbloqueosDe, leerFormularioActividad } from '@/lib/aulas/tareas';
import { esPaso, PASOS, type Instantanea, type Paso, type SesionFila } from '@/lib/aulas/clase';
import type { EstadoTareaForm } from './tareas';

/*
  ACCIONES DE LA CLASE EN VIVO (etapa 5, parte 2).
  · La maestra abre una clase (con una actividad nueva o una tarea que ya
    mandó), la empieza, la pausa, habilita lo que la actividad deja para
    después, va a la puesta en común y la cierra.
  · Las pantallas se actualizan en tiempo real (Supabase Realtime); estas
    consultas son el respaldo si el tiempo real no anda en la red de la escuela.
  Todo con la sesión de quien llama: las reglas RLS deciden (la maestra solo
  maneja las clases de SUS aulas; el alumno solo ve la de SU aula). Una sola
  clase abierta por aula (índice único de la migración 1).
*/
async function db() {
  return (await crearClienteServidor())!;
}
const enVivo = (aulaId: string) => `/maestra/aulas/${aulaId}/en-vivo`;

async function crearSesion(aulaId: string, asignacionId: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const { error } = await (await db()).from('sesiones').insert({ asignacion_id: asignacionId, aula_id: aulaId, estado: 'esperando', desbloqueos: {} });
  if (!error) return { ok: true };
  if (error.code === '23505') return { ok: true }; // ya había una abierta: se va a esa
  console.error('[clase] no se pudo abrir:', error.code);
  return { ok: false, mensaje: 'No se pudo abrir la clase. Probá de nuevo.' };
}

/** Clase con una actividad nueva (queda también como tarea del aula). */
export async function abrirClase(aulaId: string, _previo: EstadoTareaForm, datos: FormData): Promise<EstadoTareaForm> {
  await exigirDocenteActiva();
  const aula = await obtenerAula(aulaId);
  if (!aula) return { mensaje: 'No encontramos esa aula.' };
  if (aula.archivada_en) return { mensaje: 'El aula está archivada.' };
  if (await claseAbiertaDeAula(aula.id)) redirect(enVivo(aula.id));
  const form = leerFormularioActividad(datos);
  if (!form.ok) return { mensaje: form.mensaje };

  const { data, error } = await (await db())
    .from('asignaciones')
    .insert({ aula_id: aula.id, actividad: form.actividad, opciones: form.opciones, desbloqueos: form.desbloqueos, estado: 'activa' })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[clase] no se pudo crear la actividad:', error?.code);
    return { mensaje: 'No se pudo abrir la clase. Probá de nuevo.' };
  }
  const r = await crearSesion(aula.id, data.id);
  if (!r.ok) return { mensaje: r.mensaje };
  redirect(enVivo(aula.id));
}

/** Clase con una tarea que ya estaba mandada (sigue siendo la misma: el avance es uno solo). */
export async function abrirClaseConTarea(aulaId: string, tareaId: string): Promise<EstadoTareaForm> {
  await exigirDocenteActiva();
  const aula = await obtenerAula(aulaId);
  if (!aula || !esUuid(tareaId)) return { mensaje: 'No encontramos esa tarea.' };
  if (await claseAbiertaDeAula(aula.id)) redirect(enVivo(aula.id));
  const { data: tarea } = await (await db()).from('asignaciones').select('id, estado').eq('id', tareaId).eq('aula_id', aula.id).maybeSingle();
  if (!tarea) return { mensaje: 'No encontramos esa tarea.' };
  if (tarea.estado !== 'activa') return { mensaje: 'La tarea está cerrada: abrila de nuevo para hacerla en clase.' };
  const r = await crearSesion(aula.id, tarea.id);
  if (!r.ok) return { mensaje: r.mensaje };
  redirect(enVivo(aula.id));
}

export type ResultadoClase = { ok: true; sesion: SesionFila } | { ok: false; mensaje: string };

/** Empezar, ir a la puesta en común, volver al tablero o cerrar. Solo desde el estado que corresponde. */
export async function moverClase(sesionId: string, paso: Paso): Promise<ResultadoClase> {
  await exigirDocenteActiva();
  if (!esUuid(sesionId) || !esPaso(paso)) return { ok: false, mensaje: 'Pedido raro.' };
  const { desde, a } = PASOS[paso];
  const cambios: Record<string, unknown> = { estado: a, pausada: false };
  if (a === 'cerrada') cambios.cerrada_en = new Date().toISOString();
  const { data, error } = await (await db())
    .from('sesiones')
    .update(cambios)
    .eq('id', sesionId)
    .in('estado', [...desde])
    .select(COLUMNAS_SESION)
    .maybeSingle();
  if (error) {
    console.error('[clase] mover:', error.code);
    return { ok: false, mensaje: 'No se pudo. Probá de nuevo.' };
  }
  if (!data) return { ok: false, mensaje: 'La clase ya cambió (quizás desde otra compu). Mirá cómo está ahora.' };
  return { ok: true, sesion: data as SesionFila };
}

export async function pausarClase(sesionId: string, pausada: boolean): Promise<ResultadoClase> {
  await exigirDocenteActiva();
  if (!esUuid(sesionId)) return { ok: false, mensaje: 'Pedido raro.' };
  const { data, error } = await (await db())
    .from('sesiones')
    .update({ pausada: Boolean(pausada) })
    .eq('id', sesionId)
    .eq('estado', 'en-curso')
    .select(COLUMNAS_SESION)
    .maybeSingle();
  if (error || !data) return { ok: false, mensaje: 'No se pudo pausar. Probá de nuevo.' };
  return { ok: true, sesion: data as SesionFila };
}

/** Habilita en vivo algo que la actividad deja para después (y queda habilitado también en la tarea). */
export async function habilitarEnClase(sesionId: string, clave: string): Promise<ResultadoClase> {
  await exigirDocenteActiva();
  if (!esUuid(sesionId)) return { ok: false, mensaje: 'Pedido raro.' };
  const supabase = await db();
  const { data: s } = await supabase.from('sesiones').select('id, asignacion_id, desbloqueos, estado').eq('id', sesionId).maybeSingle();
  if (!s || s.estado === 'cerrada') return { ok: false, mensaje: 'La clase ya está cerrada.' };
  const { data: tarea } = await supabase.from('asignaciones').select('id, actividad, desbloqueos').eq('id', s.asignacion_id).maybeSingle();
  if (!tarea || !desbloqueosDe(tarea.actividad).some((d) => d.clave === clave)) return { ok: false, mensaje: 'Esa actividad no tiene eso.' };
  const { data, error } = await supabase
    .from('sesiones')
    .update({ desbloqueos: { ...(s.desbloqueos ?? {}), [clave]: true } })
    .eq('id', sesionId)
    .select(COLUMNAS_SESION)
    .maybeSingle();
  if (error || !data) return { ok: false, mensaje: 'No se pudo habilitar. Probá de nuevo.' };
  // También en la tarea: si después siguen en casa, ya está habilitado
  const { error: errorTarea } = await supabase.from('asignaciones').update({ desbloqueos: { ...(tarea.desbloqueos ?? {}), [clave]: true } }).eq('id', tarea.id);
  if (errorTarea) console.error('[clase] habilitar en la tarea:', errorTarea.code);
  return { ok: true, sesion: data as SesionFila };
}

/** Respaldo del tiempo real para la maestra: la clase y los avances que cambiaron. */
export async function estadoClaseMaestra(sesionId: string, desde?: string): Promise<Instantanea | null> {
  await exigirDocenteActiva();
  return instantaneaMaestra(sesionId, desde);
}

/** Respaldo del tiempo real para el alumno: cómo está la clase de su aula. */
export async function estadoClaseAlumno(sesionId: string): Promise<SesionFila | null> {
  const alumno = await obtenerAlumno();
  if (!alumno || !esUuid(sesionId)) return null;
  const { data } = await (await db()).from('sesiones').select(COLUMNAS_SESION).eq('id', sesionId).maybeSingle();
  return (data as SesionFila | null) ?? null;
}
