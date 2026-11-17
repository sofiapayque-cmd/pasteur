import type { Metadata } from 'next';
import { exigirAlumno } from '@/datos/alumno';
import { cuadernoDelAlumno } from '@/datos/cuadernos';
import FondoVivo from '@/components/FondoVivo';
import CuadernoAlumno from '@/pantallas/nino/cuenta/CuadernoAlumno';
import { CabeceraLab, PestanasLab } from '@/pantallas/nino/cuenta/PestanasLab';
import '@/pantallas/nino/cuenta/cuenta.css';

/* /lab/cuaderno · "Mi cuaderno" del alumno (migración 25). Solo con una cuenta de alumno activa. */
export const metadata: Metadata = { title: 'Mi cuaderno', robots: { index: false } };

export default async function Page() {
  const alumno = await exigirAlumno();
  const cuaderno = await cuadernoDelAlumno(alumno);
  return (
    <main className="pantalla lab">
      <FondoVivo semilla={7} opacidad={0.3} />
      <CabeceraLab aula={alumno.aula.nombre} />
      <h1 className="lab__titulo">Mi cuaderno</h1>
      <PestanasLab activa="cuaderno" />
      <CuadernoAlumno cuaderno={cuaderno} />
    </main>
  );
}
