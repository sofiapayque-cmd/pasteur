'use client';
/* eslint-disable @next/next/no-img-element -- la imagen de respaldo de Moli se escala con la escena y se cambia por el 3D; next/image no suma nada acá */

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navegacion';
import FloatingCells from '../hero/FloatingCells';
import { CELULAS_ROL, DESTINO, RESPALDO, type Rol } from './escenaRol';
import Placa from './Placa';
import './rol.css';

/* El 3D se carga aparte, después de la página (y nunca en el servidor). */
const MoliEnEscena = dynamic(() => import('./MoliEnEscena'), { ssr: false });

/*
  PANTALLA 02 · ¿CÓMO QUERÉS EXPLORAR?

  Capas, de atrás hacia adelante:
  1. las células de la portada (FloatingCells), cubriendo la pantalla;
  2. el título y las dos placas (botones);
  3. Moli, una sola: primero la imagen de respaldo (render del mismo
     archivo) y, cuando el 3D está listo, Moli en 3D en el mismo lugar.

  Etapa 2 (composición quieta): Moli sentada en «Soy maestra». Elegir una
  placa navega directo a su ruta; el saludo y el salto llegan en las etapas
  3 y 4.
*/
export default function EscenaRol() {
  const navegar = useNavigate();
  const router = useRouter();
  const escena = useRef<HTMLDivElement>(null);
  const [montada, setMontada] = useState<HTMLDivElement | null>(null);
  const [moli3d, setMoli3d] = useState(false);

  useEffect(() => {
    setMontada(escena.current);
    // las dos rutas quedan precargadas: al elegir, la pantalla siguiente aparece enseguida
    router.prefetch(DESTINO.maestra);
    router.prefetch(DESTINO.alumno);
  }, [router]);

  const elegir = (rol: Rol) => navegar(DESTINO[rol]);
  const alListo = useCallback(() => setMoli3d(true), []);

  return (
    <>
      <div className="rol-moli__celulas" aria-hidden="true">
        <FloatingCells celulas={CELULAS_ROL} />
      </div>

      <div className="rol-moli__escena" ref={escena} data-moli={moli3d ? '3d' : 'imagen'}>
        <h1 className="rol-moli__titulo">¿Cómo querés explorar?</h1>

        <Placa rol="maestra" titulo="Soy maestra" texto="Preparo y guío la clase" conMoli onElegir={elegir} />
        <Placa rol="alumno" titulo="Soy alumno" texto="Entro con el código de mi clase" onElegir={elegir} />

        <img className="rol-moli__respaldo" src={RESPALDO.src} alt="" aria-hidden="true" width={680} height={680} draggable={false} />
        {montada && <MoliEnEscena escena={montada} onListo={alListo} />}
      </div>
    </>
  );
}
