import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAlumnos, obtenerAula } from '@/datos/aulas';
import { obtenerTareaDeMaestra } from '@/datos/tareas';
import { salaDeTarea } from '@/lib/aulas/clase';
import SoloNavegador from '@/navegacion/SoloNavegador';
import PuestaDeTarea from '@/pantallas/maestra/aulas/PuestaDeTarea';

/*
  /maestra/aulas/[id]/tareas/[tarea]/puesta · Lo que encontró la clase en una
  tarea, con la misma pantalla de la puesta en común (para proyectar y
  conversar, aunque no haya sido en vivo). Solo para mirar.
*/
export default async function Page({ params }: { params: Promise<{ id: string; tarea: string }> }) {
  if (!aulasReales) redirect('/maestra');
  await exigirDocenteActiva();
  const { id, tarea: tareaId } = await params;
  const aula = await obtenerAula(id);
  if (!aula) notFound();
  const datos = await obtenerTareaDeMaestra(aula.id, tareaId);
  if (!datos) notFound();
  const alumnos = await listarAlumnos(aula.id);
  const { tarea, avances } = datos;
  const sala = salaDeTarea(
    { id: aula.id, nombre: aula.nombre, codigo: aula.codigo },
    { id: tarea.id, actividad: tarea.actividad, opciones: tarea.opciones, desbloqueos: tarea.desbloqueos, estado: tarea.estado },
    alumnos.map((a) => ({ id: a.id, numero: a.numero, apodo: a.apodo, color: a.color ?? null, activo: a.activo })),
    avances.map((a) => ({ alumno_id: a.alumno_id, etapa: a.etapa, datos: a.datos, actualizado_en: a.actualizado_en, completada_en: a.completada_en })),
  );
  return (
    <SoloNavegador>
      <PuestaDeTarea sala={sala} aula={{ id: aula.id, nombre: aula.nombre }} volverA={`/maestra/aulas/${aula.id}/tareas/${tarea.id}`} />
    </SoloNavegador>
  );
}
