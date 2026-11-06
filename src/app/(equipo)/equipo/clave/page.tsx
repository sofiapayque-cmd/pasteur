import { notFound, redirect } from 'next/navigation';
import { equipoReal } from '@/lib/supabase/config';
import { obtenerMiembro } from '@/datos/equipo';
import { ClaveEquipo } from '@/pantallas/equipo/Acceso';

/* /equipo/clave · Elegir contraseña (llega desde el link de invitación o desde un link nuevo) */
export default async function Page() {
  if (!equipoReal) notFound();
  const miembro = await obtenerMiembro();
  if (!miembro) redirect('/equipo/entrar?error=link');
  return <ClaveEquipo email={miembro.email} />;
}
