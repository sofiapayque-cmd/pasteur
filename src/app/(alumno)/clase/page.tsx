import { redirect } from 'next/navigation';
import Entrar from '@/pantallas/nino/Entrar';
import IngresoCuenta from '@/pantallas/nino/IngresoCuenta';
import { aulasReales } from '@/lib/supabase/config';
import { obtenerAlumno } from '@/datos/alumno';

/*
  /clase · Niño · Entrar.
  Con el sistema de aulas: código del aula + número + clave de su tarjeta
  (si ya entró, va a su laboratorio). Sin él: el código de la sala de prueba.
*/
export default async function Page() {
  if (!aulasReales) return <Entrar />;
  if (await obtenerAlumno()) redirect('/lab');
  return <IngresoCuenta />;
}
