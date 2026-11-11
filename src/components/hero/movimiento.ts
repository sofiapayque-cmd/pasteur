/*
  PORTADA ILUSTRADA · cuentas del movimiento (sin tocar la página)

  Acá está toda la matemática de la lupa y de las células, separada de la
  parte que mueve las imágenes (animarPortada.ts), para poder probarla sola
  (pruebas/portada.test.mjs).

  Todo en unidades de la escena (1920 × 1080).
*/
import { CELULA_ALTO, LENTE, PUNTA, RADIO_VIDRIO, type Celula } from './escena';

/* ---------- La lupa ---------- */

/*
  Estado de la lupa. GSAP mueve estos números; nada más.
  - giro y escala: cuánto gira (grados) y crece desde la punta del mango.
  - vaiven: un balanceo mínimo, en grados, mientras está en reposo.
*/
export type EstadoLupa = { giro: number; escala: number; vaiven: number };

export const LUPA_REPOSO = { giro: 0, escala: 1 } as const;

/*
  Al pasar el mouse: crece un 10 % y gira 3,8° (hacia la vertical) desde la
  punta del mango. Con esa combinación el centro sube unas 53 unidades casi
  en línea recta (53 px en 1920 × 1080; 40 px en 1440 × 900).
*/
export const LUPA_ACTIVA = { giro: -3.8, escala: 1.1 } as const;

/* El aumento crece con la lupa: 1,7 en reposo y 1,87 (1,7 × 1,1) levantada. */
export const AUMENTO = LENTE.aumento;

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
  La copia ya está ubicada (por CSS) para la lupa en reposo y la célula en su
  lugar; acá solo se suma lo que cambió: lo que se movió la célula y lo que
  se movió la lupa. Como la capa ampliada está dentro de la lupa (que crece
  con la escala), el aumento en pantalla es AUMENTO × escala de la lupa.

  visible: si la copia toca el vidrio. Si no, se oculta (no hace falta
  dibujarla); el borde del círculo igual la recorta exacta.
*/
export function transformAdentro(c: Celula, e: EstadoCelula, ls: { x: number; y: number }) {
  const alto = c.d * CELULA_ALTO;
  const px = c.x + e.dx - ls.x;
  const py = c.y + e.dy - ls.y;
  const visible = Math.hypot(px, py) - (c.d * e.escala) / 2 < RADIO_VIDRIO / AUMENTO;
  const tx = e.dx + (LENTE.x - ls.x);
  const ty = e.dy + (LENTE.y - ls.y);
  return {
    visible,
    transform: `translate(${n((tx / c.d) * 100)}%, ${n((ty / alto) * 100)}%) rotate(${n(c.giro + e.giro)}deg) scale(${n(e.escala)})`,
  };
}

/* ---------- Por dónde puede andar cada célula ---------- */

export type Rect = { izq: number; arr: number; der: number; aba: number };
/* Cuánto puede alejarse la célula de su lugar hacia cada lado. */
export type Caja = { izq: number; der: number; arr: number; aba: number };

/* Distancia mínima entre una célula y un texto, en unidades. */
export const MARGEN_TEXTOS = 12;

/* Cuánto se aleja de su lugar si no se indica: las grandes (más cerca) se mueven más. */
export function derivaDe(c: Pick<Celula, 'd' | 'deriva'>) {
  return c.deriva ?? Math.round(12 + c.d * 0.2);
}

/*
  La caja por la que puede andar la célula: un rectángulo alrededor de su
  lugar que no se acerca a ningún texto (título, subtítulo, logo, "Pedí
  acceso"). Como el rectángulo no toca los textos y la célula va en línea
  recta de un punto a otro adentro de él, nunca los tapa en el camino.
*/
export function cajaLibre(c: Pick<Celula, 'x' | 'y' | 'd' | 'deriva'>, zonas: Rect[], margen = MARGEN_TEXTOS): Caja {
  const r = (c.d / 2) * ESCALA_CELULA_MAX + margen;
  const max = derivaDe(c);
  const caja: Caja = { izq: max, der: max, arr: max, aba: max };
  for (const z of zonas) {
    const zi = z.izq - r;
    const zd = z.der + r;
    const za = z.arr - r;
    const zb = z.aba + r;
    // ¿la caja ya está lejos de esta zona?
    if (c.x + caja.der <= zi || c.x - caja.izq >= zd || c.y + caja.aba <= za || c.y - caja.arr >= zb) continue;
    // la célula está pegada a la zona: se queda quieta
    if (c.x > zi && c.x < zd && c.y > za && c.y < zb) return { izq: 0, der: 0, arr: 0, aba: 0 };
    // recortar el lado que menos movimiento le quita
    const opciones: [keyof Caja, number][] = [];
    if (c.x <= zi) opciones.push(['der', zi - c.x]);
    if (c.x >= zd) opciones.push(['izq', c.x - zd]);
    if (c.y <= za) opciones.push(['aba', za - c.y]);
    if (c.y >= zb) opciones.push(['arr', c.y - zb]);
    let mejor = opciones[0];
    for (const o of opciones) if (caja[o[0]] - o[1] < caja[mejor[0]] - mejor[1]) mejor = o;
    caja[mejor[0]] = Math.max(0, Math.min(caja[mejor[0]], mejor[1]));
  }
  return caja;
}

/*
  Dónde se mueve cada célula en esta pantalla.
  En pantallas chicas (la Ceibal, 1024 × 600) el logo y "Pedí acceso" ocupan
  más lugar de la escena y alguna célula puede quedar debajo. En ese caso su
  lugar se corre lo justo para salir (ox, oy) y la caja se arma desde ahí.
*/
export type Recorrido = { ox: number; oy: number; caja: Caja };

export function recorridoLibre(c: Celula, zonas: Rect[], margen = MARGEN_TEXTOS): Recorrido {
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
  return { ox: x - c.x, oy: y - c.y, caja: cajaLibre({ ...c, x, y }, zonas, margen) };
}
