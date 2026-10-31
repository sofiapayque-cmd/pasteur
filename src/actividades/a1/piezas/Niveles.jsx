import { useId, useMemo } from 'react';

/*
  Dibujos REALISTAS de los niveles "a simple vista" y "con lupa" de cada ambiente.
  Todo es SVG: relieve con ruido + luz (feTurbulence + feDiffuseLighting), piedras
  con sombra y brillo, organismos translúcidos. Las posiciones de lo que se puede
  tocar vienen de ../zoom.js (x, y en %), así el dibujo y los botones coinciden.
  Los colores son naturales (tierra, roca, musgo): es la "realidad" dentro del visor;
  la interfaz alrededor mantiene la paleta del sistema.
*/

function azar(semilla) {
  let s = Math.abs(Math.floor(semilla)) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Contorno irregular cerrado (piedra, grumo, mancha)
function blob(cx, cy, r, rnd, puntos = 9, irregular = 0.22, alto = 1) {
  const p = [];
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const k = r * (1 - irregular / 2 + rnd() * irregular);
    p.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k * alto]);
  }
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ini = m(p[puntos - 1], p[0]);
  let d = `M${ini[0].toFixed(1)} ${ini[1].toFixed(1)}`;
  for (let i = 0; i < puntos; i++) {
    const a = p[i];
    const b = m(a, p[(i + 1) % puntos]);
    d += ` Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// Polígono anguloso (grano mineral)
function grano(cx, cy, r, rnd, lados = 6) {
  const p = [];
  const giro = rnd() * Math.PI;
  for (let i = 0; i < lados; i++) {
    const a = giro + (i / lados) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const k = r * (0.7 + rnd() * 0.45);
    p.push(`${(cx + Math.cos(a) * k).toFixed(1)},${(cy + Math.sin(a) * k).toFixed(1)}`);
  }
  return p.join(' ');
}

const P = (v) => v * 4; // % del visor → unidades del viewBox (400)

/* Definiciones comunes: relieve, sombra, brillo */
function Defs({ id, semilla, base, frecuencia = 0.03, relieve = 3 }) {
  return (
    <defs>
      <clipPath id={`${id}-lente`}>
        <circle cx="200" cy="200" r="196" />
      </clipPath>
      <filter id={`${id}-relieve`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={frecuencia} numOctaves="4" seed={semilla} result="ruido" />
        <feDiffuseLighting in="ruido" surfaceScale={relieve} lightingColor="#FFFFFF" result="luz">
          <feDistantLight azimuth="235" elevation="48" />
        </feDiffuseLighting>
        <feComposite in="luz" in2="SourceGraphic" operator="arithmetic" k1="1.25" k2="0" k3="0" k4="0" />
      </filter>
      <filter id={`${id}-sombra`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="3" dy="5" stdDeviation="3.5" floodColor="#1E1A14" floodOpacity=".45" />
      </filter>
      <filter id={`${id}-suave`}>
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <radialGradient id={`${id}-vineta`} cx="50%" cy="50%" r="50%">
        <stop offset=".62" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".42" />
      </radialGradient>
      <radialGradient id={`${id}-piedra`} cx="35%" cy="30%" r="80%">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity=".38" />
        <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity=".32" />
      </radialGradient>
      <linearGradient id={`${id}-vidrio`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity=".75" />
        <stop offset=".45" stopColor="#FFFFFF" stopOpacity=".08" />
        <stop offset="1" stopColor="#000000" stopOpacity=".18" />
      </linearGradient>
      <rect id={`${id}-fondo`} width="400" height="400" fill={base} />
    </defs>
  );
}

/* Superficie con relieve de un color */
function Suelo({ id, base }) {
  return <rect width="400" height="400" fill={base} filter={`url(#${id}-relieve)`} />;
}

/* Montón de piedras con sombra y brillo */
function Piedras({ id, lista }) {
  return (
    <g filter={`url(#${id}-sombra)`}>
      {lista.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill={p.color} />
          <path d={p.d} fill={`url(#${id}-piedra)`} />
        </g>
      ))}
    </g>
  );
}

function usePiedras(semilla, cantidad, colores, { rMin = 8, rMax = 24, evitar = [] } = {}) {
  return useMemo(() => {
    const r = azar(semilla);
    const out = [];
    let intentos = 0;
    while (out.length < cantidad && intentos < cantidad * 6) {
      intentos++;
      const x = 10 + r() * 380;
      const y = 10 + r() * 380;
      if (evitar.some(([ex, ey, er]) => Math.hypot(x - ex, y - ey) < er)) continue;
      const rad = rMin + r() * (rMax - rMin);
      out.push({ d: blob(x, y, rad, r, 8, 0.35, 0.72 + r() * 0.3), color: colores[Math.floor(r() * colores.length)] });
    }
    return out;
  }, [semilla, cantidad]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Marco({ id, children, etiqueta }) {
  return (
    <svg className="a1-nivel" viewBox="0 0 400 400" role="img" aria-label={etiqueta}>
      {children}
    </svg>
  );
}

/* ---------- A SIMPLE VISTA ---------- */

function OjoAntartidaSuelo({ id, z }) {
  const liquen = z.ojo.puntos.find((p) => p.id === 'liquen');
  const musgo = z.ojo.puntos.find((p) => p.id === 'musgo');
  const nieve = z.ojo.puntos.find((p) => p.id === 'nieve');
  const roca = useMemo(() => blob(P(liquen.x), P(liquen.y), 78, azar(11), 10, 0.25, 0.8), [liquen]);
  const manchas = useMemo(() => {
    const r = azar(21);
    return Array.from({ length: 16 }, () => ({
      x: P(liquen.x) + (r() - 0.5) * 110,
      y: P(liquen.y) + (r() - 0.5) * 80,
      r: 5 + r() * 13,
      c: ['#D9822B', '#EAA640', '#C8C29A', '#E7B652'][Math.floor(r() * 4)],
      d: null,
    })).map((m, i) => ({ ...m, d: blob(m.x, m.y, m.r, azar(31 + i), 8, 0.4) }));
  }, [liquen]);
  const matas = useMemo(() => {
    const r = azar(41);
    return Array.from({ length: 70 }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 52;
      return { x: P(musgo.x) + Math.cos(a) * d, y: P(musgo.y) + Math.sin(a) * d * 0.7, r: 2.5 + r() * 3.5, c: ['#4F6B22', '#6C8A2E', '#88A43C', '#3E5A1C'][Math.floor(r() * 4)] };
    });
  }, [musgo]);
  const piedras = usePiedras(5, 46, ['#5F5A54', '#7A746C', '#8F887E', '#4A4743', '#6B655D'], {
    evitar: [
      [P(liquen.x), P(liquen.y), 90],
      [P(musgo.x), P(musgo.y), 55],
      [P(nieve.x), P(nieve.y), 60],
    ],
  });
  return (
    <>
      <Defs id={id} semilla={3} base="#8A8276" frecuencia={0.045} relieve={4} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#8A8276" />
        <Piedras id={id} lista={piedras} />
        {/* roca grande con líquenes */}
        <g filter={`url(#${id}-sombra)`}>
          <path d={roca} fill="#55524E" />
          <path d={roca} fill={`url(#${id}-piedra)`} />
        </g>
        {manchas.map((m, i) => (
          <path key={i} d={m.d} fill={m.c} opacity=".92" />
        ))}
        {manchas.slice(0, 8).map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.r * 0.35} fill="#000" opacity=".12" />
        ))}
        {/* musgo en almohadilla */}
        <ellipse cx={P(musgo.x)} cy={P(musgo.y) + 6} rx="58" ry="36" fill="#2E3A16" opacity=".55" filter={`url(#${id}-suave)`} />
        {matas.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.r} fill={m.c} />
        ))}
        {matas.slice(0, 30).map((m, i) => (
          <circle key={i} cx={m.x - 0.8} cy={m.y - 0.8} r={m.r * 0.4} fill="#C9DB7A" opacity=".55" />
        ))}
        {/* nieve */}
        <path d={blob(P(nieve.x), P(nieve.y), 62, azar(51), 11, 0.3, 0.7)} fill="#CBD6E6" />
        <path d={blob(P(nieve.x) - 4, P(nieve.y) - 5, 56, azar(52), 11, 0.3, 0.66)} fill="#F2F6FB" />
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

function OjoAntartidaPinguino({ id, z }) {
  const caca = z.ojo.puntos.find((p) => p.id === 'caca');
  const nido = z.ojo.puntos.find((p) => p.id === 'piedras');
  const pluma = z.ojo.puntos.find((p) => p.id === 'pluma');
  const piedras = usePiedras(8, 38, ['#5F5A54', '#77716A', '#4A4743', '#8A847B'], { evitar: [[P(caca.x), P(caca.y), 80]] });
  const nidoPiedras = useMemo(() => {
    const r = azar(17);
    return Array.from({ length: 26 }, (_, i) => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 58;
      const x = P(nido.x) + Math.cos(a) * d;
      const y = P(nido.y) + Math.sin(a) * d * 0.6;
      return { d: blob(x, y, 9 + r() * 7, azar(100 + i), 8, 0.25, 0.8), color: ['#6E6962', '#86807A', '#5A5652', '#9A948B'][Math.floor(r() * 4)] };
    });
  }, [nido]);
  const salpicado = useMemo(() => {
    const r = azar(23);
    return Array.from({ length: 12 }, (_, i) => ({ d: blob(P(caca.x) + (r() - 0.5) * 150, P(caca.y) + (r() - 0.5) * 110, 4 + r() * 9, azar(60 + i), 7, 0.5), c: r() < 0.5 ? '#E7A39A' : '#F3E7E0' }));
  }, [caca]);
  const barbas = useMemo(() => {
    const r = azar(29);
    return Array.from({ length: 34 }, (_, i) => {
      const t = i / 33;
      const x = P(pluma.x) - 40 + t * 80;
      const y = P(pluma.y) + 18 - t * 34;
      const lado = i % 2 ? 1 : -1;
      const largo = 18 + Math.sin(t * Math.PI) * 26 + r() * 8;
      return `M${x.toFixed(1)} ${y.toFixed(1)} q${(lado * largo * 0.2).toFixed(1)} ${(lado * -largo * 0.6).toFixed(1)} ${(lado * largo * 0.55).toFixed(1)} ${(lado * -largo).toFixed(1)}`;
    });
  }, [pluma]);
  return (
    <>
      <Defs id={id} semilla={9} base="#857D72" frecuencia={0.05} relieve={4} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#857D72" />
        <Piedras id={id} lista={piedras} />
        <Piedras id={id} lista={nidoPiedras} />
        {/* caca: rosada por el krill, con borde blanco */}
        <path d={blob(P(caca.x), P(caca.y), 74, azar(71), 12, 0.38, 0.72)} fill="#F2E6DE" filter={`url(#${id}-relieve)`} />
        <path d={blob(P(caca.x) + 4, P(caca.y) + 2, 58, azar(72), 12, 0.42, 0.7)} fill="#DD948B" />
        <path d={blob(P(caca.x) + 10, P(caca.y) + 4, 34, azar(73), 10, 0.45, 0.7)} fill="#C97A73" opacity=".8" />
        {salpicado.map((s, i) => (
          <path key={i} d={s.d} fill={s.c} />
        ))}
        {/* plumón */}
        <g opacity=".95">
          {barbas.map((d, i) => (
            <path key={i} d={d} stroke="#F4F2EE" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".85" />
          ))}
          <path d={`M${P(pluma.x) - 46} ${P(pluma.y) + 22} Q${P(pluma.x)} ${P(pluma.y) + 2} ${P(pluma.x) + 44} ${P(pluma.y) - 18}`} stroke="#D9D4CC" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

function OjoCampoSuelo({ id, z }) {
  const lombriz = z.ojo.puntos.find((p) => p.id === 'lombriz');
  const raices = z.ojo.puntos.find((p) => p.id === 'raices');
  const hoja = z.ojo.puntos.find((p) => p.id === 'hoja');
  const grumos = usePiedras(12, 60, ['#3E2B1D', '#4E3624', '#5B412B', '#33241A', '#6A4E33'], { rMin: 6, rMax: 16, evitar: [[P(lombriz.x), P(lombriz.y), 50]] });
  const pelos = useMemo(() => {
    const r = azar(37);
    return Array.from({ length: 26 }, () => {
      const x = P(raices.x) - 70 + r() * 140;
      let d = `M${x.toFixed(1)} -10`;
      let cx = x;
      let cy = -10;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (r() - 0.5) * 40;
        const ny = cy + 34 + r() * 30;
        d += ` Q${((cx + nx) / 2 + (r() - 0.5) * 30).toFixed(1)} ${((cy + ny) / 2).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
        cx = nx;
        cy = ny;
      }
      return { d, w: 1 + r() * 2.6 };
    });
  }, [raices]);
  const lx = P(lombriz.x);
  const ly = P(lombriz.y);
  const cuerpo = `M${lx - 92} ${ly + 20} C${lx - 60} ${ly - 30} ${lx - 20} ${ly + 40} ${lx + 18} ${ly + 4} S${lx + 70} ${ly - 34} ${lx + 96} ${ly - 6}`;
  const hx = P(hoja.x);
  const hy = P(hoja.y);
  return (
    <>
      <Defs id={id} semilla={14} base="#4A3526" frecuencia={0.06} relieve={5} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#4A3526" />
        <Piedras id={id} lista={grumos} />
        {pelos.map((p, i) => (
          <path key={i} d={p.d} stroke="#D8C49A" strokeWidth={p.w} fill="none" strokeLinecap="round" opacity=".85" />
        ))}
        {/* hoja seca */}
        <g filter={`url(#${id}-sombra)`} transform={`rotate(-28 ${hx} ${hy})`}>
          <path d={`M${hx - 58} ${hy} Q${hx - 10} ${hy - 44} ${hx + 58} ${hy} Q${hx - 10} ${hy + 44} ${hx - 58} ${hy}Z`} fill="#A9763E" />
          <path d={`M${hx - 58} ${hy} L${hx + 58} ${hy}`} stroke="#7E5426" strokeWidth="2" />
          {[-36, -16, 4, 24].map((dx) => (
            <path key={dx} d={`M${hx + dx} ${hy} l14 -18 M${hx + dx} ${hy} l14 18`} stroke="#7E5426" strokeWidth="1.2" />
          ))}
          <path d={`M${hx - 58} ${hy} Q${hx - 10} ${hy - 44} ${hx + 58} ${hy} Q${hx - 10} ${hy + 44} ${hx - 58} ${hy}Z`} fill={`url(#${id}-piedra)`} />
        </g>
        {/* lombriz */}
        <g className="a1-nivel__vivo" filter={`url(#${id}-sombra)`}>
          <path d={cuerpo} stroke="#A8615A" strokeWidth="17" fill="none" strokeLinecap="round" />
          <path d={cuerpo} stroke="#C98479" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d={cuerpo} stroke="#7C3F3A" strokeWidth="17" fill="none" strokeDasharray="1.4 6" opacity=".55" />
          <path d={cuerpo} stroke="#F1C3B8" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" transform="translate(-1 -4)" />
        </g>
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

function OjoCampoVaca({ id, z }) {
  const bosta = z.ojo.puntos.find((p) => p.id === 'bosta');
  const pasto = z.ojo.puntos.find((p) => p.id === 'pasto');
  const hojas = useMemo(() => {
    const r = azar(43);
    return Array.from({ length: 90 }, () => {
      const x = r() * 400;
      const y = r() * 400;
      const cerca = Math.hypot(x - P(bosta.x), y - P(bosta.y)) < 110;
      if (cerca) return null;
      const largo = 20 + r() * 40;
      const a = -Math.PI / 2 + (r() - 0.5) * 1.2;
      return { d: `M${x.toFixed(1)} ${y.toFixed(1)} q${(Math.cos(a) * largo * 0.3 + 6).toFixed(1)} ${(Math.sin(a) * largo * 0.5).toFixed(1)} ${(Math.cos(a) * largo).toFixed(1)} ${(Math.sin(a) * largo).toFixed(1)}`, c: ['#5E7A2C', '#7C9636', '#9AAE4E', '#4A6222', '#B7B56A'][Math.floor(r() * 5)], w: 2 + r() * 2.5 };
    }).filter(Boolean);
  }, [bosta]);
  const fibras = useMemo(() => {
    const r = azar(47);
    return Array.from({ length: 22 }, () => {
      const x = P(bosta.x) + (r() - 0.5) * 150;
      const y = P(bosta.y) + (r() - 0.5) * 90;
      const a = r() * Math.PI;
      const l = 10 + r() * 22;
      return `M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(a) * l).toFixed(1)} ${(Math.sin(a) * l).toFixed(1)}`;
    });
  }, [bosta]);
  const grietas = useMemo(() => {
    const r = azar(53);
    return Array.from({ length: 9 }, () => {
      let x = P(bosta.x) + (r() - 0.5) * 100;
      let y = P(bosta.y) + (r() - 0.5) * 60;
      let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      for (let k = 0; k < 3; k++) {
        x += (r() - 0.5) * 34;
        y += (r() - 0.5) * 22;
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    });
  }, [bosta]);
  return (
    <>
      <Defs id={id} semilla={18} base="#6E7440" frecuencia={0.05} relieve={3} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#6E7440" />
        {hojas.map((h, i) => (
          <path key={i} d={h.d} stroke={h.c} strokeWidth={h.w} fill="none" strokeLinecap="round" />
        ))}
        <g filter={`url(#${id}-sombra)`}>
          <path d={blob(P(bosta.x), P(bosta.y), 120, azar(61), 13, 0.18, 0.66)} fill="#4A3B22" />
          <path d={blob(P(bosta.x), P(bosta.y) - 6, 104, azar(62), 13, 0.2, 0.6)} fill="#5E4C2C" filter={`url(#${id}-relieve)`} />
          <path d={blob(P(bosta.x) - 8, P(bosta.y) - 12, 70, azar(63), 11, 0.3, 0.55)} fill="#7A6842" opacity=".75" />
        </g>
        {grietas.map((d, i) => (
          <path key={i} d={d} stroke="#2E2414" strokeWidth="1.6" fill="none" opacity=".7" />
        ))}
        {fibras.map((d, i) => (
          <path key={i} d={d} stroke="#C3AD72" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
        ))}
        {/* matita de pasto más alta */}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <path key={k} d={`M${P(pasto.x) + k * 5 - 15} ${P(pasto.y) + 40} q${(k - 3) * 4} -40 ${(k - 3) * 10} -78`} stroke={k % 2 ? '#7E9A36' : '#5C7A2A'} strokeWidth="4" fill="none" strokeLinecap="round" />
        ))}
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

/* ---------- CON LUPA ---------- */

function GranosMinerales({ id, semilla, cantidad, colores, evitar = [], rMin = 16, rMax = 40 }) {
  const lista = useMemo(() => {
    const r = azar(semilla);
    const out = [];
    let intentos = 0;
    while (out.length < cantidad && intentos < cantidad * 8) {
      intentos++;
      const x = r() * 400;
      const y = r() * 400;
      if (evitar.some(([ex, ey, er]) => Math.hypot(x - ex, y - ey) < er)) continue;
      out.push({ pts: grano(x, y, rMin + r() * (rMax - rMin), r, 5 + Math.floor(r() * 3)), c: colores[Math.floor(r() * colores.length)] });
    }
    return out;
  }, [semilla, cantidad]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <g filter={`url(#${id}-sombra)`}>
      {lista.map((g, i) => (
        <g key={i}>
          <polygon points={g.pts} fill={g.c} opacity=".88" />
          <polygon points={g.pts} fill={`url(#${id}-vidrio)`} />
          <polygon points={g.pts} fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      ))}
    </g>
  );
}

function Tardigrado({ x, y, escala = 1, giro = 0 }) {
  return (
    <g className="a1-nivel__vivo" transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      {[-24, -8, 8, 22].map((px, i) => (
        <g key={i}>
          <path d={`M${px} 12 q-2 12 -4 18`} stroke="#B89F74" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d={`M${px} -12 q-2 -12 -4 -18`} stroke="#B89F74" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d={`M${px - 6} 31 l-3 3 M${px - 4} 31 l0 4 M${px - 6} -31 l-3 -3 M${px - 4} -31 l0 -4`} stroke="#5E4A2E" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      ))}
      <ellipse cx="0" cy="0" rx="42" ry="19" fill="#D8C39A" opacity=".92" />
      {[-26, -13, 0, 13, 26].map((px) => (
        <path key={px} d={`M${px} -17 q4 17 0 34`} stroke="#A88C5E" strokeWidth="1.2" fill="none" opacity=".6" />
      ))}
      <ellipse cx="-10" cy="-6" rx="26" ry="7" fill="#FFFFFF" opacity=".35" />
      <circle cx="-36" cy="-5" r="2.2" fill="#3A2C1C" />
      <circle cx="-36" cy="5" r="2.2" fill="#3A2C1C" />
      <ellipse cx="6" cy="2" rx="14" ry="8" fill="#9C7E4A" opacity=".35" />
    </g>
  );
}

function Colembolo({ x, y, escala = 1, giro = 0 }) {
  return (
    <g className="a1-nivel__vivo a1-nivel__vivo--rapido" transform={`translate(${x} ${y}) rotate(${giro}) scale(${escala})`}>
      <path d="M-34 -4 q-12 -14 -26 -18 M-34 4 q-12 14 -26 16" stroke="#56607A" strokeWidth="2" fill="none" strokeLinecap="round" />
      {[-14, 0, 14].map((px) => (
        <path key={px} d={`M${px} 8 l-4 12 M${px} -8 l-4 -12`} stroke="#56607A" strokeWidth="2.4" strokeLinecap="round" />
      ))}
      <path d="M26 6 q14 10 2 18" stroke="#6F7A92" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="36" ry="11" fill="#6C7892" />
      <circle cx="-30" cy="0" r="9" fill="#5A6680" />
      <ellipse cx="-4" cy="-4" rx="24" ry="3.5" fill="#FFFFFF" opacity=".35" />
      <circle cx="-34" cy="-4" r="1.8" fill="#16181F" />
    </g>
  );
}

function Acaro({ x, y, escala = 1 }) {
  return (
    <g className="a1-nivel__vivo" transform={`translate(${x} ${y}) scale(${escala})`}>
      {[-1, 1].map((l) =>
        [-0.9, -0.35, 0.25, 0.8].map((a, i) => (
          <path key={`${l}${i}`} d={`M0 0 q${l * 22} ${a * 14} ${l * 30} ${a * 30}`} stroke="#5A2A1A" strokeWidth="2.6" fill="none" strokeLinecap="round" transform={`translate(${l * 8} 0)`} />
        )),
      )}
      <ellipse cx="0" cy="2" rx="17" ry="20" fill="#8E3A22" />
      <ellipse cx="-5" cy="-6" rx="7" ry="5" fill="#FFFFFF" opacity=".35" />
      <ellipse cx="0" cy="-20" rx="6" ry="5" fill="#6E2C1A" />
    </g>
  );
}

function LupaAntartidaSuelo({ id, z }) {
  const t = z.lupa.puntos.find((p) => p.id === 'tardigrado');
  const c = z.lupa.puntos.find((p) => p.id === 'colembolo');
  const g = z.lupa.puntos.find((p) => p.id === 'grano');
  return (
    <>
      <Defs id={id} semilla={25} base="#BDB4A5" frecuencia={0.02} relieve={2} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#BDB4A5" />
        <GranosMinerales id={id} semilla={77} cantidad={22} colores={['#9C948A', '#C9B79A', '#7E7A76', '#D8CFC2', '#A88E6E']} evitar={[[P(t.x), P(t.y), 60], [P(c.x), P(c.y), 52], [P(g.x), P(g.y), 60]]} />
        <g filter={`url(#${id}-sombra)`}>
          <polygon points={grano(P(g.x), P(g.y), 52, azar(81), 7)} fill="#8E8A85" />
          <polygon points={grano(P(g.x), P(g.y), 52, azar(81), 7)} fill={`url(#${id}-vidrio)`} />
          <polygon points={grano(P(g.x), P(g.y), 52, azar(81), 7)} fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.4" />
        </g>
        <Tardigrado x={P(t.x)} y={P(t.y)} escala={1.05} giro={-18} />
        <Colembolo x={P(c.x)} y={P(c.y)} escala={1.1} giro={24} />
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

function LupaAntartidaPinguino({ id, z }) {
  const k = z.lupa.puntos.find((p) => p.id === 'krill');
  const g = z.lupa.puntos.find((p) => p.id === 'grano');
  const placas = useMemo(() => {
    const r = azar(91);
    return Array.from({ length: 9 }, (_, i) => {
      const x = P(k.x) + (r() - 0.5) * 120 + (i === 0 ? 0 : 0);
      const y = P(k.y) + (r() - 0.5) * 100;
      return { x, y, a: r() * 180, s: 0.6 + r() * 0.8 };
    });
  }, [k]);
  const cristales = useMemo(() => {
    const r = azar(93);
    return Array.from({ length: 40 }, () => ({ x: r() * 400, y: r() * 400, r: 1.2 + r() * 3 }));
  }, []);
  return (
    <>
      <Defs id={id} semilla={33} base="#D99A90" frecuencia={0.03} relieve={4} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#D99A90" />
        {cristales.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#FBF3EE" opacity=".85" />
        ))}
        <GranosMinerales id={id} semilla={95} cantidad={6} colores={['#7E7A76', '#9C948A']} evitar={[[P(k.x), P(k.y), 90]]} rMin={14} rMax={26} />
        <g filter={`url(#${id}-sombra)`}>
          <polygon points={grano(P(g.x), P(g.y), 40, azar(97), 6)} fill="#6E6A66" />
          <polygon points={grano(P(g.x), P(g.y), 40, azar(97), 6)} fill={`url(#${id}-vidrio)`} />
        </g>
        {placas.map((p, i) => (
          <g key={i} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(0)}) scale(${p.s.toFixed(2)})`} filter={`url(#${id}-sombra)`}>
            <path d="M-30 6 Q-26 -18 0 -20 Q26 -18 30 6 Q14 0 0 0 Q-14 0 -30 6Z" fill="#E8693F" opacity=".82" />
            <path d="M-18 -10 Q0 -16 18 -10" stroke="#FFD0B8" strokeWidth="2" fill="none" opacity=".8" />
            <path d="M-10 -2 L-6 -18 M4 -1 L6 -19" stroke="#B5432A" strokeWidth="1.3" opacity=".7" />
          </g>
        ))}
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

function LupaCampoSuelo({ id, z }) {
  const h = z.lupa.puntos.find((p) => p.id === 'hifas');
  const a = z.lupa.puntos.find((p) => p.id === 'acaro');
  const n = z.lupa.puntos.find((p) => p.id === 'nematodo');
  const grumos = usePiedras(19, 34, ['#3E2B1D', '#4E3624', '#5B412B', '#33241A', '#6A4E33'], { rMin: 18, rMax: 40, evitar: [[P(a.x), P(a.y), 45], [P(n.x), P(n.y), 50]] });
  const hilos = useMemo(() => {
    const r = azar(99);
    const out = [];
    for (let i = 0; i < 30; i++) {
      let x = P(h.x) + (r() - 0.5) * 140;
      let y = P(h.y) + (r() - 0.5) * 120;
      let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      for (let k = 0; k < 3; k++) {
        const nx = x + (r() - 0.5) * 70;
        const ny = y + (r() - 0.5) * 70;
        d += ` Q${(x + (r() - 0.5) * 40).toFixed(1)} ${(y + (r() - 0.5) * 40).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
        x = nx;
        y = ny;
      }
      out.push(d);
    }
    return out;
  }, [h]);
  const nx = P(n.x);
  const ny = P(n.y);
  return (
    <>
      <Defs id={id} semilla={41} base="#5A4130" frecuencia={0.04} relieve={4} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#5A4130" />
        <Piedras id={id} lista={grumos} />
        {hilos.map((d, i) => (
          <path key={i} d={d} stroke="#F3EEE4" strokeWidth={i % 3 ? 0.9 : 1.6} fill="none" opacity=".8" />
        ))}
        <g className="a1-nivel__vivo">
          <path d={`M${nx - 44} ${ny + 10} C${nx - 24} ${ny - 26} ${nx - 4} ${ny + 26} ${nx + 14} ${ny} S${nx + 40} ${ny - 18} ${nx + 50} ${ny - 4}`} stroke="#EDE4CE" strokeWidth="6" fill="none" strokeLinecap="round" opacity=".9" />
          <path d={`M${nx - 44} ${ny + 10} C${nx - 24} ${ny - 26} ${nx - 4} ${ny + 26} ${nx + 14} ${ny} S${nx + 40} ${ny - 18} ${nx + 50} ${ny - 4}`} stroke="#B8A88A" strokeWidth="1.2" fill="none" opacity=".8" />
        </g>
        <Acaro x={P(a.x)} y={P(a.y)} escala={1.1} />
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

function LupaCampoVaca({ id, z }) {
  const f = z.lupa.puntos.find((p) => p.id === 'fibras');
  const s = z.lupa.puntos.find((p) => p.id === 'semilla');
  const fibras = useMemo(() => {
    const r = azar(103);
    return Array.from({ length: 18 }, (_, i) => {
      const x = (i < 8 ? P(f.x) : r() * 400) + (r() - 0.5) * 120;
      const y = (i < 8 ? P(f.y) : r() * 400) + (r() - 0.5) * 80;
      const a = r() * Math.PI;
      const l = 60 + r() * 110;
      return { x1: x - (Math.cos(a) * l) / 2, y1: y - (Math.sin(a) * l) / 2, x2: x + (Math.cos(a) * l) / 2, y2: y + (Math.sin(a) * l) / 2, w: 5 + r() * 7, c: ['#C9B27A', '#B49A5E', '#D8C590', '#9C8550'][Math.floor(r() * 4)] };
    });
  }, [f]);
  return (
    <>
      <Defs id={id} semilla={47} base="#5C4A2A" frecuencia={0.035} relieve={4} />
      <g clipPath={`url(#${id}-lente)`}>
        <Suelo id={id} base="#5C4A2A" />
        <g filter={`url(#${id}-sombra)`}>
          {fibras.map((b, i) => (
            <g key={i}>
              <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={b.c} strokeWidth={b.w} strokeLinecap="round" />
              <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#FFFFFF" strokeWidth={b.w * 0.22} strokeLinecap="round" opacity=".4" />
              <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#6E5A30" strokeWidth={b.w} strokeDasharray="1 5" opacity=".35" />
            </g>
          ))}
        </g>
        <g filter={`url(#${id}-sombra)`} transform={`rotate(-20 ${P(s.x)} ${P(s.y)})`}>
          <ellipse cx={P(s.x)} cy={P(s.y)} rx="34" ry="20" fill="#7A5226" />
          <ellipse cx={P(s.x)} cy={P(s.y)} rx="34" ry="20" fill={`url(#${id}-piedra)`} />
          <path d={`M${P(s.x) - 30} ${P(s.y)} Q${P(s.x)} ${P(s.y) - 6} ${P(s.x) + 30} ${P(s.y)}`} stroke="#4E3216" strokeWidth="1.5" fill="none" />
        </g>
        <circle cx="200" cy="200" r="200" fill={`url(#${id}-vineta)`} />
      </g>
    </>
  );
}

const DIBUJOS = {
  ojo: {
    'antartida-suelo': OjoAntartidaSuelo,
    'antartida-pinguino': OjoAntartidaPinguino,
    'campo-suelo': OjoCampoSuelo,
    'campo-vaca': OjoCampoVaca,
  },
  lupa: {
    'antartida-suelo': LupaAntartidaSuelo,
    'antartida-pinguino': LupaAntartidaPinguino,
    'campo-suelo': LupaCampoSuelo,
    'campo-vaca': LupaCampoVaca,
  },
};

export default function Nivel({ nivel, ambienteId, zoom, etiqueta }) {
  const id = 'n' + useId().replace(/:/g, '');
  const Dibujo = DIBUJOS[nivel]?.[ambienteId] || DIBUJOS[nivel]?.['antartida-suelo'];
  if (!Dibujo) return null;
  return (
    <Marco id={id} etiqueta={etiqueta}>
      <Dibujo id={id} z={zoom} />
    </Marco>
  );
}
