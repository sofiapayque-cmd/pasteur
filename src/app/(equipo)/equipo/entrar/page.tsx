import { notFound, redirect } from 'next/navigation';
import { equipoReal } from '@/lib/supabase/config';
import { obtenerMiembro } from '@/datos/equipo';
import { IngresoEquipo } from '@/pantallas/equipo/Acceso';

/* /equipo/entrar · Ingreso del equipo del Pasteur (solo con NEXT_PUBLIC_ASISTENTE=1) */
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!equipoReal) notFound();
  if (await obtenerMiembro()) redirect('/equipo');
  const { error } = await searchParams;
  return <IngresoEquipo aviso={error === 'link' ? 'El link venció o ya se usó. Entrá con tu contraseña o pedile uno nuevo a la admin.' : undefined} />;
}
