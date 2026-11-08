import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import Recuperar from '@/pantallas/maestra/acceso/Recuperar';

/* /maestra/recuperar · Pedir un link para elegir otra contraseña */
export default function Page() {
  if (!aulasReales) redirect('/maestra');
  return <Recuperar />;
}
