import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import PedirAcceso from '@/pantallas/maestra/acceso/PedirAcceso';

/* /pedir-acceso · Una escuela o maestra pide entrar a la plataforma (solo con el sistema de aulas prendido). */
export const metadata: Metadata = { title: 'Pedí acceso · La ciencia sin límites' };

export default function Page() {
  if (!aulasReales) redirect('/');
  return <PedirAcceso />;
}
