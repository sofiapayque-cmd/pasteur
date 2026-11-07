import type { Metadata } from 'next';
import { exigirAlumno } from '@/datos/alumno';
import { tareasDelAlumno } from '@/datos/tareas';
import Laboratorio from '@/pantallas/nino/Laboratorio';

/*
  /lab · El laboratorio del alumno (sistema de aulas, etapa 4).
  Solo con una cuenta de alumno activa (si no, a /clase).
*/
export const metadata: Metadata = { title: 'Tu laboratorio', robots: { index: false } };

export default async function Page() {
  const alumno = await exigirAlumno();
  return <Laboratorio alumno={alumno} tareas={await tareasDelAlumno()} />;
}
