import Explorar from '@/pantallas/nino/Explorar';
import { puede } from '@/datos/acceso';

/*
  /explorar · Los laboratorios.
  Con sesión (alumno, maestra o equipo): elegir una actividad para hacerla.
  Sin sesión: las mismas tarjetas, para ver de qué se trata cada una (8/11).
*/
export default async function Page() {
  return <Explorar visitante={!(await puede('actividad'))} />;
}
