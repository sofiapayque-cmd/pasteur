'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { anotarMaestra, borrarNotaMaestra, marcarCharlada, preguntarDesdeCuaderno, type EstadoNota } from '@/acciones/cuadernos';
import type { EstadoAsistente } from '@/acciones/asistente';
import type { CuadernoClase as Datos, NotaDeChico, PreguntaMaestra, RespuestaCorta } from '@/datos/cuadernos';
import type { EntradaDiario } from '@/lib/cuadernos';
import { MAX_NOTA_MAESTRA, textoMinutos } from '@/lib/cuadernos';
import { actividad as datosActividad } from '@/lib/aulas/tareas';
import '../cuadernos.css';

/*
  Cuaderno de una clase, para la maestra (migración 25, pedido de Sofia del 16/11):
  1. Preguntas de los chicos: mandarla al Pasteur (la misma búsqueda de
     "Preguntale al Pasteur"; la respuesta le llega también al chico) o
     marcar que la charlaron en clase.
  2. Diario de clase: las clases en vivo (actividad y cuánto duraron) y lo
     que ella anotó (qué hicieron, qué preguntaron, qué funcionó).
  3. Preguntas al Pasteur de esta clase, con su respuesta o "esperando".
  4. Notas de los chicos.
*/
const nombreAct = (a: string | null) => {
  const d = a ? datosActividad(a) : null;
  return d ? `${d.numero} · ${d.nombre}` : null;
};
const fechaCorta = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' });
const fechaDe = (iso: string) => new Date(iso).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', day: 'numeric', month: 'short' });

const igual = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '') === b.toLowerCase().replace(/[^a-z0-9áéíóúñü]/g, '');

/** La respuesta aprobada. Si responde con otras palabras, se ve también su pregunta. */
function Respuesta({ r, de }: { r: RespuestaCorta; de: string }) {
  return (
    <div className="cuad__respuesta">
      {!igual(r.pregunta, de) && <strong>{r.pregunta}</strong>}
      <span>{r.infantil}</span>
      <span className="cuad__sello">✓ Revisada por una investigadora del Instituto</span>
    </div>
  );
}

function resumen(e: EstadoAsistente): string {
  if (e.mensaje) return e.mensaje;
  const t = e.resultado?.tipo;
  if (t === 'respuesta') return '¡Ya tenía respuesta! Le aparece en su cuaderno.';
  if (t === 'parecidas' || t === 'nada') return 'Todavía no la tenemos: se la pasamos al equipo. Cuando la respondan, te avisamos y le aparece al chico.';
  if (t === 'cuidado') return 'Toca un tema delicado: mejor conversarla en clase.';
  return '';
}

function PreguntaDeChico({ n, puede }: { n: NotaDeChico; puede: boolean }) {
  const [ocupado, empezar] = useTransition();
  const [mensaje, setMensaje] = useState('');
  const act = nombreAct(n.actividad);
  return (
    <li className={`cuad__item ${n.estado === 'nueva' ? 'cuad__nueva' : ''}`}>
      <span className="cuad__meta">
        <strong>{n.alumno}</strong> · {fechaDe(n.creadaEn)}
        {act && <span>· {act}</span>}
        {n.respuesta ? (
          <span className="cuad__paso cuad__paso--respondida">Respondida</span>
        ) : n.esperando ? (
          <span className="cuad__paso cuad__paso--esperando">Esperando al equipo del Pasteur</span>
        ) : n.estado === 'conversada' ? (
          <span className="cuad__paso">La charlaron en clase</span>
        ) : null}
      </span>
      <p>{n.texto}</p>
      {n.respuesta && <Respuesta r={n.respuesta} de={n.texto} />}
      {n.estado === 'nueva' && (
        <span className="cuad__acciones">
          {puede && (
            <button
              className="btn btn--primario btn--chico"
              type="button"
              disabled={ocupado}
              onClick={() => empezar(async () => setMensaje(resumen(await preguntarDesdeCuaderno(n.id))))}
            >
              {ocupado ? 'Preguntando…' : 'Preguntársela al Pasteur'}
            </button>
          )}
          <button className="btn btn--claro btn--chico" type="button" disabled={ocupado} onClick={() => empezar(() => marcarCharlada(n.id))}>
            Ya la charlamos
          </button>
        </span>
      )}
      {mensaje && (
        <p className="cuad__nota" role="status">
          {mensaje}
        </p>
      )}
    </li>
  );
}

function FormDiario({
  aulaId,
  actividades,
  hoy,
  inicial,
  onListo,
}: {
  aulaId: string;
  actividades: string[];
  hoy: string;
  inicial?: { id?: string; fecha: string; actividad: string | null; minutos: number | null; texto: string; sesion?: string };
  onListo?: () => void;
}) {
  const [estado, guardar, guardando] = useActionState<EstadoNota, FormData>(anotarMaestra.bind(null, aulaId), { mensaje: '' });
  useEffect(() => {
    if (estado.ok) onListo?.();
  }, [estado, onListo]);
  const todas = [...new Set([...actividades, ...(inicial?.actividad ? [inicial.actividad] : [])])];
  return (
    <form className="cuad__form" action={guardar}>
      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      {inicial?.sesion && <input type="hidden" name="sesion" value={inicial.sesion} />}
      <div className="cuad__fila">
        <label className="campo">
          <span className="campo__nombre">Fecha</span>
          <input className="campo__entrada" type="date" name="fecha" max={hoy} defaultValue={inicial?.fecha ?? hoy} required />
        </label>
        <label className="campo">
          <span className="campo__nombre">Actividad</span>
          <select className="campo__entrada" name="actividad" defaultValue={inicial?.actividad ?? ''}>
            <option value="">Ninguna en especial</option>
            {todas.map((a) => (
              <option key={a} value={a}>
                {nombreAct(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span className="campo__nombre">Minutos</span>
          <input className="campo__entrada" type="number" name="minutos" min={1} max={600} defaultValue={inicial?.minutos ?? ''} placeholder="45" />
        </label>
      </div>
      <label className="campo">
        <span className="campo__nombre">Qué hicieron, qué preguntaron, qué funcionó</span>
        <textarea
          className="campo__entrada"
          name="texto"
          rows={4}
          maxLength={MAX_NOTA_MAESTRA}
          defaultValue={inicial?.texto ?? ''}
          placeholder="Hicimos la parte de las placas. Preguntaron por qué crecían más en lo tibio. Les costó elegir la temperatura."
        />
      </label>
      <div className="cuad__acciones">
        <button className="btn btn--primario btn--chico" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : inicial?.id ? 'Guardar cambios' : 'Anotar'}
        </button>
        {!guardando && estado.mensaje && (
          <span className={estado.ok ? 'cuad__nota' : 'cuad__nota cuad__error'} role="status">
            {estado.mensaje}
          </span>
        )}
      </div>
    </form>
  );
}

function Entrada({ e, aulaId, actividades, hoy }: { e: EntradaDiario; aulaId: string; actividades: string[]; hoy: string }) {
  const [editando, setEditando] = useState(false);
  const [borrando, empezar] = useTransition();
  const act = nombreAct(e.actividad);
  const tiempo = textoMinutos(e.minutos);
  return (
    <li className="cuad__item">
      <span className="cuad__meta">
        <strong>{fechaCorta(e.fecha)}</strong>
        {act && <span>· {act}</span>}
        {tiempo && <span>· {tiempo}</span>}
        {e.sesion && <span className="cuad__paso">Clase en vivo</span>}
      </span>
      {editando ? (
        <FormDiario
          aulaId={aulaId}
          actividades={actividades}
          hoy={hoy}
          inicial={
            e.nota
              ? { id: e.nota.id, fecha: e.nota.fecha, actividad: e.nota.actividad, minutos: e.nota.minutos, texto: e.nota.texto }
              : { fecha: e.fecha, actividad: e.actividad, minutos: e.minutos, texto: '', sesion: e.sesion?.id }
          }
          onListo={() => setEditando(false)}
        />
      ) : (
        <>
          {e.nota?.texto ? <p>{e.nota.texto}</p> : <p className="cuad__vacio">{e.sesion ? 'Sin anotaciones de esta clase.' : ''}</p>}
          <span className="cuad__acciones">
            <button className="btn btn--claro btn--chico" type="button" onClick={() => setEditando(true)}>
              {e.nota ? 'Corregir' : 'Anotar esta clase'}
            </button>
            {e.nota && (
              <button
                className="btn btn--claro btn--chico"
                type="button"
                disabled={borrando}
                onClick={() => window.confirm('¿Borrar esta anotación?') && empezar(() => borrarNotaMaestra(e.nota!.id))}
              >
                Borrar
              </button>
            )}
          </span>
        </>
      )}
    </li>
  );
}

function Pregunta({ p, clase }: { p: PreguntaMaestra; clase?: string }) {
  const act = nombreAct(p.actividad);
  return (
    <li className={`cuad__item ${p.nueva ? 'cuad__nueva' : ''}`}>
      <span className="cuad__meta">
        {clase && <strong>{clase} ·</strong>}
        {fechaDe(p.creadaEn)}
        {act && <span>· {act}</span>}
        {p.respuesta ? (
          <span className="cuad__paso cuad__paso--respondida">{p.nueva ? '¡Respuesta nueva!' : 'Respondida'}</span>
        ) : (
          <span className="cuad__paso cuad__paso--esperando">Esperando al equipo del Pasteur</span>
        )}
      </span>
      <p>{p.texto}</p>
      {p.respuesta && <Respuesta r={p.respuesta} de={p.texto} />}
    </li>
  );
}

export default function CuadernoClase({ aulaId, cuaderno, hoy, puedePreguntar }: { aulaId: string; cuaderno: Datos; hoy: string; puedePreguntar: boolean }) {
  const { disponible, diario, preguntasChicos, notasChicos, preguntas, actividades } = cuaderno;
  const [anotando, setAnotando] = useState(false);
  if (!disponible) {
    return (
      <section className="aulas__bloque">
        <p>El cuaderno de la clase va a estar listo muy pronto.</p>
      </section>
    );
  }
  const nuevas = preguntasChicos.filter((n) => n.estado === 'nueva');
  const otras = preguntasChicos.filter((n) => n.estado !== 'nueva');
  return (
    <>
      <section className="aulas__bloque" aria-labelledby="cuad-chicos">
        <h2 id="cuad-chicos">Preguntas de los chicos {nuevas.length > 0 && `(${nuevas.length === 1 ? '1 nueva' : `${nuevas.length} nuevas`})`}</h2>
        {preguntasChicos.length === 0 ? (
          <p className="cuad__vacio">Los chicos pueden escribir preguntas en su cuaderno (pestaña &quot;Mi cuaderno&quot; de su laboratorio). Acá las vas a ver.</p>
        ) : (
          <ul className="cuad__lista">
            {[...nuevas, ...otras].map((n) => (
              <PreguntaDeChico key={n.id} n={n} puede={puedePreguntar} />
            ))}
          </ul>
        )}
      </section>

      <section className="aulas__bloque" aria-labelledby="cuad-diario">
        <div className="cuad__acciones" style={{ justifyContent: 'space-between' }}>
          <h2 id="cuad-diario">Diario de clase</h2>
          {!anotando && (
            <button className="btn btn--secundario btn--chico" type="button" onClick={() => setAnotando(true)}>
              Anotar una clase
            </button>
          )}
        </div>
        {anotando && <FormDiario aulaId={aulaId} actividades={actividades} hoy={hoy} onListo={() => setAnotando(false)} />}
        {diario.length === 0 ? (
          <p className="cuad__vacio">Las clases en vivo aparecen solas, con su actividad y cuánto duraron. También podés anotar las que hicieron sin la web.</p>
        ) : (
          <ul className="cuad__lista">
            {diario.map((e) => (
              <Entrada key={e.clave} e={e} aulaId={aulaId} actividades={actividades} hoy={hoy} />
            ))}
          </ul>
        )}
      </section>

      <section className="aulas__bloque" aria-labelledby="cuad-pasteur">
        <h2 id="cuad-pasteur">Preguntas al Pasteur de esta clase</h2>
        {preguntas.length === 0 ? (
          <p className="cuad__vacio">Cuando preguntes en &quot;Preguntale al Pasteur&quot; eligiendo esta clase, quedan acá con su respuesta.</p>
        ) : (
          <ul className="cuad__lista">
            {preguntas.map((p) => (
              <Pregunta key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      {notasChicos.length > 0 && (
        <section className="aulas__bloque" aria-labelledby="cuad-notas">
          <h2 id="cuad-notas">Notas de los chicos</h2>
          <ul className="cuad__lista">
            {notasChicos.map((n) => (
              <li key={n.id} className="cuad__item">
                <span className="cuad__meta">
                  <strong>{n.alumno}</strong> · {fechaDe(n.creadaEn)}
                  {nombreAct(n.actividad) && <span>· {nombreAct(n.actividad)}</span>}
                </span>
                <p>{n.texto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export { Pregunta as PreguntaDelCuaderno };
