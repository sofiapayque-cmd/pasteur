import { redirect } from 'next/navigation';
import SoloNavegador from '@/navegacion/SoloNavegador';
import { aulasReales } from '@/lib/supabase/config';
import Espera from '@/pantallas/nino/Espera';

/* /clase/espera · Niño · Espera */

export default function Page() {
  // Pantalla del prototipo (sala en el navegador). Con el sistema real de aulas, el
  // alumno entra con su tarjeta en /clase: este enlace viejo lleva ahí (8/11).
  if (aulasReales) redirect('/clase');
  // Solo en el navegador: depende de la sala guardada en este navegador.
  return (
    <SoloNavegador>
      <Espera />
    </SoloNavegador>
  );
}
