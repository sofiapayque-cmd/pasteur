/* eslint-disable @next/next/no-img-element -- imágenes ya optimizadas (WebP a su tamaño) que se escalan con la escena y después anima GSAP; next/image no suma nada acá */
import type { CSSProperties } from 'react';
import { CELULA_ALTO, ESCALA_MARCO, LENTE, MARCO, RADIO_VIDRIO, REFLEJOS, enLaLente, type Celula } from './escena';
import { CELULA_SRC } from './FloatingCells';

/*
  LUPA
  Tres piezas, con la misma ilustración del aro y el mango (lupa-marco):
  1. <LupaMango>: la lupa entera (el mango pasa por detrás de los científicos).
  2. <InteractiveMagnifier>: el vidrio. NO es una imagen cerrada: adentro hay
     una segunda capa con las mismas células (misma lista), agrandadas respecto
     del centro óptico y recortadas por el círculo. Encima, los brillos
     (lupa-reflejos).
  3. <LupaAro>: otra vez lupa-marco, recortada al aro, encima del vidrio.
  Las tres van detrás de los científicos: nadie sostiene la lupa.

  Etapa B: todo quieto. En la etapa D, GSAP moverá estas tres piezas juntas
  y actualizará la copia ampliada en el mismo cuadro que la capa de afuera.
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

export function LupaMango() {
  return <ImagenMarco className="hero-marco--mango" />;
}

export function LupaAro() {
  return <ImagenMarco className="hero-marco--aro" />;
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
    <div className="hero-lente">
      <div className="hero-lente__ampliado">
        {celulas.map((c) => {
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
  );
}
