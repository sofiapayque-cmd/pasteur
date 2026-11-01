import SalaEspera from '@/pantallas/maestra/SalaEspera';
import { IDS_ACTIVIDAD } from '@/tipos/actividad';

/* /maestra/[act]/sala · Sala de espera (proyectada en el pizarrón) */

// Las cuatro actividades se generan al compilar (a1…a4); otra dirección la resuelve la pantalla.
export function generateStaticParams() {
  return IDS_ACTIVIDAD.map((act) => ({ act }));
}

export default function Page() {
  return <SalaEspera />;
}
