'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { descartarPregunta, redactarPendientes, type EstadoPedido } from '@/acciones/respuestas';
import type { PreguntaSinRespuesta } from '@/datos/respuestas';
import { ACTIVIDADES, fecha } from '@/lib/equipo/comun';

/*
  Preguntas que hicieron las clases y el asistente no pudo responder.
  Sin maestra, sin aula y sin hora: solo el texto, cuántas veces y el día.
  Se eligen (hasta 4) y la IA las redacta igual que "Pedir respuestas".
*/
export default function PreguntasDeClases({ preguntas }: { preguntas: PreguntaSinRespuesta[] }) {
  const [estado, redactar, redactando] = useActionState<EstadoPedido, FormData>(redactarPendientes, { mensaje: '' });
  const [elegidas, setElegidas] = useState<string[]>([]);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => redactar(datos));
    setElegidas([]);
  }

  return (
    <section className="eq-caja eq-form" aria-labelledby="clases-titulo">
      <div>
        <h2 id="clases-titulo">Preguntas de las clases sin respuesta ({preguntas.length})</h2>
        <p className="eq-bajada">Las hicieron maestras con el asistente y todavía no hay una respuesta aprobada. Elegí hasta 4 y la IA las prepara.</p>
      </div>
      {preguntas.length === 0 ? (
        <p className="eq-bajada">No hay preguntas pendientes.</p>
      ) : (
        <form onSubmit={enviar} className="eq-form">
          <ul className="eq-lista eq-clases">
            {preguntas.map((p) => (
              <li key={p.id} className="eq-clases__fila">
                <label className="eq-check">
                  <input
                    type="checkbox"
                    name="id"
                    value={p.id}
                    checked={elegidas.includes(p.id)}
                    disabled={!elegidas.includes(p.id) && elegidas.length >= 4}
                    onChange={(e) => setElegidas(e.target.checked ? [...elegidas, p.id] : elegidas.filter((x) => x !== p.id))}
                  />
                  <span>
                    <strong>{p.texto}</strong>
                    <span className="eq-tabla__chico">
                      {p.veces === 1 ? '1 vez' : `${p.veces} veces`} · última: {fecha(`${p.ultima_vez}T12:00:00`)}
                      {p.actividad ? ` · ${ACTIVIDADES[p.actividad]?.split(' · ')[0] ?? ''}` : ''}
                    </span>
                  </span>
                </label>
                <button type="button" className="enlace" onClick={() => startTransition(() => descartarPregunta(p.id))}>
                  Descartar
                </button>
              </li>
            ))}
          </ul>
          <div className="eq-botones">
            <button className="btn btn--primario btn--chico" type="submit" disabled={redactando || elegidas.length === 0}>
              {redactando ? 'Buscando y redactando…' : `Que la IA ${elegidas.length > 1 ? `redacte estas ${elegidas.length}` : 'la redacte'}`}
            </button>
            {redactando && <p className="eq-mensaje">Tarda uno o dos minutos por pregunta.</p>}
            {!redactando && estado.mensaje && <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`}>{estado.mensaje}</p>}
          </div>
        </form>
      )}
      {!redactando && estado.resultados && estado.resultados.length > 0 && (
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
    </section>
  );
}
