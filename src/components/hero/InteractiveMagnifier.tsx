/* eslint-disable @next/next/no-img-element -- imágenes ya optimizadas (WebP a su tamaño) que se escalan con la escena y después anima GSAP; next/image no suma nada acá */
import type { CSSProperties } from 'react';
import { CELULA_ALTO, ESCENA, LENTE, MANGO, RADIO_VIDRIO, enLaLente, type Celula } from './escena';
import { CELULA_SRC } from './FloatingCells';

/*
  LUPA
  - El vidrio NO es una imagen cerrada: adentro hay una segunda capa de las
    mismas células (misma lista), agrandadas respecto del centro óptico y
    recortadas por el círculo del vidrio. El aro va encima.
  - Etapa B: todo quieto. En la etapa D, GSAP moverá la lupa (reposo / hover)
    y actualizará la copia ampliada en el mismo cuadro que la capa de afuera.

  PROVISORIO: el aro, el conector y el mango están dibujados acá con los
  colores medidos en la referencia 1, con grano. No hay todavía una
  ilustración de la lupa con el vidrio transparente: cuando llegue
  (magnifier/lupa-marco.png, ver docs/PORTADA-ILUSTRADA.md) reemplaza a
  <AroProvisorio> y <MangoProvisorio>, y lo demás queda igual.
*/

/* Grano editorial: ruido fino que oscurece y aclara un poco cada forma. */
function FiltroGrano({ id }: { id: string }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={2} seed={7} result="ruido" />
      <feColorMatrix in="ruido" type="saturate" values="0" result="grisCompleto" />
      {/* menos contraste: un grano fino, como el de las ilustraciones, no arena */}
      <feComponentTransfer in="grisCompleto" result="gris">
        <feFuncR type="linear" slope={0.45} intercept={0.275} />
        <feFuncG type="linear" slope={0.45} intercept={0.275} />
        <feFuncB type="linear" slope={0.45} intercept={0.275} />
      </feComponentTransfer>
      <feComposite in="gris" in2="SourceAlpha" operator="in" result="granoDentro" />
      <feBlend in="SourceGraphic" in2="granoDentro" mode="soft-light" />
    </filter>
  );
}

function MangoProvisorio() {
  const r = LENTE.radio;
  const fin = r + MANGO.largo;
  return (
    <svg className="hero-mango" viewBox={`0 0 ${ESCENA.ancho} ${ESCENA.alto}`} aria-hidden="true" focusable="false">
      <defs>
        <FiltroGrano id="hero-grano-mango" />
        <linearGradient id="hero-mango-cuerpo" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#021a27" />
          <stop offset="0.45" stopColor="#09303f" />
          <stop offset="0.8" stopColor="#1b5262" />
          <stop offset="1" stopColor="#082a38" />
        </linearGradient>
        <linearGradient id="hero-mango-metal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#14596a" />
          <stop offset="0.55" stopColor="#5fb9c1" />
          <stop offset="0.75" stopColor="#a6dfe0" />
          <stop offset="1" stopColor="#2b8a98" />
        </linearGradient>
      </defs>
      <g transform={`translate(${LENTE.x} ${LENTE.y}) rotate(${MANGO.giro})`} filter="url(#hero-grano-mango)">
        {/* cuello: une el aro con el conector */}
        <rect x={-8} y={r - 4} width={16} height={20} fill="#032537" />
        {/* conector metálico */}
        <rect x={-15} y={r + 14} width={30} height={30} rx={4} fill="url(#hero-mango-metal)" />
        <rect x={-16} y={r + 14} width={32} height={4} rx={2} fill="#0b3243" />
        <rect x={-16} y={r + 40} width={32} height={4} rx={2} fill="#0b3243" />
        {/* mango */}
        <path
          d={`M -19 ${r + 44} H 19 L 21 ${fin - 21} A 21 21 0 0 1 -21 ${fin - 21} Z`}
          fill="url(#hero-mango-cuerpo)"
        />
        {/* virola más oscura arriba del mango */}
        <rect x={-19.5} y={r + 44} width={39} height={26} fill="#031d2a" opacity={0.85} />
        {/* brillo largo sobre el costado */}
        <rect x={8} y={r + 82} width={4} height={MANGO.largo - 120} rx={2} fill="#9fd3da" opacity={0.22} />
      </g>
    </svg>
  );
}

function AroProvisorio() {
  const r = LENTE.radio;
  const medio = r - LENTE.aro / 2;
  return (
    <svg className="hero-lente__aro" viewBox={`${-r} ${-r} ${2 * r} ${2 * r}`} aria-hidden="true" focusable="false">
      <defs>
        <FiltroGrano id="hero-grano-aro" />
      </defs>
      <g filter="url(#hero-grano-aro)">
        <circle r={medio} fill="none" stroke="#022337" strokeWidth={LENTE.aro} />
        {/* bisel interior apenas más claro */}
        <circle r={RADIO_VIDRIO + 0.8} fill="none" stroke="#3f8fa0" strokeOpacity={0.45} strokeWidth={1.4} />
        {/* luz sobre el aro, arriba a la izquierda */}
        <path
          d={arco(r - 2.2, 198, 262)}
          fill="none"
          stroke="#7cc2cf"
          strokeOpacity={0.4}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/* Arco de circunferencia entre dos ángulos (grados, 0 = derecha, sentido horario en pantalla). */
function arco(radio: number, desde: number, hasta: number) {
  const p = (a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(Math.cos(t) * radio).toFixed(2)} ${(Math.sin(t) * radio).toFixed(2)}`;
  };
  return `M ${p(desde)} A ${radio} ${radio} 0 0 1 ${p(hasta)}`;
}

export function LupaMango() {
  return <MangoProvisorio />;
}

export default function InteractiveMagnifier({ celulas }: { celulas: Celula[] }) {
  return (
    <div className="hero-lente">
      <div className="hero-lente__vidrio">
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
        <span className="hero-lente__reflejo" />
      </div>
      <AroProvisorio />
    </div>
  );
}
