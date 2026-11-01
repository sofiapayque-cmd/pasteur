'use client';

import type { ReactNode } from 'react';
import { useHidratado } from '@/hooks/navegador';

/*
  Envuelve las pantallas que dependen de lo guardado en ESTE navegador
  (la sala de prueba en localStorage, el avance en sessionStorage) o que
  dibujan en Canvas: sala, tablero, puesta, apodo, espera y las actividades.
  - En el servidor y durante la hidratación no se dibujan → sin errores de hidratación.
  - Al navegar entre pantallas ya está "montado": el cambio es inmediato, sin parpadeo.
  Cuando la sala viva en Supabase (etapa 5 en adelante), varias de estas
  pantallas van a poder dibujarse en el servidor con los datos reales.
*/
export default function SoloNavegador({ children }: { children: ReactNode }) {
  return useHidratado() ? children : null;
}
