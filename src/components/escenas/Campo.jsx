/*
  Escena del campo uruguayo (ilustración plana con grano).
  viewBox 1000 × 600: los puntos para investigar se ubican en % de ese tamaño.
  Animaciones solo de transform/opacity; se apagan con prefers-reduced-motion
  o con animado={false} (miniaturas).
*/
import { GRANO } from './grano';

function Vaca({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="96" rx="96" ry="8" fill="#22232A" opacity=".14" />
      {/* cola */}
      <g className="cam-cola">
        <path d="M84 4 Q104 20 96 50" stroke="#E9E2D2" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="96" cy="54" r="6" fill="#8A6A4A" />
      </g>
      {/* patas */}
      <rect x="-62" y="40" width="14" height="56" rx="6" fill="#FBF9F1" />
      <rect x="-36" y="44" width="14" height="52" rx="6" fill="#E9E2D2" />
      <rect x="34" y="40" width="14" height="56" rx="6" fill="#FBF9F1" />
      <rect x="58" y="44" width="14" height="52" rx="6" fill="#E9E2D2" />
      <path d="M-62 92 h14 M-36 92 h14 M34 92 h14 M58 92 h14" stroke="#5E4A38" strokeWidth="6" />
      {/* cuerpo */}
      <rect x="-76" y="-20" width="160" height="80" rx="38" fill="#FBF9F1" />
      <path d="M-40 -18 Q-10 -6 -22 22 Q-46 30 -62 10 Q-66 -12 -40 -18 Z" fill="#8A6A4A" />
      <path d="M30 0 Q58 -6 66 18 Q54 42 30 34 Q18 16 30 0 Z" fill="#8A6A4A" />
      <ellipse cx="20" cy="56" rx="12" ry="6" fill="#F4A6BD" opacity=".7" />
      {/* cabeza: baja a pastar */}
      <g className="cam-cabeza">
        <g transform="translate(-92 -6)">
          <path d="M-6 -30 Q-14 -40 -22 -34" stroke="#E9E2D2" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M22 -30 Q30 -40 38 -34" stroke="#E9E2D2" strokeWidth="5" strokeLinecap="round" fill="none" />
          <rect x="-16" y="-30" width="48" height="58" rx="22" fill="#FBF9F1" />
          <rect x="-12" y="10" width="40" height="26" rx="13" fill="#F4A6BD" />
          <circle cx="0" cy="22" r="3" fill="#8A4A5A" />
          <circle cx="16" cy="22" r="3" fill="#8A4A5A" />
          <g className="cam-parpado">
            <circle cx="-2" cy="-8" r="3.6" fill="#1A1B22" />
            <circle cx="18" cy="-8" r="3.6" fill="#1A1B22" />
          </g>
          <path d="M-24 -18 Q-34 -12 -26 -4 Z M40 -18 Q50 -12 42 -4 Z" fill="#8A6A4A" />
          <path d="M-4 36 l-3 10 M6 37 l0 11 M16 36 l3 10" stroke="#6F9A55" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
}

function Mata({ x, y, s = 1, c = '#6F9A55', d = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="cam-mata" style={{ animationDelay: `-${d}s` }} d="M0 0 L-10 -24 M0 0 L-2 -30 M0 0 L8 -26 M0 0 L16 -18" stroke={c} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Flor({ x, y, c = '#FBF9F1' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 L0 14" stroke="#6F9A55" strokeWidth="2" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-5" rx="3" ry="5" fill={c} transform={`rotate(${a})`} />
      ))}
      <circle r="2.6" fill="#F2B13B" />
    </g>
  );
}

export default function Campo({ animado = true }) {
  return (
    <div className={`escena ${animado ? 'escena--viva' : ''}`}>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" className="escena__svg" role="img" aria-label="Paisaje de campo uruguayo: lomadas de pasto natural, un árbol, sol, alambrado y una vaca pastando">
        <style>{ESTILO}</style>
        <defs>
          <linearGradient id="cam-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9E8C4" />
            <stop offset="1" stopColor="#F2F5E2" />
          </linearGradient>
        </defs>
        <rect width="1000" height="600" fill="url(#cam-cielo)" />
        <g className="cam-sol">
          <circle cx="170" cy="120" r="88" fill="#F2B13B" opacity=".14" />
          <circle cx="170" cy="120" r="70" fill="#F2B13B" opacity=".2" />
        </g>
        <circle cx="170" cy="120" r="54" fill="#F2B13B" />
        {/* nubes */}
        <g className="cam-nube" opacity=".9">
          <ellipse cx="430" cy="90" rx="64" ry="16" fill="#FBF9F1" />
          <ellipse cx="470" cy="78" rx="38" ry="15" fill="#FBF9F1" />
        </g>
        <g className="cam-nube cam-nube--lenta" opacity=".75">
          <ellipse cx="660" cy="130" rx="48" ry="11" fill="#FBF9F1" />
        </g>
        {/* pájaros */}
        <g className="cam-aves">
          <path d="M0 0 q8 -7 16 0 q8 -7 16 0 M40 14 q6 -5 12 0 q6 -5 12 0" stroke="#5E6070" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
        {/* lomadas */}
        <path d="M0 300 Q220 220 460 280 T1000 250 L1000 600 L0 600 Z" fill="#C9DDA8" />
        <path d="M0 360 Q300 290 600 340 T1000 320 L1000 600 L0 600 Z" fill="#AECB8A" />
        {/* árbol */}
        <rect x="806" y="230" width="16" height="80" rx="6" fill="#8A6A4A" />
        <path d="M814 300 q-20 10 -34 8 M814 300 q20 10 36 6" stroke="#8A6A4A" strokeWidth="5" strokeLinecap="round" fill="none" />
        <g className="cam-copa">
          <circle cx="814" cy="210" r="56" fill="#7FAE63" />
          <circle cx="780" cy="236" r="34" fill="#6F9A55" />
          <circle cx="852" cy="232" r="38" fill="#6F9A55" />
          <circle cx="826" cy="186" r="20" fill="#94BC73" opacity=".7" />
        </g>
        {/* alambrado */}
        <g stroke="#8A6A4A" strokeWidth="4">
          <path d="M420 300 L420 340 M500 296 L500 336 M580 300 L580 340" />
        </g>
        <path d="M400 312 Q500 306 600 312 M400 326 Q500 320 600 326" stroke="#8A6A4A" strokeWidth="1.5" fill="none" />
        {/* flores del campo */}
        <Flor x={440} y={372} />
        <Flor x={470} y={386} c="#F4A6BD" />
        <Flor x={492} y={370} />
        <Flor x={420} y={392} c="#E3EEA0" />
        <Flor x={510} y={392} c="#F4A6BD" />
        {/* primer plano de pasto */}
        <path d="M0 430 Q350 390 700 430 T1000 420 L1000 600 L0 600 Z" fill="#94BC73" />
        {/* tierra descubierta */}
        <path d="M80 480 Q180 452 300 470 Q360 486 350 520 Q260 548 130 540 Q60 526 80 480 Z" fill="#8A6A4A" />
        <path d="M130 490 Q200 476 270 488 Q300 500 290 518 Q220 532 150 522 Z" fill="#6E5238" />
        <circle cx="180" cy="505" r="5" fill="#C9A26B" />
        <circle cx="240" cy="498" r="4" fill="#C9A26B" />
        <circle cx="210" cy="520" r="3" fill="#C9A26B" />
        {/* lombriz */}
        <path className="cam-lombriz" d="M262 512 q6 -8 12 0 q6 8 12 0" stroke="#F4A6BD" strokeWidth="5" strokeLinecap="round" fill="none" />
        <Mata x={90} y={486} />
        <Mata x={330} y={480} s={1.2} d={1} />
        <Mata x={420} y={540} c="#7FAE63" d={2} />
        <Mata x={900} y={520} s={1.3} d={0.5} />
        <Mata x={640} y={560} s={1.1} c="#7FAE63" d={1.6} />
        <Mata x={760} y={470} c="#7FAE63" d={2.4} />
        {/* vaca */}
        <Vaca x={680} y={300} s={1.05} />
        {/* bosta, con dos moscas */}
        <path d="M526 466 q4 -16 26 -14 q24 0 24 14 q-4 12 -26 12 q-22 0 -24 -12 Z" fill="#6E5238" />
        <path d="M534 460 q16 -8 34 0" stroke="#8A6A4A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g className="cam-mosca">
          <circle cx="0" cy="0" r="2.5" fill="#22232A" />
        </g>
        <g className="cam-mosca cam-mosca--2">
          <circle cx="0" cy="0" r="2" fill="#22232A" />
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
.escena--viva .cam-sol{transform-box:fill-box;transform-origin:50% 50%;animation:cam-respira 6s ease-in-out infinite}
.escena--viva .cam-nube{animation:cam-nube 30s ease-in-out infinite alternate}
.escena--viva .cam-nube--lenta{animation-duration:44s}
.cam-aves{transform:translate(-80px,160px)}
.escena--viva .cam-aves{animation:cam-aves 28s linear infinite}
.escena--viva .cam-copa{transform-box:fill-box;transform-origin:50% 100%;animation:cam-copa 7s ease-in-out infinite}
.escena--viva .cam-cola{transform-box:fill-box;transform-origin:0 0;animation:cam-cola 2.4s ease-in-out infinite}
.escena--viva .cam-cabeza{transform-box:fill-box;transform-origin:100% 30%;animation:cam-pasta 6s ease-in-out infinite}
.escena--viva .cam-mata{transform-box:fill-box;transform-origin:50% 100%;animation:cam-mata 4s ease-in-out infinite}
.escena--viva .cam-lombriz{transform-box:fill-box;transform-origin:50% 50%;animation:cam-lombriz 2s ease-in-out infinite}
.cam-mosca{transform:translate(550px,440px)}
.escena--viva .cam-mosca{animation:cam-mosca 3s linear infinite}
.escena--viva .cam-mosca--2{animation-duration:2.3s;animation-direction:reverse}
@keyframes cam-respira{50%{transform:scale(1.08)}}
@keyframes cam-nube{to{transform:translateX(140px)}}
@keyframes cam-aves{0%{transform:translate(-80px,170px)}100%{transform:translate(1080px,120px)}}
@keyframes cam-copa{50%{transform:rotate(1.2deg)}}
@keyframes cam-cola{0%,100%{transform:rotate(0)}50%{transform:rotate(18deg)}}
@keyframes cam-pasta{0%,40%,100%{transform:rotate(0)}55%,85%{transform:rotate(-14deg)}}
@keyframes cam-mata{50%{transform:rotate(5deg)}}
@keyframes cam-lombriz{50%{transform:scaleX(1.15)}}
@keyframes cam-mosca{0%{transform:translate(530px,440px)}25%{transform:translate(560px,428px)}50%{transform:translate(578px,446px)}75%{transform:translate(548px,452px)}100%{transform:translate(530px,440px)}}
@media (prefers-reduced-motion:reduce){.escena--viva *{animation:none!important}}
`;
