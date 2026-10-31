/*
  Geometría de los modelos simplificados (esferas encadenadas como un collar).
  NO son estructuras reales: son representaciones con la forma general
  (dominios, pares) para que los chicos vean partes y cambios.

  Coordenadas: x e y en el plano de la membrana del virus, z hacia afuera.
  Cada esfera: { p:[x,y,z], r, dom, copia, color }
  Las esferas están en orden de cadena (así se puede "desarmar" el collar).
*/
import { estructura } from './ciencia';

// Generador pseudoaleatorio con semilla (mismo resultado siempre)
function rng(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

// Puntos en espiral (tipo Fibonacci) dentro de un elipsoide alargado en x:
// el orden de los puntos sigue la espiral, como una cadena plegada.
function ovillo(c, r, n, desfase = 0) {
  const pts = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const u = 1 - (2 * (i + 0.5)) / n;
    const rad = Math.sqrt(1 - u * u);
    const th = ga * (i + desfase) * 1.0;
    const k = i % 3 === 1 ? 0.45 : 0.85;
    pts.push([c[0] + r[0] * u * 0.9, c[1] + r[1] * rad * Math.cos(th) * k, c[2] + r[2] * rad * Math.sin(th) * k]);
  }
  return pts;
}

// Un monómero de la proteína E, en coordenadas locales (eje largo = x)
function monomeroE() {
  const d1 = ovillo([-3, 0, 0], [2.6, 2.0, 1.6], 10, 1);
  const d2 = ovillo([4.4, 0.7, 0.25], [4.4, 1.35, 1.1], 12, 2);
  const lazo = [
    [9.3, 1.0, 0.35],
    [10.1, 1.9, 0.2],
  ];
  const d3 = ovillo([-8.1, -0.3, -0.35], [2.0, 1.8, 1.6], 7, 3);
  // Orden de cadena: mitad del centro → brazo (ida) → gancho → brazo (vuelta) → centro → dominio III
  const d2ida = d2.filter((_, i) => i % 2 === 0).reverse();
  const d2vuelta = d2.filter((_, i) => i % 2 === 1);
  const cadena = [];
  d1.slice(0, 5).forEach((p) => cadena.push({ p, dom: 'd1', r: 1.18 }));
  d2ida.forEach((p) => cadena.push({ p, dom: 'd2', r: 1.08 }));
  lazo.forEach((p) => cadena.push({ p, dom: 'lazo', r: 0.92 }));
  d2vuelta.forEach((p) => cadena.push({ p, dom: 'd2', r: 1.08 }));
  d1.slice(5).forEach((p) => cadena.push({ p, dom: 'd1', r: 1.18 }));
  d3.forEach((p) => cadena.push({ p, dom: 'd3', r: 1.12 }));
  return cadena;
}

function monomeroLisozima() {
  const beta = ovillo([2.5, 0.5, -0.2], [2.3, 2.2, 2.1], 13, 1);
  const alfa = ovillo([-2.4, -0.1, 0.1], [2.8, 2.6, 2.4], 17, 2);
  // Surco entre las dos mitades, mirando hacia la cámara (arriba y adelante)
  const surco = [
    [0.1, -1.6, 2.2],
    [0.2, -0.4, 2.7],
    [-0.1, 0.8, 2.4],
    [0.3, -2.4, 1.0],
  ];
  const cadena = [];
  alfa.slice(0, 9).forEach((p) => cadena.push({ p, dom: 'alfa', r: 1.15 }));
  surco.slice(0, 2).forEach((p) => cadena.push({ p, dom: 'surco', r: 0.95 }));
  beta.forEach((p) => cadena.push({ p, dom: 'beta', r: 1.1 }));
  surco.slice(2).forEach((p) => cadena.push({ p, dom: 'surco', r: 0.95 }));
  alfa.slice(9).forEach((p) => cadena.push({ p, dom: 'alfa', r: 1.15 }));
  return cadena;
}

// Mezcla de color hex
export function mezclar(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (x, s) => (x >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
}

const SEP = 1.95; // media distancia entre las dos copias del par

// Construye el modelo completo de una estructura
export function construir(id) {
  const e = estructura(id);
  const colorDe = Object.fromEntries(e.partes.map((p) => [p.id, p.color]));
  const esferas = [];
  if (e.pares) {
    const m = monomeroE();
    [0, 1].forEach((copia) => {
      m.forEach((s) => {
        esferas.push({
          local: s.p,
          r: s.r,
          dom: s.dom,
          copia,
          color: copia ? mezclar(colorDe[s.dom], '#2F4A85', 0.14) : colorDe[s.dom],
        });
      });
    });
  } else {
    monomeroLisozima().forEach((s) => esferas.push({ local: s.p, r: s.r, dom: s.dom, copia: 0, color: colorDe[s.dom] }));
  }
  const n = esferas.length;
  esferas.forEach((s, i) => {
    s.i = i;
    s.inicio = plegada(e, s, 0);
    // fase y frecuencia propias para la vibración
    const az = rng(i * 7919 + 13);
    s.fase = [az() * 6.28, az() * 6.28, az() * 6.28];
    s.frec = [0.8 + az() * 0.6, 0.8 + az() * 0.6, 0.8 + az() * 0.6];
  });

  // Estado desarmado: cada cadena se despliega como un collar suelto (camino al azar con inercia)
  const radio = Math.max(...esferas.map((s) => Math.hypot(...s.inicio) + s.r));
  const az = rng(id.length * 101 + 7);
  const copias = e.pares ? [0, 1] : [0];
  copias.forEach((copia) => {
    const cad = esferas.filter((s) => s.copia === copia);
    const centro = cad.reduce((a, s) => [a[0] + s.inicio[0] / cad.length, a[1] + s.inicio[1] / cad.length, a[2] + s.inicio[2] / cad.length], [0, 0, 0]);
    let pos = [centro[0] * 1.6 - (copia ? -2 : 2), centro[1] * 1.6, centro[2]];
    let dir = [copia ? 1 : -1, 0.3, 0.2];
    const pasos = [];
    for (let k = 0; k < cad.length; k++) {
      const rnd = [az() - 0.5, az() - 0.5, (az() - 0.5) * 0.7];
      dir = [dir[0] * 0.55 + rnd[0], dir[1] * 0.55 + rnd[1], dir[2] * 0.55 + rnd[2]];
      const l = Math.hypot(...dir) || 1;
      dir = dir.map((x) => x / l);
      pos = [pos[0] + dir[0] * 1.75, pos[1] + dir[1] * 1.75, pos[2] + dir[2] * 1.75];
      // si se va muy lejos, vuelve suave hacia el centro
      const d = Math.hypot(...pos);
      if (d > radio * 1.15) {
        pos = pos.map((x) => (x * radio * 1.15) / d);
        dir = dir.map((x, j) => x - (pos[j] / d) * 0.8);
      }
      pasos.push(pos);
    }
    // centrar el ovillo de la cadena desplegada
    const cm = pasos.reduce((a, p) => [a[0] + p[0] / pasos.length, a[1] + p[1] / pasos.length, a[2] + p[2] / pasos.length], [0, 0, 0]);
    const objetivo = e.pares ? [copia ? 5.5 : -5.5, copia ? 2 : -2, 0] : [0, 0, 0];
    cad.forEach((s, k) => {
      s.suelta = [pasos[k][0] - cm[0] + objetivo[0], pasos[k][1] - cm[1] + objetivo[1], pasos[k][2] - cm[2] + objetivo[2]];
    });
  });

  // que el collar suelto no se salga del visor
  const lejos = Math.max(...esferas.map((s) => Math.hypot(...s.suelta) + s.r));
  if (lejos > radio * 0.98) {
    const f = (radio * 0.98) / lejos;
    esferas.forEach((s) => (s.suelta = s.suelta.map((x) => x * f)));
  }

  return { id, e, esferas, n, radio };
}

/*
  Posición plegada. k (0..1) = cuánto avanzó el cambio de forma por acidez:
  0 = par acostado sobre el virus; 1 = copias separadas y paradas, con el gancho arriba.
*/
function plegada(e, s, k) {
  let [x, y, z] = s.local;
  if (!e.pares) return [x, y, z];
  if (k > 0 && s.dom === 'd3') {
    // el dominio III se dobla hacia el costado (como una horquilla) — VALIDAR simplificación
    x += 6.2 * k;
    y -= 2.6 * k;
    z += 0.4 * k;
  }
  const th = (k * Math.PI) / 2;
  const xr = x * Math.cos(th) - z * Math.sin(th);
  const zr = x * Math.sin(th) + z * Math.cos(th) - 3.4 * k;
  const sep = SEP + 2.3 * k;
  const abre = 3.2 * k;
  if (s.copia === 0) return [xr - abre, y - sep, zr];
  return [-xr + abre, -y + sep, zr];
}

const suave = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// Amplitud de vibración según temperatura (más calor = más movimiento)
export const amplitud = (temp) => 0.05 + 0.75 * Math.pow(Math.min(1, Math.max(0, temp / 100)), 1.6);

/*
  Posición de cada esfera en la simulación.
  estado: { resultado, t (0..1 del tiempo simulado), temp }
  reloj: segundos (para la vibración); quieto = sin vibración
*/
export function posiciones(modelo, estado, reloj, quieto = false) {
  const { resultado: r = 'estable', t = 0, temp = 37 } = estado || {};
  const { e, esferas, n } = modelo;
  const kCambio = r === 'cambia' ? suave(0.18, 0.7, t) : 0;
  const amp0 = quieto ? 0 : amplitud(temp);
  const vel = 2.2 + temp / 22;
  return esferas.map((s) => {
    let p = kCambio > 0 ? plegada(e, s, kCambio) : s.inicio;
    let amp = amp0;
    if (r === 'desarmada') {
      // se despliega desde las puntas de la cadena hacia el centro
      const pos = e.pares ? (s.i % (n / 2)) / (n / 2) : s.i / n;
      const escalon = 1 - Math.abs(2 * pos - 1);
      const k = suave(0.2 + escalon * 0.35, 0.5 + escalon * 0.35, t);
      p = [p[0] + (s.suelta[0] - p[0]) * k, p[1] + (s.suelta[1] - p[1]) * k, p[2] + (s.suelta[2] - p[2]) * k];
      if (!quieto) amp += 0.35 * k;
    }
    if (!amp) return p;
    const w = reloj * vel;
    return [
      p[0] + amp * Math.sin(w * s.frec[0] + s.fase[0]),
      p[1] + amp * Math.sin(w * s.frec[1] + s.fase[1]),
      p[2] + amp * Math.sin(w * s.frec[2] + s.fase[2]),
    ];
  });
}

// "Cuánto se alejó de su forma inicial" (los científicos lo llaman RMSD)
export function curvaCambio(modelo, estado, muestras = 48) {
  const out = [];
  for (let i = 0; i <= muestras; i++) {
    const t = i / muestras;
    const pos = posiciones(modelo, { ...estado, t }, t * 40);
    let suma = 0;
    pos.forEach((p, j) => {
      const q = modelo.esferas[j].inicio;
      suma += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
    });
    out.push([t, Math.sqrt(suma / pos.length)]);
  }
  return out;
}
