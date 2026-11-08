import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { obtenerDocente } from '@/datos/docente';
import ElegirClave from '@/pantallas/maestra/acceso/ElegirClave';

/* /maestra/clave · Elegir contraseña (llega desde el link de invitación o de recuperación) */
export default async function Page() {
  if (!aulasReales) redirect('/maestra');
  const docente = await obtenerDocente();
  if (!docente) redirect('/maestra/entrar?error=link');
  return <ElegirClave email={docente.email} />;
}
