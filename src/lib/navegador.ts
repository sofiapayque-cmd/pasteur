'use client';

/*
  Hooks para leer cosas del navegador sin romper el dibujo en el servidor.

  Next.js dibuja primero la página en el servidor (donde no existe window,
  localStorage ni matchMedia) y después el navegador "hidrata" ese HTML.
  Si el primer dibujo del navegador no coincide con el del servidor, React
  avisa un error de hidratación. Estos hooks devuelven un valor fijo en el
  servidor y durante la hidratación, y el valor real apenas la página está viva.
*/
import { useSyncExternalStore } from 'react';

const nada = () => () => {};

/** false en el servidor y durante la hidratación; true después (y en cada navegación posterior). */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    nada,
    () => true,
    () => false
  );
}

/** Media query (ej. '(prefers-reduced-motion: reduce)'). En el servidor devuelve `enServidor`. */
export function useMediaQuery(consulta: string, enServidor = false): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener('change', avisar);
      return () => mq.removeEventListener('change', avisar);
    },
    () => window.matchMedia(consulta).matches,
    () => enServidor
  );
}

/** Origen de la web (ej. https://ciencia.pasteur.uy). Vacío en el servidor. */
export function useOrigen(): string {
  return useSyncExternalStore(
    nada,
    () => window.location.origin,
    () => ''
  );
}
