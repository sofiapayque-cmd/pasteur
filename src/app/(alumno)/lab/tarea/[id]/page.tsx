import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirAlumno } from '@/datos/alumno';
import { abrirTareaDelAlumno } from '@/datos/tareas';
import { actividad as datosActividad, esActividadDisponible } from '@/lib/aulas/tareas';
import SoloNavegador from '@/navegacion/SoloNavegador';
import TareaAlumno from '@/pantallas/nino/TareaAlumno';
import Moli from '@/components/Moli';
import '@/pantallas/nino/cuenta.css';

/*
  /lab/tarea/[id] · El alumno hace una tarea de su maestra, con el avance
  guardado en la base. Si la tarea no es de su aula, 404 (la base no la
  devuelve). Si la maestra la cerró, se lo dice.
*/
export const metadata: Metadata = { title: 'Tu actividad', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const alumno = await exigirAlumno();
  const { id } = await params;
  const abierta = await abrirTareaDelAlumno(id);
  if (!abierta || !esActividadDisponible(abierta.tarea.actividad)) notFound();
  const { tarea, avance } = abierta;

  if (tarea.estado !== 'activa') {
    return (
      <main className="pantalla lab">
        <section className="lab__saludo">
          <div aria-hidden="true">
            <Moli animo="duda" tamano={150} />
          </div>
          <div>
            <h1>Tu maestra cerró esta actividad</h1>
            <p>{datosActividad(tarea.actividad)?.nombre}. Lo que hiciste quedó guardado.</p>
            <p style={{ marginTop: 16 }}>
              <Link className="btn btn--primario" href="/lab">
                Volver a mi laboratorio
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <SoloNavegador>
      <TareaAlumno
        tareaId={tarea.id}
        actividad={tarea.actividad as 'a1' | 'a2' | 'a3' | 'a4'}
        inicial={{ etapa: avance.etapa, datos: avance.datos ?? {} }}
        opciones={tarea.opciones ?? {}}
        desbloqueos={tarea.desbloqueos ?? {}}
        apodo={alumno.apodo}
      />
    </SoloNavegador>
  );
}
