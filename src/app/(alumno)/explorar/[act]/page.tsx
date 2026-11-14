import SoloNavegador from '@/navegacion/SoloNavegador';
import Solo from '@/pantallas/nino/Solo';
import FichaActividad from '@/pantallas/nino/FichaActividad';
import { puede } from '@/datos/acceso';
import { curiosidadesPara } from '@/datos/curiosidades';

/*
  /explorar/[act] · Hacer una actividad por su cuenta (modo individual).
  Desde el 8/11 ya no es pública: el servidor mira la sesión en cada pedido
  (por eso ya no se genera fija al compilar). Alumnos, maestras y equipo la
  hacen; un visitante ve la ficha de la actividad y la actividad no se arma.
  Sin el sistema real de aulas (prototipo), sigue abierta como antes.
*/
export default async function Page({ params }: { params: Promise<{ act: string }> }) {
  const { act } = await params;
  if (!(await puede('actividad'))) return <FichaActividad act={act} curiosidades={/^a[1-4]$/.test(act) ? await curiosidadesPara({ actividad: act, cuantas: 1 }) : []} />;
  // key: al pasar de una actividad a otra la pantalla se monta de nuevo (arreglo de la etapa 2)
  // Solo en el navegador: actividad con Canvas y avance guardado en esta pestaña.
  return (
    <SoloNavegador>
      <Solo key={act} />
    </SoloNavegador>
  );
}
