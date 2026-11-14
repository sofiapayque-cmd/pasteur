'use client';

/*
  MOLI 3D · todo Moli en un solo archivo (React Three Fiber + GSAP)

  Un solo Moli, en un lienzo transparente encima de las placas. Se carga
  aparte, después de la página (EscenaRol lo pide con next/dynamic), así
  three.js no pesa en la carga de la pantalla.

  Secciones:
  1. Medidas: el modelo, su tamaño en la escena y el de las placas.
  2. Partes y estado: las piezas del modelo, todo lo que se mueve
     (EstadoMoli) y cómo se pasa al 3D (aplicarEstado).
  3. Coreografía (GSAP): reposo, saludo y salto. Cambia números del
     estado; no toca el 3D ni la página.
  4. Luz: la del archivo de Blender.
  5. Moli en la escena: el lienzo, dónde se ubica, la calidad y el control
     para saludar o saltar.

  - El lienzo cubre solo por donde Moli puede andar (rol.css).
  - Cámara ortográfica: 1 unidad del mundo = 1 píxel del lienzo. Así Moli se
    ubica midiendo las placas de verdad (getBoundingClientRect) y queda bien
    en compu, Ceibal y celular.
  - En cada cuadro de GSAP el estado pasa al 3D y se pide un dibujo
    (frameloop "demand"). En reposo, 30 cuadros por segundo.
  - Con "reducir movimiento" queda quieta (la página navega sin esperar).
  - Si no hay WebGL o el modelo no carga, no pasa nada: queda la imagen de
    respaldo (EscenaRol).
*/
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  AgXToneMapping,
  CircleGeometry,
  Color,
  DoubleSide,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  Vector3,
  type Group,
  type Object3D,
  type Scene as ThreeScene,
  type WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Rol } from './EscenaRol';

/* ───────────────────────── 1 · Medidas ───────────────────────── */

/*
  MOLI (modelo: public/models/moli.glb, preparado desde moli.blend con
  docs/moli/preparar_moli_web.py).

  - ESCALA: cuántas unidades de la escena vale una unidad de Blender
    (Moli mide 3,06 de ancho → unas 217 unidades, la mitad de la placa).
  - INCLINACION: Moli se inclina 7° hacia la pantalla, como la cámara del
    render de Blender, que la mira apenas desde arriba.
*/
const MOLI = {
  modelo: '/models/moli.glb',
  escala: 71,
  inclinacion: 7,
} as const;

/* Diámetro de cada placa, en unidades de la escena (el mismo de rol.css). */
const PLACA_D = 453;

/* ───────────────────── 2 · Partes y estado ───────────────────── */

/*
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

  Todo lo que se mueve está en un solo objeto, EstadoMoli: la coreografía
  (sección 3) cambia esos números y, en cada cuadro, aplicarEstado los pasa
  al 3D.
*/
type PartesMoli = {
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
function buscarPartes(escena: Object3D): PartesMoli {
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
const MUSLO = 0.4;
const PANTORRILLA = 0.44;
const PIES = 0.256;
const ASIENTO = 0.31;
const SENTADA = -(ASIENTO + PIES);

const rad = (g: number) => (g * Math.PI) / 180;

/*
  Cuánto baja el cuerpo si dobla las rodillas con los pies en el piso
  (muslo hacia adelante, pantorrilla hacia atrás). Para agacharse y
  amortiguar sin que los pies se hundan ni floten.
*/
const bajaAlDoblar = (piernas: number, rodillas: number) =>
  MUSLO + PANTORRILLA - (MUSLO * Math.cos(rad(piernas)) + PANTORRILLA * Math.cos(rad(rodillas - piernas)));

/*
  Todo lo que se mueve. Distancias en unidades del modelo, salvo x e y
  (píxeles del lienzo, desde arriba a la izquierda: dónde están los pies);
  ángulos en grados.
*/
type EstadoMoli = {
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
const PIERNAS_SENTADA = { piernas: 35, apertura: 58, rodillas: 35, cierre: 58 } as const;
/* Paradas: derechas. */
const PIERNAS_PARADA = { piernas: 0, apertura: 0, rodillas: 0, cierre: 0 } as const;

const estadoSentada = (x = 0, y = 0): EstadoMoli => ({
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
  La posición en pantalla (x, y) la pone quien dibuja (sección 5).
*/
function aplicarEstado(movil: Object3D, p: PartesMoli, m: EstadoMoli) {
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

/* ──────────────────────── 3 · Coreografía ─────────────────────── */

/*
  Tres momentos:
  - reposo: sentada en «Soy maestra» con las rodillas dobladas, respira,
    balancea las pantorrillas, parpadea y se ladea apenas;
  - saludo («Soy maestra»): sigue sentada, mira, levanta un hidrógeno y
    saluda;
  - salto («Soy alumno»): se para estirando las piernas, toma envión
    doblando las rodillas, salta en arco con las piernas recogidas,
    aterriza amortiguando con las rodillas (y un rebote elástico) y saluda.
  Se estira y se aplasta poco (pedido de Sofia: "un poco, sin exagerar"):
  como mucho un 6 %, siempre desde los pies y sin cambiar el volumen. El
  resto lo hacen las rodillas, como cuando uno salta.
*/
const azar = (min: number, max: number) => min + Math.random() * (max - min);

/* Cuánto se estira o se aplasta en cada momento (1 = normal). */
const ESTIRA = {
  enviones: 0.96, // se agacha antes de saltar
  despegue: 1.05, // se estira al despegar
  aterrizaje: 0.94, // se aplasta al tocar la placa
} as const;

/* Rodillas dobladas para tomar envión y para amortiguar al caer (los pies quedan en la placa). */
const AGACHADA = { piernas: 28, apertura: 6, rodillas: 58, cierre: 6 };
const AMORTIGUA = { piernas: 32, apertura: 8, rodillas: 64, cierre: 8 };
/* En el aire: rodillas arriba y pies atrás. */
const RECOGIDA = { piernas: 55, apertura: 10, rodillas: 100, cierre: 10 };

/* Reposo. Devuelve cómo detenerlo. */
function reposo(m: EstadoMoli) {
  let vivo = true;
  const animaciones: gsap.core.Animation[] = [
    // respira (el sistema de diseño: de 1 a 1,03 en 4–6 s)
    gsap.to(m, { respira: 1.025, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    // se ladea apenas
    gsap.to(m, { inclina: 1.4, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.8 }),
    // balancea las pantorrillas desde las rodillas: una adelante y la otra atrás
    gsap
      .timeline({ repeat: -1, delay: 0.4 })
      .to(m, { vaiven: 22, duration: 0.8, ease: 'sine.inOut' })
      .to(m, { vaiven: -22, duration: 1.6, ease: 'sine.inOut' })
      .to(m, { vaiven: 0, duration: 0.8, ease: 'sine.inOut' })
      .to({}, { duration: azar(0.6, 1.4) }), // a veces descansa
  ];
  // parpadea cada tanto (a veces dos veces seguidas)
  let parpadeo: gsap.core.Timeline | null = null;
  const parpadear = () => {
    if (!vivo) return;
    parpadeo = gsap.timeline({ delay: azar(2.2, 5), onComplete: parpadear });
    parpadeo.to(m, { parpado: 0.1, duration: 0.07, ease: 'power1.in' }).to(m, { parpado: 1, duration: 0.12, ease: 'power1.out' });
    if (Math.random() < 0.25) parpadeo.to(m, { parpado: 0.1, duration: 0.07, delay: 0.08 }).to(m, { parpado: 1, duration: 0.12 });
  };
  parpadear();
  return () => {
    vivo = false;
    animaciones.forEach((a) => a.kill());
    parpadeo?.kill();
    gsap.to(m, { parpado: 1, duration: 0.1 });
  };
}

/* «Soy maestra»: sigue sentada, mira a quien la eligió y saluda. */
function saludo(m: EstadoMoli) {
  return gsap
    .timeline()
    .to(m, { giro: 0, mirarX: 0, mirarY: 2, inclina: 0, vaiven: 0, ...PIERNAS_SENTADA, duration: 0.35, ease: 'power2.out' })
    .to(m, { manoDer: 84, manoAdelante: 26, duration: 0.42, ease: 'back.out(1.7)' }, 0.1)
    .to(m, { estira: 1.03, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.12)
    .to(m, { ola: 14, duration: 0.16, ease: 'sine.out' }, 0.5)
    .to(m, { ola: -12, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 4 }, '>')
    .to(m, { ola: 0, duration: 0.15, ease: 'sine.out' }, '>');
}

type Destino = {
  /** los pies en la placa de destino (píxeles del lienzo) */
  x: number;
  y: number;
  /** cuánto sube el arco, en píxeles */
  altura: number;
};

/*
  «Soy alumno»: de una placa a la otra, siempre a la vista.
  alDespegar / alLlegar: para que la página acompañe (sombras, la placa que
  responde).
*/
function salto(m: EstadoMoli, destino: Destino, alDespegar: () => void, alLlegar: () => void) {
  const desde = { x: m.x, y: m.y };
  const arco = { t: 0 };
  const hacia = Math.sign(destino.x - desde.x) || 1; // +1: salta hacia la derecha
  const vuelo = 0.62;
  return (
    gsap
      .timeline()
      // 1 · se para: estira las piernas debajo del cuerpo y mira hacia donde va
      .to(m, { alto: 0, ...PIERNAS_PARADA, vaiven: 0, giro: 18 * hacia, mirarX: 0, mirarY: 0, inclina: 0, manoIzq: 10, manoDer: 10, duration: 0.45, ease: 'power2.inOut' })
      // 2 · toma envión: dobla las rodillas (el cuerpo baja, los pies quedan) y se aplasta apenas
      .to(m, { ...AGACHADA, alto: -bajaAlDoblar(AGACHADA.piernas, AGACHADA.rodillas), estira: ESTIRA.enviones, manoIzq: -6, manoDer: -6, duration: 0.22, ease: 'power2.out' })
      // 3 · despega y vuela en arco (el arco es un solo movimiento: x pareja, y en parábola)
      .addLabel('despegue')
      .call(alDespegar, [], 'despegue')
      // se impulsa: estira las piernas de golpe…
      .to(m, { ...PIERNAS_PARADA, alto: 0, estira: ESTIRA.despegue, duration: 0.12, ease: 'power2.out' }, 'despegue')
      .to(m, { estira: 1, duration: 0.35, ease: 'sine.inOut' }, 'despegue+=0.12')
      // …y en el aire las recoge
      .to(m, { ...RECOGIDA, duration: 0.24, ease: 'power2.out' }, 'despegue+=0.1')
      .to(m, { manoIzq: 48, manoDer: 48, duration: 0.25, ease: 'power2.out' }, 'despegue')
      .to(m, { inclina: -9 * hacia, duration: 0.25, ease: 'power2.out' }, 'despegue')
      .to(m, { inclina: 4 * hacia, duration: 0.35, ease: 'sine.inOut' }, 'despegue+=0.25')
      .to(
        arco,
        {
          t: 1,
          duration: vuelo,
          ease: 'none',
          onUpdate: () => {
            const t = arco.t;
            m.x = desde.x + (destino.x - desde.x) * t;
            m.y = desde.y + (destino.y - desde.y) * t - destino.altura * 4 * t * (1 - t);
          },
        },
        'despegue',
      )
      // antes de tocar, estira las piernas para recibir el piso
      .to(m, { ...PIERNAS_PARADA, piernas: 8, rodillas: 14, manoIzq: 22, manoDer: 22, duration: 0.2, ease: 'power1.inOut' }, `despegue+=${vuelo - 0.2}`)
      // 4 · aterriza: amortigua con las rodillas y vuelve con un rebote elástico
      .addLabel('aterrizaje', `despegue+=${vuelo}`)
      .call(alLlegar, [], 'aterrizaje')
      .to(
        m,
        { ...AMORTIGUA, alto: -bajaAlDoblar(AMORTIGUA.piernas, AMORTIGUA.rodillas), estira: ESTIRA.aterrizaje, inclina: 0, duration: 0.1, ease: 'power2.out' },
        'aterrizaje',
      )
      .to(m, { ...PIERNAS_PARADA, alto: 0, estira: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, 'aterrizaje+=0.1')
      .to(m, { manoIzq: 0, manoDer: 0, giro: -6 * hacia, duration: 0.35, ease: 'power2.out' }, 'aterrizaje+=0.1')
      // 5 · saluda (con la mano del lado de donde vino)
      .to(m, { ...(hacia > 0 ? { manoIzq: 84 } : { manoDer: 84 }), manoAdelante: 26, duration: 0.4, ease: 'back.out(1.7)' }, 'aterrizaje+=0.35')
      .to(m, { ola: 14, duration: 0.16, ease: 'sine.out' }, 'aterrizaje+=0.65')
      .to(m, { ola: -12, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 2 }, '>')
  );
}

/* ─────────────────────────── 4 · Luz ─────────────────────────── */

/*
  LUZ: la misma del archivo de Blender, no una parecida.
  moli.blend ilumina a Moli con dos luces de área en forma de disco y un
  fondo gris muy oscuro. Acá se arma esa misma "habitación" (los dos discos
  brillando, del tamaño y a la distancia del archivo, sobre ese gris) y se la
  usa como entorno: da la luz suave de las luces de área y sus brillos en
  los ojos. Todo en coordenadas de Blender (Z arriba); se pasan a glTF
  (x, z, −y) y se inclinan los mismos 7° que Moli.
*/
const LUZ = {
  areas: [
    { nombre: 'Luz principal', pos: [-3, -4, 6], diametro: 5, potencia: 650 },
    { nombre: 'Luz de relleno', pos: [3, -2, 3], diametro: 4, potencia: 310 },
  ],
  /* adonde apuntan las dos luces en el archivo */
  objetivo: [0, 0, 1.4],
  /* gris del fondo (World) del archivo */
  mundo: 0.05,
  /* de vatios de Blender a brillo del entorno, y exposición: igualados contra el render de Cycles */
  intensidad: 1,
  exposicion: 1,
};

function aGltf([x, y, z]: number[]) {
  return new Vector3(x, z, -y).applyAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(MOLI.inclinacion));
}

function armarEntorno() {
  const escena = new Scene();
  escena.background = new Color(LUZ.mundo, LUZ.mundo, LUZ.mundo);
  const objetivo = aGltf(LUZ.objetivo);
  for (const a of LUZ.areas) {
    const radio = a.diametro / 2;
    // un disco que emite parejo: radiancia = potencia / (área · π)
    const radiancia = a.potencia / (Math.PI * radio * radio) / Math.PI;
    const disco = new Mesh(new CircleGeometry(radio, 48), new MeshBasicMaterial({ color: new Color(radiancia, radiancia, radiancia), side: DoubleSide }));
    disco.position.copy(aGltf(a.pos).sub(objetivo));
    disco.lookAt(0, 0, 0);
    escena.add(disco);
  }
  return escena;
}

/* Prepara la luz y el tono en el lienzo recién creado. Devuelve cómo desarmarla. */
function prepararLuz(gl: WebGLRenderer, scene: ThreeScene, invalidate: () => void) {
  gl.toneMapping = AgXToneMapping;
  gl.toneMappingExposure = LUZ.exposicion;
  const generador = new PMREMGenerator(gl);
  const habitacion = armarEntorno();
  const entorno = generador.fromScene(habitacion, 0, 0.1, 100);
  scene.environment = entorno.texture;
  scene.environmentIntensity = LUZ.intensidad;
  if (process.env.NODE_ENV === 'development') {
    // solo en desarrollo: para igualar la luz con el render de Blender desde el navegador
    (window as unknown as { __moliLuz: unknown }).__moliLuz = {
      LUZ,
      aplicar() {
        scene.environmentIntensity = LUZ.intensidad;
        gl.toneMappingExposure = LUZ.exposicion;
        invalidate();
      },
    };
  }
  return () => {
    scene.environment = null;
    entorno.dispose();
    generador.dispose();
    habitacion.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (o.material as MeshBasicMaterial).dispose();
      }
    });
  };
}

/* ───────────────────── 5 · Moli en la escena ───────────────────── */

export type ControlMoli = {
  /** «Soy maestra»: saluda sentada. Se resuelve cuando terminó. */
  saludar: () => Promise<void>;
  /** «Soy alumno»: salta hasta esa placa. Se resuelve cuando terminó de saludar. */
  saltar: (hacia: Rol, alDespegar: () => void, alLlegar: () => void) => Promise<void>;
};

type Props = {
  /** la escena (.rol-moli__escena): de ahí se miden las placas */
  escena: HTMLElement;
  /** se llama cuando Moli ya se ve en 3D (para esconder la imagen de respaldo) */
  onListo: () => void;
  /** entrega cómo pedirle a Moli que salude o salte (null si se desarmó) */
  onControl: (control: ControlMoli | null) => void;
  /** se llama si la compu no llega a dibujar fluido (para bajar la calidad) */
  onLento?: () => void;
};

/*
  Calidad: "alta" con antialiasing (bordes suaves) y hasta ×1,5 de
  resolución; "media" sin antialiasing y a ×1 (en una compu lenta es lo que
  más pesa). Si en "media" tampoco anda fluido, la página deja la imagen.
*/
export type Calidad = 'alta' | 'media';

/*
  En reposo se mide cuánto tarda cada cuadro, en promedio: si es más que esto
  (menos de 25 cuadros por segundo), es lento. El promedio y no la mitad:
  cuando cuesta dibujar, la mayoría de los cuadros son rápidos y algunos muy
  largos (son los que se notan).
*/
const CUADRO_LENTO_MS = 40;

/* El arco del salto sube como mucho esto (unidades de la escena): así no pasa por encima del título. */
const ALTURA_SALTO = 130;

function Moli({ escena, onListo, onControl, onLento }: Props) {
  const gltf = useLoader(GLTFLoader, MOLI.modelo);
  const partes = useMemo(() => buscarPartes(gltf.scene), [gltf]);
  const lugar = useRef<Group>(null);
  const movil = useRef<Group>(null);
  const estado = useRef<EstadoMoli>(estadoSentada());
  const medidas = useRef({ ancho: 0, alto: 0, escala: 1, u: 1 });
  const { invalidate, size, gl } = useThree();

  useLayoutEffect(() => {
    const lienzo = gl.domElement;
    const m = estado.current;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let placa: Rol = 'maestra'; // dónde está Moli
    let accion = false; // saludando o saltando: se dibuja cada cuadro y no sigue al puntero
    let cuadros = 0;

    /* el borde de arriba de una placa, en píxeles del lienzo */
    const apice = (rol: Rol) => {
      const c = lienzo.getBoundingClientRect();
      const p = escena.querySelector<HTMLElement>(`[data-placa="${rol}"]`)!.getBoundingClientRect();
      return { x: p.left + p.width / 2 - c.left, y: p.top - c.top, u: p.width / PLACA_D };
    };

    function pintar() {
      const g = lugar.current;
      const mv = movil.current;
      if (!g || !mv) return;
      const { ancho, alto, escala } = medidas.current;
      g.position.set(m.x - ancho / 2, alto / 2 - m.y, 0);
      g.scale.setScalar(escala);
      aplicarEstado(mv, partes, m);
      invalidate();
    }

    /* tamaños y lugar (si cambia la ventana) */
    function ubicar() {
      const c = lienzo.getBoundingClientRect();
      const a = apice(placa);
      medidas.current = { ancho: c.width, alto: c.height, escala: MOLI.escala * a.u, u: a.u };
      if (!accion) {
        m.x = a.x;
        m.y = a.y;
      }
      pintar();
    }
    ubicar();
    const observador = new ResizeObserver(ubicar);
    observador.observe(escena);

    /* en cada cuadro de GSAP; en reposo alcanza con 30 por segundo (la Ceibal lo agradece) */
    /* ¿anda fluido? se mide en reposo, en 45 cuadros después de los primeros 20 (que compilan) */
    const tiempos: number[] = [];
    let anterior = 0;
    function medirFluidez() {
      const ahora = performance.now();
      if (anterior && !accion && cuadros > 20 && tiempos.length < 45) {
        tiempos.push(ahora - anterior);
        if (tiempos.length === 45) {
          const promedio = tiempos.reduce((suma, t) => suma + t, 0) / tiempos.length;
          if (process.env.NODE_ENV === 'development') console.info('[moli] cuadro promedio', promedio.toFixed(1), 'ms');
          // solo en desarrollo, para grabar videos con la calidad alta en una compu sin placa de video: localStorage.moliCalidad = 'alta'
          const fija = process.env.NODE_ENV === 'development' && window.localStorage.getItem('moliCalidad') === 'alta';
          if (promedio > CUADRO_LENTO_MS && !fija) onLento?.();
        }
      }
      anterior = ahora;
    }

    function cuadro() {
      cuadros++;
      medirFluidez();
      if (accion || cuadros % 2 === 0) pintar();
    }

    /* la mirada: el cuerpo gira apenas hacia el puntero */
    const mirarX = gsap.quickTo(m, 'mirarX', { duration: 0.9, ease: 'power3.out' });
    const mirarY = gsap.quickTo(m, 'mirarY', { duration: 0.9, ease: 'power3.out' });
    function alMover(ev: PointerEvent) {
      if (accion) return;
      const c = lienzo.getBoundingClientRect();
      const cabeza = c.top + m.y - 2.1 * medidas.current.escala;
      const dx = (ev.clientX - (c.left + m.x)) / window.innerWidth;
      const dy = (cabeza - ev.clientY) / window.innerHeight;
      mirarX(Math.max(-12, Math.min(12, dx * 32)));
      mirarY(Math.max(-5, Math.min(7, dy * 20)));
    }

    let detenerReposo = () => {};
    if (!reducido) {
      detenerReposo = reposo(m);
      gsap.ticker.add(cuadro);
      window.addEventListener('pointermove', alMover, { passive: true });
    }

    if (process.env.NODE_ENV === 'development') {
      // solo en desarrollo: para revisar poses desde el navegador
      (window as unknown as { __moli: unknown }).__moli = {
        estado: m,
        quieta() {
          detenerReposo();
          gsap.killTweensOf(m);
          Object.assign(m, estadoSentada(m.x, m.y));
          pintar();
        },
      };
    }

    const terminar = (linea: gsap.core.Timeline) => new Promise<void>((listo) => linea.eventCallback('onComplete', () => listo()));

    onControl({
      saludar() {
        accion = true;
        detenerReposo();
        return terminar(saludo(m));
      },
      saltar(hacia, alDespegar, alLlegar) {
        accion = true;
        detenerReposo();
        const a = apice(hacia);
        const distancia = Math.hypot(a.x - m.x, a.y - m.y);
        const altura = Math.min(distancia * 0.25, ALTURA_SALTO * a.u);
        placa = hacia;
        return terminar(salto(m, { x: a.x, y: a.y, altura }, alDespegar, alLlegar));
      },
    });

    // avisa cuando ya se dibujó
    let aviso = requestAnimationFrame(() => {
      aviso = requestAnimationFrame(onListo);
    });

    return () => {
      cancelAnimationFrame(aviso);
      onControl(null);
      detenerReposo();
      gsap.ticker.remove(cuadro);
      gsap.killTweensOf(m);
      window.removeEventListener('pointermove', alMover);
      observador.disconnect();
    };
  }, [escena, gl, partes, invalidate, onListo, onControl, onLento]);

  // si cambia el tamaño del lienzo, se vuelve a medir (lo hace el observador; esto solo redibuja)
  useEffect(() => invalidate(), [size, invalidate]);

  return (
    <group ref={lugar}>
      {/* se inclina hacia la pantalla, como la cámara del render de Blender */}
      <group rotation-x={MathUtils.degToRad(MOLI.inclinacion)}>
        {/* todo Moli: sube, gira, se ladea y se estira desde los pies */}
        <group ref={movil}>
          {/* los pies quedan en el punto de apoyo */}
          <primitive object={gltf.scene} position-y={PIES} />
        </group>
      </group>
    </group>
  );
}

/* Si algo falla (WebGL, el modelo), no se muestra nada: queda la imagen de respaldo. */
class SinMoli3d extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

export default function Moli3d({ calidad = 'alta', ...props }: Props & { calidad?: Calidad }) {
  const desarmarLuz = useRef<(() => void) | null>(null);
  useEffect(() => () => desarmarLuz.current?.(), []);
  return (
    <SinMoli3d>
      <Canvas
        className="rol-moli__lienzo"
        // R3F le pone estilos en línea al contenedor: el lugar y el tamaño los da rol.css, y los clics pasan a las placas de abajo
        style={{ position: 'absolute', width: undefined, height: undefined, pointerEvents: 'none' }}
        orthographic
        frameloop="demand"
        dpr={calidad === 'alta' ? [1, 1.5] : 1}
        camera={{ position: [0, 0, 1000], near: 1, far: 4000, zoom: 1 }}
        gl={{ alpha: true, antialias: calidad === 'alta', powerPreference: 'default' }}
        onCreated={({ gl, scene, invalidate }) => {
          desarmarLuz.current = prepararLuz(gl, scene, invalidate);
        }}
        fallback={null}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <Moli {...props} />
        </Suspense>
      </Canvas>
    </SinMoli3d>
  );
}
