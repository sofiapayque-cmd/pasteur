/*
  Motor del microscopio virtual (A3).
  - Genera cada muestra con una semilla fija: siempre es la misma placa, así las misiones se pueden encontrar.
  - Dibuja el campo con Canvas 2D en coordenadas del mundo (micrómetros, µm).
  - Calcula fotoblanqueo, desenfoque y qué tocó el niño en una foto.

  Una escena es { ancho, alto, entidades, zInicio, focoZ, focoA }.
  Cada entidad tiene un centro (x, y), un radio r (para descartar lo que no se ve) y partes.
  Cada parte: { t (tipo de dibujo), tag (qué es), z0, z1 (planos donde está), a: { w, b, g, r } (cuánto se ve con cada luz),
                cw (color con luz blanca), modo ('fill' | 'stroke' | 'ambos'), ...geometría }
*/

export const AUMENTOS = [4, 10, 40, 100];
export const PLANOS = 5;
// Diámetro del campo en µm para cada objetivo (simplificado para que todo entre en la pantalla)
export const CAMPO = { 4: 420, 10: 170, 40: 42, 100: 17 };
// Profundidad de campo en planos: [nítido hasta, se ve como fantasma hasta]
export const DOF = { 4: [1.2, 2.6], 10: [1.0, 2.4], 40: [0.55, 1.6], 100: [0.35, 1.1] };
// Cuánto se desenfoca por cada punto de perilla
const SENSIBILIDAD = { 4: 0.12, 10: 0.2, 40: 0.32, 100: 0.45 };
export const FOCO_OK = 1.5; // px de desenfoque aceptables
// Fotoblanqueo: cuánto "gasta" cada segundo de luz según el aumento (más aumento = luz más concentrada)
const GASTO = { 4: 0.3, 10: 0.55, 40: 1, 100: 1.5 };
const TAU = 40;

export const COLOR_CANAL = { b: '95,140,255', g: '80,235,130', r: '255,85,75' };
const IDX = { b: 0, g: 1, r: 2 };

/* ---------- Azar con semilla ---------- */
function mulberry(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const entre = (rnd, a, b) => a + rnd() * (b - a);

/* ---------- Formas ---------- */
// Contorno orgánico: un círculo apenas irregular, estirado (e) y girado (rot)
function contorno(rnd, cx, cy, r, e = 1, rot = 0, irr = 0.08, N = 22) {
  const h = [rnd() * irr, rnd() * 6.28, rnd() * irr * 0.7, rnd() * 6.28, rnd() * irr * 0.5, rnd() * 6.28];
  const pts = new Float32Array(N * 2);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const ey = 1 / Math.sqrt(e);
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const rr = r * (1 + h[0] * Math.sin(2 * th + h[1]) + h[2] * Math.sin(3 * th + h[3]) + h[4] * Math.sin(5 * th + h[5]));
    const lx = Math.cos(th) * rr * e;
    const ly = Math.sin(th) * rr * ey;
    pts[i * 2] = cx + lx * c - ly * s;
    pts[i * 2 + 1] = cy + lx * s + ly * c;
  }
  return pts;
}

function elipsePts(cx, cy, rx, ry, rot, N = 18) {
  const pts = new Float32Array(N * 2);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2;
    const lx = Math.cos(th) * rx;
    const ly = Math.sin(th) * ry;
    pts[i * 2] = cx + lx * c - ly * s;
    pts[i * 2 + 1] = cy + lx * s + ly * c;
  }
  return pts;
}

// Línea ondulada entre dos puntos (paredes de rompecabezas de la piel de la hoja)
function ondulada(rnd, x1, y1, x2, y2, amp, ondas, n = 10) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const fase = rnd() * Math.PI;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o = Math.sin(t * Math.PI * ondas + fase) * amp * Math.sin(t * Math.PI);
    out.push(x1 + dx * t + nx * o, y1 + dy * t + ny * o);
  }
  return out;
}

/* ---------- Muestra 1: células en cultivo ---------- */
function generarCelulas() {
  const rnd = mulberry(311);
  const W = 700;
  const H = 700;
  const ent = [];
  const paso = 52;
  const n = Math.floor(W / paso);
  // Células que se están dividiendo: lejos del centro, en distintas direcciones
  const mitosis = new Map([
    ['3,10', 'meta'],
    ['10,4', 'ana'],
    ['11,11', 'meta'],
  ]);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cx = paso * (i + 0.5) + entre(rnd, -14, 14);
      const cy = paso * (j + 0.5) + entre(rnd, -14, 14);
      const tipo = mitosis.get(`${i},${j}`);
      if (tipo) {
        ent.push(celulaMitosis(rnd, cx, cy, tipo));
        continue;
      }
      if (rnd() < 0.12) continue; // huecos entre células
      ent.push(celulaChata(rnd, cx, cy));
    }
  }
  return {
    id: 'celulas',
    ancho: W,
    alto: H,
    entidades: ent,
    zInicio: 2,
    focoZ: [-18, 9, 22, -12, 14],
    focoA: { 4: 0, 10: -7, 40: 10, 100: -5 },
    fondoClaro: ['#F3F1EA', '#D9D6CC'],
  };
}

function celulaChata(rnd, cx, cy) {
  const r = entre(rnd, 17, 25);
  const e = entre(rnd, 1.25, 1.85);
  const rot = rnd() * Math.PI;
  const partes = [];
  // Contorno: se ve pálido con luz blanca y su borde brilla un poco en verde (actina cortical)
  partes.push({ t: 'blob', tag: 'celula', pts: contorno(rnd, cx, cy, r, e, rot, 0.17, 28), r: r * e, z0: 0, z1: 2, modo: 'ambos', lw: 0.5, cw: '70,72,92', a: { w: 0.32, g: 0.3 } });
  // Fibras de estrés pegadas al piso
  const nF = Math.floor(entre(rnd, 9, 15));
  const seg = new Float32Array(nF * 4);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const ry = r / Math.sqrt(e);
  for (let k = 0; k < nF; k++) {
    const t = -0.78 + (1.56 * k) / (nF - 1) + entre(rnd, -0.05, 0.05);
    const mitad = Math.sqrt(Math.max(0.05, 1 - t * t)) * r * e * entre(rnd, 0.6, 0.85);
    const ly = t * ry * 0.8;
    const g = entre(rnd, -0.12, 0.12);
    const ax = -mitad;
    const bx = mitad;
    const ay = ly + ax * g;
    const by = ly + bx * g;
    seg[k * 4] = cx + ax * c - ay * s;
    seg[k * 4 + 1] = cy + ax * s + ay * c;
    seg[k * 4 + 2] = cx + bx * c - by * s;
    seg[k * 4 + 3] = cy + bx * s + by * c;
  }
  partes.push({ t: 'lineas', tag: 'fibra', seg, w: 0.38, z0: 0, z1: 0.55, cw: '80,80,95', a: { g: 0.85, w: 0.05 } });
  // Núcleo
  const nr = entre(rnd, 6, 8);
  const nx = cx + entre(rnd, -0.12, 0.12) * r;
  const ny = cy + entre(rnd, -0.12, 0.12) * r;
  partes.push({ t: 'blob', tag: 'nucleo', pts: contorno(rnd, nx, ny, nr, entre(rnd, 1.05, 1.3), rot, 0.05, 20), r: nr * 1.2, z0: 0.7, z1: 1.7, modo: 'fill', cw: '75,75,105', a: { w: 0.16, b: 0.8 } });
  // Puntitos más densos de ADN y nucléolos
  const pts = [];
  for (let k = 0; k < 5; k++) {
    const ang = rnd() * 6.28;
    const d = rnd() * nr * 0.6;
    pts.push(nx + Math.cos(ang) * d, ny + Math.sin(ang) * d, entre(rnd, 0.6, 1.2));
  }
  partes.push({ t: 'circulos', tag: 'nucleo', c: new Float32Array(pts), z0: 0.8, z1: 1.6, cw: '60,60,90', a: { b: 0.35, w: 0.16 } });
  // Mitocondrias alrededor del núcleo
  const nM = Math.floor(entre(rnd, 24, 36));
  const mseg = [];
  let intentos = 0;
  while (mseg.length < nM * 4 && intentos++ < 300) {
    const ang = rnd() * 6.28;
    const d = entre(rnd, 0.3, 0.86);
    const lx = Math.cos(ang) * d * r * e;
    const ly = Math.sin(ang) * d * ry;
    const mx = cx + lx * c - ly * s;
    const my = cy + lx * s + ly * c;
    if (Math.hypot(mx - nx, my - ny) < nr * 1.15) continue;
    const L = entre(rnd, 1.2, 3.3) / 2;
    const o = rnd() * Math.PI;
    mseg.push(mx - Math.cos(o) * L, my - Math.sin(o) * L, mx + Math.cos(o) * L, my + Math.sin(o) * L);
  }
  partes.push({ t: 'lineas', tag: 'mitocondria', seg: new Float32Array(mseg), w: 0.5, z0: 0.8, z1: 1.6, cw: '90,90,105', a: { r: 0.9, w: 0.06 } });
  return { x: cx, y: cy, r: r * e + 2, partes };
}

function celulaMitosis(rnd, cx, cy, fase) {
  const r = entre(rnd, 10.5, 12);
  const rot = rnd() * Math.PI;
  const partes = [];
  // Célula redonda y alta: borde brillante con luz blanca
  const borde = contorno(rnd, cx, cy, r, 1.04, rot, 0.03, 24);
  partes.push({ t: 'blob', tag: 'mitosis', pts: borde, r, z0: 0.6, z1: 4, modo: 'stroke', lw: 1.1, cw: '250,250,246', a: { w: 0.9 } });
  partes.push({ t: 'blob', tag: 'mitosis', pts: contorno(rnd, cx, cy, r + 0.9, 1.04, rot, 0.03, 24), r: r + 1, z0: 0.6, z1: 4, modo: 'ambos', lw: 0.7, cw: '55,55,75', a: { w: 0.55, g: 0.8 } });
  // Cromosomas: en fila en el medio (metafase) o separándose (anafase)
  const seg = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const grupos = fase === 'ana' ? [-3.3, 3.3] : [0];
  for (const off of grupos) {
    const n = fase === 'ana' ? 13 : 17;
    for (let k = 0; k < n; k++) {
      const u = -4.6 + (9.2 * k) / (n - 1) + entre(rnd, -0.3, 0.3);
      const v = off + entre(rnd, -0.45, 0.45);
      const L = entre(rnd, 0.7, 1.1);
      const g = entre(rnd, -0.5, 0.5);
      const dx = Math.sin(g) * L;
      const dy = Math.cos(g) * L;
      const ax = u - dx;
      const ay = v - dy;
      const bx = u + dx;
      const by = v + dy;
      seg.push(cx + ax * c - ay * s, cy + ax * s + ay * c, cx + bx * c - by * s, cy + bx * s + by * c);
    }
  }
  partes.push({ t: 'lineas', tag: 'mitosis', clave: true, seg: new Float32Array(seg), w: 0.6, z0: 2.6, z1: 3.4, cw: '50,50,70', a: { b: 1, w: 0.4 } });
  // Mitocondrias repartidas
  const m = [];
  for (let k = 0; k < 22; k++) {
    const ang = rnd() * 6.28;
    const d = entre(rnd, 0.3, 0.85) * r;
    const mx = cx + Math.cos(ang) * d;
    const my = cy + Math.sin(ang) * d;
    const o = rnd() * Math.PI;
    const L = entre(rnd, 0.6, 1.3);
    m.push(mx - Math.cos(o) * L, my - Math.sin(o) * L, mx + Math.cos(o) * L, my + Math.sin(o) * L);
  }
  partes.push({ t: 'lineas', tag: 'mitocondria', seg: new Float32Array(m), w: 0.5, z0: 2, z1: 3.8, cw: '90,90,105', a: { r: 0.85 } });
  return { x: cx, y: cy, r: r + 3, partes };
}

/* ---------- Muestra 2: trocito de hoja ---------- */
function generarHoja() {
  const rnd = mulberry(977);
  const W = 480;
  const H = 480;
  const ent = [];

  // Piel (epidermis), plano 1: células como piezas de rompecabezas
  const paso = 46;
  const nv = Math.ceil(W / paso) + 1;
  const V = [];
  for (let i = 0; i < nv; i++) {
    V[i] = [];
    for (let j = 0; j < nv; j++) {
      const borde = i === 0 || j === 0 || i === nv - 1 || j === nv - 1;
      V[i][j] = [i * paso + (borde ? 0 : entre(rnd, -10, 10)), j * paso + (borde ? 0 : entre(rnd, -10, 10))];
    }
  }
  const lado = (a, b) => ondulada(rnd, a[0], a[1], b[0], b[1], entre(rnd, 2.5, 5), Math.floor(entre(rnd, 2, 4)));
  const estomas = new Set(['2,2', '7,3', '4,7', '9,8', '1,8', '8,0', '5,4']);
  for (let i = 0; i < nv - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const a = V[i][j];
      const b = V[i + 1][j];
      const c2 = V[i + 1][j + 1];
      const d = V[i][j + 1];
      const lineas = [lado(a, b), lado(a, d)];
      if (i === nv - 2) lineas.push(lado(b, c2));
      if (j === nv - 2) lineas.push(lado(d, c2));
      const cx = (a[0] + b[0] + c2[0] + d[0]) / 4;
      const cy = (a[1] + b[1] + c2[1] + d[1]) / 4;
      const partes = [];
      partes.push({ t: 'region', tag: 'piel', poly: [...a, ...b, ...c2, ...d], z0: 0, z1: 0.7, a: {} });
      partes.push({ t: 'polilinea', tag: 'piel', lineas: lineas.map((l) => new Float32Array(l)), w: 0.9, z0: 0, z1: 0.7, cw: '96,104,64', a: { w: 0.62, g: 0.75 } });
      if (estomas.has(`${i},${j}`)) {
        const rot = rnd() * Math.PI;
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        for (const lado2 of [-1, 1]) {
          const gx = cx - s * 3.5 * lado2;
          const gy = cy + c * 3.5 * lado2;
          partes.push({ t: 'blob', tag: 'estoma', pts: elipsePts(gx, gy, 11.5, 3.8, rot), r: 11.5, z0: 0, z1: 0.8, modo: 'ambos', lw: 0.8, cw: '82,120,58', a: { w: 0.75, g: 0.8 } });
          const cl = [];
          for (let k = 0; k < 6; k++) {
            const u = -7 + k * 2.8;
            cl.push(gx + c * u, gy + s * u, 1.2, 0.85, rot);
          }
          partes.push({ t: 'elipses', tag: 'estoma', e: new Float32Array(cl), rx: 1.1, z0: 0.05, z1: 0.75, cw: '70,140,50', a: { w: 0.85, r: 0.95 } });
        }
        partes.push({ t: 'lineas', tag: 'estoma', seg: new Float32Array([cx - c * 6.5, cy - s * 6.5, cx + c * 6.5, cy + s * 6.5]), w: 1, z0: 0, z1: 0.8, cw: '40,46,30', a: { w: 0.7 } });
      } else {
        const nx = cx + entre(rnd, -8, 8);
        const ny = cy + entre(rnd, -8, 8);
        partes.push({ t: 'blob', tag: 'nucleo-piel', pts: contorno(rnd, nx, ny, 3.3, 1.15, rnd() * 3, 0.05, 16), r: 4, z0: 0.1, z1: 0.65, modo: 'fill', cw: '95,95,80', a: { w: 0.18, b: 0.85 } });
      }
      ent.push({ x: cx, y: cy, r: paso * 0.9, partes });
    }
  }

  // Células de adentro: empalizada (planos 3–4) y esponjosas (plano 5)
  const capa = (pasoC, rMin, rMax, eMin, eMax, irr, nCl, z0, z1) => {
    const n = Math.ceil(W / pasoC);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cx = pasoC * (i + 0.5) + entre(rnd, -6, 6);
        const cy = pasoC * (j + 0.5) + entre(rnd, -6, 6);
        const r = entre(rnd, rMin, rMax);
        const e = entre(rnd, eMin, eMax);
        const rot = rnd() * Math.PI;
        const partes = [];
        partes.push({ t: 'blob', tag: 'celula-hoja', pts: contorno(rnd, cx, cy, r, e, rot, irr, 22), r: r * e, z0, z1, modo: 'ambos', lw: 0.7, cw: '86,108,64', a: { w: 0.48, g: 0.6 } });
        const cnt = Math.floor(entre(rnd, nCl[0], nCl[1]));
        const cl = [];
        const ry = r / Math.sqrt(e);
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        const angN = rnd() * 6.28;
        for (let k = 0; k < cnt; k++) {
          const th = (k / cnt) * 6.28 + entre(rnd, -0.15, 0.15);
          const lx = Math.cos(th) * r * e * 0.72;
          const ly = Math.sin(th) * ry * 0.72;
          const px = cx + lx * c - ly * s;
          const py = cy + lx * s + ly * c;
          cl.push(px, py, 2.2, 1.25, th + rot + Math.PI / 2);
        }
        partes.push({ t: 'elipses', tag: 'cloroplasto', e: new Float32Array(cl), rx: 2.2, anillo: r * 0.72, z0: z0 + 0.1, z1: z1 - 0.1, cw: '62,128,42', a: { w: 0.85, r: 0.95 } });
        const nlx = Math.cos(angN) * r * e * 0.6;
        const nly = Math.sin(angN) * ry * 0.6;
        const nx = cx + nlx * c - nly * s;
        const ny = cy + nlx * s + nly * c;
        partes.push({ t: 'blob', tag: 'nucleo-vegetal', pts: contorno(rnd, nx, ny, 3.4, 1.2, angN + rot, 0.05, 16), r: 4.2, z0: (z0 + z1) / 2 - 0.4, z1: (z0 + z1) / 2 + 0.4, modo: 'fill', cw: '100,100,85', a: { w: 0.2, b: 0.9 } });
        ent.push({ x: cx, y: cy, r: r * e + 3, partes });
      }
    }
  };
  capa(26, 9.5, 11.8, 1, 1.18, 0.07, [8, 12], 1.6, 3.2);
  capa(36, 12, 15, 1.3, 1.7, 0.16, [5, 8], 3.4, 4.3);

  return {
    id: 'hoja',
    ancho: W,
    alto: H,
    entidades: ent,
    zInicio: 2,
    focoZ: [16, -10, -20, 12, 24],
    focoA: { 4: 0, 10: 6, 40: -9, 100: 5 },
    fondoClaro: ['#F2F2E2', '#D8DBC4'],
  };
}

/* ---------- Muestra 3: bacterias del yogur ---------- */
function generarBacterias() {
  const rnd = mulberry(4242);
  const W = 320;
  const H = 320;
  const items = []; // { tag, kind, data }
  const ponerBacteria = (x, y, zc) => {
    const p = rnd();
    const rot = rnd() * Math.PI;
    if (p < 0.55) {
      items.push({ tag: 'bacilo', x, y, cap: [x, y, entre(rnd, 2.6, 5.5), 0.78, rot] });
    } else if (p < 0.85) {
      const n = Math.floor(entre(rnd, 4, 11));
      let ang = rot;
      let px = x;
      let py = y;
      const cs = [];
      for (let k = 0; k < n; k++) {
        cs.push(px, py, 0.44);
        ang += entre(rnd, -0.3, 0.3);
        px += Math.cos(ang) * 0.86;
        py += Math.sin(ang) * 0.86;
      }
      items.push({ tag: 'cadena', x, y, circ: cs });
    } else if (p < 0.89) {
      // Dos mitades casi separadas: se ve una cinturita en el medio (solo se distingue bien con 100x)
      const L = entre(rnd, 4.2, 5.6);
      const h = L / 4;
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      items.push({ tag: 'division', x, y, cap: [x - c * h, y - s * h, L / 2 - 0.36, 0.82, rot, x + c * h, y + s * h, L / 2 - 0.36, 0.82, rot] });
    } else {
      items.push({ tag: 'muerta', x, y, cap: [x, y, entre(rnd, 2.4, 4.2), 0.78, rot] });
    }
  };
  // Grumos de la gotita
  const grumos = [];
  for (let k = 0; k < 11; k++) grumos.push([entre(rnd, 40, W - 40), entre(rnd, 40, H - 40), entre(rnd, 16, 36)]);
  grumos.push([W / 2 + 22, H / 2 - 14, 20]);
  for (const [gx, gy, gr] of grumos) {
    const n = Math.floor(gr * gr * 0.11);
    for (let k = 0; k < n; k++) {
      const ang = rnd() * 6.28;
      const d = Math.sqrt(rnd()) * gr;
      ponerBacteria(gx + Math.cos(ang) * d, gy + Math.sin(ang) * d);
    }
  }
  for (let k = 0; k < 220; k++) ponerBacteria(entre(rnd, 10, W - 10), entre(rnd, 10, H - 10));

  // Agrupar en cuadraditos de 12 µm para dibujar y blanquear por zonas
  const T = 12;
  const celdas = new Map();
  for (const it of items) {
    const key = `${Math.floor(it.x / T)},${Math.floor(it.y / T)}`;
    if (!celdas.has(key)) celdas.set(key, { bacilo: [], cadena: [], division: [], muerta: [] });
    const c = celdas.get(key);
    c[it.tag].push(...(it.cap || it.circ));
  }
  const ent = [];
  const z0 = 1.75;
  const z1 = 2.3;
  const viva = { w: 0.32, g: 0.9, b: 0.5 };
  for (const [key, c] of celdas) {
    const [i, j] = key.split(',').map(Number);
    const partes = [];
    if (c.bacilo.length) partes.push({ t: 'capsulas', tag: 'bacilo', c: new Float32Array(c.bacilo), z0, z1, cw: '52,56,74', a: viva });
    if (c.cadena.length) partes.push({ t: 'circulos', tag: 'cadena', c: new Float32Array(c.cadena), z0, z1, cw: '52,56,74', a: viva });
    if (c.division.length) partes.push({ t: 'capsulas', tag: 'division', c: new Float32Array(c.division), z0, z1, cw: '52,56,74', a: viva });
    if (c.muerta.length) partes.push({ t: 'capsulas', tag: 'muerta', c: new Float32Array(c.muerta), z0, z1, cw: '52,56,74', a: { w: 0.32, r: 1, b: 0.4, g: 0.12 } });
    ent.push({ x: (i + 0.5) * T, y: (j + 0.5) * T, r: T, partes });
  }
  // Pelusas y polvo sobre el cubreobjetos (plano 5)
  for (let k = 0; k < 9; k++) {
    const x = entre(rnd, 20, W - 20);
    const y = entre(rnd, 20, H - 20);
    const partes = [];
    const pts = [x, y];
    let ang = rnd() * 6.28;
    let px = x;
    let py = y;
    for (let s = 0; s < 14; s++) {
      ang += entre(rnd, -0.5, 0.5);
      px += Math.cos(ang) * 3;
      py += Math.sin(ang) * 3;
      pts.push(px, py);
    }
    partes.push({ t: 'polilinea', tag: 'pelusa', lineas: [new Float32Array(pts)], w: entre(rnd, 0.8, 1.6), z0: 3.7, z1: 4.4, cw: '70,62,52', a: { w: 0.55 } });
    partes.push({ t: 'blob', tag: 'pelusa', pts: contorno(rnd, x, y, entre(rnd, 2, 5), 1.3, rnd() * 3, 0.25, 16), r: 6, z0: 3.7, z1: 4.4, modo: 'fill', cw: '70,62,52', a: { w: 0.4 } });
    ent.push({ x: x + 10, y: y + 10, r: 50, partes });
  }
  return {
    id: 'bacterias',
    ancho: W,
    alto: H,
    entidades: ent,
    zInicio: 0,
    focoZ: [-14, 18, -22, 10, -6],
    focoA: { 4: 0, 10: 8, 40: -10, 100: 6 },
    fondoClaro: ['#F4F2EC', '#DAD7CE'],
  };
}

const GENERADORES = { celulas: generarCelulas, hoja: generarHoja, bacterias: generarBacterias };
const cache = {};
export function escenaDe(id) {
  if (!cache[id]) cache[id] = GENERADORES[id]();
  return cache[id];
}

/* ---------- Enfoque ---------- */
export function focoIdeal(escena, z, a) {
  return Math.max(8, Math.min(92, 50 + escena.focoZ[z] + escena.focoA[a]));
}
export function desenfoque(escena, vista) {
  return Math.min(16, Math.abs(vista.foco - focoIdeal(escena, vista.z, vista.a)) * SENSIBILIDAD[vista.a]);
}

/* ---------- Fotoblanqueo ---------- */
// exposiciones: [{ x, y, r, s: [b, g, r] }] (segundos ponderados de luz en esa zona)
export function exponer(expos, vista) {
  const canales = vista.l.replace('w', '');
  if (!canales) return expos;
  const r = CAMPO[vista.a] / 2;
  let zona = expos.find((e) => Math.abs(e.r - r) < 0.01 && Math.hypot(e.x - vista.x, e.y - vista.y) < r * 0.3);
  const lista = expos.slice();
  if (!zona) {
    zona = { x: vista.x, y: vista.y, r, s: [0, 0, 0] };
    lista.push(zona);
    if (lista.length > 80) lista.shift();
  }
  const g = GASTO[vista.a];
  for (const c of canales) zona.s[IDX[c]] += g;
  return lista;
}
export function factorBlanqueo(expos, x, y) {
  const s = [0, 0, 0];
  for (const e of expos) {
    const dx = x - e.x;
    const dy = y - e.y;
    if (dx * dx + dy * dy < e.r * e.r) {
      s[0] += e.s[0];
      s[1] += e.s[1];
      s[2] += e.s[2];
    }
  }
  return [Math.exp(-s[0] / TAU), Math.exp(-s[1] / TAU), Math.exp(-s[2] / TAU)];
}

/* ---------- Dibujo ---------- */
function distZ(p, z) {
  return z < p.z0 ? p.z0 - z : z > p.z1 ? z - p.z1 : 0;
}

function caminoBlob(ctx, pts) {
  const N = pts.length / 2;
  let px = (pts[(N - 1) * 2] + pts[0]) / 2;
  let py = (pts[(N - 1) * 2 + 1] + pts[1]) / 2;
  ctx.moveTo(px, py);
  for (let i = 0; i < N; i++) {
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    const j = ((i + 1) % N) * 2;
    px = (x + pts[j]) / 2;
    py = (y + pts[j + 1]) / 2;
    ctx.quadraticCurveTo(x, y, px, py);
  }
  ctx.closePath();
}

function trazar(ctx, p, color, alfa, k, claro) {
  ctx.globalAlpha = Math.min(1, alfa);
  const estilo = `rgb(${color})`;
  ctx.fillStyle = estilo;
  ctx.strokeStyle = estilo;
  const minW = 1 / k;
  ctx.beginPath();
  switch (p.t) {
    case 'blob': {
      if (p.r * k < 2.5) {
        ctx.arc(p.pts[0] - (p.pts[0] - p.pts[p.pts.length / 2]) / 2, p.pts[1] - (p.pts[1] - p.pts[p.pts.length / 2 + 1]) / 2, Math.max(p.r * 0.8, minW), 0, 6.283);
        ctx.fill();
        return;
      }
      caminoBlob(ctx, p.pts);
      const modo = p.modo;
      if (modo === 'fill' || (modo === 'ambos' && !claro)) {
        if (modo === 'ambos') ctx.globalAlpha = Math.min(1, alfa * 0.18);
        ctx.fill();
        if (modo === 'ambos') {
          ctx.globalAlpha = Math.min(1, alfa);
          ctx.lineWidth = Math.max(p.lw || 0.5, minW);
          ctx.stroke();
        }
      } else {
        if (modo === 'ambos') {
          ctx.globalAlpha = Math.min(1, alfa * 0.22);
          ctx.fill();
          ctx.globalAlpha = Math.min(1, alfa);
        }
        ctx.lineWidth = Math.max(p.lw || 0.5, minW);
        ctx.stroke();
      }
      return;
    }
    case 'lineas': {
      const s = p.seg;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(p.w, minW);
      for (let i = 0; i < s.length; i += 4) {
        ctx.moveTo(s[i], s[i + 1]);
        ctx.lineTo(s[i + 2], s[i + 3]);
      }
      ctx.stroke();
      return;
    }
    case 'capsulas': {
      const c = p.c;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(c[3], minW);
      for (let i = 0; i < c.length; i += 5) {
        const h = Math.max(0, (c[i + 2] - c[i + 3]) / 2);
        const dx = Math.cos(c[i + 4]) * h;
        const dy = Math.sin(c[i + 4]) * h;
        ctx.moveTo(c[i] - dx, c[i + 1] - dy);
        ctx.lineTo(c[i] + dx + 0.001, c[i + 1] + dy);
      }
      ctx.stroke();
      return;
    }
    case 'circulos': {
      const c = p.c;
      if (c[2] * k < 0.9) {
        const t = Math.max(c[2] * 2, minW);
        for (let i = 0; i < c.length; i += 3) ctx.rect(c[i] - t / 2, c[i + 1] - t / 2, t, t);
      } else {
        for (let i = 0; i < c.length; i += 3) {
          ctx.moveTo(c[i] + c[i + 2], c[i + 1]);
          ctx.arc(c[i], c[i + 1], c[i + 2], 0, 6.283);
        }
      }
      ctx.fill();
      return;
    }
    case 'elipses': {
      const e = p.e;
      if (p.rx * k < 1.8 && p.anillo) {
        // Muy chiquitos: se dibujan como un anillo (más liviano)
        let sx = 0;
        let sy = 0;
        const n = e.length / 5;
        for (let i = 0; i < e.length; i += 5) {
          sx += e[i];
          sy += e[i + 1];
        }
        ctx.lineWidth = p.rx * 1.6;
        ctx.globalAlpha = Math.min(1, alfa * 0.75);
        ctx.arc(sx / n, sy / n, p.anillo, 0, 6.283);
        ctx.stroke();
        return;
      }
      for (let i = 0; i < e.length; i += 5) {
        const rot = e[i + 4];
        ctx.moveTo(e[i] + Math.cos(rot) * e[i + 2], e[i + 1] + Math.sin(rot) * e[i + 2]);
        ctx.ellipse(e[i], e[i + 1], e[i + 2], e[i + 3], rot, 0, 6.283);
      }
      ctx.fill();
      return;
    }
    case 'polilinea': {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(p.w, minW);
      for (const l of p.lineas) {
        ctx.moveTo(l[0], l[1]);
        for (let i = 2; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]);
      }
      ctx.stroke();
      return;
    }
    default:
  }
}

/*
  dibujar: pinta la vista en dos lienzos.
  - ctxN: lo que está en el plano de foco (nítido)
  - ctxF: lo que está en planos cercanos (fantasma; el componente lo desenfoca con CSS)
  vista: { x, y, a, z, l } donde l es 'w' (luz blanca), una combinación de 'b','g','r' o '' (apagado)
  blanqueo(x, y) → [fb, fg, fr]
*/
export function dibujar(ctxN, ctxF, R, escena, vista, blanqueo) {
  const k = R / CAMPO[vista.a];
  const fluo = vista.l && vista.l !== 'w';
  ctxN.setTransform(1, 0, 0, 1, 0, 0);
  ctxF.setTransform(1, 0, 0, 1, 0, 0);
  ctxN.globalCompositeOperation = 'source-over';
  ctxF.globalCompositeOperation = 'source-over';
  ctxN.globalAlpha = 1;
  ctxF.globalAlpha = 1;
  ctxF.clearRect(0, 0, R, R);
  const stats = { nitidas: 0, tags: {} };
  if (!vista.l) {
    ctxN.fillStyle = '#040508';
    ctxN.fillRect(0, 0, R, R);
    return stats;
  }
  if (fluo) {
    ctxN.fillStyle = '#04050B';
    ctxN.fillRect(0, 0, R, R);
  } else {
    const g = ctxN.createRadialGradient(R * 0.46, R * 0.42, R * 0.05, R / 2, R / 2, R * 0.62);
    g.addColorStop(0, escena.fondoClaro[0]);
    g.addColorStop(1, escena.fondoClaro[1]);
    ctxN.fillStyle = g;
    ctxN.fillRect(0, 0, R, R);
  }
  const [d0, d1] = DOF[vista.a];
  const rv = (CAMPO[vista.a] / 2) * 1.02;
  const modo = fluo ? 'lighter' : 'source-over';
  ctxN.globalCompositeOperation = modo;
  ctxF.globalCompositeOperation = modo;
  const T = [k, 0, 0, k, R / 2 - vista.x * k, R / 2 - vista.y * k];
  ctxN.setTransform(...T);
  ctxF.setTransform(...T);
  const canales = fluo ? vista.l.split('') : ['w'];
  for (const ent of escena.entidades) {
    const dx = ent.x - vista.x;
    const dy = ent.y - vista.y;
    const lim = rv + ent.r;
    if (dx * dx + dy * dy > lim * lim) continue;
    let fb = null;
    for (const p of ent.partes) {
      if (p.t === 'region') continue;
      const dz = distZ(p, vista.z);
      if (dz > d1) continue;
      const nit = dz <= d0;
      const alfaZ = nit ? 1 : 0.85 * (1 - (dz - d0) / (d1 - d0));
      for (const c of canales) {
        const a = p.a[c];
        if (!a) continue;
        let f = 1;
        if (c !== 'w') {
          if (!fb) fb = blanqueo(ent.x, ent.y);
          f = fb[IDX[c]];
        }
        const alfa = a * alfaZ * f;
        if (alfa < 0.025) continue;
        const color = c === 'w' ? p.cw : COLOR_CANAL[c];
        trazar(nit ? ctxN : ctxF, p, color, alfa, k, !fluo);
        if (nit) {
          if (fluo) trazar(ctxF, p, color, alfa * 0.5, k, false); // halo de brillo
          if (p.tag !== 'pelusa' && alfa > 0.15) {
            stats.nitidas++;
            stats.tags[p.tag] = true;
          }
        }
      }
    }
  }
  ctxN.globalAlpha = 1;
  ctxF.globalAlpha = 1;
  ctxN.globalCompositeOperation = 'source-over';
  ctxF.globalCompositeOperation = 'source-over';
  return stats;
}

/* ---------- ¿Qué tocó el niño en la foto? ---------- */
function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = dx * dx + dy * dy || 1e-6;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
function dentro(px, py, pts) {
  let adentro = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i];
    const yi = pts[i + 1];
    const xj = pts[j];
    const yj = pts[j + 1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}
function distParte(p, x, y) {
  switch (p.t) {
    case 'blob':
      return dentro(x, y, p.pts) ? 0 : Math.max(0, Math.hypot(x - centroX(p), y - centroY(p)) - p.r);
    case 'region':
      return dentro(x, y, p.poly) ? 0 : Infinity;
    case 'lineas': {
      let m = Infinity;
      for (let i = 0; i < p.seg.length; i += 4) m = Math.min(m, distSeg(x, y, p.seg[i], p.seg[i + 1], p.seg[i + 2], p.seg[i + 3]) - p.w / 2);
      return Math.max(0, m);
    }
    case 'capsulas': {
      let m = Infinity;
      const c = p.c;
      for (let i = 0; i < c.length; i += 5) {
        const h = Math.max(0, (c[i + 2] - c[i + 3]) / 2);
        const dx = Math.cos(c[i + 4]) * h;
        const dy = Math.sin(c[i + 4]) * h;
        m = Math.min(m, distSeg(x, y, c[i] - dx, c[i + 1] - dy, c[i] + dx, c[i + 1] + dy) - c[i + 3] / 2);
      }
      return Math.max(0, m);
    }
    case 'circulos': {
      let m = Infinity;
      for (let i = 0; i < p.c.length; i += 3) m = Math.min(m, Math.hypot(x - p.c[i], y - p.c[i + 1]) - p.c[i + 2]);
      return Math.max(0, m);
    }
    case 'elipses': {
      let m = Infinity;
      for (let i = 0; i < p.e.length; i += 5) m = Math.min(m, Math.hypot(x - p.e[i], y - p.e[i + 1]) - p.e[i + 2]);
      return Math.max(0, m);
    }
    case 'polilinea': {
      let m = Infinity;
      for (const l of p.lineas) for (let i = 0; i + 3 < l.length; i += 2) m = Math.min(m, distSeg(x, y, l[i], l[i + 1], l[i + 2], l[i + 3]) - p.w / 2);
      return Math.max(0, m);
    }
    default:
      return Infinity;
  }
}
function centroX(p) {
  let s = 0;
  for (let i = 0; i < p.pts.length; i += 2) s += p.pts[i];
  return s / (p.pts.length / 2);
}
function centroY(p) {
  let s = 0;
  for (let i = 1; i < p.pts.length; i += 2) s += p.pts[i];
  return s / (p.pts.length / 2);
}

const PRIORIDAD = { lineas: 0, capsulas: 0, circulos: 0, elipses: 0, polilinea: 1, blob: 1, region: 3 };

export function seVe(p, foto) {
  if (p.t === 'region') return Boolean(foto.l);
  const luces = foto.l === 'w' ? ['w'] : foto.l.split('');
  return luces.some((c) => (p.a[c] || 0) * (c === 'w' ? 1 : foto.bl[IDX[c]]) > 0.15);
}
export function nitida(p, foto) {
  return distZ(p, foto.z) <= DOF[foto.a][0];
}

/*
  evaluar: el niño tocó el punto (x, y) en µm de una foto. Devuelve qué pasó:
  { tipo: 'acierto' | 'aumento' | 'luz' | 'plano' | 'blanqueo' | 'distractor' | 'nada', tag }
*/
export function evaluar(escena, mision, foto, x, y, tol) {
  const golpes = [];
  for (const ent of escena.entidades) {
    if (Math.hypot(ent.x - x, ent.y - y) > ent.r + tol + 2) continue;
    for (const p of ent.partes) {
      const dz = distZ(p, foto.z);
      if (dz > DOF[foto.a][1]) continue;
      const d = distParte(p, x, y);
      if (d > tol) continue;
      golpes.push({ p, ent, d, visible: seVe(p, foto), nit: dz <= DOF[foto.a][0] });
    }
  }
  const objetivo = golpes.filter((g) => mision.objetivo.includes(g.p.tag));
  if (objetivo.length) {
    const luzOk = mision.luz.some((c) => foto.l.includes(c));
    const vistos = objetivo.filter((g) => g.visible || !luzOk);
    const canalesFluo = mision.luz.filter((c) => c !== 'w' && foto.l.includes(c));
    const gastado = canalesFluo.length > 0 && canalesFluo.every((c) => foto.bl[IDX[c]] < 0.35);
    if (!vistos.length && gastado) return { tipo: 'blanqueo', tag: objetivo[0].p.tag };
    if (vistos.length) {
      if (foto.a < mision.aumentoMin) return { tipo: 'aumento', tag: vistos[0].p.tag };
      if (!luzOk) return { tipo: 'luz', tag: vistos[0].p.tag };
      // La parte clave (por ej. el ADN ordenado) tiene que estar en foco
      const conClave = vistos.map((g) => g.ent.partes.find((q) => q.clave && q.tag === g.p.tag) || g.p);
      if (!conClave.some((q) => nitida(q, foto))) return { tipo: 'plano', tag: vistos[0].p.tag };
      if (gastado) return { tipo: 'blanqueo', tag: vistos[0].p.tag };
      return { tipo: 'acierto', tag: vistos[0].p.tag };
    }
  }
  const visibles = golpes.filter((g) => g.visible && g.nit);
  if (!visibles.length) return { tipo: 'nada' };
  visibles.sort((a, b) => PRIORIDAD[a.p.t] - PRIORIDAD[b.p.t] || a.d - b.d);
  return { tipo: 'distractor', tag: visibles[0].p.tag };
}

/* Barra de escala: un largo "redondo" cerca del 18% del campo */
export function barraEscala(a, tam) {
  const campo = CAMPO[a];
  const opciones = [1, 2, 5, 10, 20, 50, 100];
  let L = opciones[0];
  for (const o of opciones) if (o <= campo * 0.22) L = o;
  return { um: L, px: (L / campo) * tam };
}
