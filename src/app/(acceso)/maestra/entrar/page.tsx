import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { obtenerDocente } from '@/datos/docente';
import Ingreso from '@/pantallas/maestra/acceso/Ingreso';

/* /maestra/entrar · Ingreso de la maestra (solo con el sistema de aulas prendido) */
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!aulasReales) redirect('/maestra');
  const docente = await obtenerDocente();
  if (docente?.estado === 'activa') redirect('/maestra');
  const { error } = await searchParams;
  return <Ingreso aviso={error === 'link' ? 'El link venció o ya se usó. Entrá con tu contraseña o pedí uno nuevo.' : undefined} />;
}
