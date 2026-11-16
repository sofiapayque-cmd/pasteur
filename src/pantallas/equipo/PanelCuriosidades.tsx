'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState, useTransition, type FormEvent } from 'react';
import {
  actualizarCuriosidadesAhora,
  cargarTemasIniciales,
  crearTema,
  descartarConsulta,
  ocultarCuriosidadAuto,
  ubicarConsulta,
  type EstadoCuriosidades,
} from '@/acciones/curiosidades';
import { ACTIVIDADES, ACTIVIDADES_A_ELEGIR } from '@/lib/equipo/comun';
import type { AutoPanel, CuriosidadPanel, EstadoAutomaticas, SinTema, TemaPanel, TendenciaPanel } from '@/datos/curiosidadesEquipo';
import { conPregunta } from '@/components/Curiosidades';
import ConGota from '@/components/ConGota';

/*
  /equipo/curiosidades · Curiosidades según lo más consultado.
  Desde el 15/11 son automáticas (pedido de Sofia: "sin nada que aprobar"):
  cada día se sacan de las respuestas aprobadas (una oración tal cual) y se
  muestran según lo que más se pregunta; las preguntas sin tema se agrupan
  solas en temas nuevos. Ver src/datos/curiosidadesAutomaticas.ts.
  1. Cómo funcionan, y "Actualizar ahora" (admin).
  2. Lo más consultado: temas de los últimos 30 días y sus curiosidades.
  3. Las curiosidades: automáticas (se pueden ocultar) y las escritas a mano.
  4. Preguntas que no se parecían a ningún tema: ubicarlas o descartarlas.
  5. Temas (los armados solos están marcados).
  Los chicos solo ven texto aprobado por una validadora.
*/
type Props = {
  rol: 'admin' | 'redactor' | 'validador';
  temas: TemaPanel[];
  tendencia: TendenciaPanel[];
  curiosidades: CuriosidadPanel[];
  sinTema: SinTema[];
  minimo: number;
  automaticas: AutoPanel[];
  estadoAutomaticas: EstadoAutomaticas;
};

type Pestana = CuriosidadPanel['estado'] | 'automatica';
const ESTADOS: { k: CuriosidadPanel['estado']; texto: string; clase: string }[] = [
  { k: 'publicada', texto: 'Escritas, publicadas', clase: 'publicada' },
  { k: 'espera', texto: 'Esperando revisión', clase: 'en_revision' },
  { k: 'borrador', texto: 'Borradores', clase: 'borrador' },
  { k: 'rechazada', texto: 'Rechazadas', clase: 'rechazada' },
  { k: 'retirada', texto: 'Retiradas', clase: 'retirada' },
];
const nombreAct = (a: string | null) => (a ? (ACTIVIDADES[a] ?? a).split(' · ')[0] : 'Todas');

const enviar = (accion: (datos: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const datos = new FormData(e.currentTarget);
  startTransition(() => accion(datos));
};

function Actualizar() {
  const [estado, actualizar, actualizando] = useActionState<EstadoCuriosidades, FormData>(actualizarCuriosidadesAhora, { mensaje: '' });
  return (
    <form action={actualizar} className="eq-fila" style={{ alignItems: 'center', gap: 8 }}>
      <button className="btn btn--secundario btn--chico" disabled={actualizando}>
        {actualizando ? 'Actualizando… (puede tardar un par de minutos)' : 'Actualizar ahora'}
      </button>
      {!actualizando && estado.mensaje && (
        <span className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </span>
      )}
    </form>
  );
}

function Ocultar({ c }: { c: AutoPanel }) {
  const [mensaje, setMensaje] = useState('');
  const [ocupado, empezar] = useTransition();
  return (
    <span className="eq-fila" style={{ gap: 8, alignItems: 'center' }}>
      <button className="btn btn--chico" disabled={ocupado} onClick={() => empezar(async () => setMensaje((await ocultarCuriosidadAuto(c.id, !c.oculta)).mensaje))}>
        {c.oculta ? 'Volver a mostrar' : 'Ocultar'}
      </button>
      {mensaje && <small role="status">{mensaje}</small>}
    </span>
  );
}

function Ubicar({ consulta, temas }: { consulta: SinTema; temas: TemaPanel[] }) {
  const [tema, setTema] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, empezar] = useTransition();
  const opciones = temas.filter((t) => t.activo && (!consulta.actividad || !t.actividad || t.actividad === consulta.actividad));
  return (
    <li className="eq-fila" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>
        {consulta.texto} <small className="eq-meta">· {consulta.veces === 1 ? '1 vez' : `${consulta.veces} veces`} · {nombreAct(consulta.actividad)}</small>
      </span>
      <span className="eq-fila" style={{ gap: 8, alignItems: 'center' }}>
        <select className="campo__entrada" aria-label={`Tema para "${consulta.texto}"`} value={tema} onChange={(e) => setTema(e.target.value)}>
          <option value="">Elegí un tema…</option>
          {opciones.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <button className="btn btn--secundario btn--chico" disabled={!tema || ocupado} onClick={() => empezar(async () => setMensaje((await ubicarConsulta(consulta.id, tema)).mensaje))}>
          Ubicar
        </button>
        <button className="btn btn--chico" disabled={ocupado} onClick={() => empezar(async () => setMensaje((await descartarConsulta(consulta.id)).mensaje))}>
          Descartar
        </button>
        {mensaje && <small role="status">{mensaje}</small>}
      </span>
    </li>
  );
}

function CrearTema() {
  const [estado, crear, creando] = useActionState<EstadoCuriosidades, FormData>(crearTema, { mensaje: '' });
  return (
    <form onSubmit={enviar(crear)} className="eq-form">
      <div className="eq-fila">
        <label className="campo" style={{ flex: '1 1 220px' }}>
          <span className="campo__nombre">Nombre</span>
          <input className="campo__entrada" name="nombre" maxLength={80} placeholder="Por ejemplo: Bacterias del mar" />
        </label>
        <label className="campo" style={{ flex: '0 1 240px' }}>
          <span className="campo__nombre">Actividad</span>
          <select className="campo__entrada" name="actividad" defaultValue="a1">
            {ACTIVIDADES_A_ELEGIR.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="campo">
        <span className="campo__nombre">Descripción (con ella se reconoce qué preguntas son de este tema)</span>
        <input className="campo__entrada" name="descripcion" maxLength={600} placeholder="Qué bacterias viven en el agua de mar y qué hacen." />
      </label>
      <div className="eq-fila" style={{ alignItems: 'center' }}>
        <button className="btn btn--primario btn--chico" disabled={creando}>
          {creando ? 'Creando…' : 'Crear tema'}
        </button>
        {estado.mensaje && <span className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`}>{estado.mensaje}</span>}
      </div>
    </form>
  );
}

export default function PanelCuriosidades({ rol, temas, tendencia, curiosidades, sinTema, minimo, automaticas, estadoAutomaticas }: Props) {
  const [ver, setVer] = useState<Pestana>(automaticas.length ? 'automatica' : curiosidades.some((c) => c.estado === 'espera') ? 'espera' : 'publicada');
  const [cargando, empezarCarga] = useTransition();
  const [mensajeCarga, setMensajeCarga] = useState('');
  const puedeOcultar = rol === 'admin' || rol === 'validador';
  const temaDe = (id: string | null) => temas.find((t) => t.id === id)?.nombre ?? 'Sin tema';
  const maximo = Math.max(1, ...tendencia.map((t) => t.puntaje));
  const conConsultas = tendencia.filter((t) => t.consultas > 0);
  // Las que se pueden mostrar por tema: escritas y publicadas + automáticas vigentes y no ocultas
  const autoPorTema = new Map<string, number>();
  for (const a of automaticas) if (a.temaId && a.vigente && !a.oculta) autoPorTema.set(a.temaId, (autoPorTema.get(a.temaId) ?? 0) + 1);
  const totalDe = (t: TendenciaPanel) => t.curiosidades + (autoPorTema.get(t.temaId) ?? 0);
  const faltan = conConsultas.filter((t) => totalDe(t) < minimo).slice(0, 8);
  const visibles = curiosidades.filter((c) => c.estado === ver);
  const autosVisibles = [...automaticas].sort((a, b) => Number(a.oculta) - Number(b.oculta) || Number(b.vigente) - Number(a.vigente));

  if (!temas.length) {
    return (
      <section className="eq-caja eq-caja--aviso eq-form">
        <h2>Todavía no hay temas</h2>
        <p>
          Los temas agrupan las preguntas parecidas y las curiosidades. Hay una propuesta de 40 temas (14 de A1, 12 de A2 y 14 de A3), armada con las 100 preguntas
          del 14/11. Después se pueden cambiar, apagar o agregar.
        </p>
        {rol === 'admin' ? (
          <div className="eq-fila" style={{ alignItems: 'center' }}>
            <button className="btn btn--primario" disabled={cargando} onClick={() => empezarCarga(async () => setMensajeCarga((await cargarTemasIniciales()).mensaje))}>
              {cargando ? 'Cargando…' : 'Cargar los 40 temas propuestos'}
            </button>
            {mensajeCarga && <span role="status">{mensajeCarga}</span>}
          </div>
        ) : (
          <p>Los carga la admin del equipo.</p>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="eq-caja eq-form" aria-labelledby="cur-como">
        <div>
          <h2 id="cur-como">Se arman solas</h2>
          <p className="eq-bajada">
            Cada día, sin que nadie tenga que aprobar nada nuevo: de cada respuesta aprobada por la validadora se eligen hasta dos oraciones que sirven solas como
            &quot;¿Sabías que…?&quot;, tal cual están en la respuesta. Se muestran sobre todo las de los temas que más preguntan los chicos. Las preguntas que no
            se parecen a ningún tema se agrupan solas en temas nuevos.
          </p>
        </div>
        {estadoAutomaticas.disponible ? (
          <p className="eq-meta">
            {estadoAutomaticas.total} {estadoAutomaticas.total === 1 ? 'curiosidad' : 'curiosidades'} de {estadoAutomaticas.respuestasMiradas} de{' '}
            {estadoAutomaticas.aprobadas} respuestas aprobadas
            {estadoAutomaticas.respuestasMiradas < estadoAutomaticas.aprobadas ? ` (faltan mirar ${estadoAutomaticas.aprobadas - estadoAutomaticas.respuestasMiradas})` : ''}
            {estadoAutomaticas.ultima ? ` · última actualización ${new Date(estadoAutomaticas.ultima).toLocaleString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'short' })}` : ''}.
          </p>
        ) : (
          <p className="eq-meta">Falta la actualización de la base (migración 23) para que empiecen a armarse.</p>
        )}
        {rol === 'admin' && estadoAutomaticas.disponible && <Actualizar />}
      </section>

      <section className="eq-caja eq-form" aria-labelledby="cur-tendencia">
        <div>
          <h2 id="cur-tendencia">Lo más consultado (últimos 30 días)</h2>
          <p className="eq-bajada">
            Preguntas al asistente (con y sin respuesta) y respuestas abiertas en las actividades, sin datos de quién. Lo de esta semana pesa más que lo de hace un
            mes. Las curiosidades que se muestran salen sobre todo de estos temas.
          </p>
        </div>
        {conConsultas.length === 0 ? (
          <p className="eq-meta">Todavía no hay consultas. Mientras tanto, se muestran curiosidades de cualquier tema.</p>
        ) : (
          <table className="eq-tabla">
            <thead>
              <tr>
                <th>Tema</th>
                <th>Actividad</th>
                <th>Tendencia</th>
                <th>Consultas</th>
                <th>Curiosidades</th>
              </tr>
            </thead>
            <tbody>
              {conConsultas.slice(0, 15).map((t) => (
                <tr key={t.temaId}>
                  <td>{t.nombre}</td>
                  <td>{nombreAct(t.actividad)}</td>
                  <td>
                    <span className="cur-barra" style={{ width: `${Math.max(4, (t.puntaje / maximo) * 100)}%` }} aria-label={`${Math.round(t.puntaje * 10) / 10} puntos`} />
                  </td>
                  <td>{t.consultas}</td>
                  <td>{totalDe(t) < minimo ? <b>{totalDe(t)} · le faltan</b> : totalDe(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {faltan.length > 0 && (
          <div className="eq-form">
            <h3>Temas consultados con pocas curiosidades</h3>
            <p className="eq-meta">
              Las curiosidades salen de respuestas aprobadas: para que un tema tenga más, hacen falta respuestas aprobadas sobre él (se piden en Revisar). También
              se puede escribir una a mano.
            </p>
            <ul className="eq-lista">
              {faltan.map((t) => (
                <li key={t.temaId} className="eq-fila" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <b>{t.nombre}</b> <small className="eq-meta">· {nombreAct(t.actividad)} · {totalDe(t)} {totalDe(t) === 1 ? 'curiosidad' : 'curiosidades'}</small>
                  </span>
                  <Link className="btn btn--chico" href={`/equipo/fichas/nueva?formato=dato&tema=${t.temaId}`}>
                    Escribir una
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="eq-caja eq-form" aria-labelledby="cur-lista">
        <div className="eq-fila" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 id="cur-lista">Curiosidades</h2>
          <Link className="btn btn--chico" href="/equipo/fichas/nueva?formato=dato">
            Escribir una curiosidad
          </Link>
        </div>
        <ConGota className="eq-pestanas" etiqueta="Estado">
          <button type="button" aria-current={ver === 'automatica' ? 'true' : undefined} onClick={() => setVer('automatica')}>
            Automáticas ({estadoAutomaticas.total})
          </button>
          {ESTADOS.map((e) => (
            <button key={e.k} type="button" aria-current={ver === e.k ? 'true' : undefined} onClick={() => setVer(e.k)}>
              {e.texto} ({curiosidades.filter((c) => c.estado === e.k).length})
            </button>
          ))}
        </ConGota>
        {ver === 'automatica' ? (
          autosVisibles.length === 0 ? (
            <p className="eq-meta">Todavía no hay. Se arman solas cada día con las respuestas aprobadas{rol === 'admin' ? ', o con "Actualizar ahora"' : ''}.</p>
          ) : (
            <ul className="eq-tarjetas">
              {autosVisibles.map((c) => (
                <li key={c.id} className="eq-tarjeta" style={c.oculta || !c.vigente ? { opacity: 0.6 } : undefined}>
                  <div className="eq-fila" style={{ gap: 8, alignItems: 'center' }}>
                    <span className={`eq-estado eq-estado--${c.oculta || !c.vigente ? 'retirada' : 'publicada'}`}>
                      {c.oculta ? 'Oculta' : c.vigente ? 'Se muestra' : 'Su respuesta ya no está'}
                    </span>
                    <small className="eq-meta">{temaDe(c.temaId)}</small>
                  </div>
                  <p className="eq-texto-infantil">{conPregunta(c.texto)}</p>
                  <small className="eq-meta">De la respuesta aprobada: {c.pregunta || '—'}</small>
                  <div className="eq-fila" style={{ gap: 12, alignItems: 'center' }}>
                    <Link className="enlace" href={`/equipo/fichas/${c.fichaId}`}>
                      Ver la respuesta
                    </Link>
                    {puedeOcultar && c.vigente && <Ocultar c={c} />}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : visibles.length === 0 ? (
          <p className="eq-meta">No hay curiosidades en este estado.</p>
        ) : (
          <ul className="eq-tarjetas">
            {visibles.map((c) => (
              <li key={c.id} className="eq-tarjeta">
                <div className="eq-fila" style={{ gap: 8, alignItems: 'center' }}>
                  <span className={`eq-estado eq-estado--${ESTADOS.find((e) => e.k === c.estado)?.clase}`}>{ESTADOS.find((e) => e.k === c.estado)?.texto.replace(/s$/, '')}</span>
                  <small className="eq-meta">
                    {temaDe(c.temaId)} · {nombreAct(c.actividad)}
                    {c.ia ? ' · IA' : ''}
                  </small>
                </div>
                <h3>{c.titulo || 'Sin título'}</h3>
                <p className="eq-texto-infantil">{conPregunta(c.texto)}</p>
                <Link className="enlace" href={`/equipo/fichas/${c.id}`}>
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="eq-caja eq-form" aria-labelledby="cur-sin-tema">
        <div>
          <h2 id="cur-sin-tema">Preguntas que no se parecen a ningún tema ({sinTema.length})</h2>
          <p className="eq-bajada">
            Preguntas de las clases al asistente. Cada día, las que se parecen entre sí se agrupan solas en un tema nuevo. También las podés ubicar vos: sus veces
            pasan a contar para ese tema. Se borran solas a los 90 días.
          </p>
        </div>
        {sinTema.length === 0 ? (
          <p className="eq-meta">No hay ninguna.</p>
        ) : (
          <ul className="eq-lista">
            {sinTema.map((s) => (
              <Ubicar key={s.id} consulta={s} temas={temas} />
            ))}
          </ul>
        )}
      </section>

      <section className="eq-caja eq-form" aria-labelledby="cur-temas">
        <div>
          <h2 id="cur-temas">Temas ({temas.filter((t) => t.activo).length})</h2>
          <p className="eq-bajada">Cada pregunta cuenta para el tema más parecido a su nombre y descripción. Los armados solos tienen nombre puesto por la IA: no se les muestra a los chicos.</p>
        </div>
        <details className="eq-detalles">
          <summary>Ver los temas</summary>
          <ul className="eq-lista">
            {temas.map((t) => (
              <li key={t.id}>
                <b>{t.nombre}</b>{' '}
                <small className="eq-meta">
                  · {nombreAct(t.actividad)}
                  {t.padreId ? ` · dentro de ${temaDe(t.padreId)}` : ''}
                  {t.automatico ? ' · armado solo' : ''}
                  {t.activo ? '' : ' · apagado'}
                  {t.conIndice ? '' : ' · preparando'}
                </small>
                <br />
                <small>{t.descripcion}</small>
              </li>
            ))}
          </ul>
        </details>
        {rol === 'admin' && <CrearTema />}
      </section>
    </>
  );
}
