import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { obtenerAula } from '@/datos/aulas';
import { mandarActividad } from '@/acciones/tareas';
import MandarActividad from '@/pantallas/maestra/aulas/MandarActividad';

/* /maestra/aulas/[id]/mandar · Mandar una actividad a un aula de la maestra (si no es suya: 404). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const { id } = await params;
  const aula = await obtenerAula(id);
  if (!aula) notFound();
  if (aula.archivada_en) redirect(`/maestra/aulas/${aula.id}`);
  return (
    <MandarActividad
      aula={{ id: aula.id, nombre: aula.nombre }}
      cuenta={docente.nombre || docente.email || 'Maestra'}
      accion={mandarActividad.bind(null, aula.id)}
    />
  );
}
