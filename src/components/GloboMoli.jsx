'use client';

import { useEffect, useState } from 'react';
import Moli from './Moli';
import { useMediaQuery } from '../hooks/navegador';

/*
  Moli abajo a la derecha con un globo de diálogo (máximo dos líneas).

  En pantallas chicas (hasta 1100 de ancho o 740 de alto: la Ceibal de
  1024×600, o una compu con el navegador abierto) el globo
  tapaba botones de las actividades: "Mirar por el ocular" en A3, la barra
  del pH en A2, un disco de antibiótico en A1 (revisión del 7/11, ver
  docs/REVISION-EXPERIENCIAS.md). Ahí:
  · Moli es un poco más chico;
  · el globo aparece cada vez que Moli dice algo nuevo y a los pocos segundos
    se guarda;
  · tocando a Moli se vuelve a ver.
  En pantallas grandes no cambia nada.
*/
const SEGUNDOS = 7;
export const PANTALLA_CHICA = '(max-width: 1100px), (max-height: 740px)';

export default function GloboMoli({ texto, animo = 'feliz', tamano = 120 }) {
  const chica = useMediaQuery(PANTALLA_CHICA);
  // El texto que ya se guardó (en pantallas chicas). Si Moli dice otra cosa, vuelve a aparecer.
  const [guardado, setGuardado] = useState(null);
  const guardadoAhora = chica && Boolean(texto) && guardado === texto;

  useEffect(() => {
    if (!chica || !texto || guardado === texto) return undefined;
    const t = setTimeout(() => setGuardado(texto), SEGUNDOS * 1000);
    return () => clearTimeout(t);
  }, [chica, texto, guardado]);

  const moli = <Moli animo={animo} estilo="plano" patas tamano={chica ? Math.round(tamano * 0.72) : tamano} />;
  return (
    <div className={`globo-moli${guardadoAhora ? ' globo-moli--guardado' : ''}`} aria-live="polite">
      {texto && <p className="globo-moli__texto">{texto}</p>}
      {chica && texto ? (
        <button
          type="button"
          className="globo-moli__boton"
          onClick={() => setGuardado(guardadoAhora ? null : texto)}
          aria-label={guardadoAhora ? 'Ver lo que dice Moli' : 'Guardar lo que dice Moli'}
          aria-expanded={!guardadoAhora}
        >
          {moli}
        </button>
      ) : (
        moli
      )}
    </div>
  );
}
