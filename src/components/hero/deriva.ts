/*
  PORTADA ILUSTRADA · cómo viajan las células por toda la pantalla

  Cuentas puras (sin tocar la página), para poder probarlas solas
  (pruebas/portada.test.mjs). animarPortada.ts las llama una vez por cuadro.

  Cada célula:
  - elige un destino en cualquier lugar de la pantalla: entre varios lugares
    al azar, el que está más lejos de las otras células (así se reparten y no
    se amontonan en el medio). Una de cada cinco veces, más o menos, el
    destino es la lupa, y al llegar elige otro: así pasa por debajo del
    vidrio y sigue de largo;
  - si el vidrio queda vacío unos segundos, la que está más cerca va hacia
    la lupa, un poco más rápido: así seguido hay alguna pasando y
    agrandándose. Con el mouse encima, van una detrás de otra y debajo del
    vidrio pasan más despacio (se las ve más rato, y más grandes);
  - va hacia su destino girando de a poco (nunca dobla de golpe) y con una
    ondulación lenta, así el camino es una curva;
  - las grandes (más cerca) van más rápido que las chicas (más lejos);
  - se aparta de las otras células de su tamaño, y un poco de todas (para
    que queden repartidas);
  - se desvía antes de llegar a un texto y nunca lo tapa;
  - puede asomarse un poco por los bordes, pero no se va de la pantalla.

  Todo en unidades de la escena (1920 × 1080) y segundos.
*/
import { ESCENA, type Celula } from './escena';
import { ESCALA_CELULA_MAX, MARGEN_TEXTOS, type EstadoCelula, type Rect } from './movimiento';

export const DERIVA = {
  /** velocidad de las células más chicas y de las más grandes (unidades por segundo) */
  velocidadLejos: 11,
  velocidadCerca: 26,
  /** qué tan rápido cambia de dirección (por segundo): más bajo = curvas más amplias */
  agilidad: 0.7,
  /** cuánto ondula el camino (radianes) */
  ondulacion: 0.5,
  /** a qué distancia del destino elige otro (si el destino es la lupa, más cerca: así pasa por el medio del vidrio) */
  llegada: 70,
  llegadaLupa: 25,
  /** cada cuántos destinos uno es la lupa (cada célula empieza en un punto distinto de la cuenta) */
  cadaCuantosLaLupa: 5,
  /** qué tan lejos del centro de la lupa puede caer ese destino */
  radioLupa: 40,
  /** desde qué distancia empieza a esquivar un texto, y con cuánta fuerza */
  alcanceTextos: 70,
  fuerzaTextos: 90,
  /** si igual quedó encima de un texto, con qué velocidad sale */
  salida: 120,
  /** distancia mínima entre células (proporción de la suma de radios) y fuerza */
  separacion: 0.9,
  fuerzaSeparacion: 40,
  /** empuje suave entre todas, para que se repartan: hasta qué distancia y con cuánta fuerza */
  espacio: 340,
  fuerzaEspacio: 14,
  /** entre cuántos lugares al azar elige el destino más despejado */
  candidatos: 10,
  /** cuánto de la célula puede salir por el borde, y desde dónde la empuja hacia adentro */
  asomar: 0.35,
  borde: 70,
  fuerzaBorde: 60,
  /** si casi no avanza durante este tiempo, cambia de destino */
  atascada: 2.5,
  /** si no se ve ninguna por el vidrio durante este tiempo (segundos), llama a la más cercana; con el mouse encima, antes */
  esperaLupa: 4,
  esperaLupaActiva: 0.8,
  /** cuántas pueden ir a la vez hacia la lupa por un llamado */
  llamadasALaVez: 2,
  /** con el mouse encima: cada cuánto sale otra hacia la lupa (segundos), mientras se vean menos de estas */
  intervaloActiva: 2,
  muchasEnLaLupa: 2,
  /** cuánto más rápido va la que llamaron (hasta llegar) */
  apuro: 1.4,
  /** con el mouse encima, qué tan rápido pasan por debajo del vidrio (proporción de su velocidad) */
  lentoBajoLaLupa: 0.6,
  /** lo que se ve por el vidrio en reposo, alrededor del centro (radio del vidrio ÷ aumento) */
  vistaLupa: 100,
} as const;

/* Profundidad: 0 = célula chica (lejos), 1 = grande (cerca). */
export const profundidad = (d: number) => Math.min(1, Math.max(0, (d - 36) / (150 - 36)));
export const velocidadDe = (c: Pick<Celula, 'd'>) =>
  DERIVA.velocidadLejos + (DERIVA.velocidadCerca - DERIVA.velocidadLejos) * profundidad(c.d);
export const radioDe = (c: Pick<Celula, 'd'>) => (c.d / 2) * ESCALA_CELULA_MAX;

/* Lo que cada célula necesita para viajar (además de su posición, que está en su estado). */
export type Rumbo = {
  vx: number;
  vy: number;
  destinoX: number;
  destinoY: number;
  fase: number;
  frecuencia: number;
  quieta: number;
  /** cuántos destinos eligió (para pasar por la lupa cada tanto) */
  tramos: number;
  /** su destino es la lupa (por su cuenta o porque la llamaron) */
  aLaLupa: boolean;
  /** va hacia la lupa porque la llamaron (el vidrio estaba vacío o hay mouse encima) */
  llamada: boolean;
};

export type Mundo = {
  /** textos que no se tapan (sin agrandar) */
  zonas: Rect[];
  /** dónde están y adónde van las células (para elegir destinos despejados) */
  ocupados?: { x: number; y: number }[];
  /** centro óptico de la lupa ahora */
  lente: { x: number; y: number };
  /** cuánto de la escena se ve por el vidrio ahora (radio alrededor del centro óptico) */
  vista?: number;
  /** si el mouse está sobre la lupa */
  activa?: boolean;
  /** hace cuántos segundos no se ve ninguna célula por el vidrio */
  vacia?: number;
  /** hace cuántos segundos se llamó a la última */
  desdeLlamada?: number;
  /** número al azar entre 0 y 1 */
  azar: () => number;
};

/* Distancia de un punto a un rectángulo (0 si está adentro) y el punto más cercano. */
function cercano(x: number, y: number, z: Rect) {
  const qx = Math.max(z.izq, Math.min(x, z.der));
  const qy = Math.max(z.arr, Math.min(y, z.aba));
  return { qx, qy, d: Math.hypot(x - qx, y - qy) };
}

/*
  Hacia dónde salir de un texto. Si el centro está afuera del rectángulo, en
  línea recta desde el punto más cercano. Si está adentro, por el lado más
  cercano que tenga lugar en la pantalla (no hacia un borde).
*/
function salida(x: number, y: number, z: Rect, r: number, min: number, maxX: number, maxY: number) {
  const { qx, qy, d } = cercano(x, y, z);
  if (d > 0.001) return { nx: (x - qx) / d, ny: (y - qy) / d };
  const lejos = r + MARGEN_TEXTOS;
  const lados = [
    { nx: -1, ny: 0, cuanto: x - z.izq, cabe: z.izq - lejos >= min },
    { nx: 1, ny: 0, cuanto: z.der - x, cabe: z.der + lejos <= maxX },
    { nx: 0, ny: -1, cuanto: y - z.arr, cabe: z.arr - lejos >= min },
    { nx: 0, ny: 1, cuanto: z.aba - y, cabe: z.aba + lejos <= maxY },
  ].filter((l) => l.cabe);
  if (!lados.length) return { nx: 0, ny: 1 };
  lados.sort((a, b) => a.cuanto - b.cuanto);
  return lados[0];
}

/* ¿Una célula de radio r centrada en (x, y) queda lejos de todos los textos? */
export function lejosDeTextos(x: number, y: number, r: number, zonas: Rect[], extra = 0) {
  return zonas.every((z) => cercano(x, y, z).d > r + MARGEN_TEXTOS + extra);
}

export function elegirDestino(c: Celula, rumbo: Rumbo, mundo: Mundo) {
  const r = radioDe(c);
  const { azar } = mundo;
  rumbo.tramos++;
  rumbo.llamada = false;
  rumbo.aLaLupa = rumbo.tramos % DERIVA.cadaCuantosLaLupa === 0;
  if (rumbo.aLaLupa) {
    const a = azar() * Math.PI * 2;
    const dist = Math.sqrt(azar()) * DERIVA.radioLupa;
    rumbo.destinoX = mundo.lente.x + Math.cos(a) * dist;
    rumbo.destinoY = mundo.lente.y + Math.sin(a) * dist;
    return;
  }
  // entre varios lugares libres al azar, el más despejado
  const ocupados = mundo.ocupados ?? [];
  let mejor: { x: number; y: number; libre: number } | null = null;
  let validos = 0;
  for (let intento = 0; intento < 40 && validos < DERIVA.candidatos; intento++) {
    const x = r + azar() * (ESCENA.ancho - 2 * r);
    const y = r + azar() * (ESCENA.alto - 2 * r);
    if (!lejosDeTextos(x, y, r, mundo.zonas, DERIVA.alcanceTextos)) continue;
    validos++;
    let libre = Infinity;
    for (const o of ocupados) libre = Math.min(libre, Math.hypot(o.x - x, o.y - y));
    if (!mejor || libre > mejor.libre) mejor = { x, y, libre };
  }
  rumbo.destinoX = mejor ? mejor.x : mundo.lente.x;
  rumbo.destinoY = mejor ? mejor.y : mundo.lente.y;
}

export function nuevoRumbo(c: Celula, mundo: Mundo): Rumbo {
  const rumbo: Rumbo = {
    vx: 0,
    vy: 0,
    destinoX: c.x,
    destinoY: c.y,
    fase: mundo.azar() * Math.PI * 2,
    frecuencia: 0.12 + mundo.azar() * 0.22,
    quieta: 0,
    tramos: Math.floor(mundo.azar() * DERIVA.cadaCuantosLaLupa),
    aLaLupa: false,
    llamada: false,
  };
  elegirDestino(c, rumbo, mundo);
  return rumbo;
}

/*
  El turno de la lupa: manda hacia el vidrio a la célula que llegaría
  primero (entre las que no fueron llamadas ya). El destino queda cerca del
  centro, para que se vea entera; al llegar sigue de largo.
*/
function llamarALaLupa(celulas: Celula[], rumbos: Rumbo[], xs: number[], ys: number[], mundo: Mundo, fijas: boolean[]) {
  if (rumbos.filter((r) => r.llamada).length >= DERIVA.llamadasALaVez) return false;
  let elegida = -1;
  let antes = Infinity;
  for (let i = 0; i < celulas.length; i++) {
    if (fijas[i] || rumbos[i].llamada) continue;
    const tarda = Math.hypot(xs[i] - mundo.lente.x, ys[i] - mundo.lente.y) / velocidadDe(celulas[i]);
    if (tarda < antes) {
      antes = tarda;
      elegida = i;
    }
  }
  if (elegida < 0) return false;
  const rumbo = rumbos[elegida];
  const a = mundo.azar() * Math.PI * 2;
  const dist = Math.sqrt(mundo.azar()) * DERIVA.radioLupa;
  rumbo.destinoX = mundo.lente.x + Math.cos(a) * dist;
  rumbo.destinoY = mundo.lente.y + Math.sin(a) * dist;
  rumbo.llamada = true;
  rumbo.aLaLupa = true;
  rumbo.quieta = 0;
  return true;
}

/*
  Avanza todas las células un paso de dt segundos (t: segundos desde que
  arrancó). Escribe la nueva posición en el estado de cada célula (dx, dy):
  la única fuente que leen la célula de afuera y su copia ampliada.
  fijas: células que no se mueven (las pruebas las ponen a mano).
*/
export function avanzar(
  celulas: Celula[],
  estados: EstadoCelula[],
  rumbos: Rumbo[],
  dt: number,
  t: number,
  mundo: Mundo,
  fijas: boolean[] = [],
) {
  const n = celulas.length;
  const xs = celulas.map((c, i) => c.x + estados[i].dx);
  const ys = celulas.map((c, i) => c.y + estados[i].dy);
  // dónde están y adónde van todas: un destino nuevo busca lugar lejos de eso
  mundo.ocupados = [
    ...xs.map((x, i) => ({ x, y: ys[i] })),
    ...rumbos.map((r) => ({ x: r.destinoX, y: r.destinoY })),
  ];

  // ¿cuántas se ven por el vidrio? si ninguna, al rato llama a la más cercana
  const vista = mundo.vista ?? DERIVA.vistaLupa;
  let seVen = 0;
  for (let i = 0; i < n; i++) {
    if (Math.hypot(xs[i] - mundo.lente.x, ys[i] - mundo.lente.y) < vista + radioDe(celulas[i]) * 0.25) seVen++;
  }
  mundo.vacia = seVen ? 0 : (mundo.vacia ?? 0) + dt;
  mundo.desdeLlamada = (mundo.desdeLlamada ?? Infinity) + dt;
  const llamar = mundo.activa
    ? // con el mouse encima: va una detrás de otra (sin llenar el vidrio), y si se vacía, va otra
      (seVen < DERIVA.muchasEnLaLupa && !rumbos.some((r) => r.llamada) && mundo.desdeLlamada > DERIVA.intervaloActiva) ||
      mundo.vacia > DERIVA.esperaLupaActiva
    : mundo.vacia > DERIVA.esperaLupa;
  if (llamar && llamarALaLupa(celulas, rumbos, xs, ys, mundo, fijas)) {
    mundo.vacia = 0;
    mundo.desdeLlamada = 0;
  }

  for (let i = 0; i < n; i++) {
    if (fijas[i]) continue;
    const c = celulas[i];
    const rumbo = rumbos[i];
    const r = radioDe(c);
    let x = xs[i];
    let y = ys[i];
    let vmax = velocidadDe(c) * (rumbo.llamada ? DERIVA.apuro : 1);
    // con el mouse encima, debajo del vidrio van más despacio
    if (mundo.activa && Math.hypot(x - mundo.lente.x, y - mundo.lente.y) < vista + r) vmax *= DERIVA.lentoBajoLaLupa;

    // destino: al llegar (o si cruzó la lupa), elige otro
    const llegada = rumbo.aLaLupa ? DERIVA.llegadaLupa : DERIVA.llegada;
    if (Math.hypot(rumbo.destinoX - x, rumbo.destinoY - y) < llegada) elegirDestino(c, rumbo, mundo);

    // hacia el destino, con una ondulación lenta
    const angulo =
      Math.atan2(rumbo.destinoY - y, rumbo.destinoX - x) + DERIVA.ondulacion * Math.sin(rumbo.frecuencia * t + rumbo.fase);
    let ax = (Math.cos(angulo) * vmax - rumbo.vx) * DERIVA.agilidad;
    let ay = (Math.sin(angulo) * vmax - rumbo.vy) * DERIVA.agilidad;

    // se apartan de las otras (las de tamaños muy distintos se cruzan: una va más cerca que la otra)
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const ddx = x - xs[j];
      const ddy = y - ys[j];
      const dist = Math.hypot(ddx, ddy) || 0.001;
      // un poco de todas, para que se repartan (menos si va a la lupa: va a propósito)
      if (dist < DERIVA.espacio) {
        const f = DERIVA.fuerzaEspacio * (1 - dist / DERIVA.espacio) * (rumbo.aLaLupa ? 0.25 : 1);
        ax += (ddx / dist) * f;
        ay += (ddy / dist) * f;
      }
      const minima = (r + radioDe(celulas[j])) * DERIVA.separacion;
      if (dist >= minima) continue;
      const parecidas = Math.abs(c.d - celulas[j].d) < 50 ? 1 : 0.25;
      const f = DERIVA.fuerzaSeparacion * (1 - dist / minima) * parecidas;
      ax += (ddx / dist) * f;
      ay += (ddy / dist) * f;
    }

    // bordes de la pantalla: se puede asomar, pero no irse
    const min = r * (1 - DERIVA.asomar);
    const maxX = ESCENA.ancho - min;
    const maxY = ESCENA.alto - min;

    // esquivan los textos antes de llegar
    for (const z of mundo.zonas) {
      const { d } = cercano(x, y, z);
      const libre = d - r - MARGEN_TEXTOS;
      if (libre >= DERIVA.alcanceTextos) continue;
      const { nx, ny } = salida(x, y, z, r, min, maxX, maxY);
      const f = DERIVA.fuerzaTextos * Math.pow(1 - Math.max(libre, 0) / DERIVA.alcanceTextos, 2);
      ax += nx * f;
      ay += ny * f;
    }

    // cerca del borde, vuelve hacia adentro
    if (x < min + DERIVA.borde) ax += DERIVA.fuerzaBorde * (1 - (x - min) / DERIVA.borde);
    if (x > maxX - DERIVA.borde) ax -= DERIVA.fuerzaBorde * (1 - (maxX - x) / DERIVA.borde);
    if (y < min + DERIVA.borde) ay += DERIVA.fuerzaBorde * (1 - (y - min) / DERIVA.borde);
    if (y > maxY - DERIVA.borde) ay -= DERIVA.fuerzaBorde * (1 - (maxY - y) / DERIVA.borde);

    rumbo.vx += ax * dt;
    rumbo.vy += ay * dt;
    const v = Math.hypot(rumbo.vx, rumbo.vy);
    const tope = velocidadDe(c) * 1.6; // nunca más de 1,6 veces su velocidad (ni con apuro)
    if (v > tope) {
      rumbo.vx *= tope / v;
      rumbo.vy *= tope / v;
    }
    x += rumbo.vx * dt;
    y += rumbo.vy * dt;

    // si igual quedó encima de un texto (por ejemplo, la ventana se achicó), sale de a poco
    for (const z of mundo.zonas) {
      const { d } = cercano(x, y, z);
      // adentro del rectángulo, lo que falta es hasta el borde más el radio
      const sobra = r + MARGEN_TEXTOS - d;
      if (sobra <= 0) continue;
      const { nx, ny } = salida(x, y, z, r, min, maxX, maxY);
      const paso = Math.min(sobra, DERIVA.salida * dt);
      x += nx * paso;
      y += ny * paso;
      const haciaAdentro = rumbo.vx * nx + rumbo.vy * ny;
      if (haciaAdentro < 0) {
        rumbo.vx -= haciaAdentro * nx;
        rumbo.vy -= haciaAdentro * ny;
      }
    }

    // nunca más afuera de lo permitido
    x = Math.min(maxX, Math.max(min, x));
    y = Math.min(maxY, Math.max(min, y));

    // si casi no avanza (trabada contra un texto o entre otras), cambia de destino
    if (Math.hypot(rumbo.vx, rumbo.vy) < vmax * 0.25) {
      rumbo.quieta += dt;
      if (rumbo.quieta > DERIVA.atascada) {
        elegirDestino(c, rumbo, mundo);
        rumbo.quieta = 0;
      }
    } else rumbo.quieta = 0;

    xs[i] = x;
    ys[i] = y;
    estados[i].dx = x - c.x;
    estados[i].dy = y - c.y;
  }
}
