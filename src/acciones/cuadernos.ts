'use server';

import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerAlumno } from '@/datos/alumno';
import { exigirDocenteActiva } from '@/datos/docente';
import { esUuid, obtenerAula } from '@/datos/aulas';
import { fechaEscrita, limpiarNota, MAX_NOTA_MAESTRA, minutosEscritos } from '@/lib/cuadernos';
import { preguntarAlPasteur, type EstadoAsistente } from './asistente';

/*
  ACCIONES DE LOS CUADERNOS (migración 25). Cada una comprueba quién la
  llama y escribe con SU sesión: las reglas de la base deciden (un chico solo
  en su aula; una maestra solo en las suyas).
  · El chico: anotar una nota o una pregunta; borrar una que su maestra
    todavía no usó.
  · La maestra: anotar en el diario de la clase (o corregir), borrar;
    mandarle al Pasteur la pregunta de un chico; marcarla como charlada.
*/
export type EstadoNota = { mensaje: string; ok?: boolean };

const ACTIVIDAD = /^a[1-4]$/;
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

// ---------------------------------------------------------------------
// El chico
// ---------------------------------------------------------------------
export async function anotarAlumno(_previo: EstadoNota, datos: FormData): Promise<EstadoNota> {
  const alumno = await obtenerAlumno();
  if (!alumno) return { mensaje: 'Entrá con tu tarjeta para escribir en tu cuaderno.' };
  const tipo = leer(datos, 'tipo') === 'pregunta' ? 'pregunta' : 'nota';
  const texto = limpiarNota(datos.get('texto'));
  if (texto.length < 2) return { mensaje: tipo === 'pregunta' ? 'Escribí tu pregunta.' : 'Escribí tu nota.' };
  const act = leer(datos, 'actividad');
  const db = (await crearClienteServidor())!;
  const { error } = await db.from('notas_alumnos').insert({ aula_id: alumno.aulaId, actividad: ACTIVIDAD.test(act) ? act : null, tipo, texto });
  if (error) {
    if (error.code === 'P0001') return { mensaje: 'Hoy ya escribiste mucho. Seguí mañana.' };
    console.error('[cuaderno] nota del chico:', error.code);
    return { mensaje: 'No se pudo guardar. Probá de nuevo.' };
  }
  refresh();
  return { ok: true, mensaje: tipo === 'pregunta' ? 'Listo: tu maestra la va a leer.' : 'Anotado.' };
}

export async function borrarNotaAlumno(id: string): Promise<void> {
  if (!esUuid(id) || !(await obtenerAlumno())) return;
  const db = (await crearClienteServidor())!;
  await db.from('notas_alumnos').delete().eq('id', id);
  refresh();
}

// ---------------------------------------------------------------------
// La maestra
// ---------------------------------------------------------------------
export async function anotarMaestra(aulaId: string, _previo: EstadoNota, datos: FormData): Promise<EstadoNota> {
  await exigirDocenteActiva();
  const aula = await obtenerAula(aulaId);
  if (!aula) return { mensaje: 'Esa clase no es tuya.' };
  const fecha = fechaEscrita(leer(datos, 'fecha'));
  if (!fecha) return { mensaje: 'Elegí una fecha (de hoy para atrás).' };
  const act = leer(datos, 'actividad');
  const fila = {
    fecha,
    actividad: ACTIVIDAD.test(act) ? act : null,
    minutos: minutosEscritos(datos.get('minutos')),
    texto: limpiarNota(datos.get('texto'), MAX_NOTA_MAESTRA),
  };
  if (!fila.texto && !fila.actividad) return { mensaje: 'Escribí qué hicieron o elegí la actividad.' };
  const db = (await crearClienteServidor())!;
  const id = leer(datos, 'id');
  const sesion = leer(datos, 'sesion');
  const { error } = esUuid(id)
    ? await db.from('notas_maestras').update({ ...fila, actualizada_en: new Date().toISOString() }).eq('id', id).eq('aula_id', aula.id)
    : await db.from('notas_maestras').insert({ ...fila, aula_id: aula.id, sesion_id: esUuid(sesion) ? sesion : null });
  if (error) {
    console.error('[cuaderno] diario:', error.code);
    return { mensaje: 'No se pudo guardar. Probá de nuevo.' };
  }
  refresh();
  return { ok: true, mensaje: esUuid(id) ? 'Corregido.' : 'Anotado en el diario.' };
}

export async function borrarNotaMaestra(id: string): Promise<void> {
  await exigirDocenteActiva();
  if (!esUuid(id)) return;
  const db = (await crearClienteServidor())!;
  await db.from('notas_maestras').delete().eq('id', id);
  refresh();
}

/** La pregunta de un chico, al Pasteur: la misma búsqueda que "Preguntale al Pasteur", unida a la nota del chico. */
export async function preguntarDesdeCuaderno(notaId: string): Promise<EstadoAsistente> {
  await exigirDocenteActiva();
  if (!esUuid(notaId)) return { mensaje: 'No se encontró esa pregunta.' };
  const db = (await crearClienteServidor())!;
  // Con la sesión de la maestra: si no es de sus aulas, no la ve
  const { data: nota } = await db.from('notas_alumnos').select('id, aula_id, texto, actividad, tipo').eq('id', notaId).maybeSingle<{ id: string; aula_id: string; texto: string; actividad: string | null; tipo: string }>();
  if (!nota || nota.tipo !== 'pregunta') return { mensaje: 'No se encontró esa pregunta.' };
  const datos = new FormData();
  datos.set('pregunta', nota.texto);
  datos.set('actividad', nota.actividad ?? '');
  datos.set('aula', nota.aula_id);
  datos.set('nota', nota.id);
  const estado = await preguntarAlPasteur({}, datos);
  refresh();
  return estado;
}

export async function marcarCharlada(notaId: string): Promise<void> {
  await exigirDocenteActiva();
  if (!esUuid(notaId)) return;
  const db = (await crearClienteServidor())!;
  await db.from('notas_alumnos').update({ estado: 'conversada' }).eq('id', notaId).eq('tipo', 'pregunta');
  refresh();
}
