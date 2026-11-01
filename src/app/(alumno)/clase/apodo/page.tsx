import SoloNavegador from '@/navegacion/SoloNavegador';
import Apodo from '@/pantallas/nino/Apodo';

/* /clase/apodo · Niño · Apodo y color */

export default function Page() {
  // Solo en el navegador: depende de la sala guardada en este navegador.
  return (
    <SoloNavegador>
      <Apodo />
    </SoloNavegador>
  );
}
