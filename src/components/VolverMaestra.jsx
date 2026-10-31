import { useNavigate } from 'react-router-dom';
import { useSala } from '../sala/sala';

/*
  Botón para volver a la vista de la maestra desde las pantallas del niño.
  En el prototipo todo pasa en la misma computadora, así que la maestra
  necesita poder volver a su panel (o al tablero de la sala abierta).
*/
export function rutaMaestra(sala) {
  if (sala?.actividad && sala.estado && sala.estado !== 'cerrada') {
    if (sala.estado === 'puesta') return `/maestra/${sala.actividad}/puesta`;
    if (sala.estado === 'esperando') return `/maestra/${sala.actividad}/sala`;
    return `/maestra/${sala.actividad}/tablero`;
  }
  return '/maestra';
}

export default function VolverMaestra({ destino, className = '' }) {
  const navegar = useNavigate();
  const sala = useSala();
  const a = destino || rutaMaestra(sala);
  return (
    <button type="button" className={`volver-maestra ${className}`} onClick={() => navegar(a)} title="Volver a la vista de la maestra">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Vista de la maestra
    </button>
  );
}
