import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAulas } from '@/datos/aulas';
import MisAulas from '@/pantallas/maestra/aulas/MisAulas';

/* /maestra/aulas · Mis aulas (solo con el sistema de aulas prendido) */

// Crear un aula crea también las cuentas de sus alumnos: puede tardar unos segundos.
export const maxDuration = 60;

const anioActual = () => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Montevideo' }).format(new Date()));

export default async function Page() {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const aulas = await listarAulas();
  return <MisAulas aulas={aulas} cuenta={docente.nombre || docente.email || 'Maestra'} anioActual={anioActual()} />;
}
