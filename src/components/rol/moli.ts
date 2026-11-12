/*
  MOLI 3D · sus partes y su estado (sin React, sin tocar la página)

  El modelo (public/models/moli.glb) viene de moli.blend, preparado con
  docs/moli/preparar_moli_web.py. Moli no tiene esqueleto: es un grupo de
  piezas rígidas. Moverla es girar o correr piezas enteras; nunca se
  deforma la malla:

    MOLI (en el piso, entre los pies)
    ├─ Cuerpo (centro del oxígeno: respira y mira desde acá)
    │   ├─ oxígeno, ojos (parpadean), mejillas, sonrisa
    │   └─ Hombro izquierdo / derecho → hidrógeno (hacen de manos: giran
    │      alrededor del centro del oxígeno)
    └─ Cadera izquierda / derecha → muslo
        └─ Rodilla → articulación y pantorrilla con el pie

  Ejes (glTF): Y hacia arriba, Z hacia la pantalla, X hacia la derecha.
  "izquierdo/derecho" son como los ve quien mira la pantalla (así se
  llaman en el archivo de Blender).

  Todo lo que se mueve está en un solo objeto, EstadoMoli: GSAP cambia esos
  números (coreografia.ts) y, en cada cuadro, aplicarEstado los pasa al 3D.
*/
import type { Object3D } from 'three';

export type PartesMoli = {
  cuerpo: Object3D;
  hombroIzq: Object3D;
  hombroDer: Object3D;
  caderaIzq: Object3D;
  caderaDer: Object3D;
  rodillaIzq: Object3D;
  rodillaDer: Object3D;
  ojoIzq: Object3D;
  ojoDer: Object3D;
};

const NOMBRES: Record<keyof PartesMoli, string> = {
  cuerpo: 'MOLI | Cuerpo',
  hombroIzq: 'MOLI | Hombro izquierdo',
  hombroDer: 'MOLI | Hombro derecho',
  caderaIzq: 'MOLI | Cadera izquierda',
  caderaDer: 'MOLI | Cadera derecha',
  rodillaIzq: 'MOLI | Rodilla izquierda',
  rodillaDer: 'MOLI | Rodilla derecha',
  ojoIzq: 'MOLI | Ojo izquierdo',
  ojoDer: 'MOLI | Ojo derecho',
};

/* Busca cada parte por el nombre que tiene en Blender (el cargador de glTF lo guarda en userData.name). */
export function buscarPartes(escena: Object3D): PartesMoli {
  const porNombre = new Map<string, Object3D>();
  escena.traverse((o) => porNombre.set((o.userData?.name as string | undefined) ?? o.name, o));
  const partes = {} as PartesMoli;
  for (const [clave, nombre] of Object.entries(NOMBRES) as [keyof PartesMoli, string][]) {
    const o = porNombre.get(nombre);
    if (!o) throw new Error(`Al modelo de Moli le falta "${nombre}"`);
    partes[clave] = o;
  }
  return partes;
}

/*
  Medidas del modelo (unidades de Blender, desde el piso del modelo):
  - PIES: cuánto bajan las piernitas estiradas debajo del piso (cadera a
    0,62, muslo de 0,40, pantorrilla y pie de 0,44 y el grosor del trazo).
    Moli se apoya y se aplasta desde los pies.
  - ASIENTO: la base del oxígeno (0,31): sentada, ese punto va en el borde.
  - SENTADA: cuánto más abajo queda todo cuando está sentada (asiento en el
    borde y las piernitas colgando por delante de la placa).
*/
export const MUSLO = 0.4;
export const PANTORRILLA = 0.44;
export const PIES = 0.256;
export const ASIENTO = 0.31;
export const SENTADA = -(ASIENTO + PIES);

const rad = (g: number) => (g * Math.PI) / 180;

/*
  Cuánto baja el cuerpo si dobla las rodillas con los pies en el piso
  (muslo hacia adelante, pantorrilla hacia atrás). Para agacharse y
  amortiguar sin que los pies se hundan ni floten.
*/
export const bajaAlDoblar = (piernas: number, rodillas: number) =>
  MUSLO + PANTORRILLA - (MUSLO * Math.cos(rad(piernas)) + PANTORRILLA * Math.cos(rad(rodillas - piernas)));

/*
  Todo lo que se mueve. Distancias en unidades del modelo, salvo x e y
  (píxeles del lienzo, desde arriba a la izquierda: dónde están los pies);
  ángulos en grados.
*/
export type EstadoMoli = {
  /** dónde se apoya (los pies), en píxeles del lienzo */
  x: number;
  y: number;
  /** cuánto sube (+) o baja (−) desde ahí; sentada: SENTADA */
  alto: number;
  /** hacia dónde mira todo Moli (+ = hacia la derecha de la pantalla) */
  giro: number;
  /** cuánto se ladea (+ = la cabeza hacia la izquierda) */
  inclina: number;
  /** estirarse (> 1) o aplastarse (< 1) desde los pies, sin cambiar el volumen */
  estira: number;
  /** respiración: tamaño del cuerpo */
  respira: number;
  /**
   * Piernitas:
   * - piernas: el muslo hacia adelante (+) o atrás (−), desde la cadera;
   * - apertura: el muslo hacia afuera (rodillas separadas);
   * - rodillas: cuánto se dobla cada rodilla (la pantorrilla va hacia atrás);
   * - cierre: la pantorrilla vuelve hacia adentro (con las rodillas separadas, para que cuelgue derecha);
   * - vaiven: el balanceo de las pantorrillas (una adelante y la otra atrás).
   */
  piernas: number;
  apertura: number;
  rodillas: number;
  cierre: number;
  vaiven: number;
  /** cuánto sube cada mano (hidrógeno) por el costado, y cuánto se adelanta la que sube */
  manoIzq: number;
  manoDer: number;
  manoAdelante: number;
  /** el ir y venir del saludo (se suma a la mano que saluda) */
  ola: number;
  /** 1 = ojos abiertos; 0,1 = cerrados */
  parpado: number;
  /** la mirada: el cuerpo gira apenas hacia el puntero */
  mirarX: number;
  mirarY: number;
};

/*
  Sentada en el borde: las rodillas hacia afuera y un poco hacia adelante, y
  las pantorrillas colgando derechas por delante de la placa (pedido de
  Sofia: "sentada debería tener las piernas dobladas").
*/
export const PIERNAS_SENTADA = { piernas: 35, apertura: 58, rodillas: 35, cierre: 58 } as const;
/* Paradas: derechas. */
export const PIERNAS_PARADA = { piernas: 0, apertura: 0, rodillas: 0, cierre: 0 } as const;

export const estadoSentada = (x = 0, y = 0): EstadoMoli => ({
  x,
  y,
  alto: SENTADA,
  // casi de frente (se ven las dos rodillas); igual que la imagen de respaldo, para que el cambio a 3D no se note
  giro: 3,
  inclina: 0,
  estira: 1,
  respira: 1,
  ...PIERNAS_SENTADA,
  vaiven: 0,
  manoIzq: 0,
  manoDer: 0,
  manoAdelante: 0,
  ola: 0,
  parpado: 1,
  mirarX: 0,
  mirarY: 0,
});

/*
  Pasa el estado al 3D.
  - movil: el grupo que lleva a todo Moli (sube, gira, se ladea, se estira
    desde los pies).
  - Las partes: respirar y mirar (cuerpo), piernas, manos y párpados.
  La posición en pantalla (x, y) la pone quien dibuja (MoliEnEscena).
*/
export function aplicarEstado(movil: Object3D, p: PartesMoli, m: EstadoMoli) {
  movil.position.y = m.alto;
  movil.rotation.set(0, rad(m.giro + m.mirarX), rad(m.inclina));
  const ancho = 1 / Math.sqrt(m.estira);
  movil.scale.set(ancho, m.estira, ancho);

  p.cuerpo.scale.setScalar(m.respira);
  p.cuerpo.rotation.x = rad(-m.mirarY);

  /*
    Piernas. Como en Blender: primero hacia adelante (+Z: giro negativo
    alrededor de X) y después hacia afuera (alrededor de Z), por eso el orden
    "ZYX". En la rodilla, igual: se dobla hacia atrás y se cierra hacia adentro.
  */
  for (const [cadera, rodilla, lado] of [
    [p.caderaIzq, p.rodillaIzq, -1],
    [p.caderaDer, p.rodillaDer, 1],
  ] as const) {
    cadera.rotation.order = 'ZYX';
    cadera.rotation.set(rad(-m.piernas), 0, rad(lado * m.apertura));
    rodilla.rotation.order = 'ZYX';
    rodilla.rotation.set(rad(m.rodillas + lado * m.vaiven), 0, rad(-lado * m.cierre));
  }

  // manos: suben por el costado (alrededor de Z) y se adelantan (alrededor de X); la que saluda suma la ola
  const olaIzq = m.manoIzq > 40 ? m.ola : 0;
  const olaDer = m.manoDer > 40 ? m.ola : 0;
  const adelante = (mano: number) => rad((m.manoAdelante * Math.max(0, Math.min(mano, 60))) / 60);
  p.hombroDer.rotation.set(adelante(m.manoDer), 0, rad(m.manoDer + olaDer));
  p.hombroIzq.rotation.set(adelante(m.manoIzq), 0, rad(-(m.manoIzq + olaIzq)));

  p.ojoIzq.scale.y = m.parpado;
  p.ojoDer.scale.y = m.parpado;
}
