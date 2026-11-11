/* eslint-disable @next/next/no-img-element -- imágenes ya optimizadas (WebP a su tamaño) que se escalan con la escena y anima GSAP; next/image no suma nada acá */
import type { CSSProperties } from 'react';
import { CELULA_ALTO, ESCALA_MARCO, ESCENA, LENTE, MARCO, PUNTA, RADIO_VIDRIO, REFLEJOS, enLaLente, type Celula } from './escena';
import { CELULA_SRC } from './FloatingCells';

/*
  LUPA
  Una sola pieza (data-lupa) que se mueve entera, detrás de los científicos.
  Gira y crece desde la punta del mango (animarPortada.ts). Adentro, de
  atrás hacia adelante:
  1. La ilustración completa (lupa-marco): mango, conector y aro.
  2. El vidrio. NO es una imagen cerrada: adentro hay una segunda capa con
     las mismas células (misma lista y mismo estado que las de afuera),
     agrandadas respecto del centro óptico y recortadas por el círculo.
     Encima, los brillos (lupa-reflejos).
  3. Otra vez lupa-marco, recortada al aro, para que el aro tape el borde
     de lo ampliado.
*/

/* Dónde va la imagen de la lupa, en unidades: el centro de su vidrio cae en el centro óptico. */
const VARIABLES_MARCO = {
  '--x': LENTE.x - MARCO.vidrioX * ESCALA_MARCO,
  '--y': LENTE.y - MARCO.vidrioY * ESCALA_MARCO,
  '--w': MARCO.ancho * ESCALA_MARCO,
  '--h': MARCO.alto * ESCALA_MARCO,
  '--corte-r': MARCO.radioCorte * ESCALA_MARCO,
  '--corte-x': MARCO.vidrioX * ESCALA_MARCO,
  '--corte-y': MARCO.vidrioY * ESCALA_MARCO,
} as CSSProperties;

/* La lupa gira y crece desde la punta del mango. */
const VARIABLES_LUPA = {
  '--punta-x': `${(PUNTA.x / ESCENA.ancho) * 100}%`,
  '--punta-y': `${(PUNTA.y / ESCENA.alto) * 100}%`,
} as CSSProperties;

function ImagenMarco({ className }: { className: string }) {
  return (
    <img
      src={MARCO.src}
      alt=""
      width={MARCO.ancho}
      height={MARCO.alto}
      draggable={false}
      className={`hero-marco ${className}`}
      style={VARIABLES_MARCO}
    />
  );
}

/* Los brillos se agrandan para que el borde de su disco coincida con el borde del vidrio. */
const ESCALA_REFLEJOS = RADIO_VIDRIO / REFLEJOS.radio;
const VARIABLES_REFLEJOS = {
  '--x': RADIO_VIDRIO - REFLEJOS.centroX * ESCALA_REFLEJOS,
  '--y': RADIO_VIDRIO - REFLEJOS.centroY * ESCALA_REFLEJOS,
  '--w': REFLEJOS.ancho * ESCALA_REFLEJOS,
  '--h': REFLEJOS.alto * ESCALA_REFLEJOS,
} as CSSProperties;

export default function InteractiveMagnifier({ celulas }: { celulas: Celula[] }) {
  return (
    <div className="hero-lupa" data-lupa style={VARIABLES_LUPA}>
      <ImagenMarco className="hero-marco--mango" />
      <div className="hero-lente">
        <div className="hero-lente__ampliado" data-ampliado>
          {celulas.map((c) => {
            // posición con la lupa en reposo y la célula en su lugar; el movimiento se suma encima
            const p = enLaLente(c);
            return (
              <img
                key={c.id}
                src={CELULA_SRC}
                alt=""
                width={640}
                height={602}
                draggable={false}
                decoding="async"
                className="hero-celula hero-celula--ampliada"
                data-capa="adentro"
                data-celula={c.id}
                style={
                  {
                    '--x': p.x,
                    '--y': p.y,
                    '--d': p.d,
                    '--h': p.d * CELULA_ALTO,
                    '--giro': `${c.giro}deg`,
                    visibility: p.visible ? 'visible' : 'hidden',
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
        <img
          src={REFLEJOS.src}
          alt=""
          width={REFLEJOS.ancho}
          height={REFLEJOS.alto}
          draggable={false}
          className="hero-lente__reflejos"
          style={VARIABLES_REFLEJOS}
        />
      </div>
      <ImagenMarco className="hero-marco--aro" />
    </div>
  );
}
