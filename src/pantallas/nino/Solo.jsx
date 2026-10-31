import { Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import MarcoActividad from '../../components/MarcoActividad';
import Cargando from '../../components/Cargando';
import { EXPERIENCIAS } from '../../actividades/componentes';
import { useProgreso } from '../../sala/progreso';
import { ACTIVIDADES } from '../../data/contenido';

/* MODO INDIVIDUAL: cualquier actividad, sin sala (también sirve para que la maestra la pruebe). */
export default function Solo() {
  const { act } = useParams();
  const Experiencia = EXPERIENCIAS[act];
  const progreso = useProgreso(Experiencia ? act : 'a1');
  const disponible = ACTIVIDADES.find((a) => a.id === act)?.disponible;
  if (!Experiencia || !disponible) return <Navigate to="/explorar" replace />;
  return (
    <MarcoActividad actividadId={act} progreso={progreso}>
      <Suspense fallback={<Cargando />}>
        <Experiencia progreso={progreso} />
      </Suspense>
    </MarcoActividad>
  );
}
