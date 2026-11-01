import SoloNavegador from '@/navegacion/SoloNavegador';
import EnClase from '@/pantallas/nino/EnClase';

/* /clase/actividad · Niño · La actividad de la clase */

export default function Page() {
  // Solo en el navegador: actividad con Canvas y avance guardado en esta pestaña.
  return (
    <SoloNavegador>
      <EnClase />
    </SoloNavegador>
  );
}
