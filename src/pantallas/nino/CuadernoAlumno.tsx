'use client';

import { useActionState, useState, useTransition } from 'react';
import { anotarAlumno, borrarNotaAlumno, type EstadoNota } from '@/acciones/cuadernos';
import type { CuadernoAlumno as Datos, NotaAlumno, RespuestaCorta } from '@/datos/cuadernos';
import { actividad as datosActividad } from '@/lib/aulas/tareas';
import { MAX_NOTA_ALUMNO } from '@/lib/cuadernos';
import '../cuadernos.css';

/*
  "Mi cuaderno" del chico (pestaña de /lab, migración 25):
  escribir una nota o una pregunta (las lee su maestra; nada va a la IA),
  sus preguntas con lo que pasó con cada una (y la respuesta del Pasteur si
  llegó), sus notas, sus investigaciones (lo que guardó cada actividad) y
  las preguntas de su clase que ya tienen respuesta.
*/
const SELLO = 'Revisado por una investigadora del Institut Pasteur de Montevideo';
const nombreAct = (a: string | null) => {
  const d = a ? datosActividad(a) : null;
  return d ? `${d.numero} · ${d.nombre}` : null;
};
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', day: 'numeric', month: 'short' });

const igual = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '') === b.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '');

/** La respuesta aprobada. Si responde con otras palabras, se ve también su pregunta. */
function Respuesta({ r, de }: { r: RespuestaCorta; de: string }) {
  return (
    <div className="cuad__respuesta">
      {!igual(r.pregunta, de) && <strong>{r.pregunta}</strong>}
      <span>{r.infantil}</span>
      <span className="cuad__sello">✓ {SELLO}</span>
    </div>
  );
}

function Borrar({ id }: { id: string }) {
  const [borrando, empezar] = useTransition();
  return (
    <button
      className="btn btn--claro btn--chico"
      type="button"
      disabled={borrando}
      onClick={() => window.confirm('¿Borrar esto de tu cuaderno?') && empezar(() => borrarNotaAlumno(id))}
    >
      {borrando ? 'Borrando…' : 'Borrar'}
    </button>
  );
}

function Item({ n }: { n: NotaAlumno }) {
  const act = nombreAct(n.actividad);
  return (
    <li className="cuad__item">
      <span className="cuad__meta">
        {fecha(n.creadaEn)}
        {act && <span>· {act}</span>}
        {n.paso && <span className={`cuad__paso cuad__paso--${n.paso.paso}`}>{n.paso.texto}</span>}
      </span>
      <p>{n.texto}</p>
      {n.respuesta && <Respuesta r={n.respuesta} de={n.texto} />}
      {n.estado === 'nueva' && (
        <span className="cuad__acciones">
          <Borrar id={n.id} />
        </span>
      )}
    </li>
  );
}

function Escribir({ actividades }: { actividades: string[] }) {
  const [estado, anotar, guardando] = useActionState<EstadoNota, FormData>(anotarAlumno, { mensaje: '' });
  const [tipo, setTipo] = useState<'nota' | 'pregunta'>('pregunta');
  const [texto, setTexto] = useState('');
  // Si se guardó, la hoja queda en blanco para la próxima (al cambiar el resultado, no en un efecto)
  const [visto, setVisto] = useState(estado);
  if (estado !== visto) {
    setVisto(estado);
    if (estado.ok) setTexto('');
  }
  return (
    <form className="cuad__form" action={anotar}>
      <fieldset className="cuad__tipo">
        <legend className="solo-lector">Qué querés escribir</legend>
        <label>
          <input type="radio" name="tipo" value="pregunta" checked={tipo === 'pregunta'} onChange={() => setTipo('pregunta')} /> Una pregunta
        </label>
        <label>
          <input type="radio" name="tipo" value="nota" checked={tipo === 'nota'} onChange={() => setTipo('nota')} /> Una nota
        </label>
      </fieldset>
      <label className="campo">
        <span className="campo__nombre">{tipo === 'pregunta' ? '¿Qué te gustaría saber?' : '¿Qué observaste o qué te llamó la atención?'}</span>
        <textarea
          className="campo__entrada"
          name="texto"
          rows={3}
          maxLength={MAX_NOTA_ALUMNO}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={tipo === 'pregunta' ? '¿Por qué las bacterias de la Antártida son de colores?' : 'En la placa del frío crecieron colonias anaranjadas.'}
          required
        />
      </label>
      <div className="cuad__fila">
        {actividades.length > 0 && (
          <label className="campo">
            <span className="campo__nombre">De qué actividad (si es de una)</span>
            <select className="campo__entrada" name="actividad" defaultValue="">
              <option value="">Ninguna en especial</option>
              {actividades.map((a) => (
                <option key={a} value={a}>
                  {nombreAct(a)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="btn btn--primario" type="submit" disabled={guardando || texto.trim().length < 2}>
          {guardando ? 'Guardando…' : 'Anotar'}
        </button>
      </div>
      <p className="cuad__nota">
        Lo lee tu maestra. No escribas tu nombre ni datos tuyos.{tipo === 'pregunta' ? ' Tu maestra se la puede mandar al Pasteur.' : ''}
      </p>
      {!guardando && estado.mensaje && (
        <p className={estado.ok ? 'cuad__nota' : 'cuad__nota cuad__error'} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

export default function CuadernoAlumno({ cuaderno }: { cuaderno: Datos }) {
  const { disponible, preguntas, notas, investigaciones, deLaClase, actividades } = cuaderno;
  return (
    <>
      {disponible ? (
        <>
          <section className="lab__caja" aria-labelledby="cuad-escribir">
            <h2 id="cuad-escribir">Escribir en mi cuaderno</h2>
            <Escribir actividades={actividades} />
          </section>

          <section className="lab__caja" aria-labelledby="cuad-preguntas">
            <h2 id="cuad-preguntas">Mis preguntas</h2>
            {preguntas.length === 0 ? (
              <p className="cuad__vacio">Todavía no escribiste ninguna.</p>
            ) : (
              <ul className="cuad__lista">
                {preguntas.map((n) => (
                  <Item key={n.id} n={n} />
                ))}
              </ul>
            )}
          </section>

          <section className="lab__caja" aria-labelledby="cuad-notas">
            <h2 id="cuad-notas">Mis notas</h2>
            {notas.length === 0 ? (
              <p className="cuad__vacio">Todavía no anotaste nada.</p>
            ) : (
              <ul className="cuad__lista">
                {notas.map((n) => (
                  <Item key={n.id} n={n} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="lab__caja">
          <p>Muy pronto vas a poder escribir tus notas y preguntas acá.</p>
        </section>
      )}

      <section className="lab__caja" aria-labelledby="cuad-investigaciones">
        <h2 id="cuad-investigaciones">Mis investigaciones</h2>
        {investigaciones.length === 0 ? (
          <p className="cuad__vacio">Cuando hagas una actividad, acá queda lo que fuiste descubriendo.</p>
        ) : (
          <ul className="cuad__lista">
            {investigaciones.map((i) => (
              <li key={i.tareaId} className="cuad__item">
                <span className="cuad__meta">
                  <strong>{nombreAct(i.actividad)}</strong>
                  {i.terminada && <span className="cuad__paso cuad__paso--respondida">Terminada</span>}
                </span>
                <dl className="cuad__seccion">
                  {i.secciones.map((s) => (
                    <div key={s.id}>
                      <dt>{s.nombre}</dt>
                      <dd>
                        <ul>
                          {s.items.map((x, k) => (
                            <li key={k}>{x}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deLaClase.length > 0 && (
        <section className="lab__caja" aria-labelledby="cuad-clase">
          <h2 id="cuad-clase">Preguntas que hizo mi clase</h2>
          <ul className="cuad__lista">
            {deLaClase.map((c) => (
              <li key={c.id} className="cuad__item">
                <p>{c.texto}</p>
                <Respuesta r={c.respuesta} de={c.texto} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
