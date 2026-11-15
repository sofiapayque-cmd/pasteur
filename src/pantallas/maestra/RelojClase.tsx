'use client';

import { useEffect, useState } from 'react';
import {
  DURACIONES_MIN,
  EXTENSION_SEG,
  accionesPosibles,
  ahoraServidor,
  estadoEfectivo,
  formatearReloj,
  guardaronAlFinal,
  msRestantes,
  tiempoDeFila,
  type AccionTiempo,
  type FilaTiempo,
} from '@/lib/aulas/tiempo';
import './reloj.css';

/*
  TIMER DE LA CLASE · lo que ve la maestra (pedido de Sofia, 8/11).
  Es opcional: sin duración, la clase funciona igual que siempre.
  · modo "preparar" (sala de espera): solo poner o quitar la duración; al
    tocar "Empezar" el tiempo arranca solo.
  · modo "clase" (tablero): iniciar, pausar, seguir, +5 minutos, finalizar y,
    cuando terminó, el cierre definitivo.
  La cuenta la hace cada pantalla con la hora del servidor (ver lib/aulas/tiempo.ts).
*/
export type PropsReloj = {
  fila: FilaTiempo;
  desfase: number;
  mover: (accion: AccionTiempo, segundos?: number) => void;
  actualizaciones: string[];
  modo: 'preparar' | 'clase';
};

/** La hora del servidor, al día cada cuarto de segundo (sin llamar a Date.now() al dibujar). */
export function useAhoraServidor(desfase: number) {
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    const tic = () => setAhora(ahoraServidor(desfase));
    const primera = setTimeout(tic, 0);
    const cada = setInterval(tic, 250);
    return () => {
      clearTimeout(primera);
      clearInterval(cada);
    };
  }, [desfase]);
  return ahora;
}

export default function RelojClase({ fila, desfase, mover, actualizaciones, modo }: PropsReloj) {
  const ahora = useAhoraServidor(desfase);
  const [minutos, setMinutos] = useState<number>(30);
  const t = tiempoDeFila(fila);
  if (!ahora) return null;
  const estado = estadoEfectivo(t, ahora);
  const puede = new Set(accionesPosibles(t, ahora));
  const reloj = formatearReloj(msRestantes(t, ahora));
  const extender = () => mover('extender', EXTENSION_SEG);

  // Sin tiempo: elegir una duración (opcional)
  if (estado === 'sin') {
    return (
      <section className="reloj reloj--sin" aria-label="Tiempo de la clase">
        <span className="etiqueta etiqueta--oscura">Tiempo de la clase (opcional)</span>
        <div className="reloj__fila">
          <label className="reloj__elegir">
            <span className="solo-lector">Duración</span>
            <select className="campo__entrada" value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}>
              {DURACIONES_MIN.map((m) => (
                <option key={m} value={m}>
                  {m} minutos
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn--secundario" type="button" onClick={() => mover('poner', minutos * 60)}>
            Poner tiempo
          </button>
        </div>
      </section>
    );
  }

  const terminado = estado === 'terminado';
  const definitivo = t.cierre === 'definitivo';
  const guardaron = terminado ? guardaronAlFinal(t.terminadoEn ?? t.fin, actualizaciones) : 0;
  const titulo = {
    listo: modo === 'preparar' ? 'Arranca al tocar "Empezar"' : 'Listo para empezar',
    corriendo: 'Quedan',
    pausado: 'En pausa',
    terminado: definitivo ? 'Cierre definitivo' : 'Se terminó el tiempo',
  }[estado];

  return (
    <section className={`reloj reloj--${estado} ${definitivo ? 'reloj--definitivo' : ''}`} aria-label="Tiempo de la clase">
      <div className="reloj__cuenta">
        <span className="etiqueta etiqueta--oscura">{titulo}</span>
        {!terminado && (
          <span className="reloj__numeros" role="timer" aria-live="off">
            {reloj}
          </span>
        )}
      </div>
      {terminado && (
        <p className="reloj__nota" role="status">
          {definitivo
            ? 'La actividad quedó cerrada: ya no se guarda nada más.'
            : `Los chicos pueden terminar la parte en la que están. Guardaron al final: ${guardaron} de ${actualizaciones.length}.`}
        </p>
      )}
      <div className="reloj__botones">
        {modo === 'clase' && puede.has('iniciar') && (
          <button className="btn btn--primario" type="button" onClick={() => mover('iniciar')}>
            Iniciar tiempo
          </button>
        )}
        {puede.has('pausar') && (
          <button className="btn btn--secundario" type="button" onClick={() => mover('pausar')}>
            Pausar tiempo
          </button>
        )}
        {puede.has('seguir') && (
          <button className="btn btn--primario" type="button" onClick={() => mover('seguir')}>
            Seguir
          </button>
        )}
        {puede.has('extender') && (
          <button className="btn btn--claro" type="button" onClick={extender}>
            +5 minutos
          </button>
        )}
        {puede.has('quitar') && (
          <button className="btn btn--claro" type="button" onClick={() => mover('quitar')}>
            Quitar el tiempo
          </button>
        )}
        {modo === 'clase' && puede.has('finalizar') && (
          <button className="btn btn--claro" type="button" onClick={() => mover('finalizar')}>
            Finalizar ya
          </button>
        )}
        {modo === 'clase' && terminado && puede.has('definitivo') && (
          <button
            className="btn btn--secundario"
            type="button"
            onClick={() => {
              if (window.confirm('¿Cerrar la actividad definitivamente? Lo que hizo cada chico queda guardado, pero ya no van a poder seguir. Después podés volver a abrirla desde el aula.'))
                mover('definitivo');
            }}
          >
            Cierre definitivo
          </button>
        )}
      </div>
    </section>
  );
}
