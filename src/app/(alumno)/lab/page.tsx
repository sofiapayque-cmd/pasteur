import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { exigirAlumno } from '@/datos/alumno';
import { tareasDelAlumno } from '@/datos/tareas';
import { claseDelAlumno } from '@/datos/claseEnVivo';
import { esReciente } from '@/lib/aulas/clase';
import Laboratorio from '@/pantallas/nino/Laboratorio';

/*
  /lab · El laboratorio del alumno (sistema de aulas, etapa 4).
  Solo con una cuenta de alumno activa (si no, a /clase).
  Si su maestra abrió una clase en vivo, se muestra arriba para entrar; y si
  recién entró con su tarjeta (?recien=1), ya tiene apodo y la clase es de
  hoy, va directo a la clase.
*/
export const metadata: Metadata = { title: 'Tu laboratorio', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ recien?: string }> }) {
  const alumno = await exigirAlumno();
  const [tareas, clase, sp] = await Promise.all([tareasDelAlumno(), claseDelAlumno(), searchParams]);
  if (sp.recien === '1' && clase && alumno.apodo && esReciente(clase.sesion.iniciada_en)) redirect('/lab/clase');
  return <Laboratorio alumno={alumno} tareas={tareas} clase={clase ? { actividad: clase.asignacion.actividad, estado: clase.sesion.estado } : null} />;
}
