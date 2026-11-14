'use client';
/* eslint-disable @next/next/no-img-element -- la imagen de respaldo de Moli se escala con la escena y se cambia por el 3D; next/image no suma nada acá */

import gsap from 'gsap';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from '@/navegacion';
import { animarCelulas } from '../hero/animarCelulas';
import type { Celula } from '../hero/escena';
import FloatingCells from '../hero/FloatingCells';
import type { Calidad, ControlMoli } from './Moli3d';
import './rol.css';

/*
  PANTALLA 02 · ¿CÓMO QUERÉS EXPLORAR?

  Este archivo tiene la pantalla entera menos Moli 3D (Moli3d.tsx) y los
  estilos (rol.css):
  1. Datos: rutas, células y la imagen de respaldo de Moli.
  2. La escena: células, título, las dos placas y Moli. Elegir, bloquear,
     ondas, sombras y navegar.
  3. Cada placa (Placa).

  Como en la portada, todo se mide en unidades de diseño y en pantalla cada
  unidad vale var(--u) (ver rol.css). Hay dos escenas:
  - horizontal: 1920 × 1080 (compu y Ceibal);
  - vertical: 1080 × 1920 (celular parado).
  Las dos placas quedan lado a lado en las dos, así Moli salta igual.

  Las células están en otra capa que CUBRE toda la pantalla (siempre
  1920 × 1080), así no quedan franjas vacías en ningún tamaño.
*/

/* ─────────────────────────── 1 · Datos ─────────────────────────── */

export type Rol = 'maestra' | 'alumno';

/* Rutas que ya existen (no se crean rutas nuevas). */
const DESTINO: Record<Rol, string> = {
  maestra: '/maestra',
  alumno: '/clase',
};

/* Células de esta pantalla (capa que cubre, 1920 × 1080). Las mismas de la portada (FloatingCells), en otras posiciones. */
const CELULAS_ROL: Celula[] = [
  { id: 'a', x: 240, y: 252, d: 156, giro: -12 },
  { id: 'b', x: 456, y: 984, d: 115, giro: 20 },
  { id: 'c', x: 1656, y: 204, d: 134, giro: 24 },
  { id: 'd', x: 1692, y: 672, d: 180, giro: 9 },
  { id: 'e', x: 1524, y: 984, d: 77, giro: -8 },
  { id: 'f', x: 252, y: 672, d: 70, giro: 30 },
  { id: 'g', x: 960, y: 1008, d: 53, giro: -20 },
  { id: 'h', x: 1368, y: 396, d: 48, giro: 14 },
  { id: 'k', x: 492, y: 360, d: 41, giro: -30 },
  { id: 'i', x: 864, y: 840, d: 84, giro: -18 },
  { id: 'j', x: 1070, y: 624, d: 62, giro: 16 },
];

/*
  Imagen de respaldo de Moli (render del mismo archivo, con Cycles): se ve
  mientras carga el 3D y queda si el navegador no tiene WebGL. Es un
  cuadrado de 6,4 unidades de Blender (454,4 de la escena); el asiento cae
  en (50 %, 62,26 %). Su lugar lo da rol.css.
*/
const RESPALDO = '/illustrations/rol/moli-sentada.webp';

/* El 3D se carga aparte, después de la página (y nunca en el servidor). */
const Moli3d = dynamic(() => import('./Moli3d'), { ssr: false });

/* ────────────────────────── 2 · La escena ────────────────────────── */

/*
  Si por algo la animación no termina (por ejemplo, el 3D se perdió a la
  mitad), se navega igual a los… (segundos de la animación: en el mismo
  reloj de GSAP, así un salto que va lento no se corta en el aire).
*/
const PLAZO_S = 3.4;

/*
  Capas, de atrás hacia adelante:
  1. las células de la portada (FloatingCells), que viajan por toda la
     pantalla (animarCelulas) sin tapar el título;
  2. el título y las dos placas (botones);
  3. Moli, una sola: primero la imagen de respaldo (render del mismo
     archivo) y, cuando el 3D está listo, Moli en 3D en el mismo lugar.

  Al elegir:
  - «Soy maestra»: Moli sigue sentada y saluda; después, /maestra.
  - «Soy alumno»: Moli salta hasta esa placa, aterriza, saluda; después, /clase.
  - Una sola elección: las dos placas quedan bloqueadas hasta navegar.
  - Con "reducir movimiento", o si el 3D no está listo, se navega sin esperar.
*/
export default function EscenaRol() {
  const navegar = useNavigate();
  const router = useRouter();
  const escena = useRef<HTMLDivElement>(null);
  const capaCelulas = useRef<HTMLDivElement>(null);
  const control = useRef<ControlMoli | null>(null);
  const elegido = useRef<Rol | null>(null);
  const [montada, setMontada] = useState<HTMLDivElement | null>(null);
  const [moli3d, setMoli3d] = useState(false);
  const [eligiendo, setEligiendo] = useState<Rol | null>(null);
  const [moliEn, setMoliEn] = useState<Rol>('maestra');
  // si la compu no dibuja fluido: primero sin antialiasing; si igual no, queda la imagen de Moli
  const [calidad, setCalidad] = useState<Calidad | 'imagen'>('alta');

  useEffect(() => {
    setMontada(escena.current);
    // las dos rutas quedan precargadas: al elegir, la pantalla siguiente aparece enseguida
    router.prefetch(DESTINO.maestra);
    router.prefetch(DESTINO.alumno);
  }, [router]);

  // solo en desarrollo, para grabar videos en cámara lenta: localStorage.moliVelocidad = '0.5'
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const v = Number(window.localStorage.getItem('moliVelocidad'));
    if (v > 0) gsap.globalTimeline.timeScale(v);
  }, []);

  // las células viajan (las mismas de la portada); no tapan el título ni "Volver"
  useEffect(() => {
    if (!capaCelulas.current) return;
    return animarCelulas(capaCelulas.current, CELULAS_ROL, '[data-rol-evitar], .rol-moli .cabecera__volver');
  }, []);

  const alListo = useCallback(() => setMoli3d(true), []);
  const alLento = useCallback(() => {
    if (elegido.current) return;
    setMoli3d(false);
    setCalidad((c) => (c === 'alta' ? 'media' : 'imagen'));
  }, []);
  const alControl = useCallback((c: ControlMoli | null) => {
    control.current = c;
  }, []);

  /* la placa de destino responde: una onda que sale del borde */
  function onda(rol: Rol) {
    const el = escena.current?.querySelector<HTMLElement>(`[data-onda="${rol}"]`);
    if (!el) return;
    gsap.fromTo(el, { scale: 0.96, opacity: 0.7 }, { scale: 1.22, opacity: 0, duration: 1.1, ease: 'power2.out' });
  }
  /* la sombra de Moli sobre una placa */
  function sombra(rol: Rol, visible: boolean) {
    const el = escena.current?.querySelector<HTMLElement>(`[data-placa="${rol}"] .rol-placa__sombra`);
    if (el) gsap.to(el, { opacity: visible ? 1 : 0, duration: visible ? 0.2 : 0.25, ease: 'power1.out' });
  }

  function elegir(rol: Rol) {
    if (elegido.current) return; // ya eligió: una sola navegación
    elegido.current = rol;
    setEligiendo(rol);

    let fuera = false;
    const ir = () => {
      if (fuera) return;
      fuera = true;
      navegar(DESTINO[rol]);
    };
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const moli = control.current;
    if (reducido) return ir();
    if (!moli || !moli3d) {
      // sin Moli 3D (todavía cargando o sin WebGL): solo la respuesta de la placa
      onda(rol);
      window.setTimeout(ir, 350);
      return;
    }
    gsap.delayedCall(PLAZO_S, ir);
    if (rol === 'maestra') {
      onda('maestra');
      moli.saludar().then(ir);
    } else {
      moli
        .saltar(
          'alumno',
          () => sombra('maestra', false),
          () => {
            sombra('alumno', true);
            onda('alumno');
            setMoliEn('alumno');
          },
        )
        .then(ir);
    }
  }

  return (
    <>
      <div className="rol-moli__celulas" ref={capaCelulas} aria-hidden="true">
        <FloatingCells celulas={CELULAS_ROL} />
      </div>

      <div className="rol-moli__escena" ref={escena} data-moli={moli3d ? '3d' : 'imagen'} data-eligiendo={eligiendo ?? undefined}>
        <h1 className="rol-moli__titulo">
          <span data-rol-evitar="texto">¿Cómo querés explorar?</span>
        </h1>

        <span className="rol-moli__onda rol-moli__onda--maestra" data-onda="maestra" aria-hidden="true" />
        <span className="rol-moli__onda rol-moli__onda--alumno" data-onda="alumno" aria-hidden="true" />
        <Placa rol="maestra" titulo="Soy maestra" texto="Preparo y guío la clase" conMoli={moliEn === 'maestra'} eligiendo={eligiendo} onElegir={elegir} />
        <Placa rol="alumno" titulo="Soy alumno" texto="Entro con el código de mi clase" conMoli={moliEn === 'alumno'} eligiendo={eligiendo} onElegir={elegir} />

        <img className="rol-moli__respaldo" src={RESPALDO} alt="" aria-hidden="true" width={680} height={680} draggable={false} />
        {montada && calidad !== 'imagen' && (
          <Moli3d key={calidad} calidad={calidad} escena={montada} onListo={alListo} onControl={alControl} onLento={alLento} />
        )}
      </div>
    </>
  );
}

/* ─────────────────────────── 3 · Placa ─────────────────────────── */

/*
  Una de las dos opciones: una placa de Petri vista desde arriba (la "placa"
  del sistema de diseño: círculo que es marco y botón). Es un <button> de
  verdad: funciona con mouse, teclado y lector de pantalla.
*/

type Colonia = { t: number; cx: string; cy: string; c: string };

const COLONIAS: Record<Rol, Colonia[]> = {
  maestra: [
    { t: 16, cx: '27%', cy: '77%', c: 'rgba(147, 174, 235, 0.55)' },
    { t: 9, cx: '32%', cy: '82%', c: 'rgba(147, 174, 235, 0.45)' },
    { t: 12, cx: '70%', cy: '80%', c: 'rgba(142, 213, 195, 0.6)' },
  ],
  alumno: [
    { t: 16, cx: '67%', cy: '76%', c: 'rgba(114, 114, 238, 0.35)' },
    { t: 9, cx: '62%', cy: '82%', c: 'rgba(114, 114, 238, 0.3)' },
    { t: 12, cx: '28%', cy: '79%', c: 'rgba(142, 213, 195, 0.6)' },
  ],
};

type PropsPlaca = {
  rol: Rol;
  titulo: string;
  texto: string;
  /** Moli está en esta placa (se ve su sombra) */
  conMoli?: boolean;
  /** si ya se eligió una opción (mientras Moli saluda o salta): las dos quedan bloqueadas */
  eligiendo?: Rol | null;
  onElegir: (rol: Rol) => void;
};

function Placa({ rol, titulo, texto, conMoli = false, eligiendo = null, onElegir }: PropsPlaca) {
  return (
    <button
      type="button"
      className={`rol-placa rol-placa--${rol}`}
      data-placa={rol}
      data-con-moli={conMoli ? '' : undefined}
      data-elegida={eligiendo === rol ? '' : undefined}
      aria-disabled={eligiendo ? true : undefined}
      onClick={() => onElegir(rol)}
    >
      <span className="rol-placa__sombra" aria-hidden="true" />
      <span className="rol-placa__brillo" aria-hidden="true" />
      {COLONIAS[rol].map((c, i) => (
        <span key={i} className="rol-placa__colonia" aria-hidden="true" style={{ '--t': c.t, '--cx': c.cx, '--cy': c.cy, '--c': c.c } as CSSProperties} />
      ))}
      <span className="rol-placa__titulo">{titulo}</span>
      <span className="rol-placa__texto">{texto}</span>
      <span className="rol-placa__ir" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
