'use client';

/*
  MOLI 3D (React Three Fiber). Un solo Moli, en un lienzo transparente que
  cubre la escena, encima de las placas.

  - Cámara ortográfica: 1 unidad del mundo = 1 píxel del lienzo. Así Moli se
    ubica midiendo las placas de verdad (getBoundingClientRect) y queda bien
    en compu, Ceibal y celular.
  - Luz: la del archivo de Blender (ver LUZ) y el mismo tono (AgX). Los
    materiales son los del archivo, sin cambios.
  - Se dibuja solo cuando algo cambia (frameloop "demand").
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
import { MOLI, PLACA_D } from './escenaRol';
import { POSES, aplicarPose, buscarPartes } from './moli';

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

type Props = {
  /** la escena (.rol-moli__escena): de ahí se miden las placas */
  escena: HTMLElement;
  /** se llama cuando Moli ya se ve en 3D (para esconder la imagen de respaldo) */
  onListo: () => void;
};

function Moli({ escena, onListo }: Props) {
  const gltf = useLoader(GLTFLoader, MOLI.modelo);
  const partes = useMemo(() => buscarPartes(gltf.scene), [gltf]);
  const lugar = useRef<Group>(null);
  const { invalidate, size } = useThree();

  useLayoutEffect(() => {
    aplicarPose(partes, POSES.sentada);
    invalidate();
  }, [partes, invalidate]);

  // sentada en el borde de arriba de «Soy maestra»; se vuelve a medir si cambia el tamaño
  useLayoutEffect(() => {
    const ubicar = () => {
      const g = lugar.current;
      const placa = escena.querySelector<HTMLElement>('[data-placa="maestra"]');
      if (!g || !placa) return;
      const e = escena.getBoundingClientRect();
      const p = placa.getBoundingClientRect();
      const u = p.width / PLACA_D; // píxeles por unidad de la escena
      g.position.set(p.left + p.width / 2 - e.left - e.width / 2, e.height / 2 - (p.top - e.top), 0);
      g.scale.setScalar(MOLI.escala * u);
      invalidate();
    };
    ubicar();
    const observador = new ResizeObserver(ubicar);
    observador.observe(escena);
    return () => observador.disconnect();
  }, [escena, invalidate, size]);

  // avisa cuando ya se dibujó
  useEffect(() => {
    let cuadro = requestAnimationFrame(() => {
      cuadro = requestAnimationFrame(onListo);
    });
    return () => cancelAnimationFrame(cuadro);
  }, [onListo]);

  return (
    <group ref={lugar}>
      {/* se inclina hacia la pantalla, como la cámara del render de Blender */}
      <group rotation-x={MathUtils.degToRad(MOLI.inclinacion)}>
        {/* el asiento (base del oxígeno) queda justo en el borde de la placa */}
        <primitive object={gltf.scene} position-y={-MOLI.asiento} />
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

export default function MoliEnEscena({ escena, onListo }: Props) {
  const desarmarLuz = useRef<(() => void) | null>(null);
  useEffect(() => () => desarmarLuz.current?.(), []);
  return (
    <SinMoli3d>
      <Canvas
        className="rol-moli__lienzo"
        // R3F le pone pointer-events en línea al contenedor: así los clics pasan a las placas de abajo
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        orthographic
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 1000], near: 1, far: 4000, zoom: 1 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
        onCreated={({ gl, scene, invalidate }) => {
          desarmarLuz.current = prepararLuz(gl, scene, invalidate);
        }}
        fallback={null}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <Moli escena={escena} onListo={onListo} />
        </Suspense>
      </Canvas>
    </SinMoli3d>
  );
}
