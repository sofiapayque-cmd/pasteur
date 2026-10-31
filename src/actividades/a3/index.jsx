import { useEffect, useRef } from 'react';
import { MUESTRA, buscarMision } from './contenido';
import Muestras from './pantallas/Muestras';
import Misiones from './pantallas/Misiones';
import Preparar from './pantallas/Preparar';
import Microscopio from './pantallas/Microscopio';
import Identificar from './pantallas/Identificar';
import Galeria from './pantallas/Galeria';
import './a3.css';

/*
  A3 · Bioimagenología: un microscopio virtual.
  El niño elige una muestra y un caso, prepara el microscopio, investiga (mover, aumento, enfoque,
  profundidad, canales de fluorescencia), saca fotos, señala lo que encontró y arma su álbum.
  La etapa visible siempre sale de progreso.etapa.
*/
export default function ActividadA3({ progreso }) {
  // Estado vivo que no se guarda en la sala: zonas iluminadas (fotoblanqueo) y última vista por muestra
  const vivo = useRef({ expos: {}, vistas: {} });
  const { etapa, datos } = progreso;
  const muestra = datos.muestra && MUESTRA[datos.muestra] ? MUESTRA[datos.muestra] : null;
  const mision = muestra ? buscarMision(muestra.id, datos.mision) : null;

  // Si falta algo (por ejemplo, se reinició), volver al paso que corresponde
  const falta = etapa !== 'muestra' && !muestra ? 'muestra' : ['preparar', 'microscopio', 'identificar'].includes(etapa) && !mision ? 'mision' : null;
  useEffect(() => {
    if (falta) progreso.ir(falta);
  }, [falta]); // eslint-disable-line react-hooks/exhaustive-deps

  if (falta === 'muestra' || etapa === 'muestra') return <Muestras progreso={progreso} />;
  if (falta === 'mision' || etapa === 'mision') return <Misiones progreso={progreso} muestra={muestra} />;
  if (etapa === 'preparar') return <Preparar progreso={progreso} muestra={muestra} mision={mision} />;
  if (etapa === 'microscopio') return <Microscopio progreso={progreso} muestra={muestra} mision={mision} vivo={vivo.current} />;
  if (etapa === 'identificar') return <Identificar progreso={progreso} muestra={muestra} mision={mision} />;
  if (etapa === 'galeria') return <Galeria progreso={progreso} />;
  return <Muestras progreso={progreso} />;
}
