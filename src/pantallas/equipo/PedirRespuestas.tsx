'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { ideasDePreguntas, pedirRespuestas, type EstadoIdeas, type EstadoPedido } from '@/acciones/respuestas';
import { ACTIVIDADES } from '@/lib/equipo/comun';

/*
  "Pedir respuestas a la IA": la lista de preguntas (una por renglón) y la
  actividad. Mientras trabaja muestra qué está haciendo; al terminar, qué
  pasó con cada pregunta. "Ideas" le pide a la IA preguntas posibles para
  la actividad y se agregan a la lista con un clic.
  Se envía con onSubmit (y no con action=) para que React no reinicie el
  formulario al terminar: si no, la actividad volvía sola a A1.
*/
const enviar = (accion: (datos: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const datos = new FormData(e.currentTarget);
  startTransition(() => accion(datos));
};

export default function PedirRespuestas() {
  const [preguntas, setPreguntas] = useState('');
  const [actividad, setActividad] = useState('a3');
  const [estado, pedir, pidiendo] = useActionState<EstadoPedido, FormData>(pedirRespuestas, { mensaje: '' });
  const [ideas, pedirIdeas, pensando] = useActionState<EstadoIdeas, FormData>(ideasDePreguntas, { mensaje: '' });
  const [elegidas, setElegidas] = useState<string[]>([]);
  const renglones = preguntas.split('\n').filter((l) => l.trim().length >= 5).length;

  const agregar = () => {
    const ya = new Set(preguntas.split('\n').map((l) => l.trim()));
    const nuevas = elegidas.filter((p) => !ya.has(p));
    setPreguntas([preguntas.trim(), ...nuevas].filter(Boolean).join('\n'));
    setElegidas([]);
  };

  return (
    <section className="eq-caja eq-form" aria-labelledby="pedir-titulo">
      <div>
        <h2 id="pedir-titulo">Pedir respuestas a la IA</h2>
        <p className="eq-bajada">
          Busca artículos científicos, escribe la respuesta para chicos con sus fuentes y la manda a revisión. Nada llega a los chicos sin la aprobación de una
          validadora.
        </p>
      </div>
      <form onSubmit={enviar(pedir)} className="eq-form">
        <div className="eq-fila">
          <label className="campo" style={{ flex: '0 1 260px' }}>
            <span className="campo__nombre">Actividad</span>
            <select className="campo__entrada" name="actividad" value={actividad} onChange={(e) => setActividad(e.target.value)}>
              {Object.entries(ACTIVIDADES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="campo">
          <span className="campo__nombre">Preguntas (una por renglón, hasta 4 por vez)</span>
          <textarea
            className="campo__entrada"
            name="preguntas"
            rows={4}
            maxLength={1500}
            value={preguntas}
            onChange={(e) => setPreguntas(e.target.value)}
            placeholder={'¿Por qué las células tienen núcleo?\n¿Cómo hace un microscopio para agrandar las cosas?'}
          />
        </label>
        <div className="eq-botones">
          <button className="btn btn--primario btn--chico" type="submit" disabled={pidiendo || renglones === 0}>
            {pidiendo ? 'Buscando y redactando…' : renglones > 1 ? `Buscar y redactar ${Math.min(renglones, 4)}` : 'Buscar y redactar'}
          </button>
          {pidiendo && (
            <p className="eq-mensaje" role="status" aria-live="polite">
              Busca artículos, redacta y comprueba cada cita. Tarda uno o dos minutos por pregunta: podés dejar esta pestaña abierta y seguir con otra cosa.
            </p>
          )}
          {!pidiendo && estado.mensaje && (
            <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status" aria-live="polite">
              {estado.mensaje}
            </p>
          )}
        </div>
      </form>

      {!pidiendo && estado.resultados && estado.resultados.length > 0 && (
        <ul className="eq-lista eq-resultados">
          {estado.resultados.map((r) => (
            <li key={r.pregunta} className={r.enRevision ? 'eq-resultados__ok' : 'eq-resultados__no'}>
              <strong>{r.pregunta}</strong>
              <span>
                {r.mensaje}{' '}
                {r.fichaId && (
                  <Link className="enlace" href={`/equipo/fichas/${r.fichaId}`}>
                    Ver la ficha
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <details className="eq-detalles">
        <summary>¿No se te ocurren preguntas? Pedile ideas a la IA</summary>
        <form onSubmit={enviar(pedirIdeas)} className="eq-form" style={{ marginTop: 'var(--space-2)' }}>
          <input type="hidden" name="actividad" value={actividad} />
          <div className="eq-fila">
            <label className="campo">
              <span className="campo__nombre">Sobre qué (opcional)</span>
              <input className="campo__entrada" name="enfoque" maxLength={200} placeholder="Por ejemplo: el núcleo, la fluorescencia, la piel" />
            </label>
            <button className="btn btn--claro btn--chico" type="submit" disabled={pensando}>
              {pensando ? 'Pensando…' : `Ideas para ${ACTIVIDADES[actividad]?.split(' · ')[0] ?? 'la actividad'}`}
            </button>
          </div>
          {ideas.mensaje && !pensando && <p className={`eq-mensaje ${ideas.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`}>{ideas.mensaje}</p>}
        </form>
        {!pensando && ideas.preguntas && ideas.preguntas.length > 0 && (
          <div className="eq-form" style={{ marginTop: 'var(--space-2)' }}>
            {ideas.preguntas.map((p) => (
              <label key={p} className="eq-check">
                <input
                  type="checkbox"
                  checked={elegidas.includes(p)}
                  onChange={(e) => setElegidas(e.target.checked ? [...elegidas, p] : elegidas.filter((x) => x !== p))}
                />
                {p}
              </label>
            ))}
            <div className="eq-botones">
              <button className="btn btn--secundario btn--chico" type="button" disabled={!elegidas.length} onClick={agregar}>
                Agregar {elegidas.length || ''} a la lista
              </button>
            </div>
          </div>
        )}
      </details>
    </section>
  );
}
