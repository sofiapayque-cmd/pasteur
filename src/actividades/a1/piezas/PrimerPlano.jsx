import { GRANO } from '../../../components/escenas/grano';

/*
  Primer plano del lugar donde se toma la muestra (viewBox 600×400).
  - raspado: muestra la marca que dejó el instrumento
  - huella: marca de dedos (error: tocar con la mano)
*/
function Pinguinito({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="22" rx="22" ry="38" fill="#2B3245" />
      <ellipse cx="-3" cy="30" rx="15" ry="28" fill="#FBF9F1" />
      <circle cx="-6" cy="-6" r="2.6" fill="#1A1B22" />
      <path d="M-14 -2 L-28 2 L-14 5 Z" fill="#EF6F5E" />
      <path d="M-8 58 L-15 63 L-2 63 Z M8 58 L15 63 L2 63 Z" fill="#F2B13B" />
    </g>
  );
}

export default function PrimerPlano({ ambiente, raspado, huella }) {
  const id = ambiente.id;
  const nieve = id.startsWith('antartida');
  return (
    <div className="a1-primerplano">
      <svg viewBox="0 0 600 400" className="a1-primerplano__svg" role="img" aria-label={`Primer plano: ${ambiente.nombre}`}>
        {id === 'antartida-suelo' && (
          <>
            <rect width="600" height="400" fill="#B9C3D6" />
            <path d="M0 0 H600 V70 Q420 100 300 80 Q150 60 0 96 Z" fill="#F4F7FC" />
            <path d="M0 96 Q150 60 300 80 Q420 100 600 70 V400 H0 Z" fill="#7D8FAE" />
            <path d="M40 210 Q200 150 380 190 Q520 220 560 300 Q420 360 200 350 Q60 330 40 210 Z" fill="#5E6B85" />
            {[[90, 140, 22], [480, 140, 30], [520, 330, 18], [120, 330, 26], [300, 120, 14]].map(([x, y, r], i) => (
              <g key={i}>
                <ellipse cx={x} cy={y} rx={r} ry={r * 0.7} fill="#3E4A63" />
                <ellipse cx={x - r * 0.3} cy={y - r * 0.25} rx={r * 0.35} ry={r * 0.2} fill="#9AA8C2" opacity=".6" />
              </g>
            ))}
            <circle cx="470" cy="128" r="7" fill="#F2B13B" />
            <circle cx="482" cy="134" r="4" fill="#F2B13B" />
            <circle cx="112" cy="322" r="6" fill="#9DB08A" />
            <path d="M200 230 l10 0 M205 225 l0 10 M380 280 l10 0 M385 275 l0 10 M260 300 l8 0 M264 296 l0 8 M150 260 l8 0 M154 256 l0 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {id === 'campo-suelo' && (
          <>
            <rect width="600" height="400" fill="#8A6A4A" />
            <path d="M0 0 H600 V60 Q300 100 0 70 Z" fill="#94BC73" />
            <path d="M40 200 Q220 140 420 180 Q560 210 560 300 Q400 370 200 350 Q50 330 40 200 Z" fill="#6E5238" />
            {[[100, 150, 10], [450, 130, 8], [500, 320, 12], [140, 320, 9], [320, 110, 6], [260, 330, 5]].map(([x, y, r], i) => (
              <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.75} fill="#C9A26B" />
            ))}
            <path d="M380 160 q30 40 10 90 q-10 30 20 60" stroke="#C9A26B" strokeWidth="3" fill="none" opacity=".7" />
            <path d="M200 280 q10 -14 20 0 q10 14 20 0" stroke="#F4A6BD" strokeWidth="8" strokeLinecap="round" fill="none" />
            {[30, 90, 160, 250, 340, 420, 500, 570].map((x, i) => (
              <path key={i} d={`M${x} 70 l-10 -50 M${x} 70 l4 -58 M${x} 70 l14 -44`} stroke={i % 2 ? '#6F9A55' : '#7FAE63'} strokeWidth="6" strokeLinecap="round" />
            ))}
          </>
        )}
        {id === 'antartida-pinguino' && (
          <>
            <rect width="600" height="400" fill="#F4F7FC" />
            <path d="M0 0 H600 V120 Q300 90 0 130 Z" fill="#DCE6F5" />
            <Pinguinito x={510} y={40} s={0.85} />
            <Pinguinito x={440} y={64} s={0.6} />
            {[[80, 330], [120, 300], [150, 268], [190, 246], [240, 226]].map(([x, y], i) => (
              <path key={i} d={`M${x} ${y} l-9 -14 l9 5 l9 -5 Z`} fill="#C9D6F4" />
            ))}
            <path d="M230 250 q20 -40 70 -26 q50 -10 60 20 q6 36 -50 36 q-60 10 -80 -30 Z" fill="#D9A3A8" />
            <path d="M262 236 q30 -14 64 -4" stroke="#C58890" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="380" cy="282" r="10" fill="#D9A3A8" />
            <circle cx="214" cy="290" r="7" fill="#D9A3A8" />
          </>
        )}
        {id === 'campo-vaca' && (
          <>
            <rect width="600" height="400" fill="#94BC73" />
            <path d="M0 0 H600 V110 Q300 80 0 120 Z" fill="#C9DDA8" />
            {/* la vaca, lejos */}
            <g transform="translate(470 30) scale(.5)">
              <rect x="-76" y="-20" width="160" height="80" rx="38" fill="#FBF9F1" />
              <path d="M-40 -18 Q-10 -6 -22 22 Q-46 30 -62 10 Q-66 -12 -40 -18 Z" fill="#8A6A4A" />
              <rect x="-62" y="40" width="14" height="56" rx="6" fill="#FBF9F1" />
              <rect x="34" y="40" width="14" height="56" rx="6" fill="#FBF9F1" />
              <path d="M-100 -34 Q-110 -46 -118 -40 M-70 -34 Q-60 -46 -52 -40" stroke="#E9E2D2" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="-108" y="-36" width="48" height="58" rx="22" fill="#FBF9F1" />
              <rect x="-104" y="4" width="40" height="26" rx="13" fill="#F4A6BD" />
              <circle cx="-94" cy="-14" r="4" fill="#1A1B22" />
              <circle cx="-74" cy="-14" r="4" fill="#1A1B22" />
            </g>
            {[40, 120, 520, 560, 90, 470].map((x, i) => (
              <path key={i} d={`M${x} ${i > 3 ? 390 : 380} l-10 -44 M${x} ${i > 3 ? 390 : 380} l4 -52 M${x} ${i > 3 ? 390 : 380} l14 -38`} stroke={i % 2 ? '#6F9A55' : '#7FAE63'} strokeWidth="6" strokeLinecap="round" />
            ))}
            <path d="M170 250 q16 -70 130 -64 q120 0 120 64 q-14 56 -126 54 q-116 2 -124 -54 Z" fill="#6E5238" />
            <path d="M200 236 q90 -40 190 0 M220 264 q70 -26 150 0" stroke="#8A6A4A" strokeWidth="6" fill="none" strokeLinecap="round" />
          </>
        )}
        {raspado && (
          <g className="a1-raspado" stroke={nieve && id === 'antartida-suelo' ? '#C9D3E6' : '#FBF9F1'} strokeWidth="5" strokeLinecap="round" opacity=".75">
            <path d="M262 246 l26 -22 M282 252 l26 -22 M302 258 l26 -22" />
          </g>
        )}
        {huella && (
          <g className="a1-huella" fill="none" stroke="#C79C7A" strokeWidth="3" opacity=".8">
            {[0, 1, 2, 3].map((k) => (
              <g key={k} transform={`translate(${250 + k * 34} ${200 - (k === 1 || k === 2 ? 14 : 0)})`}>
                <ellipse rx="13" ry="18" />
                <ellipse rx="8" ry="12" />
                <ellipse rx="3" ry="6" />
              </g>
            ))}
          </g>
        )}
      </svg>
      <div className="escena__grano" style={{ ...GRANO, position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply', opacity: 0.5 }} aria-hidden="true" />
    </div>
  );
}
