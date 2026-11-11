/* eslint-disable @next/next/no-img-element -- imágenes ya optimizadas (WebP a su tamaño) que se escalan con la escena y después anima GSAP; next/image no suma nada acá */
import type { CSSProperties } from 'react';
import { CELULA_ALTO, type Celula } from './escena';

export const CELULA_SRC = '/illustrations/hero/cells/celula.webp';

/*
  Células alrededor de la escena (capa de afuera).
  Acá quedan donde arrancan; después viajan por toda la pantalla
  (deriva.ts y animarPortada.ts), sin volver a dibujar React en cada cuadro.
*/
export default function FloatingCells({ celulas }: { celulas: Celula[] }) {
  return (
    <div className="hero-celulas">
      {celulas.map((c) => (
        <img
          key={c.id}
          src={CELULA_SRC}
          alt=""
          width={640}
          height={602}
          draggable={false}
          decoding="async"
          className="hero-celula"
          data-capa="afuera"
          data-celula={c.id}
          style={
            {
              '--x': c.x,
              '--y': c.y,
              '--d': c.d,
              '--h': c.d * CELULA_ALTO,
              '--giro': `${c.giro}deg`,
              // las grandes (más cerca) pasan por delante de las chicas
              zIndex: Math.round(c.d),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
