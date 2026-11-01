import SoloNavegador from '@/navegacion/SoloNavegador';
import Espera from '@/pantallas/nino/Espera';

/* /clase/espera · Niño · Espera */

export default function Page() {
  // Solo en el navegador: depende de la sala guardada en este navegador.
  return (
    <SoloNavegador>
      <Espera />
    </SoloNavegador>
  );
}
