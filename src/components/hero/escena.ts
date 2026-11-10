/*
  PORTADA ILUSTRADA · datos de la escena

  Todo se mide en "unidades de diseño": la referencia 1 de Sofia mide
  1920 × 1080. En pantalla, cada unidad vale var(--u) (ver hero.css), así la
  composición conserva sus proporciones en 1440 × 900, 1920 × 1080 o una Ceibal.

  Es la ÚNICA fuente de datos de las células: la capa de afuera y la copia
  ampliada dentro de la lupa salen de esta misma lista. En las etapas C y D,
  GSAP moverá estas posiciones y las dos capas las leerán igual.
*/

export const ESCENA = { ancho: 1920, alto: 1080 } as const;

/*
  La lupa: centro óptico (el centro del vidrio), radio exterior del aro
  (como en la referencia 1) y aumento.
*/
export const LENTE = { x: 953, y: 597, radio: 188, aumento: 1.7 } as const;

/*
  Ilustración de la lupa (magnifier/lupa-marco): aro, conector y mango, con
  el vidrio y el fondo transparentes. Medidas del archivo, en píxeles:
  centro del vidrio, radio exterior del aro (promedio) y hasta dónde llega el
  aro sin tocar el conector (para la copia del aro que va adelante).
*/
export const MARCO = {
  src: '/illustrations/hero/magnifier/lupa-marco.webp',
  ancho: 628,
  alto: 723,
  vidrioX: 374.2,
  vidrioY: 250.1,
  radioAro: 242.4,
  radioCorte: 252,
} as const;

/* Cuántas unidades de la escena vale un píxel del archivo de la lupa. */
export const ESCALA_MARCO = LENTE.radio / MARCO.radioAro;

/*
  Radio del vidrio, en unidades. El hueco del archivo es apenas ovalado
  (212 × 219 px de radio): se usa el mayor, y lo que sobra queda debajo del aro.
*/
export const RADIO_VIDRIO = Math.ceil(219 * ESCALA_MARCO) + 1;

/* Brillos del vidrio (magnifier/lupa-reflejos): un disco con los reflejos en el borde. */
export const REFLEJOS = {
  src: '/illustrations/hero/magnifier/lupa-reflejos.webp',
  ancho: 546,
  alto: 547,
  centroX: 272.5,
  centroY: 273,
  radio: 255,
} as const;

export type Celula = {
  id: string;
  /** centro, en unidades de diseño */
  x: number;
  y: number;
  /** ancho de la célula */
  d: number;
  /** giro en grados */
  giro: number;
};

/*
  Posiciones tomadas de la referencia 1. Cambios a propósito:
  - "c" va un poco más abajo y a la derecha para no quedar debajo de "Pedí acceso".
  - "m" y "n" están debajo del vidrio: solo se ven ampliadas, como en la referencia
    (una grande arriba a la izquierda y otra cortada por el borde, abajo a la derecha).
  - "l" queda detrás del aro, asomando a la derecha, como en la referencia.
*/
export const CELULAS: Celula[] = [
  { id: 'a', x: 185, y: 205, d: 150, giro: -12 },
  { id: 'b', x: 558, y: 92, d: 72, giro: 18 },
  { id: 'c', x: 1560, y: 140, d: 104, giro: -24 },
  { id: 'd', x: 1410, y: 325, d: 150, giro: 9 },
  { id: 'e', x: 1735, y: 285, d: 36, giro: 30 },
  { id: 'f', x: 385, y: 500, d: 78, giro: -20 },
  { id: 'g', x: 1658, y: 540, d: 135, giro: 14 },
  { id: 'h', x: 1385, y: 655, d: 50, giro: -6 },
  { id: 'i', x: 275, y: 932, d: 125, giro: 22 },
  { id: 'j', x: 1340, y: 950, d: 150, giro: -16 },
  { id: 'k', x: 1820, y: 880, d: 100, giro: 6 },
  { id: 'l', x: 1140, y: 650, d: 92, giro: -30 },
  { id: 'm', x: 908, y: 560, d: 96, giro: 12 },
  { id: 'n', x: 1024, y: 654, d: 70, giro: -18 },
];

/* Proporción de la imagen de la célula (celula.webp mide 640 × 602). */
export const CELULA_ALTO = 602 / 640;

/*
  Dónde se ve una célula dentro de la lupa.
  Una lupa agranda todo respecto de su centro óptico: un punto que está a
  (dx, dy) del centro se ve a (dx, dy) × aumento. Por eso solo aparecen
  ampliadas las células que están a menos de RADIO_VIDRIO / aumento del centro.
  Devuelve el centro en coordenadas del vidrio (0,0 = esquina del cuadrado
  que contiene al círculo), el ancho ampliado y si toca el vidrio.
*/
export function enLaLente(c: Pick<Celula, 'x' | 'y' | 'd'>, lente: { x: number; y: number; aumento: number } = LENTE) {
  const k = lente.aumento;
  const dx = (c.x - lente.x) * k;
  const dy = (c.y - lente.y) * k;
  const d = c.d * k;
  return {
    x: RADIO_VIDRIO + dx,
    y: RADIO_VIDRIO + dy,
    d,
    visible: Math.hypot(dx, dy) - d / 2 < RADIO_VIDRIO,
  };
}

export type Cientifico = {
  id: 'rodete' | 'rulos' | 'pelirroja';
  src: string;
  /** tamaño del archivo, para reservar el lugar antes de que cargue */
  ancho: number;
  alto: number;
  /** borde izquierdo y alto en pantalla, en unidades de diseño (los pies van en PISO) */
  x: number;
  h: number;
};

/* Línea del piso: donde apoyan los pies en la referencia 1. */
export const PISO = 950;

/*
  De izquierda a derecha: rodete, rulos y pelirroja (la pelirroja, junto al mango).
  Vista de tres cuartos mirando hacia arriba, recortada de cada hoja de rotación.
  Los altos respetan la proporción entre las hojas (rulos es el más alto).
  PROVISORIO: la pelirroja todavía no sostiene el mango. En pelirroja-sostiene
  agarra un mango unas cuatro veces más finito que el de la lupa gigante, así
  que no encaja con la escala de la referencia (ver docs/PORTADA-ILUSTRADA.md).
*/
export const CIENTIFICOS: Cientifico[] = [
  { id: 'rodete', src: '/illustrations/hero/scientists/rodete-mira.webp', ancho: 172, alto: 396, x: 586, h: 173 },
  { id: 'rulos', src: '/illustrations/hero/scientists/rulos-mira.webp', ancho: 164, alto: 471, x: 652, h: 206 },
  { id: 'pelirroja', src: '/illustrations/hero/scientists/pelirroja-mira.webp', ancho: 178, alto: 427, x: 722, h: 187 },
];
