'use client';

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from '@/navegacion';
import { ACTIVIDADES } from '../../data/contenido';
import { INFO_ACTIVIDADES } from '../../actividades/info';
import { AMBIENTES } from '../../actividades/a1/datos';
import { useClase } from '../../sala/contexto';

const CINCO_MINUTOS = 5 * 60 * 1000;

/*
  TABLERO EN VIVO — qué está haciendo cada niño y las acciones de la maestra.
  La sala sale de useClase(): la clase real (tiempo real) o el prototipo.
*/
export default function Tablero() {
  const clase = useClase();
  const { sala, real } = clase;
  const navegar = useNavigate();
  const [ahora, setAhora] = useState(Date.now());

  // Recalcula "sin avanzar hace 5 minutos" cada 30 segundos
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (sala.estado === 'cerrada') return real ? null : <Navigate to="/maestra" replace />;

  const act = ACTIVIDADES.find((a) => a.id === sala.actividad);
  const info = INFO_ACTIVIDADES[sala.actividad] || {};
  const etapas = info.ETAPAS || [];
  const ultima = etapas[etapas.length - 1]?.id;
  const nombreEtapa = (id) => etapas.find((e) => e.id === id)?.nombre || id;
  const bloqueadas = new Set((info.DESBLOQUEOS || []).filter((d) => !sala.desbloqueos?.[d.clave]).map((d) => d.etapa));
  const trabados = sala.alumnos.filter((a) => a.etapa !== ultima && ahora - a.desde > CINCO_MINUTOS);

  function puesta() {
    clase.irAPuesta();
    if (!real) navegar(`/maestra/${sala.actividad}/puesta`);
  }

  return (
    <main className="pantalla tablero">
      <header className="cabecera">
        <div className="cabecera__izq">
          <h1 className="tablero__titulo">Tablero en vivo</h1>
          <span className="etiqueta etiqueta--oscura">
            {act?.numero} · {act?.nombre} · {real ? clase.aula?.nombre : `Sala ${sala.codigo}`}
          </span>
        </div>
        <span className={`etiqueta etiqueta--oscura tablero__vivo ${real && clase.conexion !== 'en-vivo' ? 'tablero__vivo--respaldo' : ''}`}>
          <i aria-hidden="true" /> {real && clase.conexion !== 'en-vivo' ? 'Se actualiza cada pocos segundos' : 'En vivo'} · {sala.alumnos.length}{' '}
          {real ? 'en la clase' : 'conectados'}
        </span>
      </header>

      {real && clase.aviso && <p className="tablero__pausa">{clase.aviso}</p>}

      {sala.pausada && <p className="tablero__pausa">Las Ceibal están en pausa: la clase está mirando el pizarrón.</p>}

      <section className="tablero__etapas" aria-label="Etapa de cada niño" style={{ gridTemplateColumns: `repeat(${Math.max(etapas.length, 1)}, minmax(0, 1fr))` }}>
        {etapas.map((e) => {
          const aca = sala.alumnos.filter((a) => a.etapa === e.id);
          const bloqueada = bloqueadas.has(e.id);
          return (
            <div key={e.id} className={`tablero__columna ${bloqueada ? 'tablero__columna--bloqueada' : ''}`}>
              <span className="etiqueta etiqueta--oscura">{e.nombre}</span>
              {bloqueada ? (
                <span className="tablero__candado">Bloqueado hasta que lo habilites</span>
              ) : (
                <>
                  <span className="tablero__cuenta">{aca.length}</span>
                  <ul className="tablero__puntos">
                    {aca.map((a) => (
                      <li key={a.id} title={a.apodo} style={{ background: a.color }}>
                        <span className="solo-lector">{a.apodo}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </section>

      {sala.actividad === 'a1' ? <MuestrasA1 sala={sala} /> : <UltimoA sala={sala} resumen={info.resumen} />}

      <section className="tarjeta tablero__ayuda">
        <span className="etiqueta etiqueta--oscura">Pueden necesitar ayuda</span>
        {trabados.length === 0 ? (
          <p>Todos vienen avanzando.</p>
        ) : (
          <>
            <p>Sin avanzar hace más de 5 minutos:</p>
            <ul>
              {trabados.map((a) => (
                <li key={a.id}>
                  <i style={{ background: a.color }} aria-hidden="true" />
                  {a.apodo} · en {nombreEtapa(a.etapa)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="tablero__acciones" aria-label="Acciones para la clase">
        <button className="accion accion--pausa" onClick={clase.alternarPausa} aria-pressed={sala.pausada}>
          {sala.pausada ? 'Reanudar las Ceibal' : 'Pausar y mirar el pizarrón'}
        </button>
        {(info.DESBLOQUEOS || []).map((d) => (
          <button key={d.clave} className="accion accion--habilitar" onClick={() => clase.desbloquear(d.clave)} disabled={sala.desbloqueos?.[d.clave]}>
            {sala.desbloqueos?.[d.clave] ? `${d.etiqueta}: habilitado` : d.accion}
          </button>
        ))}
        <button className="accion accion--puesta" onClick={puesta}>
          Ir a la puesta en común
        </button>
        {!real && (
          <button className="prototipo" onClick={clase.simularAlumno}>
            + Simular un alumno (solo prototipo)
          </button>
        )}
      </section>
    </main>
  );
}

function MuestrasA1({ sala }) {
  const ambientes = sala.opciones?.ambientes || [];
  const contar = (id) => sala.alumnos.reduce((n, a) => n + (a.datos?.muestras || []).filter((m) => m.ambiente === id).length, 0);
  const maximo = Math.max(1, ...ambientes.map(contar));
  return (
    <section className="tarjeta tablero__muestras">
      <span className="etiqueta etiqueta--oscura">Muestras por ambiente</span>
      {ambientes.map((id) => {
        const amb = AMBIENTES.find((a) => a.id === id);
        const n = contar(id);
        return (
          <div key={id} className="barra">
            <span className="barra__nombre">{amb?.nombre}</span>
            <span className="barra__linea" style={{ width: `${(n / maximo) * 160}px`, background: amb?.color }} />
            <b>{n}</b>
          </div>
        );
      })}
    </section>
  );
}

function UltimoA({ sala, resumen }) {
  return (
    <section className="tarjeta tablero__muestras">
      <span className="etiqueta etiqueta--oscura">Lo que va haciendo cada uno</span>
      {sala.alumnos.length === 0 && <p className="texto-suave">Todavía no hay datos.</p>}
      <ul className="tablero__resumen">
        {sala.alumnos.slice(0, 8).map((a) => (
          <li key={a.id}>
            <i style={{ background: a.color }} aria-hidden="true" />
            <span><b>{a.apodo}:</b> {resumen ? resumen(a.datos || {}) : '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
