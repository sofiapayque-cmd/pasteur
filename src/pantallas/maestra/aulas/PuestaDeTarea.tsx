'use client';

import Puesta from '@/pantallas/maestra/Puesta';
import { ProveedorClase, type Clase } from '@/sala/contexto';
import type { SalaReal } from '@/lib/aulas/clase';

/* La puesta en común de una tarea: la misma pantalla, solo para mirar (sin manejar ninguna clase). */
const nada = () => {};
export default function PuestaDeTarea({
  sala,
  aula,
  volverA,
  asistente = false,
}: {
  sala: SalaReal;
  aula: { id: string; nombre: string };
  volverA: string;
  asistente?: boolean;
}) {
  const valor: Clase = {
    real: true,
    soloLectura: true,
    volverA,
    sala: sala as unknown as Clase['sala'],
    empezar: nada,
    alternarPausa: nada,
    desbloquear: nada,
    irAPuesta: nada,
    cerrar: nada,
    aula,
    asistente,
  };
  return (
    <ProveedorClase valor={valor}>
      <Puesta />
    </ProveedorClase>
  );
}
