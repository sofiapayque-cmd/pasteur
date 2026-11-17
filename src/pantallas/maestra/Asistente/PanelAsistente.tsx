'use client';

import { useEffect, useRef } from 'react';
import Ventana from '@/components/Ventana';
import { ConsultaAsistente } from '@/pantallas/maestra/Asistente/Asistente';
import '@/pantallas/maestra/Asistente/asistente.css';

/*
  "Preguntale al Pasteur" al costado de la puesta en común (pedido de Sofia, 8/11).
  La maestra pregunta sin salir de la pantalla que está proyectando; "Mostrar en
  grande" pone la respuesta aprobada a pantalla completa. Es la misma consulta
  que /maestra/preguntar: solo respuestas aprobadas. Con una clase real, la
  pregunta queda en el cuaderno de esa clase (16/11). Los chicos no la usan.
*/
export default function PanelAsistente({ actividad, aulaId, onCerrar }: { actividad?: string; aulaId?: string; onCerrar: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
  }, []);

  // Si está abierta la respuesta en grande, Esc cierra esa primero (lo hace el navegador)
  return (
    <Ventana className="puesta-asis" aria-labelledby="puesta-asis-titulo" onCerrar={onCerrar} cerrarAfuera>
      <div className="puesta-asis__panel" ref={panel} tabIndex={-1}>
        <div className="puesta-asis__cabeza">
          <h2 id="puesta-asis-titulo">Preguntale al Pasteur</h2>
          <button className="btn btn--claro" type="button" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <p className="asis__nota">Escribí la pregunta de la clase. Solo aparecen respuestas que revisó una investigadora del Instituto.</p>
        <ConsultaAsistente lista actividadInicial={actividad} aulaFija={aulaId} />
      </div>
    </Ventana>
  );
}
