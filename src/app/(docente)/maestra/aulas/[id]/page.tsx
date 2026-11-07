import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAlumnos, obtenerAula } from '@/datos/aulas';
import { listarTareas } from '@/datos/tareas';
import { claseAbiertaDeAula } from '@/datos/claseEnVivo';
import AulaDetalle from '@/pantallas/maestra/aulas/AulaDetalle';

/* /maestra/aulas/[id] · Un aula de la maestra. Si no es suya, la base no la devuelve: 404. */

export const maxDuration = 60;

const anioActual = () => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Montevideo' }).format(new Date()));

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const { id } = await params;
  const aula = await obtenerAula(id);
  if (!aula) notFound();
  const [alumnos, tareas, clase] = await Promise.all([listarAlumnos(aula.id), listarTareas(aula.id), claseAbiertaDeAula(aula.id)]);
  return (
    <AulaDetalle
      aula={aula}
      alumnos={alumnos}
      tareas={tareas}
      claseAbierta={clase ? clase.estado : null}
      cuenta={docente.nombre || docente.email || 'Maestra'}
      anioActual={anioActual()}
    />
  );
}
