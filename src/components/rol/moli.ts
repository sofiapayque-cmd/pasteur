/*
  MOLI 3D · sus partes y sus poses (sin React, sin tocar la página)

  El modelo (public/models/moli.glb) viene de moli.blend, preparado con
  docs/moli/preparar_moli_web.py. Moli no tiene esqueleto: es un grupo de
  piezas rígidas, y cada pose solo gira piezas enteras (nunca se deforma la
  malla):

    MOLI (en el piso, entre los pies)
    ├─ Cuerpo (centro del oxígeno: respira desde acá)
    │   ├─ oxígeno, ojos, mejillas, sonrisa
    │   └─ Hombro izquierdo / derecho → hidrógeno (hacen de manos: giran
    │      alrededor del centro del oxígeno)
    └─ Cadera izquierda / derecha → piernita (giran desde la cadera)

  Ejes (glTF): Y hacia arriba, Z hacia la pantalla, X hacia la derecha.
  "izquierdo/derecho" son como los ve quien mira la pantalla (así se
  llaman en el archivo de Blender).
*/
import type { Object3D } from 'three';

export type PartesMoli = {
  raiz: Object3D;
  cuerpo: Object3D;
  hombroIzq: Object3D;
  hombroDer: Object3D;
  caderaIzq: Object3D;
  caderaDer: Object3D;
  ojoIzq: Object3D;
  ojoDer: Object3D;
};

const NOMBRES: Record<keyof PartesMoli, string> = {
  raiz: 'MOLI',
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
  Una pose, en grados:
  - giro: hacia dónde mira todo Moli (+ = hacia la derecha de la pantalla);
  - piernas: cuánto van las piernitas hacia adelante desde la cadera;
  - manoIzq / manoDer: cuánto sube cada hidrógeno por el costado;
  - manoAdelante: cuánto se adelanta la mano que sube (para que se vea como mano y no como oreja).
*/
export type Pose = {
  giro: number;
  piernas: number;
  manoIzq: number;
  manoDer: number;
  manoAdelante: number;
};

export const POSES = {
  /* sentada en el borde de «Soy maestra», mirando apenas hacia «Soy alumno»; las piernitas cuelgan un poco hacia adelante */
  sentada: { giro: 10, piernas: 8, manoIzq: 0, manoDer: 0, manoAdelante: 0 },
} satisfies Record<string, Pose>;

const rad = (g: number) => (g * Math.PI) / 180;

export function aplicarPose(p: PartesMoli, pose: Pose) {
  p.raiz.rotation.set(0, rad(pose.giro), 0);
  // piernas hacia adelante (+Z): giro negativo alrededor de X
  p.caderaIzq.rotation.set(rad(-pose.piernas), 0, 0);
  p.caderaDer.rotation.set(rad(-pose.piernas), 0, 0);
  // manos: suben por el costado (alrededor de Z) y después se adelantan (alrededor de X)
  p.hombroDer.rotation.set(rad(pose.manoDer ? pose.manoAdelante : 0), 0, rad(pose.manoDer));
  p.hombroIzq.rotation.set(rad(pose.manoIzq ? pose.manoAdelante : 0), 0, rad(-pose.manoIzq));
}
