import { useId } from 'react';
import './Moli.css';

/*
  Moli: la molécula de agua que guía la plataforma.
  Un oxígeno grande (el cuerpo, con la cara) y dos hidrógenos chicos
  abajo a los costados, a 104,5° (el ángulo real de la molécula).

  Props:
  - animo:  'feliz' | 'escucha' | 'piensa' | 'eureka' | 'duda' | 'alegria'
  - fase:   'liquido' | 'hielo' | 'vapor'
  - estilo: '3d' (peludo) | 'plano' (ilustrado)
  - patas:  true para mostrar las piernitas de trazo
  - tamano: ancho en px (el alto es el 90%)
*/

const COLORES = {
  liquido: { b: ['#E8EDFC', '#93AEEB', '#6E8DDA'], h: ['#F6F8FE', '#C3D1F5'], plano: '#93AEEB', planoH: '#C3D1F5', pelo: '#D4DCF7' },
  hielo: { b: ['#FFFFFF', '#DCE8F8', '#AFC4E8'], h: ['#FFFFFF', '#E3ECF9'], plano: '#CFDDF4', planoH: '#EAF1FB', pelo: '#FFFFFF' },
  vapor: { b: ['#F1F4FD', '#B9C8F5', '#93AEEB'], h: ['#FFFFFF', '#D4DCF7'], plano: '#B9C8F5', planoH: '#D4DCF7', pelo: '#E8EDFC' },
};

const ANIMACION = {
  feliz: 'moli--respira',
  escucha: 'moli--inclina',
  piensa: 'moli--respira',
  eureka: 'moli--salta',
  duda: 'moli--duda',
  alegria: 'moli--rebota',
};

const DESCRIPCION = {
  feliz: 'saluda',
  escucha: 'escucha',
  piensa: 'piensa',
  eureka: 'descubre algo',
  duda: 'duda',
  alegria: 'festeja',
};

export default function Moli({ animo = 'feliz', fase = 'liquido', estilo = '3d', patas = false, tamano = 240 }) {
  // useId da un id único por Moli; le sacamos los ":" porque rompen url(#...)
  const uid = useId().replace(/:/g, '');
  const c = COLORES[fase] || COLORES.liquido;
  const es3d = estilo !== 'plano';

  let ojos = 'punto';
  let boca = 'sonrisa';
  if (animo === 'piensa') boca = 'recta';
  if (animo === 'eureka') { ojos = 'grandes'; boca = 'o'; }
  if (animo === 'duda') boca = 'ondulada';
  if (animo === 'alegria') { ojos = 'felices'; boca = 'grande'; }
  if (fase === 'hielo') { ojos = 'linea'; boca = 'ondulada'; }

  let dx = 0;
  let dy = 0;
  if (animo === 'escucha') dx = 4;
  if (animo === 'piensa') { dx = 3; dy = -4; }
  if (animo === 'duda') dx = -2;

  let animacion = ANIMACION[animo] || 'moli--respira';
  if (fase === 'hielo') animacion = 'moli--tiembla';
  if (fase === 'vapor') animacion = 'moli--flota';

  const pelo = es3d && fase !== 'hielo';
  const enLiquido = fase === 'liquido';

  return (
    <svg
      className="moli"
      viewBox="0 50 200 180"
      width={tamano}
      height={Math.round(tamano * 0.9)}
      role="img"
      aria-label={`Moli, la molécula de agua, ${DESCRIPCION[animo] || 'saluda'}`}
    >
      <defs>
        <radialGradient id={`b${uid}`} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor={c.b[0]} />
          <stop offset=".55" stopColor={c.b[1]} />
          <stop offset="1" stopColor={c.b[2]} />
        </radialGradient>
        <radialGradient id={`h${uid}`} cx="36%" cy="30%" r="80%">
          <stop offset="0" stopColor={c.h[0]} />
          <stop offset="1" stopColor={c.h[1]} />
        </radialGradient>
        <filter id={`f${uid}`} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={pelo ? 7 : 0} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`s${uid}`} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`v${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={fase === 'vapor' ? 1.8 : 0} />
        </filter>
      </defs>

      <ellipse cx="100" cy={patas ? 219 : 224} rx="54" ry="6" fill="#22232A" opacity={fase === 'vapor' ? 0.05 : 0.14} filter={`url(#s${uid})`} />

      <g className={`moli__cuerpo ${animacion}`}>
        <g filter={`url(#v${uid})`} opacity={fase === 'vapor' ? 0.62 : 1}>
          {patas && (
            <g stroke="#22232A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M91 180 L89 214 L83 214" />
              <path d="M109 180 L111 214 L117 214" />
            </g>
          )}

          {es3d ? (
            <g filter={`url(#f${uid})`}>
              {pelo && (
                <>
                  <circle cx="43" cy="169" r="32" fill="none" stroke={c.pelo} strokeWidth="8" strokeDasharray="0.8 2.4" opacity=".8" />
                  <circle cx="157" cy="169" r="32" fill="none" stroke={c.pelo} strokeWidth="8" strokeDasharray="0.8 2.4" opacity=".8" />
                </>
              )}
              <circle cx="43" cy="169" r="30" fill={`url(#h${uid})`} />
              <circle cx="157" cy="169" r="30" fill={`url(#h${uid})`} />
              {pelo && <circle cx="100" cy="125" r="65" fill="none" stroke={c.pelo} strokeWidth="10" strokeDasharray="0.8 2.4" opacity=".8" />}
              <circle cx="100" cy="125" r="62" fill={`url(#b${uid})`} />
              <ellipse cx="76" cy="94" rx="18" ry="10" fill="#FFFFFF" opacity=".3" transform="rotate(-28 76 94)" />
            </g>
          ) : (
            <g>
              <circle cx="43" cy="169" r="33" fill="none" stroke={c.planoH} strokeWidth="7" strokeDasharray="1.6 4.4" />
              <circle cx="157" cy="169" r="33" fill="none" stroke={c.planoH} strokeWidth="7" strokeDasharray="1.6 4.4" />
              <circle cx="43" cy="169" r="30" fill={c.planoH} />
              <circle cx="157" cy="169" r="30" fill={c.planoH} />
              <circle cx="100" cy="125" r="65.5" fill="none" stroke={c.plano} strokeWidth="8" strokeDasharray="1.8 4.6" />
              <circle cx="100" cy="125" r="62" fill={c.plano} />
              <g fill="#2F4A85" opacity=".15">
                <circle cx="70" cy="104" r="4" />
                <circle cx="134" cy="100" r="3" />
                <circle cx="130" cy="152" r="5" />
                <circle cx="76" cy="154" r="3" />
                <circle cx="108" cy="88" r="2.5" />
                <circle cx="36" cy="176" r="2.5" />
                <circle cx="162" cy="164" r="3" />
              </g>
            </g>
          )}

          {fase === 'hielo' && (
            <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
              <path d="M68 96 L76 96 M72 92 L72 100" />
              <path d="M134 150 L140 150 M137 147 L137 153" />
              <path d="M140 92 L146 92 M143 89 L143 95" />
            </g>
          )}

          <g transform={`translate(${dx} ${dy})`}>
            {ojos === 'punto' && (
              <g>
                <circle cx="86" cy="118" r="5.5" fill="#1A1B22" />
                <circle cx="114" cy="118" r={animo === 'duda' ? 4 : 5.5} fill="#1A1B22" />
                <circle cx="87.8" cy="116.2" r="1.6" fill="#FFFFFF" />
                <circle cx="115.6" cy="116.4" r="1.4" fill="#FFFFFF" />
              </g>
            )}
            {ojos === 'grandes' && (
              <g>
                <circle cx="85" cy="117" r="7.5" fill="#1A1B22" />
                <circle cx="115" cy="117" r="7.5" fill="#1A1B22" />
                <circle cx="87.6" cy="114.4" r="2.4" fill="#FFFFFF" />
                <circle cx="117.6" cy="114.4" r="2.4" fill="#FFFFFF" />
              </g>
            )}
            {ojos === 'felices' && (
              <g stroke="#1A1B22" strokeWidth="2.8" strokeLinecap="round" fill="none">
                <path d="M80 120 Q86 112 92 120" />
                <path d="M108 120 Q114 112 120 120" />
              </g>
            )}
            {ojos === 'linea' && (
              <g stroke="#1A1B22" strokeWidth="2.8" strokeLinecap="round">
                <path d="M80 118 L92 118" />
                <path d="M108 118 L120 118" />
              </g>
            )}
            {boca === 'sonrisa' && <path d="M93 131 Q100 137 107 131" stroke="#1A1B22" strokeWidth="2.4" strokeLinecap="round" fill="none" />}
            {boca === 'grande' && <path d="M90 128 Q100 145 110 128 Z" fill="#1A1B22" stroke="#1A1B22" strokeWidth="2" strokeLinejoin="round" />}
            {boca === 'o' && <ellipse cx="100" cy="134" rx="3.6" ry="4.6" fill="#1A1B22" />}
            {boca === 'recta' && <path d="M95 133 L105 133" stroke="#1A1B22" strokeWidth="2.4" strokeLinecap="round" />}
            {boca === 'ondulada' && <path d="M91 134 Q95.5 130 100 134 T109 134" stroke="#1A1B22" strokeWidth="2.4" strokeLinecap="round" fill="none" />}
            <ellipse cx="74" cy="129" rx="7" ry="4" fill="#F4A6BD" opacity={fase === 'hielo' ? 0.25 : 0.7} />
            <ellipse cx="126" cy="129" rx="7" ry="4" fill="#F4A6BD" opacity={fase === 'hielo' ? 0.25 : 0.7} />
          </g>

          {(animo === 'eureka' || animo === 'alegria') && (
            <g stroke="#F2B13B" strokeWidth="3" strokeLinecap="round">
              <path d="M52 63 L52 77 M45 70 L59 70" />
              <path d="M150 56 L150 68 M144 62 L156 62" />
              <path d="M166 88 L166 96 M162 92 L170 92" />
            </g>
          )}
          {animo === 'duda' && enLiquido && (
            <text x="150" y="78" fill="#2F4A85" fontFamily="'Bricolage Grotesque Variable', sans-serif" fontSize="34" fontWeight="800">?</text>
          )}
          {animo === 'piensa' && enLiquido && (
            <g fill="#D4DCF7" stroke="#2F4A85" strokeWidth="1.5">
              <circle cx="140" cy="72" r="3" />
              <circle cx="151" cy="62" r="4.5" />
              <circle cx="165" cy="50" r="6" />
            </g>
          )}
          {animo === 'escucha' && enLiquido && (
            <g stroke="#7272EE" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M170 104 Q178 114 170 124" />
              <path d="M180 98 Q192 114 180 130" />
            </g>
          )}
          {fase === 'vapor' && (
            <g stroke="#B9C8F5" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M80 62 Q88 54 80 46 Q72 38 80 30" />
              <path d="M122 60 Q114 52 122 44 Q130 36 122 28" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
