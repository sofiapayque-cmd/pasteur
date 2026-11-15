import { redirect } from 'next/navigation';
import SoloNavegador from '@/navegacion/SoloNavegador';
import { aulasReales } from '@/lib/supabase/config';
import EnClase from '@/pantallas/nino/EnClase';

/* /clase/actividad · Niño · La actividad de la clase */

export default function Page() {
  // Pantalla del prototipo (sala en el navegador). Con el sistema real de aulas, el
  // alumno entra con su tarjeta en /clase: este enlace viejo lleva ahí (8/11).
  if (aulasReales) redirect('/clase');
  // Solo en el navegador: actividad con Canvas y avance guardado en esta pestaña.
  return (
    <SoloNavegador>
      <EnClase />
    </SoloNavegador>
  );
}
