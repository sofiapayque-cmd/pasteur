import type { Metadata } from 'next';
import { exigirAlumno } from '@/datos/alumno';
import Laboratorio from '@/pantallas/nino/Laboratorio';

/*
  /lab · El laboratorio del alumno (sistema de aulas, etapa 4).
  Solo con una cuenta de alumno activa (si no, a /clase).
*/
export const metadata: Metadata = { title: 'Tu laboratorio', robots: { index: false } };

export default async function Page() {
  return <Laboratorio alumno={await exigirAlumno()} />;
}
