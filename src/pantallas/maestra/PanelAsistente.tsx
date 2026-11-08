'use client';

import { useEffect, useRef } from 'react';
import { ConsultaAsistente } from './Asistente';
import './asistente.css';

/*
  "Preguntale al Pasteur" al costado de la puesta en común (pedido de Sofia, 8/11).
  La maestra pregunta sin salir de la pantalla que está proyectando; "Mostrar en
  grande" pone la respuesta aprobada a pantalla completa. Es la misma consulta
  que /maestra/preguntar: solo respuestas aprobadas, y la pregunta sin respuesta
  se anota sin maestra, aula ni hora. Los chicos no la usan.
*/
export default function PanelAsistente({ actividad, onCerrar }: { actividad?: string; onCerrar: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    // Esc cierra el panel, salvo que esté abierta la respuesta en grande (Esc cierra esa primero)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.asis__grande')) onCerrar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  return (
    <div className="puesta-asis" role="dialog" aria-modal="true" aria-labelledby="puesta-asis-titulo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="puesta-asis__panel" ref={panel} tabIndex={-1}>
        <div className="puesta-asis__cabeza">
          <h2 id="puesta-asis-titulo">Preguntale al Pasteur</h2>
          <button className="btn btn--claro" type="button" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <p className="asis__nota">Escribí la pregunta de la clase. Solo aparecen respuestas que revisó una investigadora del Instituto.</p>
        <ConsultaAsistente lista actividadInicial={actividad} />
      </div>
    </div>
  );
}
