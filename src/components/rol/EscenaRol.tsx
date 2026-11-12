'use client';
/* eslint-disable @next/next/no-img-element -- la imagen de respaldo de Moli se escala con la escena y se cambia por el 3D; next/image no suma nada acá */

import gsap from 'gsap';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navegacion';
import { animarCelulas } from '../hero/animarCelulas';
import FloatingCells from '../hero/FloatingCells';
import { CELULAS_ROL, DESTINO, RESPALDO, type Rol } from './escenaRol';
import type { Calidad, ControlMoli } from './MoliEnEscena';
import Placa from './Placa';
import './rol.css';

/* El 3D se carga aparte, después de la página (y nunca en el servidor). */
const MoliEnEscena = dynamic(() => import('./MoliEnEscena'), { ssr: false });

/*
  Si por algo la animación no termina (por ejemplo, el 3D se perdió a la
  mitad), se navega igual a los… (segundos de la animación: en el mismo
  reloj de GSAP, así un salto que va lento no se corta en el aire).
*/
const PLAZO_S = 3.4;

/*
  PANTALLA 02 · ¿CÓMO QUERÉS EXPLORAR?

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

        <img className="rol-moli__respaldo" src={RESPALDO.src} alt="" aria-hidden="true" width={680} height={680} draggable={false} />
        {montada && calidad !== 'imagen' && (
          <MoliEnEscena key={calidad} calidad={calidad} escena={montada} onListo={alListo} onControl={alControl} onLento={alLento} />
        )}
      </div>
    </>
  );
}
