'use client';

import Link from 'next/link';
import { useEffect, useRef, type CSSProperties } from 'react';
import './hero.css';
import { animarPortada } from './animarPortada';
import { CELULAS, CIENTIFICOS, LENTE, RADIO_VIDRIO } from './escena';
import FloatingCells from './FloatingCells';
import HeroScientists from './HeroScientists';
import HeroTitle from './HeroTitle';
import InteractiveMagnifier from './InteractiveMagnifier';

/*
  PORTADA ILUSTRADA (hero editorial)

  React arma la composición quieta (todo en una "escena" de 1920 × 1080
  unidades que se escala para entrar en la pantalla). Después, animarPortada
  la pone en movimiento con GSAP, sin volver a dibujar React.

  Capas, de atrás hacia adelante:
  1. células que flotan · 2. la lupa (mango, vidrio con la copia ampliada,
  brillos y aro), que se mueve entera · 3. científicos · 4. textos y enlaces.
  Nadie sostiene la lupa: está entera detrás de los científicos.
*/
const ENTRAR_A = '/rol';

/* Medidas de la lupa para el CSS: salen de escena.ts (una sola fuente). */
const VARIABLES_LENTE = {
  '--lente-x': LENTE.x,
  '--lente-y': LENTE.y,
  '--lente-r': LENTE.radio,
  '--vidrio-r': RADIO_VIDRIO,
} as CSSProperties;

export default function HeroEditorial() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    let desarmar = animarPortada(el);
    // si cambia "reducir movimiento" mientras la página está abierta, se vuelve a armar
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const alCambiar = () => {
      desarmar();
      desarmar = animarPortada(el);
    };
    consulta.addEventListener('change', alCambiar);
    return () => {
      consulta.removeEventListener('change', alCambiar);
      desarmar();
    };
  }, []);

  return (
    <div className="hero" style={VARIABLES_LENTE} ref={raiz}>
      <div className="hero__escena" data-escena>
        <div
          className="hero__ilustracion"
          role="img"
          aria-label="Tres científicas y científicos miran células por una lupa gigante."
        >
          <FloatingCells celulas={CELULAS} />
          <InteractiveMagnifier celulas={CELULAS} />
          <HeroScientists cientificos={CIENTIFICOS} />
        </div>
        <HeroTitle entrarA={ENTRAR_A} />
        {/* La lupa también lleva a entrar (para el mouse; el teclado usa el subtítulo). Acompaña al vidrio cuando se mueve. */}
        <Link className="hero__lente-enlace" href={ENTRAR_A} tabIndex={-1} aria-hidden="true" data-lente-enlace />
      </div>
    </div>
  );
}
