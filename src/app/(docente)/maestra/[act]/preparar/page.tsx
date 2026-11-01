import Preparar from '@/pantallas/maestra/Preparar';
import { IDS_ACTIVIDAD } from '@/tipos/actividad';

/* /maestra/[act]/preparar · Preparar la clase */

// Las cuatro actividades se generan al compilar (a1…a4); otra dirección la resuelve la pantalla.
export function generateStaticParams() {
  return IDS_ACTIVIDAD.map((act) => ({ act }));
}

export default async function Page({ params }: { params: Promise<{ act: string }> }) {
  const { act } = await params;
  // key: al pasar de una actividad a otra la pantalla se monta de nuevo (arreglo de la etapa 2)
  return <Preparar key={act} />;
}
