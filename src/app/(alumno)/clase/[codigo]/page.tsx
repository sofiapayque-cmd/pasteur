import { redirect } from 'next/navigation';
import Entrar from '@/pantallas/nino/Entrar';
import IngresoCuenta from '@/pantallas/nino/IngresoCuenta';
import { aulasReales } from '@/lib/supabase/config';
import { obtenerAlumno } from '@/datos/alumno';

/* /clase/[codigo] · Niño · Entrar con el código ya puesto (link o QR de la maestra) */

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  if (!aulasReales) return <Entrar />;
  if (await obtenerAlumno()) redirect('/lab');
  const { codigo } = await params;
  return <IngresoCuenta codigoInicial={codigo} />;
}
