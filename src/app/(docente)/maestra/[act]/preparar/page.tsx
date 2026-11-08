import Preparar from '@/pantallas/maestra/Preparar';
import { redirect } from 'next/navigation';
import { IDS_ACTIVIDAD } from '@/tipos/actividad';
import { aulasReales } from '@/lib/supabase/config';

/* /maestra/[act]/preparar · Preparar la clase */

// Es la sala de prueba del prototipo (vive en el navegador). Con el sistema real de aulas
// prendido, la clase se arma desde "Mis aulas": este enlace viejo lleva ahí (8/11).

// Las cuatro actividades se generan al compilar (a1…a4); otra dirección la resuelve la pantalla.
export function generateStaticParams() {
  return IDS_ACTIVIDAD.map((act) => ({ act }));
}

export default async function Page({ params }: { params: Promise<{ act: string }> }) {
  if (aulasReales) redirect('/maestra/aulas');
  const { act } = await params;
  // key: al pasar de una actividad a otra la pantalla se monta de nuevo (arreglo de la etapa 2)
  return <Preparar key={act} />;
}
