'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

/*
  Las pantallas leen localStorage, window y dibujan en Canvas, así que por
  ahora se muestran solo en el navegador (como en la versión Vite).
  - En el servidor y durante la hidratación: no se dibuja nada → sin errores
    de hidratación.
  - Al navegar entre pantallas ya está "montado": el cambio es inmediato,
    sin parpadeo.
  En la etapa 4 cada pantalla se prepara para el servidor y esto se va achicando.
*/
const nada = () => () => {};
const enNavegador = () => true;
const enServidor = () => false;

export function useHidratado(): boolean {
  return useSyncExternalStore(nada, enNavegador, enServidor);
}

export default function SoloNavegador({ children }: { children: ReactNode }) {
  return useHidratado() ? children : null;
}
