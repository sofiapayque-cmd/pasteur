'use client';

import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import Moli from '@/components/Moli';
import { preguntarAlPasteur, verRespuesta, type EstadoAsistente, type Respuesta } from '@/acciones/asistente';
import { ACTIVIDADES_DISPONIBLES } from '@/lib/aulas/tareas';
import './asistente.css';

/*
  /maestra/preguntar · "Preguntale al Pasteur" (modo clase).
  La maestra escribe la pregunta de la clase. Solo se muestran respuestas
  APROBADAS por una investigadora, tal cual, con el sello y sus fuentes.
  "Mostrar en grande" la deja lista para proyectar.
*/
const SELLO = 'Revisado por una investigadora del Institut Pasteur de Montevideo';

function Tarjeta({ r, onGrande }: { r: Respuesta; onGrande: () => void }) {
  return (
    <article className="asis__respuesta" aria-labelledby="asis-pregunta">
      <h2 className="asis__pregunta" id="asis-pregunta">
        {r.pregunta}
      </h2>
      <p className="asis__infantil">{r.infantil}</p>
      <p className="asis__sello">
        <span aria-hidden="true">✓</span> {SELLO}
      </p>
      <div className="asis__acciones">
        <button className="btn btn--primario" type="button" onClick={onGrande}>
          Mostrar en grande
        </button>
      </div>
      {r.fuentes.length > 0 && (
        <details className="asis__fuentes">
          <summary>De dónde sale ({r.fuentes.length === 1 ? '1 artículo' : `${r.fuentes.length} artículos`})</summary>
          <ul>
            {r.fuentes.map((f, i) => (
              <li key={i}>
                {f.titulo}
                {f.revista || f.anio ? <span> · {[f.revista, f.anio].filter(Boolean).join(', ')}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

export default function Asistente({ cuenta, lista, inicial = {} }: { cuenta: string; lista: boolean; inicial?: EstadoAsistente }) {
  const [estado, preguntar, buscando] = useActionState<EstadoAsistente, FormData>(preguntarAlPasteur, inicial);
  const [elegida, setElegida] = useState<EstadoAsistente | null>(null);
  const [grande, setGrande] = useState(false);
  const [texto, setTexto] = useState('');
  const [actividad, setActividad] = useState('');
  const mostrado = elegida ?? estado;
  const respuesta = mostrado.resultado?.tipo === 'respuesta' ? mostrado.resultado.respuesta : null;

  useEffect(() => {
    if (!grande) return;
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && setGrande(false);
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [grande]);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setElegida(null);
    const datos = new FormData(e.currentTarget);
    startTransition(() => preguntar(datos));
  }

  async function elegir(fichaId: string) {
    setElegida(await verRespuesta(fichaId));
  }

  return (
    <main className="pantalla asis">
      <FondoVivo semilla={13} opacidad={0.35} />
      <Cabecera volverA="/maestra" miga="Inicio › Maestras › Preguntale al Pasteur" derecha={<CuentaDocente nombre={cuenta} />} />
      <div className="asis__cuerpo">
        <div className="asis__cabeza">
          <div>
            <h1>Preguntale al Pasteur</h1>
            <p className="asis__bajada">
              Escribí la pregunta que hizo la clase. Solo aparecen respuestas que revisó una investigadora del Instituto. Si todavía no la tenemos, se la pasamos al
              equipo.
            </p>
          </div>
          <div aria-hidden="true" className="asis__moli">
            <Moli animo={buscando ? 'duda' : 'feliz'} estilo="plano" patas tamano={110} />
          </div>
        </div>

        {!lista ? (
          <p className="asis__aviso">El asistente todavía no está listo en esta versión de la web.</p>
        ) : (
          <form className="asis__form" onSubmit={enviar}>
            <label className="campo">
              <span className="campo__nombre">La pregunta de la clase</span>
              <textarea
                className="campo__entrada"
                name="pregunta"
                rows={2}
                maxLength={300}
                required
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="¿Por qué las células tienen núcleo?"
              />
            </label>
            <div className="asis__fila">
              <label className="campo">
                <span className="campo__nombre">Actividad (opcional)</span>
                <select className="campo__entrada" name="actividad" value={actividad} onChange={(e) => setActividad(e.target.value)}>
                  <option value="">Ninguna en especial</option>
                  {ACTIVIDADES_DISPONIBLES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.numero} · {a.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn--primario btn--grande" type="submit" disabled={buscando || texto.trim().length < 5}>
                {buscando ? 'Buscando…' : 'Preguntar'}
              </button>
            </div>
            <p className="asis__nota">No escribas nombres de los chicos: no hacen falta.</p>
          </form>
        )}

        {!buscando && mostrado.mensaje && (
          <p className="asis__aviso" role="status">
            {mostrado.mensaje}
          </p>
        )}

        {!buscando && respuesta && <Tarjeta r={respuesta} onGrande={() => setGrande(true)} />}

        {!buscando && mostrado.resultado?.tipo === 'parecidas' && (
          <section className="asis__caja" aria-labelledby="asis-parecidas">
            <h2 id="asis-parecidas">Esa exacta todavía no la tenemos, pero sí estas parecidas:</h2>
            <div className="asis__opciones">
              {mostrado.resultado.opciones.map((o) => (
                <button key={o.fichaId} type="button" className="asis__opcion" onClick={() => elegir(o.fichaId)}>
                  {o.pregunta}
                </button>
              ))}
            </div>
            <p className="asis__nota">La tuya se la pasamos al equipo del Pasteur, por si hace falta una respuesta nueva.</p>
          </section>
        )}

        {!buscando && mostrado.resultado?.tipo === 'nada' && (
          <section className="asis__caja" role="status">
            <h2>Todavía no tenemos esa respuesta</h2>
            <p>Ya se la pasamos al equipo del Pasteur. Cuando una investigadora la apruebe, va a aparecer acá. Mientras tanto, es una linda pregunta para investigar en clase.</p>
          </section>
        )}

        {!buscando && mostrado.resultado?.tipo === 'cuidado' && (
          <section className="asis__caja asis__caja--cuidado" role="status">
            <h2>Mejor conversarla en clase</h2>
            <p>
              Esta pregunta toca un tema delicado, así que el asistente no la responde ni la guarda. Si a un chico le preocupa algo de esto, lo mejor es que lo hable con un
              adulto de confianza.
            </p>
          </section>
        )}
      </div>

      {grande && respuesta && (
        <div className="asis__grande" role="dialog" aria-modal="true" aria-label="Respuesta en grande">
          <button className="btn btn--claro asis__cerrar" type="button" onClick={() => setGrande(false)}>
            Cerrar
          </button>
          <p className="asis__grande-pregunta">{respuesta.pregunta}</p>
          <p className="asis__grande-texto">{respuesta.infantil}</p>
          <p className="asis__sello asis__sello--grande">
            <span aria-hidden="true">✓</span> {SELLO}
          </p>
        </div>
      )}
    </main>
  );
}
