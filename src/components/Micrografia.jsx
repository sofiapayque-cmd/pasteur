import { useId, useMemo } from 'react';
import './Micrografia.css';

/*
  Micrografía: vista "de microscopio de verdad" (campo claro) de una muestra.
  Reemplaza a Microvista con un aspecto realista: campo gris crema con viñeta,
  grano de imagen, manchas fuera de foco, células translúcidas con borde
  oscuro y halo brillante (refracción), cloroplastos, granos minerales, etc.
  Es una ILUSTRACIÓN: no muestra especies reales ni cantidades reales.

  Props (las mismas que Microvista, para cambiar una por otra):
    colores   se acepta por compatibilidad; los contenidos usan colores naturales de microscopio
    semilla   la misma semilla dibuja siempre la misma muestra
    tamano    px del lado
    etiqueta  texto para lectores de pantalla
    cantidad  densidad (26 ≈ vista normal)
    perfil    'antartida-suelo' | 'antartida-pinguino' | 'campo-suelo' | 'campo-vaca' | undefined

  Rendimiento (Ceibal): dos capas SVG. La de abajo (filtros: grano y desenfoque)
  es estática y no se vuelve a pintar; la de arriba tiene los organismos y solo
  anima transform/opacity con CSS. Se reutilizan plantillas con <use>.
  Escala: 48 unidades del viewBox = 10 µm.
*/

// Números pseudoaleatorios fijos: la misma muestra siempre se ve igual
function azar(semilla) {
  let s = Math.abs(Math.floor(semilla)) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const f1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => `${f1(p[0])} ${f1(p[1])}`;
const UM10 = 48; // 10 µm en unidades del viewBox

// Curva suave que pasa cerca de los puntos (abierta)
function suave(pts) {
  if (pts.length < 3) return `M${pts.map(pt).join('L')}`;
  let d = `M${pt(pts[0])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${pt(pts[i])} ${pt(m)}`;
  }
  return d + `L${pt(pts[pts.length - 1])}`;
}
// Curva suave cerrada
function cerrada(pts) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${pt(mid(pts[n - 1], pts[0]))}`;
  for (let i = 0; i < n; i++) d += `Q${pt(pts[i])} ${pt(mid(pts[i], pts[(i + 1) % n]))}`;
  return d + 'Z';
}
// Puntito como subtrayecto (muchos puntos en un solo <path>)
const punto = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;

/*
  Qué aparece en cada ambiente y en qué proporción (para cantidad = 26).
  Es una representación para chicos, no un inventario científico.
*/
// VALIDAR con el Laboratorio de Genómica Microbiana
const PERFILES = {
  'antartida-suelo': {
    granos: 6, cianos: 3, algas: 3, bacilos: 11, cocos: 5, espirilos: 1, hifas: 1, actinos: 0, fibras: 0, detritos: 1, ciliados: 0,
    tiposGrano: ['cuarzo', 'basalto', 'cuarzo', 'feldespato', 'basalto'], detrito: 'humus',
    nubes: ['#8C9A62', '#A39A82', '#7F8B70'],
  },
  'antartida-pinguino': {
    granos: 2, cianos: 0, algas: 0, bacilos: 26, cocos: 14, espirilos: 3, hifas: 0, actinos: 0, fibras: 0, detritos: 6, ciliados: 0,
    tiposGrano: ['cuarzo', 'basalto'], detrito: 'guano',
    nubes: ['#D9A08E', '#CDAA9C', '#BE8C7C'],
  },
  'campo-suelo': {
    granos: 9, cianos: 0, algas: 1, bacilos: 14, cocos: 6, espirilos: 1, hifas: 2, actinos: 3, fibras: 0, detritos: 3, ciliados: 0,
    tiposGrano: ['cuarzo', 'feldespato', 'oxido', 'cuarzo', 'feldespato'], detrito: 'humus',
    nubes: ['#8E7556', '#A38E6C', '#76654B'],
  },
  'campo-vaca': {
    granos: 1, cianos: 0, algas: 0, bacilos: 24, cocos: 10, espirilos: 2, hifas: 0, actinos: 0, fibras: 3, detritos: 3, ciliados: 1,
    tiposGrano: ['cuarzo'], detrito: 'pasto',
    nubes: ['#9A9156', '#B0A06A', '#857C4C'],
  },
  general: {
    granos: 4, cianos: 1, algas: 2, bacilos: 12, cocos: 6, espirilos: 1, hifas: 1, actinos: 1, fibras: 0, detritos: 2, ciliados: 0,
    tiposGrano: ['cuarzo', 'feldespato', 'basalto'], detrito: 'humus',
    nubes: ['#9AA07A', '#A89A80', '#8C9A86'],
  },
};

const GRANOS = {
  cuarzo: ['#F7F4EA', '#CFC8B4', 0.34],
  feldespato: ['#EEE2C8', '#BBA585', 0.4],
  basalto: ['#C4C1B8', '#7C7A72', 0.48],
  oxido: ['#D2AE84', '#8E6A4A', 0.46],
};
const DETRITOS = {
  guano: ['#F0BCA8', '#CC7E66', '#A9533F'],
  humus: ['#A78A66', '#6E5236', '#4A3522'],
  pasto: ['#C4BA7A', '#8E8448', '#5E5730'],
};

// Ciliado: contorno fijo (ovoide con surco oral) y dos juegos de cilios
const CILIADO = (() => {
  const N = 46;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = 44 * Math.cos(t);
    let y = 27 * Math.sin(t) * (1 + 0.14 * Math.cos(t));
    y -= 7 * Math.exp(-((t - 1.75) ** 2) / 0.09);
    pts.push([x, y]);
  }
  const cilios = (lean) => {
    let d = '';
    for (let i = 0; i < N; i++) {
      const a = pts[(i + N - 1) % N];
      const b = pts[(i + 1) % N];
      const tx = b[0] - a[0];
      const ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      let nx = ty / l;
      let ny = -tx / l;
      const c = Math.cos(lean);
      const s = Math.sin(lean);
      [nx, ny] = [nx * c - ny * s, nx * s + ny * c];
      const p = pts[i];
      d += `M${pt([p[0] + nx * 0.6, p[1] + ny * 0.6])}L${pt([p[0] + nx * 5.4, p[1] + ny * 5.4])}`;
    }
    return d;
  };
  return { cuerpo: cerrada(pts), ciliosA: cilios(-0.45), ciliosB: cilios(0.35) };
})();

function generar(semilla, cantidad, perfil) {
  const r = azar(semilla * 7 + 3);
  const p = PERFILES[perfil] || PERFILES.general;
  const k = Math.max(0.3, cantidad / 26);
  const cuantos = (b) => (b > 0 ? Math.max(1, Math.round(b * k)) : 0);
  // los objetos grandes crecen menos con la densidad (así no se llena de elementos)
  const grandes = (b) => (b > 0 ? Math.max(1, Math.round(b * Math.sqrt(k))) : 0);
  const entre = (a, b) => a + r() * (b - a);
  const elegir = (lista) => lista[Math.floor(r() * lista.length) % lista.length];
  const ocupados = [];
  const libre = (x, y, rad, f) => ocupados.every((o) => Math.hypot(o.x - x, o.y - y) > (o.r + rad) * f);
  function ubicar(rad, rmax, intentos = 12, f = 0.85) {
    let x = 200;
    let y = 200;
    for (let i = 0; i < intentos; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * rmax;
      x = 200 + Math.cos(a) * d;
      y = 200 + Math.sin(a) * d;
      if (libre(x, y, rad, f)) break;
    }
    return [x, y];
  }
  const hebra = (x, y, ang, pasos, largo, curva) => {
    const pts = [[x, y]];
    const angs = [ang];
    for (let i = 0; i < pasos; i++) {
      ang += (r() - 0.5) * curva;
      x += Math.cos(ang) * largo;
      y += Math.sin(ang) * largo;
      pts.push([x, y]);
      angs.push(ang);
    }
    return { pts, angs };
  };

  const m = { perfil: p };

  // Capa de fondo: manchas fuera de foco y "fantasmas" (partículas desenfocadas)
  m.nubes = Array.from({ length: 5 }, () => {
    const [x, y] = ubicar(0, 175, 1);
    const rx = entre(22, 52);
    return { x, y, rx, ry: rx * entre(0.55, 1), rot: r() * 180, c: elegir(p.nubes), o: entre(0.2, 0.34) };
  });
  m.fantasmas = Array.from({ length: 4 }, () => {
    const [x, y] = ubicar(0, 170, 1);
    return { x, y, r: entre(4, 10) };
  });

  // Ciliado (el más grande, se ubica primero)
  m.ciliados = Array.from({ length: grandes(p.ciliados) }, () => {
    const [x, y] = ubicar(62, 95);
    ocupados.push({ x, y, r: 60 });
    const vac = Array.from({ length: 5 }, () => ({
      x: entre(-26, 22),
      y: entre(-12, 12),
      r: entre(2.8, 5.2),
      c: elegir(['rgba(146,168,78,.6)', 'rgba(172,140,88,.55)', 'rgba(124,150,70,.55)']),
    }));
    let gran = '';
    for (let i = 0; i < 26; i++) gran += punto(entre(-34, 34), entre(-15, 15), entre(0.6, 1.1));
    return { x, y, rot: r() * 360, vac, gran, dur: entre(13, 18) };
  });

  // Restos vegetales (fibras con paredes celulares)
  m.fibras = Array.from({ length: grandes(p.fibras) }, () => {
    const L = entre(100, 165);
    const W = entre(20, 32);
    const [x, y] = ubicar(L * 0.32, 160, 14);
    ocupados.push({ x, y, r: L * 0.32 });
    const h = W / 2;
    const borde = (n, y0) => Array.from({ length: n }, (_, i) => [-L / 2 + (L * (i + 1)) / (n + 1), y0 + (r() - 0.5) * 2.4]);
    const der = [[L / 2 + entre(-4, 4), -h * 0.6], [L / 2 - entre(4, 10), -h * 0.1], [L / 2 + entre(-2, 6), h * 0.5]];
    const izq = [[-L / 2 + entre(-4, 4), h * 0.6], [-L / 2 + entre(4, 10), 0], [-L / 2 + entre(-6, 2), -h * 0.5]];
    const contorno = [[-L / 2, -h], ...borde(3, -h), [L / 2, -h], ...der, [L / 2, h], ...borde(3, h).reverse(), [-L / 2, h], ...izq];
    const cuerpo = `M${contorno.map(pt).join('L')}Z`;
    const vaso = r() < 0.4;
    let red = '';
    if (vaso) {
      const a = h * 0.62;
      red += `M${f1(-L / 2 + 4)} ${f1(-a)}H${f1(L / 2 - 4)}M${f1(-L / 2 + 4)} ${f1(a)}H${f1(L / 2 - 4)}`;
      for (let xx = -L / 2 + 8; xx < L / 2 - 10; xx += 5.2) red += `M${f1(xx)} ${f1(a)}L${f1(xx + 4.5)} ${f1(-a)}`;
    } else {
      const cols = 3;
      for (let j = 1; j < cols; j++) red += `M${f1(-L / 2 + 3)} ${f1(-h + (W * j) / cols)}H${f1(L / 2 - 3)}`;
      for (let j = 0; j < cols; j++) {
        const y0 = -h + (W * j) / cols + 0.6;
        const y1 = -h + (W * (j + 1)) / cols - 0.6;
        for (let xx = -L / 2 + entre(6, 18); xx < L / 2 - 6; xx += entre(14, 22)) red += `M${f1(xx)} ${f1(y0)}V${f1(y1)}`;
      }
    }
    return { x, y, rot: r() * 180, cuerpo, red, vaso, L, h };
  });

  // Granos minerales (polígonos angulosos)
  m.granos = Array.from({ length: grandes(p.granos) }, () => {
    const rr = r() < 0.3 ? entre(30, 46) : entre(13, 26);
    const [cx, cy] = ubicar(rr, 182, 14);
    ocupados.push({ x: cx, y: cy, r: rr });
    const n = 6 + Math.floor(r() * 3);
    const rot = r() * Math.PI;
    const est = entre(1, 1.45);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = ((i + (r() - 0.5) * 0.55) / n) * Math.PI * 2;
      const d = rr * entre(0.72, 1.05);
      const lx = Math.cos(a) * d * est;
      const ly = Math.sin(a) * d;
      pts.push([cx + lx * Math.cos(rot) - ly * Math.sin(rot), cy + lx * Math.sin(rot) + ly * Math.cos(rot)]);
    }
    const hacia = (q, t) => [q[0] + (cx - q[0]) * t, q[1] + (cy - q[1]) * t];
    const j = Math.floor(r() * n);
    const brillo = `M${[0, 1, 2].map((s) => pt(hacia(pts[(j + s) % n], 0.2))).join('L')}`;
    const o = (j + Math.floor(n / 2)) % n;
    const centro = hacia(pts[o], 0.85);
    const faceta = `M${pt(centro)}L${pt(pts[o])}L${pt(pts[(o + 1) % n])}Z`;
    const a1 = pts[(j + 1) % n];
    const q = Math.floor(r() * n);
    const grieta = `M${pt(hacia(a1, 0.15))}L${pt(hacia(pts[(j + 3) % n], 0.55 + r() * 0.3))}M${pt(hacia(pts[q], 0.1))}L${pt([cx + (r() - 0.5) * rr * 0.5, cy + (r() - 0.5) * rr * 0.5])}`;
    return { d: `M${pts.map(pt).join('L')}Z`, brillo, faceta, grieta: rr > 19 ? grieta : '', relieve: rr > 23, tipo: elegir(p.tiposGrano), o: entre(0.8, 1) };
  });

  // Algas verdes (algunas dividiéndose)
  m.algas = Array.from({ length: grandes(p.algas) }, (_, i) => {
    const rad = entre(12, 17);
    const [x, y] = ubicar(rad + 4, 160, 14);
    ocupados.push({ x, y, r: rad + 2 });
    return { x, y, rad, rot: r() * 360, div: i === 1 || r() < 0.2, dur: entre(5, 8), ret: r() * 6 };
  });

  // Restos amorfos (humus, guano rosado, pasto digerido)
  m.detritos = Array.from({ length: grandes(p.detritos) }, () => {
    const rad = entre(10, 26);
    const [x, y] = ubicar(rad, 175, 10);
    ocupados.push({ x, y, r: rad * 0.8 });
    const n = 13;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const d = rad * (i % 3 === 0 ? entre(0.62, 0.86) : entre(0.8, 1.18));
      return [x + Math.cos(a) * d * 1.2, y + Math.sin(a) * d];
    });
    let gran = '';
    for (let g = 0; g < 7; g++) gran += punto(x + entre(-0.7, 0.7) * rad, y + entre(-0.5, 0.5) * rad, entre(0.8, 2));
    return { d: cerrada(pts), gran };
  });

  // Hifas de hongo: tubos largos ramificados con tabiques (todas en 4 trazos)
  let hifa = '';
  let septos = '';
  const tabiques = (pts, cada, w) => {
    for (let i = 3; i < pts.length - 1; i += cada) {
      const a = pts[i - 1];
      const b = pts[i + 1];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / l;
      const ny = (b[0] - a[0]) / l;
      const c = pts[i];
      septos += `M${pt([c[0] + nx * w, c[1] + ny * w])}L${pt([c[0] - nx * w, c[1] - ny * w])}`;
    }
  };
  for (let h = 0; h < grandes(p.hifas); h++) {
    const a0 = r() * Math.PI * 2;
    const main = hebra(200 + Math.cos(a0) * 192, 200 + Math.sin(a0) * 192, a0 + Math.PI + (r() - 0.5) * 1.1, 16 + Math.floor(r() * 7), 13, 0.32);
    hifa += suave(main.pts);
    tabiques(main.pts, 5, 3.4);
    const ramas = 1 + Math.floor(r() * 2);
    for (let b = 0; b < ramas; b++) {
      const bi = 4 + Math.floor(r() * (main.pts.length - 8));
      const s = r() < 0.5 ? -1 : 1;
      const rama = hebra(main.pts[bi][0], main.pts[bi][1], main.angs[bi] + s * entre(0.6, 1.05), 5 + Math.floor(r() * 5), 12, 0.3);
      hifa += suave(rama.pts);
      tabiques(rama.pts, 4, 3.2);
    }
  }
  m.hifa = hifa;
  m.septos = septos;

  // Actinomicetos: filamentos finísimos y muy ramificados
  let actino = '';
  for (let h = 0; h < grandes(p.actinos); h++) {
    const [x, y] = ubicar(0, 150, 1);
    const main = hebra(x, y, r() * Math.PI * 2, 7 + Math.floor(r() * 5), 7, 0.55);
    actino += suave(main.pts);
    const ramas = 2 + Math.floor(r() * 2);
    for (let b = 0; b < ramas; b++) {
      const bi = 1 + Math.floor(r() * (main.pts.length - 2));
      const s = b % 2 ? -1 : 1;
      actino += suave(hebra(main.pts[bi][0], main.pts[bi][1], main.angs[bi] + s * entre(0.5, 1), 3 + Math.floor(r() * 4), 6.5, 0.6).pts);
    }
  }
  m.actino = actino;

  // Cianobacterias filamentosas: cadenas de células con algún heterocisto
  m.cianos = Array.from({ length: grandes(p.cianos) }, () => {
    const s = entre(11, 13.5);
    const n = 7 + Math.floor(r() * 5);
    let [x, y] = ubicar(s * n * 0.32, 135, 16, 0.75);
    let ang = r() * Math.PI * 2;
    const het = r() < 0.8 ? 2 + Math.floor(r() * (n - 4)) : -1;
    x -= (Math.cos(ang) * s * 0.9 * n) / 2;
    y -= (Math.sin(ang) * s * 0.9 * n) / 2;
    const cel = [];
    for (let i = 0; i < n; i++) {
      const esHet = i === het;
      const sz = esHet ? s * 1.22 : s * (i === 0 || i === n - 1 ? 0.84 : entre(0.92, 1.05));
      x += Math.cos(ang) * sz * 0.45;
      y += Math.sin(ang) * sz * 0.45;
      cel.push({ x, y, rot: (ang * 180) / Math.PI, sz, het: esHet });
      x += Math.cos(ang) * sz * 0.45;
      y += Math.sin(ang) * sz * 0.45;
      ang += (r() - 0.5) * 0.24;
    }
    // las células ocupan lugar: el filamento siguiente no se le cruza encima
    for (let i = 0; i < cel.length; i += 3) ocupados.push({ x: cel[i].x, y: cel[i].y, r: s * 1.2 });
    return { cel, vaina: suave(cel.map((c) => [c.x, c.y])), s };
  });

  // Bacterias: bacilos (solos, en pares, cadenitas), cocos (solos, pares, racimos, cadenas), espirilos
  m.desfocados = [];
  m.bacilos = Array.from({ length: cuantos(p.bacilos) }, () => {
    const [x, y] = ubicar(3, 178, 4, 0.55);
    const v = r();
    return {
      x, y,
      o: entre(0.65, 1),
      fuera: r() < 0.3,
      forma: v < 0.62 ? 'b1' : v < 0.88 ? 'b2' : 'b3',
      rot: r() * 180,
      esc: entre(0.85, 1.2),
      vivo: r() < 0.4,
      dur: entre(7, 12),
      ret: r() * 8,
    };
  });
  m.cocos = Array.from({ length: cuantos(p.cocos) }, () => {
    const [x, y] = ubicar(3, 178, 4, 0.55);
    const v = r();
    return { x, y, forma: v < 0.35 ? 'c1' : v < 0.65 ? 'c2' : v < 0.85 ? 'c4' : 'c5', rot: r() * 180, esc: entre(0.9, 1.15), o: entre(0.7, 1), fuera: r() < 0.25 };
  });
  // Lo que queda fuera de foco se dibuja simplificado y desenfocado en la capa de abajo
  m.desfocados = [
    ...m.bacilos.filter((b) => b.fuera).map((b) => ({ ...b, tipo: 'rod' })),
    ...m.cocos.filter((c) => c.fuera).map((c) => ({ ...c, tipo: 'coco' })),
  ];
  m.bacilos = m.bacilos.filter((b) => !b.fuera);
  m.cocos = m.cocos.filter((c) => !c.fuera);
  // algún grano y alguna alga desenfocados (dan profundidad)
  m.granosFuera = m.granos.length > 3 ? m.granos.splice(0, 1) : [];
  m.algasFuera = m.algas.length > 1 ? m.algas.splice(m.algas.length - 1, 1) : [];
  m.espirilos = Array.from({ length: cuantos(p.espirilos) }, () => {
    const [x, y] = ubicar(3, 165, 4, 0.6);
    return { x, y, rot: r() * 180, esc: entre(0.85, 1.15), dur: entre(4.5, 7), ret: r() * 5 };
  });

  // Partículas diminutas con movimiento browniano (un solo trazo)
  let polvo = '';
  for (let i = 0; i < Math.round(26 * k); i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 182;
    polvo += punto(200 + Math.cos(a) * d, 200 + Math.sin(a) * d, entre(0.6, 1.4));
  }
  m.polvo = polvo;
  return m;
}

export default function Micrografia({ semilla = 7, tamano = 420, etiqueta, cantidad = 22, perfil }) {
  const uid = useId().replace(/:/g, '');
  const m = useMemo(() => generar(semilla, cantidad, perfil), [semilla, cantidad, perfil]);
  const id = (n) => `${n}${uid}`;
  const url = (n) => `url(#${n}${uid})`;
  const ref = (n) => `#${n}${uid}`;
  const mini = tamano < 150;
  const fs = Math.min(17, Math.max(11, (11.5 * 400) / tamano));
  const det = DETRITOS[m.perfil.detrito];
  const tiposGrano = [...new Set(m.granos.map((g) => g.tipo))];
  const usa = (lista, forma) => lista.some((b) => b.forma === forma);

  return (
    <div className="micrografia" style={{ width: tamano, height: tamano }} role="img" aria-label={etiqueta || 'Vista con microscopio de la muestra'}>
      {/* CAPA 1 · estática: campo iluminado, grano de imagen y manchas fuera de foco */}
      <svg className="mg-capa" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={id('lf')}>
            <circle cx="200" cy="200" r="190" />
          </clipPath>
          <radialGradient id={id('campo')} cx="47%" cy="45%" r="58%">
            <stop offset="0" stopColor="#F6F2E7" />
            <stop offset=".55" stopColor="#EDE7D8" />
            <stop offset="1" stopColor="#D6CDB9" />
          </radialGradient>
          <filter id={id('grano')} x="0" y="0" width="400" height="400" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed={semilla % 97} />
            <feColorMatrix values="0 0 0 0 .24  0 0 0 0 .21  0 0 0 0 .16  1.6 0 0 0 -.55" />
          </filter>
          <filter id={id('mancha')} x="0" y="0" width="400" height="400" filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed={(semilla % 89) + 5} />
            <feColorMatrix values="0 0 0 0 .42  0 0 0 0 .38  0 0 0 0 .3  1.8 0 0 0 -.7" />
          </filter>
          <filter id={id('desf')} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={id('desf2')} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id={id('desf3')} x="0" y="0" width="400" height="400" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="1.25" />
          </filter>
        </defs>
        <circle cx="200" cy="200" r="198" fill="#FFFFFF" />
        <g clipPath={url('lf')}>
          <rect width="400" height="400" fill={url('campo')} />
          <rect width="400" height="400" filter={url('mancha')} opacity=".35" />
          {m.nubes.map((n, i) => (
            <ellipse key={i} cx={f1(n.x)} cy={f1(n.y)} rx={f1(n.rx)} ry={f1(n.ry)} transform={`rotate(${f1(n.rot)} ${f1(n.x)} ${f1(n.y)})`} fill={n.c} opacity={f1(n.o * 100) / 100} filter={url('desf')} />
          ))}
          <g filter={url('desf2')}>
            {m.fantasmas.map((g, i) => (
              <circle key={i} cx={f1(g.x)} cy={f1(g.y)} r={f1(g.r)} fill="rgba(255,255,250,.35)" stroke="rgba(70,62,48,.22)" strokeWidth="2.6" />
            ))}
          </g>
          {/* objetos apenas fuera del plano de foco */}
          <g filter={url('desf3')}>
            {m.granosFuera.map((g, i) => (
              <path key={`gf${i}`} d={g.d} fill="#D8D0BC" fillOpacity=".45" stroke="#4A4234" strokeOpacity=".4" strokeWidth="2.4" strokeLinejoin="round" />
            ))}
            {m.algasFuera.map((a, i) => (
              <g key={`af${i}`}>
                <circle cx={f1(a.x)} cy={f1(a.y)} r={f1(a.rad)} fill="#9DB45C" fillOpacity=".55" stroke="#4E5E30" strokeOpacity=".4" strokeWidth="1.6" />
                <circle cx={f1(a.x - a.rad * 0.3)} cy={f1(a.y - a.rad * 0.3)} r={f1(a.rad * 0.35)} fill="#E7EDCB" fillOpacity=".5" />
              </g>
            ))}
            {m.desfocados.map((b, i) =>
              b.tipo === 'rod' ? (
                <rect key={`df${i}`} x="-6.5" y="-2.6" width="13" height="5.2" rx="2.6" transform={`translate(${f1(b.x)} ${f1(b.y)}) rotate(${f1(b.rot)}) scale(${f1(b.esc * 10) / 10})`} fill="#E9E4D4" fillOpacity=".55" stroke="#5A5444" strokeOpacity=".45" strokeWidth="1.3" />
              ) : (
                <circle key={`df${i}`} cx={f1(b.x)} cy={f1(b.y)} r={f1(3.2 * b.esc)} fill="#ECE7D8" fillOpacity=".5" stroke="#5A5444" strokeOpacity=".4" strokeWidth="1.1" />
              ),
            )}
          </g>
          <rect width="400" height="400" filter={url('grano')} opacity=".2" />
        </g>
      </svg>

      {/* CAPA 2 · la muestra en foco (animaciones solo de transform/opacity) */}
      <svg className="mg-capa" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={id('lente')}>
            <circle cx="200" cy="200" r="190" />
          </clipPath>
          {/* bacterias: casi transparentes, centro claro y borde oscuro */}
          <radialGradient id={id('bac')} cx="50%" cy="42%" r="62%">
            <stop offset="0" stopColor="#F7F4EA" stopOpacity=".9" />
            <stop offset=".6" stopColor="#D2CBB5" stopOpacity=".72" />
            <stop offset="1" stopColor="#8E8670" stopOpacity=".85" />
          </radialGradient>
          <g id={id('b1')}>
            <rect x="-6.7" y="-2.9" width="13.4" height="5.8" rx="2.9" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.3" />
            <rect x="-6" y="-2.2" width="12" height="4.4" rx="2.2" fill={url('bac')} stroke="#4A4538" strokeOpacity=".78" strokeWidth=".9" />
            <path d="M-3.6 -.6H3.6" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth=".9" strokeLinecap="round" />
          </g>
          {usa(m.bacilos, 'b2') && (
            <g id={id('b2')}>
              <use href={ref('b1')} transform="translate(-6.2 -.2) rotate(-5)" />
              <use href={ref('b1')} transform="translate(6.2 .3) rotate(6)" />
            </g>
          )}
          {usa(m.bacilos, 'b3') && (
            <g id={id('b3')}>
              <use href={ref('b1')} transform="translate(-12.4 -1) rotate(-8)" />
              <use href={ref('b1')} transform="translate(0 0)" />
              <use href={ref('b1')} transform="translate(12.3 1.2) rotate(9)" />
            </g>
          )}
          <g id={id('c1')}>
            <circle r="3.4" fill="none" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="1.1" />
            <circle r="2.7" fill={url('bac')} stroke="#4A4538" strokeOpacity=".78" strokeWidth=".8" />
            <circle cx="-.7" cy="-.8" r=".8" fill="#FFFFFF" fillOpacity=".8" />
          </g>
          {usa(m.cocos, 'c2') && (
            <g id={id('c2')}>
              <use href={ref('c1')} x="-2.6" />
              <use href={ref('c1')} x="2.6" />
            </g>
          )}
          {usa(m.cocos, 'c4') && (
            <g id={id('c4')}>
              {[[0, 0], [5.2, 0.4], [2.4, 4.6], [-2.8, 4.3], [-5, 0.2], [1.8, -4.8]].map(([x, y], i) => (
                <use key={i} href={ref('c1')} x={x} y={y} />
              ))}
            </g>
          )}
          {usa(m.cocos, 'c5') && (
            <g id={id('c5')}>
              {[-2, -1, 0, 1, 2].map((i) => (
                <use key={i} href={ref('c1')} x={i * 5.3} y={f1(i * i * 0.6)} />
              ))}
            </g>
          )}
          {m.espirilos.length > 0 && (
            <g id={id('esp')}>
              <path d="M-14 0c2.3-5 4.7-5 7 0s4.7 5 7 0 4.7-5 7 0 4.7 5 7 0" fill="none" stroke="#4A4538" strokeOpacity=".72" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M-14 0c2.3-5 4.7-5 7 0s4.7 5 7 0 4.7-5 7 0 4.7 5 7 0" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".8" strokeLinecap="round" />
            </g>
          )}
          {m.cianos.length > 0 && (
            <>
              <radialGradient id={id('cia')} cx="42%" cy="38%" r="65%">
                <stop offset="0" stopColor="#BCC874" />
                <stop offset=".55" stopColor="#8A9C42" />
                <stop offset="1" stopColor="#5D7230" />
              </radialGradient>
              <g id={id('cel')}>
                <ellipse rx=".93" ry="1" fill={url('cia')} fillOpacity=".88" stroke="#34451C" strokeOpacity=".75" strokeWidth=".12" />
                <ellipse cx="-.12" cy="-.22" rx=".52" ry=".5" fill="none" stroke="#F4F6D8" strokeOpacity=".45" strokeWidth=".1" />
                <circle cx=".25" cy=".28" r=".14" fill="#3A4C1E" fillOpacity=".45" />
                <circle cx="-.3" cy=".18" r=".1" fill="#3A4C1E" fillOpacity=".35" />
              </g>
              <g id={id('het')}>
                <circle r="1" fill="#E9E5B4" fillOpacity=".9" stroke="#6B6633" strokeOpacity=".8" strokeWidth=".2" />
                <circle r=".78" fill="none" stroke="#FFFFF2" strokeOpacity=".55" strokeWidth=".09" />
                <circle cx=".82" r=".15" fill="#FFFDEB" stroke="#6B6633" strokeOpacity=".5" strokeWidth=".05" />
                <circle cx="-.82" r=".15" fill="#FFFDEB" stroke="#6B6633" strokeOpacity=".5" strokeWidth=".05" />
              </g>
            </>
          )}
          {m.algas.length > 0 && (
            <>
              <radialGradient id={id('algc')} cx="45%" cy="42%" r="60%">
                <stop offset="0" stopColor="#DCE6B6" stopOpacity=".7" />
                <stop offset="1" stopColor="#9DB46A" stopOpacity=".8" />
              </radialGradient>
              <radialGradient id={id('cloro')} cx="38%" cy="64%" r="72%">
                <stop offset="0" stopColor="#A9C653" stopOpacity=".9" />
                <stop offset=".55" stopColor="#759E36" stopOpacity=".88" />
                <stop offset="1" stopColor="#52782A" stopOpacity=".85" />
              </radialGradient>
              <radialGradient id={id('hueco')}>
                <stop offset="0" stopColor="#E9EED0" stopOpacity=".85" />
                <stop offset=".7" stopColor="#D2DDA6" stopOpacity=".5" />
                <stop offset="1" stopColor="#C2D18E" stopOpacity="0" />
              </radialGradient>
              <g id={id('alga')}>
                <circle r="1.07" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth=".08" />
                <circle r="1" fill={url('algc')} stroke="#3A4E22" strokeOpacity=".72" strokeWidth=".06" />
                <circle r=".86" fill={url('cloro')} />
                <ellipse cx=".3" cy="-.3" rx=".46" ry=".4" transform="rotate(-45 .3 -.3)" fill={url('hueco')} />
                <circle cx="-.36" cy=".34" r=".19" fill="#D6E2A6" fillOpacity=".7" stroke="#3E5E1E" strokeOpacity=".45" strokeWidth=".05" />
                <path d={punto(0.42, 0.42, 0.06) + punto(-0.55, -0.1, 0.05) + punto(0.05, 0.62, 0.05) + punto(-0.15, -0.5, 0.045) + punto(0.62, 0.05, 0.05)} fill="#2E4416" fillOpacity=".45" />
                <path d="M-.86 -.3A.91 .91 0 0 1 -.35 -.84" fill="none" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth=".08" strokeLinecap="round" />
              </g>
              {m.algas.some((a) => a.div) && (
                <g id={id('alga2')}>
                  <circle r="1.04" fill="none" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth=".07" />
                  <circle r="1" fill="#E4EBCB" fillOpacity=".4" stroke="#3A4E22" strokeOpacity=".6" strokeWidth=".05" />
                  <use href={ref('alga')} transform="translate(-.45 .05) scale(.5) rotate(200)" />
                  <use href={ref('alga')} transform="translate(.47 -.04) scale(.49) rotate(20)" />
                </g>
              )}
            </>
          )}
          {tiposGrano.map((t) => (
            <linearGradient key={t} id={id(`g-${t}`)} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={GRANOS[t][0]} stopOpacity={GRANOS[t][2]} />
              <stop offset="1" stopColor={GRANOS[t][1]} stopOpacity={GRANOS[t][2] + 0.18} />
            </linearGradient>
          ))}
          {m.detritos.length > 0 && (
            <radialGradient id={id('det')} cx="45%" cy="45%" r="60%">
              <stop offset="0" stopColor={det[0]} stopOpacity=".38" />
              <stop offset=".7" stopColor={det[1]} stopOpacity=".5" />
              <stop offset="1" stopColor={det[1]} stopOpacity=".7" />
            </radialGradient>
          )}
          {m.fibras.length > 0 && (
            <linearGradient id={id('fib')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#EDE4BA" stopOpacity=".45" />
              <stop offset=".5" stopColor="#C8B57E" stopOpacity=".5" />
              <stop offset="1" stopColor="#E4D8A8" stopOpacity=".42" />
            </linearGradient>
          )}
          {m.ciliados.length > 0 && (
            <radialGradient id={id('cil')} cx="48%" cy="44%" r="58%">
              <stop offset="0" stopColor="#ECEDDB" stopOpacity=".55" />
              <stop offset=".75" stopColor="#C9CCAE" stopOpacity=".55" />
              <stop offset="1" stopColor="#9A9E7E" stopOpacity=".7" />
            </radialGradient>
          )}
          <radialGradient id={id('vin')} cx="50%" cy="50%" r="50%">
            <stop offset=".68" stopColor="#4A3F2C" stopOpacity="0" />
            <stop offset=".9" stopColor="#4A3F2C" stopOpacity=".16" />
            <stop offset="1" stopColor="#30281C" stopOpacity=".55" />
          </radialGradient>
        </defs>

        <g clipPath={url('lente')}>
          {/* restos vegetales */}
          {m.fibras.map((fb, i) => (
            <g key={`f${i}`} transform={`translate(${f1(fb.x)} ${f1(fb.y)}) rotate(${f1(fb.rot)})`}>
              <path d={fb.cuerpo} fill="none" stroke="#4E4224" strokeOpacity=".18" strokeWidth="4" strokeLinejoin="round" />
              <path d={fb.cuerpo} fill={url('fib')} stroke="#4E4224" strokeOpacity=".62" strokeWidth="1.1" strokeLinejoin="round" />
              <path d={fb.red} fill="none" stroke={fb.vaso ? '#85733D' : '#776737'} strokeOpacity={fb.vaso ? 0.62 : 0.5} strokeWidth={fb.vaso ? 1.2 : 0.9} />
              <path d={`M${f1(-fb.L / 2 + 6)} ${f1(-fb.h + 2)}H${f1(fb.L / 2 - 8)}`} stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ))}

          {/* granos minerales: relieve alto, borde oscuro y aristas que brillan */}
          {m.granos.map((g, i) => (
            <g key={`g${i}`} opacity={f1(g.o * 100) / 100}>
              {g.relieve && <path d={g.d} fill="none" stroke="#3A3226" strokeOpacity=".22" strokeWidth="4.2" strokeLinejoin="round" />}
              <path d={g.d} fill={url(`g-${g.tipo}`)} stroke="#2F281E" strokeOpacity=".72" strokeWidth="1.1" strokeLinejoin="round" />
              <path d={g.faceta} fill="#2E2518" fillOpacity=".1" />
              {g.grieta && <path d={g.grieta} fill="none" stroke="#3A3226" strokeOpacity=".3" strokeWidth=".7" strokeLinecap="round" />}
              <path d={g.brillo} fill="none" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}

          {/* restos amorfos */}
          {m.detritos.map((d, i) => (
            <g key={`d${i}`}>
              <path d={d.d} fill="none" stroke={det[2]} strokeOpacity=".16" strokeWidth="4" />
              <path d={d.d} fill={url('det')} stroke={det[2]} strokeOpacity=".45" strokeWidth=".8" />
              <path d={d.gran} fill={det[2]} fillOpacity=".42" />
            </g>
          ))}

          {/* hifas de hongo */}
          {m.hifa && (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={m.hifa} stroke="#4E4A3B" strokeOpacity=".55" strokeWidth="7.4" />
              <path d={m.hifa} stroke="#ECE7D7" strokeOpacity=".72" strokeWidth="5.4" />
              <path d={m.hifa} stroke="#FFFFFF" strokeOpacity=".3" strokeWidth="1.6" />
              <path d={m.septos} stroke="#4E4A3B" strokeOpacity=".5" strokeWidth=".9" />
            </g>
          )}
          {/* actinomicetos */}
          {m.actino && (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={m.actino} stroke="#4C473A" strokeOpacity=".62" strokeWidth="2.3" />
              <path d={m.actino} stroke="#FFFFFF" strokeOpacity=".45" strokeWidth=".7" />
            </g>
          )}

          {/* cianobacterias filamentosas */}
          {m.cianos.map((c, i) => (
            <g key={`c${i}`}>
              <path d={c.vaina} fill="none" stroke="#C7CB9E" strokeOpacity=".32" strokeWidth={f1(c.s * 1.55)} strokeLinecap="round" strokeLinejoin="round" />
              {c.cel.map((e, j) => (
                <use key={j} href={ref(e.het ? 'het' : 'cel')} transform={`translate(${f1(e.x)} ${f1(e.y)}) rotate(${f1(e.rot)}) scale(${f1(e.sz * 5) / 10})`} />
              ))}
            </g>
          ))}

          {/* algas verdes */}
          {m.algas.map((a, i) => (
            <g key={`a${i}`} transform={`translate(${f1(a.x)} ${f1(a.y)}) rotate(${f1(a.rot)}) scale(${f1(a.rad * (a.div ? 13 : 10)) / 10})`}>
              <use href={ref(a.div ? 'alga2' : 'alga')} className="mg-vivo mg-respira" style={{ animationDuration: `${f1(a.dur)}s`, animationDelay: `-${f1(a.ret)}s` }} />
            </g>
          ))}

          {/* ciliado */}
          {m.ciliados.map((c, i) => (
            <g key={`z${i}`} transform={`translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(c.rot)}) scale(1.22)`}>
              <g className="mg-vivo mg-gira" style={{ animationDuration: `${f1(c.dur)}s` }}>
                <path d={CILIADO.ciliosA} className="mg-cilios" fill="none" stroke="#5E5E4C" strokeOpacity=".6" strokeWidth=".6" strokeLinecap="round" />
                <path d={CILIADO.ciliosB} className="mg-cilios mg-cilios--b" fill="none" stroke="#5E5E4C" strokeOpacity=".6" strokeWidth=".6" strokeLinecap="round" />
                <path d={CILIADO.cuerpo} fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="2.6" />
                <path d={CILIADO.cuerpo} fill={url('cil')} stroke="#45463A" strokeOpacity=".7" strokeWidth="1.2" />
                <path d={CILIADO.cuerpo} transform="scale(.92)" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="1.1" />
                <path d="M40 -6Q26 -4 14 6" fill="none" stroke="#4E4F40" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="2" cy="-2" rx="13" ry="8.5" fill="#8E8E6E" fillOpacity=".26" stroke="#55553F" strokeOpacity=".25" strokeWidth=".8" />
                {c.vac.map((v, j) => (
                  <circle key={j} cx={f1(v.x)} cy={f1(v.y)} r={f1(v.r)} fill={v.c} stroke="#4A4A36" strokeOpacity=".4" strokeWidth=".7" />
                ))}
                <circle cx="-33" cy="2" r="5.4" fill="#FFFFF8" fillOpacity=".55" stroke="#4A4A36" strokeOpacity=".35" strokeWidth=".8" />
                <path d={c.gran} fill="#5A5A44" fillOpacity=".35" />
              </g>
            </g>
          ))}

          {/* bacterias */}
          {m.cocos.map((c, i) => (
            <use key={`k${i}`} href={ref(c.forma)} opacity={f1(c.o * 100) / 100} transform={`translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(c.rot)}) scale(${f1(c.esc * 10) / 10})`} />
          ))}
          {m.bacilos.map((b, i) => {
            const t = `translate(${f1(b.x)} ${f1(b.y)}) rotate(${f1(b.rot)}) scale(${f1(b.esc * 10) / 10})`;
            return b.vivo ? (
              <g key={`b${i}`} transform={t} opacity={f1(b.o * 100) / 100}>
                <use href={ref(b.forma)} className="mg-vivo mg-deriva" style={{ animationDuration: `${f1(b.dur)}s`, animationDelay: `-${f1(b.ret)}s` }} />
              </g>
            ) : (
              <use key={`b${i}`} href={ref(b.forma)} transform={t} opacity={f1(b.o * 100) / 100} />
            );
          })}
          {m.espirilos.map((e, i) => (
            <g key={`e${i}`} transform={`translate(${f1(e.x)} ${f1(e.y)}) rotate(${f1(e.rot)}) scale(${f1(e.esc * 10) / 10})`}>
              <use href={ref('esp')} className="mg-vivo mg-nada" style={{ animationDuration: `${f1(e.dur)}s`, animationDelay: `-${f1(e.ret)}s` }} />
            </g>
          ))}

          {/* partículas con movimiento browniano */}
          <path d={m.polvo} className="mg-brown" fill="#3D372B" fillOpacity=".42" />

          {/* viñeta del campo y leve franja de color en el borde (como en un ocular real) */}
          <circle cx="200" cy="200" r="190" fill={url('vin')} />
          <circle cx="200" cy="200" r="187.5" fill="none" stroke="#7F86C8" strokeOpacity=".07" strokeWidth="3" />
          <circle cx="200" cy="200" r="184" fill="none" stroke="#E0B878" strokeOpacity=".12" strokeWidth="3" />
        </g>

        {/* barra de escala: 10 µm */}
        <g className="mg-escala">
          <rect x={318 - UM10 - 2.5} y={mini ? 314.5 : 318.5} width={UM10 + 5} height={mini ? 11 : 7} rx="2" fill="#FFFFFF" fillOpacity=".55" />
          <rect x={318 - UM10} y={mini ? 317 : 320} width={UM10} height={mini ? 6 : 4} fill="#22232A" />
          {!mini && (
            <text
              x={318 - UM10 / 2}
              y={314}
              textAnchor="middle"
              fontSize={f1(fs)}
              fill="#22232A"
              stroke="#FFFFFF"
              strokeOpacity=".75"
              strokeWidth="3"
              strokeLinejoin="round"
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, paintOrder: 'stroke' }}
            >
              10 µm
            </text>
          )}
        </g>

        {/* aro de la lente (tokens del sistema) */}
        <circle cx="200" cy="200" r="190" fill="none" stroke="#2F4A85" strokeOpacity=".25" strokeWidth="2" />
        <circle cx="200" cy="200" r="196" fill="none" stroke="#2F4A85" strokeOpacity=".08" strokeWidth="6" />
      </svg>
    </div>
  );
}
