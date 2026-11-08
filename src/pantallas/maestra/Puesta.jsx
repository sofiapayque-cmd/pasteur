'use client';

import { Suspense, useCallback, useState } from 'react';
import { Navigate, useNavigate } from '@/navegacion';
import FondoVivo from '../../components/FondoVivo';
import Cargando from '../../components/Cargando';
import { ACTIVIDADES } from '../../data/contenido';
import { INFO_ACTIVIDADES } from '../../actividades/info';
import { PUESTAS } from '../../actividades/componentes';
import { useClase } from '../../sala/contexto';
import PanelAsistente from './PanelAsistente';

/* PUESTA EN COMÚN — lo que encontró toda la clase, para conversar (clase real o prototipo, ver useClase). */
export default function Puesta() {
  const clase = useClase();
  const { sala, real } = clase;
  const navegar = useNavigate();
  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const cerrarAsistente = useCallback(() => setAsistenteAbierto(false), []);

  if (sala.estado === 'cerrada') return real ? null : <Navigate to="/maestra" replace />;

  const act = ACTIVIDADES.find((a) => a.id === sala.actividad);
  const info = INFO_ACTIVIDADES[sala.actividad] || {};
  const Especial = PUESTAS[sala.actividad];

  function cerrar() {
    if (real && !window.confirm('¿Cerrar la clase? Lo que hizo cada chico queda guardado.')) return;
    clase.cerrar();
    if (!real) navegar('/maestra');
  }

  return (
    <main className="pantalla puesta" style={{ background: act?.fondo }}>
      <FondoVivo semilla={33} opacidad={0.3} />
      <div className="puesta__cabeza">
        <span className="etiqueta etiqueta--oscura">
          {act?.numero} · Puesta en común · {sala.alumnos.length} investigadores
        </span>
        <h1>Lo que encontró la clase</h1>
      </div>

      <div className="puesta__principal">
        {Especial ? (
          <Suspense fallback={<Cargando />}>
            <Especial sala={sala} />
          </Suspense>
        ) : (
          <section className="tarjeta puesta__lista">
            <span className="etiqueta etiqueta--oscura">Cada investigador</span>
            <ul>
              {sala.alumnos.map((a) => (
                <li key={a.id}>
                  <i style={{ background: a.color }} aria-hidden="true" />
                  <b>{a.apodo}</b>
                  <span>{info.resumen ? info.resumen(a.datos || {}) : ''}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="puesta__lado">
        <div className="puesta__preguntas">
          <span className="etiqueta etiqueta--oscura">Para conversar</span>
          <ol>
            {(info.PREGUNTAS || []).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>
        {/* "Preguntale al Pasteur" sin salir de la puesta en común (8/11): solo en la clase real */}
        {real && clase.asistente && (
          <button className="btn btn--secundario" onClick={() => setAsistenteAbierto(true)}>
            Preguntale al Pasteur
          </button>
        )}
        <button className="btn btn--claro" onClick={() => window.print()}>
          Imprimir resumen de la clase
        </button>
        {clase.soloLectura ? (
          <a className="btn btn--primario" href={clase.volverA}>
            Volver
          </a>
        ) : (
          <>
            {real && clase.volverAlTablero && (
              <button className="btn btn--secundario" onClick={clase.volverAlTablero}>
                Volver al tablero
              </button>
            )}
            <button className="btn btn--primario" onClick={cerrar}>
              Cerrar la clase
            </button>
          </>
        )}
      </aside>
      {asistenteAbierto && <PanelAsistente actividad={sala.actividad} onCerrar={cerrarAsistente} />}
    </main>
  );
}
