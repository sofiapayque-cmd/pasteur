'use client';

import { useEffect, useRef, useState } from 'react';
import { contarVistaEnActividad, respuestasDeActividad, type RespuestaPublica } from '@/acciones/respuestasPublicas';

/*
  Botón "Preguntas del Pasteur" en cada actividad: las respuestas que aprobó
  una investigadora para esa actividad. Los chicos eligen de la lista (no
  escriben). Se cargan recién al abrir; Esc o "Cerrar" la cierran.
*/
const SELLO = 'Revisado por una investigadora del Institut Pasteur de Montevideo';

export default function PreguntasDelPasteur({ actividadId }: { actividadId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<RespuestaPublica[] | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const contadas = useRef(new Set<string>());
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    if (lista === null) respuestasDeActividad(actividadId).then(setLista, () => setLista([]));
    panel.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto, lista, actividadId]);

  function abrirRespuesta(id: string) {
    setElegida((x) => (x === id ? null : id));
    if (!contadas.current.has(id)) {
      contadas.current.add(id);
      contarVistaEnActividad(id).catch(() => {});
    }
  }

  return (
    <>
      <button className="btn btn--claro preguntas-pasteur__boton" type="button" onClick={() => setAbierto(true)}>
        Preguntas del Pasteur
      </button>
      {abierto && (
        <div className="preguntas-pasteur" role="dialog" aria-modal="true" aria-labelledby="pp-titulo" onClick={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div className="preguntas-pasteur__panel" ref={panel} tabIndex={-1}>
            <div className="preguntas-pasteur__cabeza">
              <h2 id="pp-titulo">Preguntas del Pasteur</h2>
              <button className="btn btn--claro btn--chico" type="button" onClick={() => setAbierto(false)}>
                Cerrar
              </button>
            </div>
            <p className="preguntas-pasteur__bajada">Preguntas que hicieron otros chicos, respondidas con artículos científicos y revisadas por una investigadora.</p>
            {lista === null ? (
              <p className="preguntas-pasteur__bajada">Buscando…</p>
            ) : lista.length === 0 ? (
              <p className="preguntas-pasteur__bajada">Todavía no hay respuestas para esta actividad. Si tenés una pregunta, hacésela a tu maestra: ella se la puede pasar al Pasteur.</p>
            ) : (
              <ul className="preguntas-pasteur__lista">
                {lista.map((r) => (
                  <li key={r.fichaId}>
                    <button type="button" className="preguntas-pasteur__pregunta" aria-expanded={elegida === r.fichaId} onClick={() => abrirRespuesta(r.fichaId)}>
                      {r.pregunta}
                    </button>
                    {elegida === r.fichaId && (
                      <div className="preguntas-pasteur__respuesta">
                        <p>{r.texto}</p>
                        <p className="preguntas-pasteur__sello">
                          <span aria-hidden="true">✓</span> {SELLO}
                        </p>
                        {r.fuentes.length > 0 && (
                          <details>
                            <summary>De dónde sale</summary>
                            <ul>
                              {r.fuentes.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
