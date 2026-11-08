import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirMiembro } from '@/datos/equipo';
import { listarFuentes, listarTemas, nombresDelEquipo, obtenerFicha, publicacionesCitables } from '@/datos/fichas';
import { listarLicencias } from '@/datos/biblioteca';
import { abrirVersionNueva, cambiarDatosFicha, enviarARevision, retirarEnvio, retirarFicha } from '@/acciones/fichas';
import { ACTIVIDADES, NOMBRE_ESTADO, fechaHora } from '@/lib/equipo/comun';
import Forma from '@/pantallas/equipo/Forma';
import EditorVersion from '@/pantallas/equipo/EditorVersion';
import Citas from '@/pantallas/equipo/Citas';
import VistaVersion from '@/pantallas/equipo/VistaVersion';

/* /equipo/fichas/[id] · Una ficha: la versión abierta (para editar), la publicada y la historia */
const DECISION: Record<string, string> = { aprobar: 'Aprobó', pedir_cambios: 'Pidió cambios', rechazar: 'Rechazó' };
const AVISO_REVISADA: Record<string, string> = {
  aprobar: 'Aprobada: esta versión ya es la que ven los chicos.',
  pedir_cambios: 'Pediste cambios: la versión volvió a borrador con tu comentario.',
  rechazar: 'Rechazada.',
};

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ revisada?: string }> }) {
  const yo = await exigirMiembro();
  const { id } = await params;
  const { revisada } = await searchParams;
  const datos = await obtenerFicha(id);
  if (!datos) notFound();
  const { ficha, versiones, citas, revisiones } = datos;
  const [nombres, temas, publicaciones, fuentes, licencias] = await Promise.all([
    nombresDelEquipo(),
    listarTemas(),
    publicacionesCitables(),
    listarFuentes(),
    listarLicencias(),
  ]);
  const politicas = Object.fromEntries(licencias.map((l) => [l.codigo, l.pasaje]));

  const abierta = versiones.find((v) => v.estado === 'borrador' || v.estado === 'en_revision') ?? null;
  const publicada = versiones.find((v) => v.id === ficha.version_publicada_id) ?? null;
  const esAutora = abierta?.autor_id === yo.id;
  const puedeEditar = !!abierta && ((esAutora && ['borrador', 'en_revision'].includes(abierta.estado)) || (yo.rol === 'validador' && abierta.estado === 'en_revision'));
  const ultimaRevisionAbierta = abierta ? revisiones.find((r) => r.objeto_id === abierta.id) : undefined;
  const titulo = (abierta ?? publicada ?? versiones[0])?.pregunta || ficha.slug;

  return (
    <main className="eq-cuerpo">
      <div>
        <Link className="enlace" href="/equipo/fichas">
          ← Fichas
        </Link>
        <h1>{titulo}</h1>
        <div className="eq-meta">
          <span>{ficha.formato === 'pregunta' ? 'Pregunta' : 'Dato'}</span>
          <span className={`eq-estado eq-estado--${ficha.estado}`}>Ficha {NOMBRE_ESTADO[ficha.estado].toLowerCase()}</span>
          {ficha.actividad && <span>{ACTIVIDADES[ficha.actividad]}</span>}
          <span>/{ficha.slug}</span>
        </div>
      </div>

      {revisada && AVISO_REVISADA[revisada] && <p className="eq-caja eq-caja--ok">{AVISO_REVISADA[revisada]}</p>}
      {ficha.estado === 'retirada' && (
        <p className="eq-caja eq-caja--aviso">
          Retirada {fechaHora(ficha.retirada_en)}: {ficha.motivo_retiro}. El asistente no la usa. Se puede volver a publicar con una versión nueva aprobada.
        </p>
      )}

      <div className="eq-dos">
        <div className="eq-form">
          {abierta ? (
            <section className="eq-caja">
              <h2>
                Versión {abierta.numero} · {NOMBRE_ESTADO[abierta.estado]}
              </h2>
              <p className="eq-ayuda">
                Escribe {nombres[abierta.autor_id] ?? '—'}.{' '}
                {abierta.estado === 'en_revision'
                  ? `En revisión desde ${fechaHora(abierta.enviada_en)}. Si se corrige ahora, quien revise tiene que volver a cargarla.`
                  : publicada
                    ? 'Los chicos siguen viendo la versión publicada hasta que se apruebe esta.'
                    : 'Todavía nadie la ve fuera del equipo.'}
              </p>
              {ultimaRevisionAbierta?.decision === 'pedir_cambios' && abierta.estado === 'borrador' && (
                <p className="eq-caja eq-caja--aviso">
                  <strong>{nombres[ultimaRevisionAbierta.revisor_id] ?? 'La validadora'} pidió cambios:</strong> {ultimaRevisionAbierta.comentario}
                </p>
              )}
              {puedeEditar ? (
                <EditorVersion v={abierta} formato={ficha.formato} enRevision={abierta.estado === 'en_revision'} />
              ) : (
                <VistaVersion v={abierta} formato={ficha.formato} autor={nombres[abierta.autor_id]} />
              )}
            </section>
          ) : publicada ? (
            <section className="eq-caja">
              <h2>Para cambiarla</h2>
              <p className="eq-ayuda">Lo publicado no se edita: se abre una versión nueva (copia de la publicada) y los chicos siguen viendo la actual hasta que se apruebe la nueva.</p>
              <Forma accion={abrirVersionNueva.bind(null, ficha.id)} boton="Abrir versión nueva" variante="secundario" className="" />
            </section>
          ) : null}

          {abierta && (
            <section className="eq-caja">
              <h2>Fuentes de la versión {abierta.numero}</h2>
              <Citas
                versionId={abierta.id}
                citas={citas[abierta.id] ?? []}
                editable={puedeEditar}
                publicaciones={publicaciones}
                fuentes={fuentes}
                politicas={politicas}
              />
            </section>
          )}

          {publicada && (
            <section className="eq-caja">
              <h2>Publicada (lo que ven los chicos)</h2>
              <VistaVersion v={publicada} formato={ficha.formato} citas={citas[publicada.id] ?? []} autor={nombres[publicada.autor_id]} />
            </section>
          )}
        </div>

        <aside className="eq-form">
          {abierta && esAutora && abierta.estado === 'borrador' && (
            <section className="eq-caja">
              <h2>¿Lista?</h2>
              <p className="eq-ayuda">Al mandarla, la base revisa que tenga lo mínimo (texto, largo, fuentes con su pasaje) y guarda su huella.</p>
              <Forma accion={enviarARevision.bind(null, abierta.id)} boton="Mandar a revisión" enviando="Mandando…" className="" />
            </section>
          )}
          {abierta && esAutora && abierta.estado === 'en_revision' && (
            <section className="eq-caja">
              <h2>En revisión</h2>
              <Forma accion={retirarEnvio.bind(null, abierta.id)} boton="Sacar de revisión" variante="secundario" className="" />
            </section>
          )}
          {abierta && yo.rol === 'validador' && abierta.estado === 'en_revision' && (
            <section className="eq-caja">
              <h2>Revisar</h2>
              <p className="eq-ayuda">{esAutora ? 'La escribiste vos: si la aprobás, queda marcado que la escribió y la aprobó la misma persona.' : 'Leela entera con sus fuentes y decidí.'}</p>
              <Link className="btn btn--primario btn--chico" href={`/equipo/revisar/${abierta.id}`}>
                Abrir para revisar
              </Link>
            </section>
          )}

          <section className="eq-caja">
            <h2>Datos de la ficha</h2>
            <Forma accion={cambiarDatosFicha.bind(null, ficha.id)} boton="Guardar">
              <label className="campo">
                <span className="campo__nombre">Actividad</span>
                <select className="campo__entrada" name="actividad" defaultValue={ficha.actividad ?? ''}>
                  <option value="">Ninguna en particular</option>
                  {Object.entries(ACTIVIDADES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span className="campo__nombre">Tema</span>
                <select className="campo__entrada" name="tema" defaultValue={ficha.tema_id ?? ''}>
                  <option value="">Sin tema</option>
                  {temas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </Forma>
          </section>

          <section className="eq-caja">
            <h2>Historia</h2>
            <ul className="eq-lista">
              {versiones.map((v) => (
                <li key={v.id}>
                  <strong>Versión {v.numero}</strong> <span className={`eq-estado eq-estado--${v.estado}`}>{NOMBRE_ESTADO[v.estado]}</span>
                  <span className="eq-tabla__chico">
                    {nombres[v.autor_id] ?? '—'} · {fechaHora(v.creada_en)}
                  </span>
                  {revisiones
                    .filter((r) => r.objeto_id === v.id)
                    .map((r) => (
                      <span key={r.id} className="eq-tabla__chico">
                        {DECISION[r.decision]}: {nombres[r.revisor_id] ?? '—'}, {fechaHora(r.creada_en)}
                        {r.autoaprobada ? ' (la misma persona que la escribió)' : ''}
                        {r.comentario ? ` — “${r.comentario}”` : ''}
                      </span>
                    ))}
                </li>
              ))}
            </ul>
          </section>

          {ficha.estado === 'publicada' && (yo.rol === 'validador' || yo.rol === 'admin') && (
            <section className="eq-caja eq-caja--peligro">
              <h2>Retirar</h2>
              <p className="eq-ayuda">Sale del asistente en el momento (por ejemplo, si hay datos nuevos que la contradicen).</p>
              <Forma accion={retirarFicha.bind(null, ficha.id)} boton="Retirar ficha" variante="claro" confirmar="¿Retirar esta ficha? El asistente deja de usarla ya.">
                <label className="campo">
                  <span className="campo__nombre">Motivo</span>
                  <input className="campo__entrada" name="motivo" required minLength={5} maxLength={600} />
                </label>
              </Forma>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
