/* eslint-disable @next/next/no-img-element -- imágenes ya optimizadas (WebP a su tamaño) que se escalan con la escena y después anima GSAP; next/image no suma nada acá */
import type { CSSProperties } from 'react';
import { PISO, type Cientifico } from './escena';

/* Margen transparente que dejé alrededor de cada recorte (en píxeles del archivo). */
const MARGEN_RECORTE = 6;

/*
  Los tres científicos, agrupados al pie de la lupa.
  Cada uno es una imagen aparte (recortada de su hoja de rotación), no la
  lámina completa. Apoyan en el piso con una sombra suave: no flotan.
  Se mueven (animarPortada.ts) solo girando apenas desde los pies.
*/
export default function HeroScientists({ cientificos }: { cientificos: Cientifico[] }) {
  return (
    <div className="hero-cientificos">
      <span className="hero-cientificos__sombra" />
      {cientificos.map((c) => {
        // el borde de abajo de la imagen queda apenas debajo del piso, por el margen del recorte
        const abajo = PISO + (MARGEN_RECORTE * c.h) / c.alto;
        return (
          <img
            key={c.id}
            src={c.src}
            alt=""
            width={c.ancho}
            height={c.alto}
            draggable={false}
            className={`hero-cientifico hero-cientifico--${c.id}`}
            data-cientifico={c.id}
            style={
              {
                '--x': c.x,
                '--h': c.h,
                '--w': (c.h * c.ancho) / c.alto,
                '--abajo': abajo,
                // los pies: el punto desde el que se balancean
                '--pies': `${((c.alto - MARGEN_RECORTE) / c.alto) * 100}%`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
