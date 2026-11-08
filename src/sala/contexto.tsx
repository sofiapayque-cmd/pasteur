'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { alternarPausa, cerrarSala, desbloquear, empezar, irAPuesta, simularAlumno, useSala } from './sala';
import type { Conexion } from './claseEnVivo';

/*
  ¿De dónde sale la sala que ven la sala de espera, el tablero y la puesta en
  común de la maestra?
  · Sin proveedor: del prototipo de siempre (sala.js, en este navegador).
  · Con <ProveedorClase>: de una clase en vivo real (Supabase, tiempo real).
  Las pantallas no cambian: piden la sala y las acciones con useClase().
*/
type SalaComun = ReturnType<typeof useSala>;
export type Clase = {
  real: boolean;
  sala: SalaComun;
  empezar: () => void;
  alternarPausa: () => void;
  desbloquear: (clave: string) => void;
  irAPuesta: () => void;
  volverAlTablero?: () => void;
  cerrar: () => void;
  simularAlumno?: () => void;
  /** Solo en la clase real */
  aula?: { id: string; nombre: string };
  /** Para mirar los resultados de una tarea (sin clase abierta): sin botones de manejar la clase */
  soloLectura?: boolean;
  volverA?: string;
  conexion?: Conexion;
  aviso?: string;
};

const Contexto = createContext<Clase | null>(null);

export function ProveedorClase({ valor, children }: { valor: Clase; children: ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useClase(): Clase {
  const real = useContext(Contexto);
  const sala = useSala();
  if (real) return real;
  return { real: false, sala, empezar, alternarPausa, desbloquear, irAPuesta, cerrar: cerrarSala, simularAlumno };
}
