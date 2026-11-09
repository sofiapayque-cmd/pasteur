'use client';

import { useEffect, useRef, useState } from 'react';
import { estadoEfectivo, formatearReloj, msRestantes, tiempoDeFila, type FilaTiempo } from '@/lib/aulas/tiempo';
import { useAhoraServidor } from '@/pantallas/maestra/RelojClase';
import '@/pantallas/maestra/reloj.css';

/*
  TIMER DE LA CLASE · lo que ve el chico (pedido de Sofia, 8/11).
  · Corriendo o en pausa: un relojito abajo a la izquierda.
  · Al terminar: guarda en ese momento lo que tiene y avisa.
      - cierre flexible: "terminá la parte en la que estás" (se sigue guardando);
      - cierre definitivo: la actividad quedó cerrada.
  Sin tiempo, no muestra nada.
*/
export default function RelojAlumno({ fila, desfase, alTerminar }: { fila: FilaTiempo; desfase: number; alTerminar: () => void }) {
  const ahora = useAhoraServidor(desfase);
  const t = tiempoDeFila(fila);
  const estado = ahora ? estadoEfectivo(t, ahora) : 'sin';
  const terminado = estado === 'terminado';
  const [visto, setVisto] = useState<string | null>(null);
  const guardo = useRef<string | null>(null);
  const claveFin = terminado ? `${t.terminadoEn ?? t.fin}-${t.cierre}` : null;

  // Una sola vez por cada final: guardar ya lo que hay
  useEffect(() => {
    if (!claveFin || guardo.current === claveFin) return;
    guardo.current = claveFin;
    alTerminar();
  }, [claveFin, alTerminar]);

  if (estado === 'sin' || estado === 'listo') return null;
  if (terminado) {
    if (visto === claveFin) {
      return (
        <div className="reloj-alumno" role="status">
          {t.cierre === 'definitivo' ? 'Actividad cerrada' : 'Se terminó el tiempo'}
        </div>
      );
    }
    return (
      <div className="reloj-aviso" role="alert">
        <p>
          <b>{t.cierre === 'definitivo' ? 'La maestra cerró la actividad' : '¡Se terminó el tiempo!'}</b>
          {t.cierre === 'definitivo' ? 'Lo que hiciste quedó guardado.' : 'Terminá la parte en la que estás: lo que hagas se sigue guardando.'}
        </p>
        <button className="btn btn--primario" type="button" onClick={() => setVisto(claveFin)}>
          Entendido
        </button>
      </div>
    );
  }
  return (
    <div className="reloj-alumno" role="timer" aria-label={estado === 'pausado' ? 'Tiempo en pausa' : 'Tiempo que queda'}>
      {estado === 'pausado' ? 'En pausa' : 'Quedan'}
      <span className="reloj-alumno__numeros">{formatearReloj(msRestantes(t, ahora))}</span>
    </div>
  );
}
