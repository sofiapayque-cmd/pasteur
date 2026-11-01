import Puesta from '@/pantallas/maestra/Puesta';
import { IDS_ACTIVIDAD } from '@/tipos/actividad';

/* /maestra/[act]/puesta · Puesta en común */

// Las cuatro actividades se generan al compilar (a1…a4); otra dirección la resuelve la pantalla.
export function generateStaticParams() {
  return IDS_ACTIVIDAD.map((act) => ({ act }));
}

export default function Page() {
  return <Puesta />;
}
