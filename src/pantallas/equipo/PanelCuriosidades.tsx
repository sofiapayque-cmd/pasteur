'use client';

import Link from 'next/link';
import { startTransition, useActionState, useState, useTransition, type FormEvent } from 'react';
import {
  cargarTemasIniciales,
  crearTema,
  descartarConsulta,
  pedirCuriosidades,
  ubicarConsulta,
  type EstadoCuriosidades,
} from '@/acciones/curiosidades';
import { ACTIVIDADES, ACTIVIDADES_A_ELEGIR } from '@/lib/equipo/comun';
import type { CuriosidadPanel, SinTema, TemaPanel, TendenciaPanel } from '@/datos/curiosidadesEquipo';
import { conPregunta } from '@/components/Curiosidades';

/*
  /equipo/curiosidades · Curiosidades según lo más consultado (etapa 4).
  1. Lo más consultado: temas de los últimos 30 días (lo reciente pesa más),
     cuántas curiosidades publicadas tiene cada uno y, si le faltan, pedirle
     borradores a la IA o escribir una a mano.
  2. Las curiosidades, por estado (publicadas, esperando revisión, borradores).
  3. Preguntas que no se parecían a ningún tema: ubicarlas o descartarlas.
  4. Temas (la admin los crea; la primera vez, carga los propuestos).
  Nada se publica solo: todo pasa por la revisión de una validadora.
*/
type Props = {
  rol: 'admin' | 'redactor' | 'validador';
  temas: TemaPanel[];
  tendencia: TendenciaPanel[];
  curiosidades: CuriosidadPanel[];
  sinTema: SinTema[];
  minimo: number;
};

const ESTADOS: { k: CuriosidadPanel['estado']; texto: string; clase: string }[] = [
  { k: 'publicada', texto: 'Publicadas', clase: 'publicada' },
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

function PedirALaIA({ tema, puede }: { tema: { id: string; nombre: string }; puede: boolean }) {
  const [estado, pedir, pidiendo] = useActionState<EstadoCuriosidades, FormData>(pedirCuriosidades, { mensaje: '' });
  if (!puede) return null;
  return (
    <form onSubmit={enviar(pedir)} className="eq-fila" style={{ alignItems: 'center', gap: 8 }}>
      <input type="hidden" name="tema" value={tema.id} />
      <input type="hidden" name="cuantas" value="2" />
      <button className="btn btn--secundario btn--chico" disabled={pidiendo}>
        {pidiendo ? 'Buscando y redactando…' : 'Pedir 2 a la IA'}
      </button>
      {estado.mensaje && (
        <span className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
          {estado.resultados?.some((r) => !r.ok) ? ` ${estado.resultados.filter((r) => !r.ok).map((r) => r.mensaje).join(' ')}` : ''}
        </span>
      )}
    </form>
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

export default function PanelCuriosidades({ rol, temas, tendencia, curiosidades, sinTema, minimo }: Props) {
  const [ver, setVer] = useState<CuriosidadPanel['estado']>(curiosidades.some((c) => c.estado === 'espera') ? 'espera' : 'publicada');
  const [cargando, empezarCarga] = useTransition();
  const [mensajeCarga, setMensajeCarga] = useState('');
  const puedePedir = rol !== 'validador';
  const temaDe = (id: string | null) => temas.find((t) => t.id === id)?.nombre ?? 'Sin tema';
  const maximo = Math.max(1, ...tendencia.map((t) => t.puntaje));
  const conConsultas = tendencia.filter((t) => t.consultas > 0);
  const faltan = conConsultas.filter((t) => t.curiosidades < minimo).slice(0, 8);
  const visibles = curiosidades.filter((c) => c.estado === ver);

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
      <section className="eq-caja eq-form" aria-labelledby="cur-tendencia">
        <div>
          <h2 id="cur-tendencia">Lo más consultado (últimos 30 días)</h2>
          <p className="eq-bajada">
            Preguntas al asistente (con y sin respuesta) y respuestas abiertas en las actividades, sin datos de quién. Lo de esta semana pesa más que lo de hace un
            mes. Las curiosidades que se muestran salen sobre todo de estos temas.
          </p>
        </div>
        {conConsultas.length === 0 ? (
          <p className="eq-meta">Todavía no hay consultas. Mientras tanto, se muestran curiosidades publicadas de cualquier tema.</p>
        ) : (
          <table className="eq-tabla">
            <thead>
              <tr>
                <th>Tema</th>
                <th>Actividad</th>
                <th>Tendencia</th>
                <th>Consultas</th>
                <th>Curiosidades publicadas</th>
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
                  <td>{t.curiosidades < minimo ? <b>{t.curiosidades} · le faltan</b> : t.curiosidades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {faltan.length > 0 && (
          <div className="eq-form">
            <h3>Temas consultados con pocas curiosidades</h3>
            <ul className="eq-lista">
              {faltan.map((t) => (
                <li key={t.temaId} className="eq-fila" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <b>{t.nombre}</b> <small className="eq-meta">· {nombreAct(t.actividad)} · {t.curiosidades} publicadas</small>
                  </span>
                  <span className="eq-fila" style={{ gap: 8, alignItems: 'center' }}>
                    <PedirALaIA tema={{ id: t.temaId, nombre: t.nombre }} puede={puedePedir} />
                    <Link className="btn btn--chico" href={`/equipo/fichas/nueva?formato=dato&tema=${t.temaId}`}>
                      Escribir una
                    </Link>
                  </span>
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
        <nav className="eq-pestanas" aria-label="Estado">
          {ESTADOS.map((e) => (
            <button key={e.k} type="button" className="enlace" aria-current={ver === e.k ? 'true' : undefined} onClick={() => setVer(e.k)}>
              {e.texto} ({curiosidades.filter((c) => c.estado === e.k).length})
            </button>
          ))}
        </nav>
        {visibles.length === 0 ? (
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
          <p className="eq-bajada">Preguntas de las clases al asistente. Si las ubicás en un tema, sus veces pasan a contar para ese tema. Se borran solas a los 90 días.</p>
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
          <p className="eq-bajada">Cada pregunta cuenta para el tema más parecido a su nombre y descripción.</p>
        </div>
        <details className="eq-detalles">
          <summary>Ver los temas</summary>
          <ul className="eq-lista">
            {temas.map((t) => (
              <li key={t.id}>
                <b>{t.nombre}</b> <small className="eq-meta">· {nombreAct(t.actividad)}{t.activo ? '' : ' · apagado'}{t.conIndice ? '' : ' · preparando'}</small>
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
