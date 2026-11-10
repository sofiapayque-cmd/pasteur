'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import './hero.css';
import { CELULAS, CIENTIFICOS, LENTE } from './escena';
import FloatingCells from './FloatingCells';
import HeroScientists from './HeroScientists';
import HeroTitle from './HeroTitle';
import InteractiveMagnifier, { LupaMango } from './InteractiveMagnifier';

/*
  PORTADA ILUSTRADA (hero editorial)
  Etapa B: composición estática con las ilustraciones reales.

  Capas, de atrás hacia adelante (todas dentro de una "escena" de 1920 × 1080
  unidades que se escala para entrar en la pantalla):
  1. células que flotan · 2. mango de la lupa · 3. científicos ·
  4. lupa (vidrio con la copia ampliada + aro) · 5. textos y enlaces.

  'use client' porque en las etapas C y D se suman las animaciones con GSAP.
*/
const ENTRAR_A = '/rol';

/* Medidas de la lupa para el CSS: salen de escena.ts (una sola fuente). */
const VARIABLES_LENTE = {
  '--lente-x': LENTE.x,
  '--lente-y': LENTE.y,
  '--lente-r': LENTE.radio,
  '--lente-aro': LENTE.aro,
} as CSSProperties;

export default function HeroEditorial() {
  return (
    <div className="hero" style={VARIABLES_LENTE}>
      <div className="hero__escena">
        <div
          className="hero__ilustracion"
          role="img"
          aria-label="Tres científicas y científicos miran células por una lupa gigante."
        >
          <FloatingCells celulas={CELULAS} />
          <LupaMango />
          <HeroScientists cientificos={CIENTIFICOS} />
          <InteractiveMagnifier celulas={CELULAS} />
        </div>
        <HeroTitle entrarA={ENTRAR_A} />
        {/* La lupa también lleva a entrar (para el mouse; el teclado usa el subtítulo). */}
        <Link className="hero__lente-enlace" href={ENTRAR_A} tabIndex={-1} aria-hidden="true" />
      </div>
    </div>
  );
}
