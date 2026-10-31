import { Suspense } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import FondoVivo from '../../components/FondoVivo';
import Cargando from '../../components/Cargando';
import { ACTIVIDADES } from '../../data/contenido';
import { INFO_ACTIVIDADES } from '../../actividades/info';
import { PUESTAS } from '../../actividades/componentes';
import { useSala, cerrarSala } from '../../sala/sala';

/* PUESTA EN COMÚN — lo que encontró toda la clase, para conversar. */
export default function Puesta() {
  const sala = useSala();
  const navegar = useNavigate();

  if (sala.estado === 'cerrada') return <Navigate to="/maestra" replace />;

  const act = ACTIVIDADES.find((a) => a.id === sala.actividad);
  const info = INFO_ACTIVIDADES[sala.actividad] || {};
  const Especial = PUESTAS[sala.actividad];

  function cerrar() {
    cerrarSala();
    navegar('/maestra');
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
        <button className="btn btn--claro" onClick={() => window.print()}>
          Imprimir resumen de la clase
        </button>
        <button className="btn btn--primario" onClick={cerrar}>
          Cerrar la clase
        </button>
      </aside>
    </main>
  );
}
