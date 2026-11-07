import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAlumnos, obtenerAula } from '@/datos/aulas';
import { obtenerTareaDeMaestra } from '@/datos/tareas';
import { cambiarDesbloqueo, cambiarEstadoTarea } from '@/acciones/tareas';
import { desbloqueosDe } from '@/lib/aulas/tareas';
import ComoVaTarea from '@/pantallas/maestra/aulas/ComoVaTarea';

/* /maestra/aulas/[id]/tareas/[tarea] · Cómo va una tarea del aula (si no es de la maestra: 404). */
export default async function Page({ params }: { params: Promise<{ id: string; tarea: string }> }) {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const { id, tarea: tareaId } = await params;
  const aula = await obtenerAula(id);
  if (!aula) notFound();
  const datos = await obtenerTareaDeMaestra(aula.id, tareaId);
  if (!datos) notFound();
  const alumnos = await listarAlumnos(aula.id);
  const { tarea, avances } = datos;
  const filas = alumnos.map((a) => {
    const av = avances.find((x) => x.alumno_id === a.id);
    return { id: a.id, numero: a.numero, apodo: a.apodo, activo: a.activo, etapa: av?.etapa ?? null, actualizado: av?.actualizado_en ?? null, terminada: Boolean(av?.completada_en) };
  });
  return (
    <ComoVaTarea
      aula={{ id: aula.id, nombre: aula.nombre }}
      tarea={{ id: tarea.id, actividad: tarea.actividad, estado: tarea.estado, creada_en: tarea.creada_en }}
      filas={filas}
      cuenta={docente.nombre || docente.email || 'Maestra'}
      cerrar={cambiarEstadoTarea.bind(null, tarea.id, 'cerrada')}
      reabrir={cambiarEstadoTarea.bind(null, tarea.id, 'activa')}
      desbloqueos={desbloqueosDe(tarea.actividad).map((d) => ({
        clave: d.clave,
        etiqueta: d.etiqueta,
        habilitado: tarea.desbloqueos?.[d.clave] !== false,
        habilitar: cambiarDesbloqueo.bind(null, tarea.id, d.clave, true),
        cerrar: cambiarDesbloqueo.bind(null, tarea.id, d.clave, false),
      }))}
    />
  );
}
