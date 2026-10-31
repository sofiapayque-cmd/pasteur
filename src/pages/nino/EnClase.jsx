import { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import MarcoActividad from '../../components/MarcoActividad';
import Cargando from '../../components/Cargando';
import { EXPERIENCIAS } from '../../actividades/componentes';
import { useSala, yo } from '../../sala/sala';
import { useProgreso } from '../../sala/progreso';

/* NIÑO · LA ACTIVIDAD EN CLASE (la que eligió la maestra al abrir la sala) */
export default function EnClase() {
  const sala = useSala();
  const mio = yo(sala);
  const progreso = useProgreso(sala.actividad || 'a1');

  if (!mio || sala.estado === 'cerrada' || !sala.actividad) return <Navigate to="/clase" replace />;

  const Experiencia = EXPERIENCIAS[sala.actividad];
  return (
    <MarcoActividad actividadId={sala.actividad} progreso={progreso}>
      <Suspense fallback={<Cargando />}>
        <Experiencia progreso={progreso} />
      </Suspense>
    </MarcoActividad>
  );
}
