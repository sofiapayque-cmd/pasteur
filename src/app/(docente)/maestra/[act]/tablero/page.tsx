import SoloNavegador from '@/components/SoloNavegador';
import Tablero from '@/pantallas/maestra/Tablero';
import { redirect } from 'next/navigation';
import { IDS_ACTIVIDAD } from '@/lib/actividad';
import { aulasReales } from '@/lib/supabase/config';

/* /maestra/[act]/tablero · Tablero en vivo */

// Es la sala de prueba del prototipo (vive en el navegador). Con el sistema real de aulas
// prendido, la clase se arma desde "Mis aulas": este enlace viejo lleva ahí (8/11).

// Las tres actividades se generan al compilar (a1…a3); otra dirección la resuelve la pantalla.
export function generateStaticParams() {
  return IDS_ACTIVIDAD.map((act) => ({ act }));
}

export default function Page() {
  if (aulasReales) redirect('/maestra/aulas');
  // Solo en el navegador: depende de la sala guardada en este navegador.
  return (
    <SoloNavegador>
      <Tablero />
    </SoloNavegador>
  );
}
