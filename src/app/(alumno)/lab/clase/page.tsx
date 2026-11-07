import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirAlumno } from '@/datos/alumno';
import { claseDelAlumno } from '@/datos/claseEnVivo';
import { abrirTareaDelAlumno } from '@/datos/tareas';
import { esActividadDisponible } from '@/lib/aulas/tareas';
import SoloNavegador from '@/navegacion/SoloNavegador';
import ClaseAlumno from '@/pantallas/nino/ClaseAlumno';
import '@/pantallas/nino/cuenta.css';

/*
  /lab/clase · El alumno en la clase en vivo de su aula.
  Si no hay ninguna abierta, vuelve a su laboratorio. Al entrar se crea su
  fila de avance (así la maestra lo ve en la sala de espera).
*/
export const metadata: Metadata = { title: 'Clase en vivo', robots: { index: false } };

export default async function Page() {
  const alumno = await exigirAlumno();
  const clase = await claseDelAlumno();
  if (!clase || !esActividadDisponible(clase.asignacion.actividad)) redirect('/lab');
  const abierta = await abrirTareaDelAlumno(clase.asignacion.id);
  if (!abierta) redirect('/lab');
  const { tarea, avance } = abierta;
  return (
    <SoloNavegador>
      <ClaseAlumno
        sesion={clase.sesion}
        tarea={{
          id: tarea.id,
          actividad: tarea.actividad as 'a1' | 'a2' | 'a3' | 'a4',
          opciones: tarea.opciones ?? {},
          desbloqueos: tarea.desbloqueos ?? {},
          abierta: tarea.estado === 'activa',
        }}
        inicial={{ etapa: avance.etapa, datos: avance.datos ?? {} }}
        alumno={{ apodo: alumno.apodo, numero: alumno.numero, color: alumno.color }}
      />
    </SoloNavegador>
  );
}
