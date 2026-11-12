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
    └─ Cadera izquierda / derecha → piernita (giran desde la cadera)

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
  ojoIzq: Object3D;
  ojoDer: Object3D;
};

const NOMBRES: Record<keyof PartesMoli, string> = {
  cuerpo: 'MOLI | Cuerpo',
  hombroIzq: 'MOLI | Hombro izquierdo',
  hombroDer: 'MOLI | Hombro derecho',
  caderaIzq: 'MOLI | Cadera izquierda',
  caderaDer: 'MOLI | Cadera derecha',
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
  - PIES: cuánto bajan las piernitas debajo del piso (cadera a 0,62, pierna
    de 0,80 y el grosor del trazo). Moli se apoya y se aplasta desde los pies.
  - ASIENTO: la base del oxígeno (0,31): sentada, ese punto va en el borde.
  - SENTADA: cuánto más abajo queda todo cuando está sentada (asiento en el
    borde y las piernitas colgando por delante de la placa).
*/
export const PIES = 0.216;
export const ASIENTO = 0.31;
export const SENTADA = -(ASIENTO + PIES);

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
  /** piernitas hacia adelante (+) o atrás (−), y el balanceo (una adelante, otra atrás) */
  piernas: number;
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

export const estadoSentada = (x = 0, y = 0): EstadoMoli => ({
  x,
  y,
  alto: SENTADA,
  // igual que la imagen de respaldo, para que el cambio a 3D no se note
  giro: 10,
  inclina: 0,
  estira: 1,
  respira: 1,
  piernas: 8,
  vaiven: 0,
  manoIzq: 0,
  manoDer: 0,
  manoAdelante: 0,
  ola: 0,
  parpado: 1,
  mirarX: 0,
  mirarY: 0,
});

const rad = (g: number) => (g * Math.PI) / 180;

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

  // piernas hacia adelante (+Z): giro negativo alrededor de X
  p.caderaIzq.rotation.set(rad(-(m.piernas + m.vaiven)), 0, 0);
  p.caderaDer.rotation.set(rad(-(m.piernas - m.vaiven)), 0, 0);

  // manos: suben por el costado (alrededor de Z) y se adelantan (alrededor de X); la que saluda suma la ola
  const olaIzq = m.manoIzq > 40 ? m.ola : 0;
  const olaDer = m.manoDer > 40 ? m.ola : 0;
  const adelante = (mano: number) => rad((m.manoAdelante * Math.max(0, Math.min(mano, 60))) / 60);
  p.hombroDer.rotation.set(adelante(m.manoDer), 0, rad(m.manoDer + olaDer));
  p.hombroIzq.rotation.set(adelante(m.manoIzq), 0, rad(-(m.manoIzq + olaIzq)));

  p.ojoIzq.scale.y = m.parpado;
  p.ojoDer.scale.y = m.parpado;
}
