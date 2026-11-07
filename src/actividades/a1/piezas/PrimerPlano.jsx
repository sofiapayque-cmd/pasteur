import { GRANO } from '../../../components/escenas/grano';
import { azar } from '../laboratorio';

/*
  Primer plano del lugar donde se toma la muestra (viewBox 600×400).
  - raspado: muestra la marca que dejó el instrumento
  - huella: marca de dedos (error: tocar con la mano)

  Bloque 7 (7/11): colores naturales y textura, para que se lea qué es cada
  cosa: grava antártica con escarcha, líquenes y musgo; caca de pingüino
  rosada (por el krill que comen) junto a un nido de piedritas; tierra oscura
  del campo con grumos y raíces; bosta de vaca con costra y fibras.
  La muestra queda siempre en el centro (ahí cae el instrumento).
  Todo es SVG sin filtros; las piedritas y grumos salen de una semilla fija.
*/

/* Piedritas o grumos: elipses con luz arriba a la izquierda. */
function Granos({ semilla, n, zona, colores, tam = [2, 8], luz = 0.35, aplastadas = 0.7 }) {
  const r = azar(semilla);
  const [x0, y0, x1, y1] = zona;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + r() * (x1 - x0);
        const y = y0 + r() * (y1 - y0);
        const t = tam[0] + r() * r() * (tam[1] - tam[0]);
        const color = colores[Math.floor(r() * colores.length)];
        const giro = Math.round(r() * 180);
        const ry = t * (aplastadas + r() * 0.25);
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${giro})`}>
            <ellipse cx={t * 0.12} cy={t * 0.22} rx={t} ry={ry} fill="#1E1A14" opacity=".22" />
            <ellipse rx={t} ry={ry} fill={color} />
            {t > 3 && <ellipse cx={-t * 0.3} cy={-ry * 0.35} rx={t * 0.42} ry={ry * 0.3} fill="#FFFFFF" opacity={luz} />}
          </g>
        );
      })}
    </g>
  );
}

/* Puntitos sueltos (escarcha, tierra fina, semillitas). */
function Puntos({ semilla, n, zona, color, r: radio = [0.6, 1.6], opacidad = 0.7 }) {
  const r = azar(semilla);
  const [x0, y0, x1, y1] = zona;
  return (
    <g fill={color} opacity={opacidad}>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={(x0 + r() * (x1 - x0)).toFixed(1)} cy={(y0 + r() * (y1 - y0)).toFixed(1)} r={(radio[0] + r() * (radio[1] - radio[0])).toFixed(2)} />
      ))}
    </g>
  );
}

/* Roca grande con sombra y una cara más clara. */
function Roca({ x, y, w, h, color = '#6E6A62', claro = '#9A958A', giro = 0, children }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro})`}>
      <ellipse cx={w * 0.08} cy={h * 0.62} rx={w * 1.02} ry={h * 0.42} fill="#1E1A14" opacity=".22" />
      <path d={`M${-w} ${h * 0.25} Q${-w * 0.95} ${-h * 0.75} ${-w * 0.15} ${-h} Q${w * 0.7} ${-h * 0.95} ${w} ${-h * 0.1} Q${w * 1.02} ${h * 0.55} ${w * 0.2} ${h * 0.62} Q${-w * 0.7} ${h * 0.7} ${-w} ${h * 0.25} Z`} fill={color} />
      <path d={`M${-w * 0.8} ${-h * 0.05} Q${-w * 0.7} ${-h * 0.72} ${-w * 0.1} ${-h * 0.86} Q${w * 0.35} ${-h * 0.86} ${w * 0.55} ${-h * 0.45} Q${0} ${-h * 0.35} ${-w * 0.8} ${-h * 0.05} Z`} fill={claro} opacity=".7" />
      {children}
    </g>
  );
}

/* Liquen que crece pegado a la roca, en manchas (anaranjado como Xanthoria, o negro). */
function Liquen({ semilla, n, rx, ry, color, x = 0, y = 0 }) {
  const r = azar(semilla);
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }, (_, i) => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r());
        const t = 1.6 + r() * 3.6;
        return <circle key={i} cx={(Math.cos(a) * d * rx).toFixed(1)} cy={(Math.sin(a) * d * ry).toFixed(1)} r={t.toFixed(1)} fill={color} opacity={0.75 + r() * 0.25} />;
      })}
    </g>
  );
}

/* Matita de musgo: muchas bolitas verdes apretadas. */
function Musgo({ x, y, rx, ry, semilla }) {
  const r = azar(semilla);
  const verdes = ['#5D7A32', '#6F8C3C', '#83A04A', '#4E6A2B', '#93AE57'];
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="3" cy={ry * 0.35} rx={rx * 1.05} ry={ry * 0.75} fill="#1E1A14" opacity=".2" />
      <ellipse rx={rx} ry={ry} fill="#4E6A2B" />
      {Array.from({ length: 70 }, (_, i) => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.92;
        return <circle key={i} cx={(Math.cos(a) * d * rx).toFixed(1)} cy={(Math.sin(a) * d * ry).toFixed(1)} r={(2 + r() * 3.4).toFixed(1)} fill={verdes[Math.floor(r() * verdes.length)]} />;
      })}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={`l${i}`} cx={(r() - 0.6) * rx} cy={(r() - 0.7) * ry} r={1.2} fill="#C7D88A" opacity=".8" />
      ))}
    </g>
  );
}

function Pinguinito({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="2" cy="60" rx="20" ry="5" fill="#1E1A14" opacity=".18" />
      <ellipse cx="0" cy="22" rx="22" ry="38" fill="#2B3245" />
      <ellipse cx="-3" cy="30" rx="15" ry="28" fill="#FBF9F1" />
      <circle cx="-6" cy="-6" r="2.6" fill="#1A1B22" />
      <circle cx="-6" cy="-6" r="5" fill="none" stroke="#FBF9F1" strokeWidth="1.6" />
      <path d="M-14 -2 L-26 1 L-14 4 Z" fill="#2B2B2B" />
      <path d="M-8 58 L-15 63 L-2 63 Z M8 58 L15 63 L2 63 Z" fill="#E7A9B6" />
    </g>
  );
}

/* Pasto: matas de hojas finas */
function Pasto({ semilla, n, y0, y1, x0 = 0, x1 = 600, alto = [30, 60], verdes = ['#6F9A55', '#7FAE63', '#5E8A47', '#8DB86C'] }) {
  const r = azar(semilla);
  return (
    <g strokeLinecap="round" fill="none">
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + r() * (x1 - x0);
        const y = y0 + r() * (y1 - y0);
        const h = alto[0] + r() * (alto[1] - alto[0]);
        const c = verdes[Math.floor(r() * verdes.length)];
        return (
          <g key={i} stroke={c} strokeWidth={2.2 + r() * 1.8}>
            <path d={`M${x.toFixed(1)} ${y.toFixed(1)} q${(-4 - r() * 8).toFixed(1)} ${(-h * 0.5).toFixed(1)} ${(-8 - r() * 10).toFixed(1)} ${(-h).toFixed(1)}`} />
            <path d={`M${x.toFixed(1)} ${y.toFixed(1)} q${(r() * 4).toFixed(1)} ${(-h * 0.6).toFixed(1)} ${(2 + r() * 6).toFixed(1)} ${(-h * 1.1).toFixed(1)}`} />
            <path d={`M${x.toFixed(1)} ${y.toFixed(1)} q${(4 + r() * 6).toFixed(1)} ${(-h * 0.4).toFixed(1)} ${(10 + r() * 10).toFixed(1)} ${(-h * 0.8).toFixed(1)}`} />
          </g>
        );
      })}
    </g>
  );
}

function SueloAntartico() {
  return (
    <>
      <defs>
        <linearGradient id="pp-ant-suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A49D8F" />
          <stop offset="1" stopColor="#7A7366" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#pp-ant-suelo)" />
      {/* Nieve que queda en los huecos */}
      <path d="M0 0 H600 V58 Q540 84 470 66 Q400 52 330 74 Q240 98 150 70 Q80 52 0 82 Z" fill="#F3F6FA" />
      <path d="M0 82 Q80 52 150 70 Q240 98 330 74 Q400 52 470 66 Q540 84 600 58 V70 Q540 96 470 78 Q400 64 330 86 Q240 110 150 82 Q80 64 0 94 Z" fill="#D3DCE8" />
      <path d="M470 400 Q500 352 560 350 Q600 352 600 360 V400 Z" fill="#F3F6FA" />
      <Granos semilla={11} n={240} zona={[0, 86, 600, 400]} colores={['#6F695E', '#8F887A', '#5E5950', '#A59E90', '#7B7468', '#857D6E']} tam={[1.5, 11]} />
      {/* Muestra: tierra húmeda y fina entre las piedras */}
      <path d="M138 240 Q160 200 214 198 Q250 180 300 192 Q352 178 400 196 Q452 206 458 244 Q470 286 414 296 Q372 316 314 306 Q262 322 214 302 Q146 296 138 240 Z" fill="#746C5F" />
      <path d="M156 240 Q176 208 222 208 Q258 192 300 202 Q350 190 394 206 Q440 216 442 246 Q448 280 404 288 Q366 304 312 296 Q264 310 222 294 Q162 288 156 240 Z" fill="#655E52" />
      <Puntos semilla={12} n={160} zona={[160, 196, 450, 306]} color="#4E483E" r={[0.6, 1.8]} opacidad={0.8} />
      <Granos semilla={13} n={22} zona={[170, 205, 430, 296]} colores={['#8F887A', '#5E5950', '#A59E90']} tam={[1.2, 3.6]} />
      <Roca x={76} y={170} w={52} h={36} color="#6A665E" claro="#9C978B" giro={-6}>
        <Liquen semilla={21} n={26} rx={26} ry={14} color="#E0892E" x={-6} y={-12} />
        <Liquen semilla={22} n={10} rx={10} ry={6} color="#F2B13B" x={20} y={4} />
      </Roca>
      <Roca x={520} y={176} w={58} h={40} color="#615D56" claro="#908B80" giro={8}>
        <Liquen semilla={23} n={30} rx={30} ry={14} color="#2A2826" x={4} y={-6} />
        <Liquen semilla={24} n={12} rx={14} ry={8} color="#B8BC9A" x={-22} y={-14} />
      </Roca>
      <Roca x={500} y={330} w={30} h={20} color="#706B61" claro="#A39D90" giro={-12} />
      <Musgo x={86} y={326} rx={58} ry={30} semilla={25} />
      {/* Escarcha */}
      <Puntos semilla={26} n={90} zona={[0, 90, 600, 400]} color="#FFFFFF" r={[0.6, 1.5]} opacidad={0.75} />
    </>
  );
}

function CacaDePinguino() {
  return (
    <>
      <defs>
        <linearGradient id="pp-ant-ping" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#98918A" />
          <stop offset="1" stopColor="#6C665F" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#pp-ant-ping)" />
      <path d="M0 0 H600 V104 Q470 128 340 108 Q200 90 90 116 Q40 126 0 118 Z" fill="#EEF2F8" />
      <path d="M0 118 Q40 126 90 116 Q200 90 340 108 Q470 128 600 104 V116 Q470 140 340 120 Q200 102 90 128 Q40 138 0 130 Z" fill="#D3DCE8" />
      <Pinguinito x={520} y={36} s={0.72} />
      <Pinguinito x={458} y={58} s={0.52} />
      <Granos semilla={31} n={170} zona={[0, 120, 600, 400]} colores={['#57524C', '#76706A', '#8D877F', '#4A4641', '#66615A']} tam={[2, 8]} luz={0.3} aplastadas={0.8} />
      {/* Nido de piedritas (los pingüinos los arman con piedras) */}
      <g transform="translate(500 300)">
        {Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2;
          return (
            <g key={i} transform={`translate(${(Math.cos(a) * 62).toFixed(1)} ${(Math.sin(a) * 30).toFixed(1)})`}>
              <ellipse cx="1.5" cy="3" rx="9" ry="6.5" fill="#1E1A14" opacity=".25" />
              <ellipse rx="9" ry="6.5" fill={i % 3 ? '#6E6862' : '#8A847C'} />
              <ellipse cx="-3" cy="-2" rx="3.5" ry="2" fill="#FFFFFF" opacity=".3" />
            </g>
          );
        })}
        <path d="M-14 -4 q10 -8 22 -2 q-6 2 -12 8 z" fill="#F4F2EE" stroke="#C9C4BC" strokeWidth="1" />
      </g>
      {/* Manchas rosadas por el krill, con rayas blancas */}
      {[[70, 190, 22, 10], [120, 330, 16, 8], [430, 180, 18, 8], [560, 230, 12, 6], [250, 360, 20, 7]].map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#D9939C" opacity=".85" />
      ))}
      {/* La muestra: un depósito grande en el centro */}
      <path d="M190 246 Q206 200 270 206 Q320 186 372 204 Q430 214 420 252 Q414 292 346 290 Q300 306 248 292 Q184 286 190 246 Z" fill="#D58B95" />
      <path d="M214 246 Q232 214 282 220 Q330 204 370 220 Q404 232 396 256 Q386 280 338 276 Q296 288 256 278 Q214 272 214 246 Z" fill="#E4A6AF" />
      {[[250, 238, 5, 3.2], [292, 226, 6, 3.6], [336, 244, 4.4, 3], [272, 262, 3.6, 2.6], [356, 228, 3.4, 2.4], [316, 266, 5, 3.2], [232, 254, 2.6, 2], [306, 246, 2.8, 2]].map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#F6EEEC" opacity=".7" />
      ))}
      <path d="M226 252 q14 12 40 8 M352 270 q22 -2 36 -14" stroke="#B9707A" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".55" />
      {/* Gotitas alrededor */}
      {[[176, 232, 6], [180, 270, 4], [436, 236, 5], [428, 280, 7], [300, 312, 4], [238, 196, 4]].map(([x, y, rr], i) => (
        <circle key={i} cx={x} cy={y} r={rr} fill="#D58B95" />
      ))}
    </>
  );
}

function SueloDeCampo() {
  return (
    <>
      <defs>
        <linearGradient id="pp-campo-suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5E4835" />
          <stop offset="1" stopColor="#3F3026" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#pp-campo-suelo)" />
      {/* Raíces que bajan del pasto */}
      <g stroke="#B99A6E" strokeWidth="1.6" fill="none" opacity=".55" strokeLinecap="round">
        {[40, 110, 190, 270, 360, 430, 510, 570].map((x, i) => (
          <path key={i} d={`M${x} 64 q${i % 2 ? 12 : -10} 40 ${i % 2 ? -4 : 6} 80 q${i % 2 ? -10 : 8} 30 ${i % 2 ? 8 : -6} 70 M${x} 90 q${i % 2 ? -18 : 18} 20 ${i % 2 ? -30 : 26} 30`} />
        ))}
      </g>
      <Granos semilla={41} n={190} zona={[0, 70, 600, 400]} colores={['#6A5039', '#4F3B2B', '#7A5E44', '#3E2F24', '#5B4532']} tam={[2, 9]} luz={0.18} aplastadas={0.78} />
      <Granos semilla={42} n={14} zona={[0, 90, 600, 400]} colores={['#A8A091', '#8E8576', '#B9AE98']} tam={[3, 7]} luz={0.35} />
      {/* Pastitos secos y restos de hojas */}
      <g stroke="#B79A62" strokeWidth="2" strokeLinecap="round" opacity=".65">
        {[[60, 260, 26, -20], [480, 140, 30, 15], [520, 300, 22, -35], [140, 160, 18, 40], [350, 350, 24, 10]].map(([x, y, l, g], i) => (
          <path key={i} d={`M${x} ${y} l${l} 0`} transform={`rotate(${g} ${x} ${y})`} />
        ))}
      </g>
      {/* La muestra: tierra suelta y grumosa en el centro */}
      <path d="M160 238 Q200 190 300 196 Q410 190 440 236 Q462 282 390 300 Q300 320 214 302 Q140 286 160 238 Z" fill="#4A3829" />
      <Granos semilla={43} n={70} zona={[176, 204, 432, 298]} colores={['#6E543C', '#5A4431', '#7F6347', '#4B392A']} tam={[2, 6]} luz={0.2} />
      {/* Lombriz */}
      <path d="M392 330 q12 -16 26 0 q14 16 28 0 q10 -10 18 -2" stroke="#D98E8E" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M392 330 q12 -16 26 0 q14 16 28 0 q10 -10 18 -2" stroke="#F0B3B0" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".7" transform="translate(-1 -2)" />
      {/* Pasto arriba */}
      <rect width="600" height="66" fill="#7E9F5A" />
      <Pasto semilla={44} n={46} y0={62} y1={74} alto={[34, 62]} />
    </>
  );
}

function BostaDeVaca() {
  const r = azar(51);
  return (
    <>
      <defs>
        <linearGradient id="pp-campo-vaca" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B7CC8E" />
          <stop offset=".28" stopColor="#8FB46B" />
          <stop offset="1" stopColor="#6E9450" />
        </linearGradient>
        <radialGradient id="pp-bosta" cx=".46" cy=".42" r=".6">
          <stop offset="0" stopColor="#5C4C2F" />
          <stop offset=".7" stopColor="#4C3E26" />
          <stop offset="1" stopColor="#3B301D" />
        </radialGradient>
      </defs>
      <rect width="600" height="400" fill="url(#pp-campo-vaca)" />
      {/* la vaca, lejos */}
      <g transform="translate(470 34) scale(.46)">
        <ellipse cx="0" cy="104" rx="90" ry="10" fill="#1E1A14" opacity=".15" />
        <rect x="-76" y="-20" width="160" height="80" rx="38" fill="#FBF9F1" />
        <path d="M-40 -18 Q-10 -6 -22 22 Q-46 30 -62 10 Q-66 -12 -40 -18 Z" fill="#8A6A4A" />
        <path d="M30 0 Q56 -10 66 14 Q54 34 34 26 Z" fill="#8A6A4A" />
        <rect x="-62" y="40" width="14" height="56" rx="6" fill="#FBF9F1" />
        <rect x="34" y="40" width="14" height="56" rx="6" fill="#FBF9F1" />
        <path d="M-100 -34 Q-110 -46 -118 -40 M-70 -34 Q-60 -46 -52 -40" stroke="#E9E2D2" strokeWidth="6" strokeLinecap="round" fill="none" />
        <rect x="-108" y="-36" width="48" height="58" rx="22" fill="#FBF9F1" />
        <rect x="-104" y="4" width="40" height="26" rx="13" fill="#F4A6BD" />
        <circle cx="-94" cy="-14" r="4" fill="#1A1B22" />
        <circle cx="-74" cy="-14" r="4" fill="#1A1B22" />
      </g>
      <Pasto semilla={52} n={190} y0={112} y1={400} alto={[12, 34]} verdes={['#6F9A55', '#7FAE63', '#5E8A47', '#8DB86C', '#9CC27A']} />
      <Puntos semilla={53} n={60} zona={[0, 120, 600, 400]} color="#F3E7A6" r={[1, 2.2]} opacidad={0.8} />
      {/* La bosta: chata, con una costra seca más clara en el borde, anillos y grietas */}
      <ellipse cx="304" cy="262" rx="150" ry="44" fill="#1E1A14" opacity=".2" />
      <path d="M158 246 Q150 214 196 204 Q226 186 270 192 Q302 178 340 188 Q392 184 424 204 Q458 222 446 252 Q440 282 392 286 Q352 300 300 292 Q248 302 212 288 Q164 280 158 246 Z" fill="#7C6A47" />
      <path d="M168 244 Q164 218 204 210 Q232 194 272 200 Q302 188 338 196 Q388 192 416 210 Q444 226 434 250 Q428 274 388 278 Q350 290 300 284 Q252 292 216 280 Q174 272 168 244 Z" fill="url(#pp-bosta)" />
      <g fill="none" strokeLinecap="round">
        <path d="M208 234 Q244 212 300 212 Q362 210 398 232" stroke="#6C5A38" strokeWidth="3.4" opacity=".75" />
        <path d="M232 252 Q266 236 304 236 Q350 236 378 252" stroke="#6C5A38" strokeWidth="3" opacity=".65" />
        <path d="M262 266 Q292 256 332 260" stroke="#6C5A38" strokeWidth="2.4" opacity=".55" />
        <path d="M196 254 l12 -6 l9 5 M394 262 l-10 -8 l-12 4 M300 204 l5 10 l-5 7" stroke="#2C2416" strokeWidth="1.4" opacity=".7" />
      </g>
      {/* Fibras de pasto sin digerir */}
      <g stroke="#C9B27A" strokeWidth="1.8" strokeLinecap="round" opacity=".85">
        {Array.from({ length: 16 }, (_, i) => {
          const x = 200 + r() * 210;
          const y = 206 + r() * 74;
          const a = r() * 180;
          const l = 8 + r() * 14;
          return <path key={i} d={`M${x.toFixed(1)} ${y.toFixed(1)} l${l.toFixed(1)} 0`} transform={`rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`} />;
        })}
      </g>
      <ellipse cx="270" cy="214" rx="26" ry="7" fill="#FFFFFF" opacity=".12" />
      {/* Un escarabajo estercolero, chiquito */}
      <g transform="translate(430 300) rotate(-20)">
        <ellipse cx="1" cy="2" rx="8" ry="5.4" fill="#1E1A14" opacity=".25" />
        <ellipse rx="7.5" ry="5" fill="#26231F" />
        <circle cx="-8" cy="0" r="3" fill="#26231F" />
        <path d="M-2 -5 v10" stroke="#4A453C" strokeWidth="1" />
        <ellipse cx="-2" cy="-2" rx="3" ry="1.4" fill="#FFFFFF" opacity=".35" />
        <path d="M-4 -5 l-3 -4 M2 -5 l2 -4 M-4 5 l-3 4 M2 5 l2 4" stroke="#26231F" strokeWidth="1.2" />
      </g>
      {/* Pasto de adelante, tapando un poco el borde */}
      <Pasto semilla={54} n={18} y0={292} y1={312} x0={150} x1={460} alto={[14, 26]} />
    </>
  );
}

export default function PrimerPlano({ ambiente, raspado, huella }) {
  const id = ambiente.id;
  const marca = id === 'antartida-pinguino' ? '#F7E9EB' : id === 'campo-vaca' ? '#8E7A50' : '#C9C2B3';
  return (
    <div className="a1-primerplano">
      <svg viewBox="0 0 600 400" className="a1-primerplano__svg" role="img" aria-label={`Primer plano: ${ambiente.nombre}`}>
        {id === 'antartida-suelo' && <SueloAntartico />}
        {id === 'antartida-pinguino' && <CacaDePinguino />}
        {id === 'campo-suelo' && <SueloDeCampo />}
        {id === 'campo-vaca' && <BostaDeVaca />}
        {raspado && (
          <g className="a1-raspado" stroke={marca} strokeWidth="5" strokeLinecap="round" opacity=".8">
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
