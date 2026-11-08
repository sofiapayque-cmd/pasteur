/*
  A1 · CÓMO SE VEN LAS COLONIAS (bloque 7, 7/11/2026; opción A elegida por Sofia)

  Cada ambiente tiene su "firma": tres tipos de colonia que se parecen a los
  que aparecen en placas de ese tipo de muestra. Así dos placas de lugares
  distintos se ven distintas, que es lo que el chico tiene que descubrir en
  "Comparar" ("en lugares distintos viven microorganismos distintos").

  Son TIPOS DE COLONIA (forma, borde, superficie, color), no especies: una
  placa no alcanza para saber qué bacteria es (para eso se secuencia el ADN,
  que es lo que hace el laboratorio de Genómica Microbiana).

  VALIDAR con Genómica Microbiana: qué tipos de colonia ven en sus placas de
  suelo antártico, heces de pingüino, suelo de campo y bosta, y en qué medio.

  En qué se apoya cada firma:
  · Suelo antártico: aislamientos pigmentados amarillos y anaranjados por
    carotenoides, que protegen del sol fuerte y ayudan con el frío
    (Reis-Mansur et al., Scientific Reports 2019, suelo de la isla Rey Jorge;
    Pradel et al., Microorganisms 2021: una Flavobacterium del suelo antártico
    que forma "colonias circulares de un anaranjado intenso").
  · Campo natural: el estudio del Institut Pasteur de Montevideo (Giménez,
    Iraola y otros, Environmental Microbiome 2025) encontró en pastizales
    nativos bacterias como Bacillus y Streptomyces.
    - Bacillus: colonias grandes, planas, secas, de borde irregular.
    - Streptomyces: chicas, compactas, secas, opacas, "como de tiza", a veces
      con pigmento marrón alrededor; hacen la geosmina, el olor a tierra
      mojada (Microbiology Concept Inventory, U. de Wisconsin, "Streptomyces").
  · Pingüino y vaca (intestino): colonias cremosas, lisas y brillantes, y otras
    chiquitas grisáceas, típicas de bacterias intestinales en agar común.
    La caca de pingüino es rosada por el krill que comen (NASA Earth
    Observatory, "Pink Penguin Guano Provides Diet Clues").
*/

/*
  Tipos de colonia.
  - borde: entero (redondo) · ondulado · lobulado · irregular
  - relieve: convexa (abombada) · plana · umbonada (con un "ombligo" alto)
  - superficie: brillante · mate · arrugada · tiza · mucosa
  - tam: tamaño de la colonia cuando crece bien (en unidades de la placa: el agar mide 176 de radio)
  - pigmento: color que se difunde en el agar alrededor (o null)
*/
export const MORFOTIPOS = {
  naranja: { nombre: 'anaranjada y brillante', color: '#E8902C', borde: 'entero', relieve: 'convexa', superficie: 'brillante', tam: [8, 14], pigmento: null },
  amarilla: { nombre: 'amarilla y brillante', color: '#EDC93F', borde: 'entero', relieve: 'convexa', superficie: 'brillante', tam: [7, 12], pigmento: null },
  cremaChica: { nombre: 'chiquita y transparente', color: '#F4EEDF', borde: 'entero', relieve: 'convexa', superficie: 'brillante', tam: [4, 7], pigmento: null, translucida: true },
  crema: { nombre: 'cremosa y lisa', color: '#F4ECD6', borde: 'entero', relieve: 'convexa', superficie: 'brillante', tam: [10, 16], pigmento: null },
  gris: { nombre: 'chiquita y grisácea', color: '#DCDDD8', borde: 'entero', relieve: 'convexa', superficie: 'brillante', tam: [4, 8], pigmento: null, translucida: true },
  mucosa: { nombre: 'mucosa, que se desparrama', color: '#EFE2C2', borde: 'ondulado', relieve: 'plana', superficie: 'mucosa', tam: [13, 20], pigmento: null, translucida: true },
  arrugada: { nombre: 'grande, seca y arrugada', color: '#EFE8D6', borde: 'irregular', relieve: 'plana', superficie: 'arrugada', tam: [15, 24], pigmento: null },
  tiza: { nombre: 'como de tiza', color: '#ECE9E3', borde: 'entero', relieve: 'umbonada', superficie: 'tiza', tam: [7, 12], pigmento: '#9C7A4E' },
  amarillaMate: { nombre: 'amarilla y mate', color: '#E4C259', borde: 'ondulado', relieve: 'plana', superficie: 'mate', tam: [8, 13], pigmento: null },
};

/* La firma de cada ambiente: el primer tipo es el más común (si crece uno solo, es ese). VALIDAR */
export const FIRMA = {
  'antartida-suelo': ['naranja', 'amarilla', 'cremaChica'],
  'antartida-pinguino': ['crema', 'gris', 'mucosa'],
  'campo-suelo': ['arrugada', 'tiza', 'amarillaMate'],
  'campo-vaca': ['crema', 'gris', 'arrugada'],
};

export const firma = (ambiente) => (FIRMA[ambiente] || FIRMA['campo-suelo']).map((id) => ({ id, ...MORFOTIPOS[id] }));

/* ---------- Colores ---------- */
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const aHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
/** Aclara (k > 0, hacia blanco) u oscurece (k < 0, hacia un marrón oscuro, como la sombra sobre el agar). */
export function tono(color, k) {
  const c = hex(color);
  const hacia = k >= 0 ? [255, 255, 255] : [74, 56, 30];
  const t = Math.abs(k);
  return aHex(c.map((v, i) => v + (hacia[i] - v) * t));
}

/* ---------- Formas (coordenadas de la colonia, centro 0,0) ---------- */
function rnd(semilla) {
  let s = Math.abs(Math.floor(semilla)) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Contorno cerrado y suave a partir de radios por ángulo. */
function contorno(radios) {
  const n = radios.length;
  const p = radios.map((r, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  const medio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = medio(p[n - 1], p[0]);
  let d = `M${m0[0].toFixed(2)} ${m0[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const a = p[i];
    const m = medio(a, p[(i + 1) % n]);
    d += `Q${a[0].toFixed(2)} ${a[1].toFixed(2)} ${m[0].toFixed(2)} ${m[1].toFixed(2)}`;
  }
  return d + 'Z';
}

/**
 * Contorno de una colonia de radio r. Determinístico: la misma semilla da la
 * misma forma en la mesa, en el cuaderno y en la puesta en común.
 */
export function formaColonia(borde, r, semilla) {
  const az = rnd(semilla * 31 + 7);
  if (borde === 'entero') {
    // Casi redonda: las colonias reales nunca son círculos perfectos
    return contorno(Array.from({ length: 10 }, () => r * (0.97 + az() * 0.06)));
  }
  if (borde === 'ondulado') {
    const fase = az() * Math.PI * 2;
    const ondas = 7 + Math.floor(az() * 4);
    return contorno(Array.from({ length: 28 }, (_, i) => r * (0.93 + 0.07 * Math.sin((i / 28) * Math.PI * 2 * ondas + fase) + az() * 0.04)));
  }
  if (borde === 'lobulado') {
    const fase = az() * Math.PI * 2;
    return contorno(Array.from({ length: 30 }, (_, i) => r * (0.86 + 0.14 * Math.abs(Math.sin((i / 30) * Math.PI * 5 + fase)) + az() * 0.03)));
  }
  // irregular: lóbulos grandes desparejos y borde que avanza (como Bacillus)
  const lobulos = Array.from({ length: 5 }, () => [az() * Math.PI * 2, 0.08 + az() * 0.16]);
  return contorno(
    Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      const l = lobulos.reduce((s, [fa, k]) => s + k * Math.max(0, Math.cos(a - fa)) ** 3, 0);
      return r * (0.78 + l + az() * 0.07);
    }),
  );
}

/** Arrugas de una colonia seca: pliegues que salen del centro y se tuercen, y alguno de costado. */
export function arrugas(r, semilla) {
  const az = rnd(semilla * 17 + 3);
  const n = 5 + Math.floor(az() * 3);
  const f = (v) => v.toFixed(2);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + az() * 0.8;
    const r1 = r * (0.22 + az() * 0.22);
    const r2 = r * (0.55 + az() * 0.25);
    const giro = (az() - 0.5) * 1.1;
    const rm = (r1 + r2) / 2;
    d += `M${f(Math.cos(a) * r1)} ${f(Math.sin(a) * r1)}Q${f(Math.cos(a + giro) * rm)} ${f(Math.sin(a + giro) * rm)} ${f(Math.cos(a + giro * 0.4) * r2)} ${f(Math.sin(a + giro * 0.4) * r2)}`;
  }
  // Dos pliegues de costado, como arcos
  for (let i = 0; i < 2; i++) {
    const a = az() * Math.PI * 2;
    const rr = r * (0.4 + az() * 0.25);
    const largo = 0.5 + az() * 0.5;
    d += `M${f(Math.cos(a) * rr)} ${f(Math.sin(a) * rr)}Q${f(Math.cos(a + largo / 2) * rr * 1.12)} ${f(Math.sin(a + largo / 2) * rr * 1.12)} ${f(Math.cos(a + largo) * rr)} ${f(Math.sin(a + largo) * rr)}`;
  }
  return d;
}

/**
 * Tamaño final de una colonia: crece más a la temperatura que le gusta
 * (con 0,22 de gusto llega a dos tercios).
 */
export const tamanoColonia = (morfo, sorteo, gusto) => (morfo.tam[0] + sorteo * (morfo.tam[1] - morfo.tam[0])) * (0.58 + 0.42 * Math.max(0, Math.min(1, gusto)));
