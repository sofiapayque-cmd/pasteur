'use client';

/*
  MOLI 3D (React Three Fiber). Un solo Moli, en un lienzo transparente que
  cubre la escena, encima de las placas.

  - El lienzo cubre solo por donde Moli puede andar (rol.css).
  - Cámara ortográfica: 1 unidad del mundo = 1 píxel del lienzo. Así Moli se
    ubica midiendo las placas de verdad (getBoundingClientRect) y queda bien
    en compu, Ceibal y celular.
  - Luz: la del archivo de Blender (ver LUZ) y el mismo tono (AgX). Los
    materiales son los del archivo, sin cambios.
  - Se mueve con GSAP (coreografia.ts) sobre un solo estado (moli.ts); en
    cada cuadro de GSAP ese estado pasa al 3D y se pide un dibujo
    (frameloop "demand"). En reposo, 30 cuadros por segundo.
  - Con "reducir movimiento" queda quieta (la página navega sin esperar).
  - Si no hay WebGL o el modelo no carga, no pasa nada: queda la imagen de
    respaldo (EscenaRol).
*/
import { Canvas, useLoader, useThree } from '@react-three/fiber';
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
  type Scene as ThreeScene,
  type WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { reposo, saludo, salto } from './coreografia';
import { MOLI, PLACA_D, type Rol } from './escenaRol';
import { PIES, aplicarEstado, buscarPartes, estadoSentada, type EstadoMoli } from './moli';

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

export default function MoliEnEscena({ calidad = 'alta', ...props }: Props & { calidad?: Calidad }) {
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
