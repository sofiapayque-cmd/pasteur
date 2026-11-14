/*
  PORTADA ILUSTRADA · cuentas de la lupa y de las células (sin tocar la página)

  Acá está la matemática de la lupa, separada de la parte que mueve las
  imágenes (animarPortada.ts), para poder probarla sola
  (pruebas/portada.test.mjs). Cómo viajan las células: deriva.ts.

  Todo en unidades de la escena (1920 × 1080).
*/
import { CELULA_ALTO, LENTE, PUNTA, RADIO_VIDRIO, type Celula } from './escena';

/* ---------- La lupa ---------- */

/*
  Estado de la lupa. GSAP mueve estos números; nada más.
  - giro y escala: cuánto gira (grados) y crece desde la punta del mango.
  - aumento: cuánto agranda lo que se ve por el vidrio.
  - vaiven: un balanceo mínimo, en grados, mientras está en reposo.
*/
export type EstadoLupa = { giro: number; escala: number; aumento: number; vaiven: number };

/* En reposo: en su lugar, agranda 1,7 veces. */
export const LUPA_REPOSO = { giro: 0, escala: 1, aumento: LENTE.aumento } as const;

/*
  Con el mouse encima: crece un 10 % y gira 3,8° (hacia la vertical) desde
  la punta del mango, así el centro sube unas 53 unidades casi en línea
  recta (53 px en 1920 × 1080; 40 px en 1440 × 900). Y agranda más: 2,3
  veces (pedido de Sofia, 11/11).
*/
export const LUPA_ACTIVA = { giro: -3.8, escala: 1.1, aumento: 2.3 } as const;

/*
  Dónde queda el centro óptico (el centro del vidrio) para un giro y una
  escala dados. Gira y escala alrededor de la punta del mango, igual que el
  transform de CSS (rotate positivo = sentido horario en pantalla).
*/
export function centroOptico(giro: number, escala: number) {
  const t = (giro * Math.PI) / 180;
  const vx = LENTE.x - PUNTA.x;
  const vy = LENTE.y - PUNTA.y;
  return {
    x: PUNTA.x + escala * (vx * Math.cos(t) - vy * Math.sin(t)),
    y: PUNTA.y + escala * (vx * Math.sin(t) + vy * Math.cos(t)),
  };
}

/* ---------- Las células ---------- */

/*
  Estado de cada célula: cuánto se corrió de su lugar (dx, dy), cuánto giró
  de más y su tamaño relativo. Es la única fuente: la célula de afuera y su
  copia ampliada se calculan las dos desde acá.
*/
export type EstadoCelula = { dx: number; dy: number; giro: number; escala: number };

export const nuevoEstadoCelula = (): EstadoCelula => ({ dx: 0, dy: 0, giro: 0, escala: 1 });

/* Tamaño máximo con el "respiro" de la célula (ver animarPortada.ts). */
export const ESCALA_CELULA_MAX = 1.025;

const n = (v: number) => Number(v.toFixed(3));

/*
  Transform de la célula de afuera.
  El desplazamiento va en % del tamaño de la propia imagen (dx / ancho), así
  no hace falta saber cuántos píxeles vale una unidad en esta pantalla.
*/
export function transformAfuera(c: Celula, e: EstadoCelula) {
  const alto = c.d * CELULA_ALTO;
  return `translate(${n((e.dx / c.d) * 100)}%, ${n((e.dy / alto) * 100)}%) rotate(${n(c.giro + e.giro)}deg) scale(${n(e.escala)})`;
}

/*
  La copia ampliada, dentro del vidrio.
  Una lupa agranda respecto de su centro óptico: un punto P se ve en
  Ls + aumento × (P − Ls), donde Ls es dónde está el centro óptico ahora.

  La copia ya está ubicada por CSS para la lupa en reposo (aumento 1,7) y la
  célula en su lugar. Acá se la mueve y se la agranda hasta donde tiene que
  estar ahora. Como la capa ampliada está dentro de la lupa, que ya crece con
  su escala, adentro se usa aumento ÷ escala.

  visible: si la copia toca el vidrio. Si no, se oculta (no hace falta
  dibujarla); el borde del círculo igual la recorta exacta.
*/
export type Lente = { x: number; y: number; escala: number; aumento: number };

export function transformAdentro(c: Celula, e: EstadoCelula, lente: Lente) {
  const alto = c.d * CELULA_ALTO;
  const base = LENTE.aumento; // como la ubicó el CSS
  const k = lente.aumento / lente.escala; // aumento dentro de la lupa
  const px = c.x + e.dx - lente.x;
  const py = c.y + e.dy - lente.y;
  const visible = Math.hypot(px, py) - (c.d * e.escala) / 2 < RADIO_VIDRIO / k;
  // de dónde la puso el CSS a dónde va ahora (en unidades de adentro del vidrio)
  const mx = k * px - base * (c.x - LENTE.x);
  const my = k * py - base * (c.y - LENTE.y);
  return {
    visible,
    transform: `translate(${n((mx / (base * c.d)) * 100)}%, ${n((my / (base * alto)) * 100)}%) rotate(${n(c.giro + e.giro)}deg) scale(${((k / base) * e.escala).toFixed(4)})`,
  };
}

/* ---------- Los textos ---------- */

export type Rect = { izq: number; arr: number; der: number; aba: number };

/* Distancia mínima entre una célula y un texto, en unidades. */
export const MARGEN_TEXTOS = 12;

/*
  Para "reducir movimiento" (todo quieto): en pantallas chicas (la Ceibal,
  1024 × 600) "Pedí acceso" ocupa más lugar de la escena y alguna célula
  puede quedar debajo. Se corre lo justo para salir.
*/
export function salirDeZonas(c: Celula, zonas: Rect[], margen = MARGEN_TEXTOS) {
  const r = (c.d / 2) * ESCALA_CELULA_MAX + margen;
  let x = c.x;
  let y = c.y;
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    let movida = false;
    for (const z of zonas) {
      const zi = z.izq - r;
      const zd = z.der + r;
      const za = z.arr - r;
      const zb = z.aba + r;
      if (!(x > zi && x < zd && y > za && y < zb)) continue;
      // salir por el lado más cercano
      const salidas: [number, number][] = [
        [zi - x - 0.5, 0],
        [zd - x + 0.5, 0],
        [0, za - y - 0.5],
        [0, zb - y + 0.5],
      ];
      salidas.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
      x += salidas[0][0];
      y += salidas[0][1];
      movida = true;
    }
    if (!movida) break;
  }
  return { ox: x - c.x, oy: y - c.y };
}
