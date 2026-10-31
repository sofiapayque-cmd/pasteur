/*
  Escena de la Antártida (ilustración plana con grano).
  viewBox 1000 × 600: los puntos para investigar se ubican en % de ese tamaño.
  El grano es una capa HTML estática encima (más liviano que un filtro SVG
  sobre elementos animados, importante en las Ceibal).
  Animaciones solo de transform/opacity; se apagan con prefers-reduced-motion
  o con animado={false} (miniaturas).
*/
import { GRANO } from './grano';

function Pinguino({ x, y, s = 1, mira = 1, demora = 0, aleta = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * mira} ${s})`}>
      <ellipse cx="0" cy="62" rx="22" ry="5" fill="#22232A" opacity=".13" />
      <g className="ant-camina" style={{ animationDelay: `${demora}s` }}>
        <path d="M-8 58 L-15 63 L-2 63 Z M8 58 L15 63 L2 63 Z" fill="#F2B13B" />
        <ellipse cx="0" cy="22" rx="22" ry="38" fill="#2B3245" />
        <ellipse cx="3" cy="30" rx="15" ry="28" fill="#FBF9F1" />
        <ellipse cx="6" cy="16" rx="9" ry="6" fill="#F2B13B" opacity=".35" />
        <g className={aleta ? 'ant-aleta' : undefined}>
          <path d="M-20 10 Q-31 30 -18 47" stroke="#2B3245" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
        <circle cx="6" cy="-6" r="3" fill="#FBF9F1" />
        <circle cx="6.6" cy="-6" r="1.6" fill="#1A1B22" />
        <path d="M14 -2 L28 2 L14 5 Z" fill="#EF6F5E" />
        <path d="M-4 -14 Q6 -20 16 -12" stroke="#FBF9F1" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

const COPOS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 137) % 1000,
  r: 2 + (i % 3),
  d: (i * 0.73) % 9,
  v: 9 + (i % 5) * 2,
}));

export default function Antartida({ animado = true }) {
  return (
    <div className={`escena ${animado ? 'escena--viva' : ''}`}>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" className="escena__svg" role="img" aria-label="Paisaje de la Antártida: montañas nevadas, mar con témpanos, rocas, una base científica y una colonia de pingüinos">
        <style>{ESTILO}</style>
        <defs>
          <linearGradient id="ant-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C6D5F1" />
            <stop offset="1" stopColor="#EAF0FA" />
          </linearGradient>
          <linearGradient id="ant-mar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7E9BE0" />
            <stop offset="1" stopColor="#A7BDEE" />
          </linearGradient>
        </defs>
        <rect width="1000" height="600" fill="url(#ant-cielo)" />
        <circle cx="820" cy="110" r="80" fill="#FBF9F1" opacity=".35" />
        <circle cx="820" cy="110" r="46" fill="#FBF9F1" opacity=".95" />
        {/* nubes */}
        <g className="ant-nube" opacity=".85">
          <ellipse cx="200" cy="90" rx="70" ry="16" fill="#FBF9F1" />
          <ellipse cx="240" cy="80" rx="40" ry="14" fill="#FBF9F1" />
        </g>
        <g className="ant-nube ant-nube--lenta" opacity=".7">
          <ellipse cx="560" cy="60" rx="56" ry="12" fill="#FBF9F1" />
        </g>
        {/* ave (petrel) */}
        <g className="ant-ave">
          <path d="M0 0 q10 -9 20 0 q10 -9 20 0" stroke="#3E4A63" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {/* montañas */}
        <path d="M0 300 L120 170 L210 250 L330 120 L470 280 L560 210 L690 300 Z" fill="#B9C8F5" />
        <path d="M300 300 L430 180 L520 240 L640 150 L780 290 L880 220 L1000 300 Z" fill="#D4DCF7" />
        <path d="M330 120 L362 150 L340 160 L318 140 Z M640 150 L668 178 L640 186 L620 170 Z M120 170 L140 192 L118 198 L104 186 Z" fill="#FFFFFF" />
        {/* mar con témpanos */}
        <rect y="296" width="1000" height="80" fill="url(#ant-mar)" />
        <g className="ant-tempano">
          <path d="M120 318 L190 318 L178 332 L132 332 Z" fill="#FFFFFF" />
          <path d="M132 332 L178 332 L170 340 L140 340 Z" fill="#C9D6F4" opacity=".7" />
        </g>
        <g className="ant-tempano ant-tempano--2">
          <path d="M440 330 L520 326 L512 342 L452 344 Z" fill="#FFFFFF" />
        </g>
        <g className="ant-ola">
          <path d="M-100 346 Q-50 340 0 346 T100 346 T200 346 T300 346 T400 346 T500 346 T600 346 T700 346 T800 346 T900 346 T1000 346 T1100 346" stroke="#FFFFFF" strokeWidth="2" opacity=".55" fill="none" />
          <path d="M-100 362 Q-50 356 0 362 T100 362 T200 362 T300 362 T400 362 T500 362 T600 362 T700 362 T800 362 T900 362 T1000 362 T1100 362" stroke="#FFFFFF" strokeWidth="1.5" opacity=".4" fill="none" />
        </g>
        {/* costa nevada, con una loma a la derecha para la base */}
        <path d="M0 372 Q200 352 420 374 T780 360 Q840 300 1000 296 L1000 600 L0 600 Z" fill="#F4F7FC" />
        <path d="M780 360 Q840 300 1000 296 L1000 330 Q880 330 800 372 Z" fill="#E3EAF6" />
        {/* base científica */}
        <g transform="translate(846 262)">
          <rect x="0" y="18" width="70" height="34" rx="4" fill="#EF6F5E" />
          <path d="M-4 20 L35 2 L74 20 Z" fill="#D85A4A" />
          <rect x="10" y="28" width="12" height="10" rx="2" fill="#DCE6F5" />
          <rect x="30" y="28" width="12" height="10" rx="2" fill="#DCE6F5" />
          <rect x="52" y="30" width="10" height="22" rx="2" fill="#B84A3C" />
          <rect x="84" y="30" width="44" height="24" rx="4" fill="#F2B13B" />
          <rect x="92" y="36" width="10" height="8" rx="2" fill="#DCE6F5" />
          <path d="M120 30 L120 -16" stroke="#5E6070" strokeWidth="3" />
          <g className="ant-bandera">
            <path d="M120 -16 L144 -10 L120 -4 Z" fill="#2F4A85" />
          </g>
        </g>
        {/* zona de rocas y suelo descubierto */}
        <path d="M60 470 Q160 430 300 452 Q380 468 400 520 Q300 560 120 552 Q40 540 60 470 Z" fill="#7D8FAE" />
        <path d="M110 480 Q170 462 240 474 Q280 490 270 512 Q200 530 130 518 Z" fill="#5E6B85" />
        <circle cx="170" cy="500" r="9" fill="#3E4A63" />
        <circle cx="230" cy="492" r="6" fill="#3E4A63" />
        <circle cx="320" cy="500" r="11" fill="#5E6B85" />
        <path d="M250 455 L262 440 L272 456 Z" fill="#9AA8C2" />
        {/* líquenes y musgo sobre las rocas */}
        <circle cx="318" cy="492" r="4" fill="#F2B13B" opacity=".9" />
        <circle cx="326" cy="497" r="2.5" fill="#F2B13B" opacity=".8" />
        <circle cx="92" cy="486" r="5" fill="#9DB08A" />
        <circle cx="100" cy="482" r="3" fill="#9DB08A" />
        <circle cx="356" cy="520" r="4" fill="#E3EEA0" />
        {/* escarcha */}
        <path d="M150 470 l6 0 M153 467 l0 6 M290 520 l6 0 M293 517 l0 6 M200 535 l5 0 M202.5 532.5 l0 5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        {/* colonia de pingüinos */}
        <Pinguino x={590} y={348} s={0.9} demora={0} />
        <Pinguino x={660} y={360} s={1.1} mira={-1} demora={0.6} aleta />
        <Pinguino x={732} y={346} s={0.95} demora={1.1} />
        <Pinguino x={798} y={372} s={0.8} mira={-1} demora={0.3} />
        <Pinguino x={712} y={396} s={0.68} demora={0.9} />
        {/* huellas y caca (guano rosado: comen krill) */}
        <g fill="#C9D6F4">
          <path d="M560 452 l-4 -6 l4 2 l4 -2 Z M574 462 l-4 -6 l4 2 l4 -2 Z M588 470 l-4 -6 l4 2 l4 -2 Z M604 476 l-4 -6 l4 2 l4 -2 Z" />
        </g>
        <path d="M624 474 q8 -12 22 -6 q14 -2 14 8 q-2 10 -18 8 q-16 4 -18 -10 Z" fill="#D9A3A8" />
        <circle cx="664" cy="484" r="4" fill="#D9A3A8" />
        <circle cx="618" cy="486" r="3" fill="#D9A3A8" />
        {/* nieve cayendo */}
        <g className="ant-copos">
          {COPOS.map((c, i) => (
            <circle key={i} className="ant-copo" cx={c.x} cy="-10" r={c.r} fill="#FFFFFF" opacity=".85" style={{ animationDelay: `-${c.d}s`, animationDuration: `${c.v}s` }} />
          ))}
        </g>
      </svg>
      <div className="escena__grano" style={GRANO} aria-hidden="true" />
    </div>
  );
}

const ESTILO = `
.escena{position:relative;width:100%;height:100%}
.escena__svg{display:block;width:100%;height:100%}
.escena__grano{position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.55}
.escena--viva .ant-camina{transform-box:fill-box;transform-origin:50% 100%;animation:ant-camina 2.6s ease-in-out infinite}
.escena--viva .ant-aleta{transform-box:fill-box;transform-origin:50% 0;animation:ant-aleta 1.8s ease-in-out infinite}
.escena--viva .ant-nube{animation:ant-nube 26s ease-in-out infinite alternate}
.escena--viva .ant-nube--lenta{animation-duration:38s}
.escena--viva .ant-tempano{transform-box:fill-box;transform-origin:50% 50%;animation:ant-flota 5s ease-in-out infinite}
.escena--viva .ant-tempano--2{animation-delay:-2s}
.escena--viva .ant-ola{animation:ant-ola 7s linear infinite}
.escena--viva .ant-bandera{transform-box:fill-box;transform-origin:0 50%;animation:ant-bandera 1.4s ease-in-out infinite}
.ant-ave{transform:translate(-60px,140px)}
.escena--viva .ant-ave{animation:ant-ave 24s linear infinite}
.ant-copo{opacity:0}
.escena--viva .ant-copo{animation:ant-copo 11s linear infinite}
@keyframes ant-camina{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes ant-aleta{0%,100%{transform:rotate(0)}50%{transform:rotate(-26deg)}}
@keyframes ant-nube{to{transform:translateX(120px)}}
@keyframes ant-flota{50%{transform:translateY(3px) rotate(1.5deg)}}
@keyframes ant-ola{to{transform:translateX(-100px)}}
@keyframes ant-bandera{50%{transform:scaleX(.7)}}
@keyframes ant-ave{0%{transform:translate(-60px,150px)}50%{transform:translate(500px,110px)}100%{transform:translate(1080px,140px)}}
@keyframes ant-copo{0%{transform:translateY(0);opacity:0}10%{opacity:.85}100%{transform:translate(30px,620px);opacity:.85}}
@media (prefers-reduced-motion:reduce){.escena--viva *{animation:none!important}.ant-copo{display:none}}
`;
