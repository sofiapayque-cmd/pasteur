import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { obtenerAula } from '@/datos/aulas';
import { listarTareas } from '@/datos/tareas';
import { claseAbiertaDeAula, instantaneaMaestra } from '@/datos/claseEnVivo';
import { abrirClase, abrirClaseConTarea } from '@/acciones/claseEnVivo';
import { actividad as datosActividad } from '@/lib/aulas/tareas';
import SoloNavegador from '@/navegacion/SoloNavegador';
import MandarActividad from '@/pantallas/maestra/aulas/MandarActividad';
import TareasParaClase from '@/pantallas/maestra/aulas/TareasParaClase';
import ClaseEnVivo from '@/pantallas/maestra/aulas/ClaseEnVivo';

/*
  /maestra/aulas/[id]/en-vivo · La clase en vivo del aula (etapa 5, parte 2).
  · Si hay una abierta: sala de espera, tablero o puesta en común, según cómo esté.
  · Si no: elegir la actividad (o una tarea ya mandada) y abrirla.
  Si el aula no es de la maestra, la base no la devuelve: 404.
*/
const fecha = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', timeZone: 'America/Montevideo' });

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const { id } = await params;
  const aula = await obtenerAula(id);
  if (!aula) notFound();

  const abierta = await claseAbiertaDeAula(aula.id);
  if (abierta) {
    const inst = await instantaneaMaestra(abierta.id);
    if (!inst) notFound();
    return (
      <SoloNavegador>
        <ClaseEnVivo inicial={inst} />
      </SoloNavegador>
    );
  }

  if (aula.archivada_en) redirect(`/maestra/aulas/${aula.id}`);
  const tareas = (await listarTareas(aula.id)).filter((t) => t.estado === 'activa');
  return (
    <MandarActividad
      modo="clase"
      aula={{ id: aula.id, nombre: aula.nombre }}
      cuenta={docente.nombre || docente.email || 'Maestra'}
      accion={abrirClase.bind(null, aula.id)}
      extra={
        <TareasParaClase
          accion={abrirClaseConTarea.bind(null, aula.id)}
          tareas={tareas.map((t) => {
            const act = datosActividad(t.actividad);
            return {
              id: t.id,
              nombre: `${act?.numero ?? ''} · ${act?.nombre ?? t.actividad}`,
              detalle: `Mandada el ${fecha.format(new Date(t.creada_en))} · ${t.empezaron} ${t.empezaron === 1 ? 'empezó' : 'empezaron'}`,
            };
          })}
        />
      }
    />
  );
}
