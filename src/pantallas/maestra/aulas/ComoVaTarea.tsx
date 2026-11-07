'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import type { EstadoTareaForm } from '@/acciones/tareas';
import { SECCIONES } from '@/actividades/secciones';
import { actividad as datosActividad, dondeVa } from '@/lib/aulas/tareas';
import './aulas.css';

/*
  /maestra/aulas/[id]/tareas/[tarea] · Cómo va una tarea: en qué parte está
  cada chico, quién terminó, y los botones para habilitar lo que quedó para
  después o cerrar la tarea. Se actualiza sola cada 20 segundos.
*/
type Fila = { id: string; numero: number; apodo: string | null; activo: boolean; etapa: string | null; actualizado: string | null; terminada: boolean; cuaderno?: Record<string, string[]> | null };
type Accion = (previo: EstadoTareaForm, datos: FormData) => Promise<EstadoTareaForm>;

const hora = new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' });

function Boton({ accion, texto, variante = 'secundario' }: { accion: Accion; texto: string; variante?: string }) {
  const [estado, hacer, haciendo] = useActionState(accion, { mensaje: '' });
  return (
    <form action={hacer} className="tarea__estado">
      <button className={`btn btn--${variante} btn--chico`} type="submit" disabled={haciendo}>
        {haciendo ? '…' : texto}
      </button>
      {estado.mensaje && !haciendo && <span className="aulas__bajada">{estado.mensaje}</span>}
    </form>
  );
}

export default function ComoVaTarea({
  aula,
  tarea,
  filas,
  cuenta,
  cerrar,
  reabrir,
  desbloqueos,
}: {
  aula: { id: string; nombre: string };
  tarea: { id: string; actividad: string; estado: string; creada_en: string };
  filas: Fila[];
  cuenta: string;
  cerrar: Accion;
  reabrir: Accion;
  desbloqueos: { clave: string; etiqueta: string; habilitado: boolean; habilitar: Accion; cerrar: Accion }[];
}) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);

  const act = datosActividad(tarea.actividad);
  const activos = filas.filter((f) => f.activo);
  const empezaron = activos.filter((f) => f.etapa).length;
  const terminaron = activos.filter((f) => f.terminada).length;
  const abierta = tarea.estado === 'activa';

  return (
    <main className="pantalla aulas">
      <FondoVivo semilla={9} />
      <Cabecera volverA={`/maestra/aulas/${aula.id}`} miga={`Inicio › Mis aulas › ${aula.nombre} › ${act?.nombre ?? 'Actividad'}`} derecha={<CuentaDocente nombre={cuenta} />} />
      <div className="aulas__cuerpo">
        <div className="aula__cabeza">
          <div>
            <span className="etiqueta">
              {abierta ? 'Abierta' : 'Cerrada'} · mandada el {hora.format(new Date(tarea.creada_en))}
            </span>
            <h1>
              {act?.numero} · {act?.nombre}
            </h1>
            <p className="aulas__bajada">
              {empezaron} de {activos.length} empezaron · {terminaron} {terminaron === 1 ? 'terminó' : 'terminaron'} · se actualiza sola
            </p>
          </div>
          <div className="tarea__estado">
            {abierta ? <Boton accion={cerrar} texto="Cerrar la actividad" variante="claro" /> : <Boton accion={reabrir} texto="Abrirla otra vez" />}
          </div>
        </div>

        {abierta && desbloqueos.length > 0 && (
          <section className="aulas__bloque" aria-labelledby="titulo-habilitar">
            <h2 id="titulo-habilitar">Para habilitar</h2>
            {desbloqueos.map((d) => (
              <div key={d.clave} className="tarea__estado">
                <strong>{d.etiqueta}:</strong>
                <span>{d.habilitado ? 'habilitado' : 'todavía cerrado'}</span>
                {d.habilitado ? <Boton accion={d.cerrar} texto="Cerrar" variante="claro" /> : <Boton accion={d.habilitar} texto={`Habilitar ${d.etiqueta.toLowerCase()}`} />}
              </div>
            ))}
          </section>
        )}

        <section className="aulas__bloque" aria-labelledby="titulo-avance">
          <h2 id="titulo-avance">Cómo va cada uno</h2>
          <div className="aula__tabla-marco">
            <table className="aula__tabla">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Apodo</th>
                  <th>Por dónde va</th>
                  <th>Último cambio</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const va = dondeVa(tarea.actividad, f.etapa);
                  return (
                    <tr key={f.id} className={f.activo ? '' : 'aula__inactivo'}>
                      <td>{String(f.numero).padStart(2, '0')}</td>
                      <td>{f.apodo ?? '—'}</td>
                      <td>
                        {f.terminada ? (
                          <>
                            <span className="tarea__barra tarea__barra--lista" aria-hidden="true">
                              <span style={{ width: '100%' }} />
                            </span>
                            ¡Terminó!
                          </>
                        ) : f.etapa ? (
                          <>
                            <span className="tarea__barra" aria-hidden="true">
                              <span style={{ width: `${Math.round((va.indice / Math.max(va.total, 1)) * 100)}%` }} />
                            </span>
                            {va.nombre} ({va.indice} de {va.total})
                          </>
                        ) : (
                          'Sin empezar'
                        )}
                      </td>
                      <td>{f.actualizado ? hora.format(new Date(f.actualizado)) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <Cuadernos filas={filas} puestaUrl={`/maestra/aulas/${aula.id}/tareas/${tarea.id}/puesta`} />
      </div>
    </main>
  );
}

/* Cuaderno de investigación de cada chico (hipótesis, decisiones, variables, resultados, conclusiones) */
function Cuadernos({ filas, puestaUrl }: { filas: Fila[]; puestaUrl: string }) {
  const conAlgo = filas.filter((f) => f.cuaderno && SECCIONES.some((s) => f.cuaderno?.[s.id]?.length));
  const imprimir = () => {
    // Se imprimen abiertos (un <details> cerrado sale cerrado)
    document.querySelectorAll<HTMLDetailsElement>('details.cuaderno').forEach((d) => (d.open = true));
    window.print();
  };
  return (
    <section className="aulas__bloque cuadernos" aria-labelledby="titulo-cuadernos">
      <div className="aula__titulo-fila">
        <h2 id="titulo-cuadernos">Cuadernos de investigación</h2>
        <div className="aula__botones cuadernos__botones">
          <Link className="btn btn--secundario btn--chico" href={puestaUrl}>
            Lo que encontró la clase
          </Link>
          {conAlgo.length > 0 && (
            <button className="btn btn--claro btn--chico" type="button" onClick={imprimir}>
              Imprimir los cuadernos
            </button>
          )}
        </div>
      </div>
      {conAlgo.length === 0 ? (
        <p className="aulas__vacio">Cuando empiecen a investigar, acá aparece lo que hizo cada uno: su hipótesis, qué decidió, qué cambió, qué obtuvo y a qué llegó.</p>
      ) : (
        <div className="cuadernos__lista">
          {conAlgo.map((f) => (
            <details key={f.id} className="cuaderno">
              <summary>
                <span>
                  {String(f.numero).padStart(2, '0')} · {f.apodo ?? 'sin apodo'}
                </span>
                <span className="aulas__bajada">{f.terminada ? 'Terminó' : 'En curso'}</span>
              </summary>
              <dl>
                {SECCIONES.map((s) =>
                  f.cuaderno?.[s.id]?.length ? (
                    <div key={s.id}>
                      <dt>{s.nombre}</dt>
                      {f.cuaderno[s.id].map((t, i) => (
                        <dd key={i}>{t}</dd>
                      ))}
                    </div>
                  ) : null,
                )}
              </dl>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
