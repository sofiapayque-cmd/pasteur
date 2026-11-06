import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirMiembro } from '@/datos/equipo';
import { listarLicencias, obtenerPublicacion } from '@/datos/biblioteca';
import { nombresDelEquipo } from '@/datos/fichas';
import { enviarPublicacion, fijarLicencia, resolverRelacion, retirarPublicacion, revisarPublicacion, sacarDeRevision } from '@/acciones/biblioteca';
import { NOMBRE_ESTADO, POLITICA_PASAJE, fecha, fechaHora } from '@/lib/equipo/comun';
import Forma from '@/pantallas/equipo/Forma';
import Revisar from '@/pantallas/equipo/Revisar';

/* /equipo/biblioteca/[id] · Un artículo: datos, licencia, revisión como fuente y posibles duplicados */
const TIPO: Record<string, string> = { articulo: 'Artículo', revision: 'Revisión', preprint: 'Preprint (sin revisión de pares)', otro: 'Otro' };
const ENLACE_ID: Record<string, (v: string) => string> = {
  doi: (v) => `https://doi.org/${v}`,
  pmid: (v) => `https://pubmed.ncbi.nlm.nih.gov/${v}/`,
  pmcid: (v) => `https://www.ncbi.nlm.nih.gov/pmc/articles/${v}/`,
  openalex: (v) => `https://openalex.org/${v}`,
  europepmc: (v) => `https://europepmc.org/article/${v.replace(':', '/')}`,
};
const DECISION: Record<string, string> = { aprobar: 'Aprobó', pedir_cambios: 'Pidió cambios', rechazar: 'Rechazó' };
const RESULTADO: Record<string, string> = {
  coincide: 'las fuentes coinciden',
  difiere: 'las fuentes no coinciden: vale la más restrictiva',
  sin_senal: 'ninguna fuente dice la licencia',
  manual: 'fijada a mano',
  se_mantiene_manual: 'automático, no cambia lo fijado a mano',
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const yo = await exigirMiembro();
  const { id } = await params;
  const datos = await obtenerPublicacion(id);
  if (!datos) notFound();
  const { publicacion: p, identificadores, accesos, procedencias, verificaciones, relaciones, revisiones, citadaEn } = datos;
  const [nombres, licencias] = await Promise.all([nombresDelEquipo(), listarLicencias()]);
  const licencia = licencias.find((l) => l.codigo === p.licencia_codigo);
  const puedeLicencia = yo.rol === 'validador' || yo.rol === 'admin';

  return (
    <main className="eq-cuerpo">
      <div>
        <Link className="enlace" href="/equipo/biblioteca">
          ← Biblioteca
        </Link>
        <h1>{p.titulo}</h1>
        <div className="eq-meta">
          <span className={`eq-estado eq-estado--${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span>
          <span>{TIPO[p.tipo]}</span>
          <span>{[p.revista, p.anio].filter(Boolean).join(', ')}</span>
          {p.del_instituto && <span>Institut Pasteur de Montevideo</span>}
          <span>{p.citas} citas</span>
          <span>Citada en {citadaEn} {citadaEn === 1 ? 'ficha' : 'fichas'}</span>
        </div>
      </div>

      {p.retractada && <p className="eq-caja eq-caja--aviso">Una de las fuentes informa que este artículo fue <strong>retractado</strong>: no se puede aprobar ni citar.</p>}
      {p.estado === 'retirada' && <p className="eq-caja eq-caja--aviso">Retirada {fechaHora(p.retirada_en)}: {p.motivo_retiro}</p>}
      {p.tipo === 'preprint' && <p className="eq-caja eq-caja--aviso">Es un preprint: todavía no pasó revisión de pares. Conviene buscar si ya hay una versión publicada.</p>}

      <div className="eq-dos">
        <div className="eq-form">
          <section className="eq-caja">
            <h2>Autores</h2>
            <p className="eq-bajada">
              {p.autores.length ? p.autores.map((a) => a.nombre).filter(Boolean).slice(0, 12).join(', ') + (p.autores.length > 12 ? ` y ${p.autores.length - 12} más` : '') : '—'}
            </p>
          </section>
          <section className="eq-caja">
            <h2>Resumen</h2>
            <p style={{ lineHeight: 1.55, margin: 0 }}>{p.resumen_interno ?? 'Las fuentes no traen resumen. Leelo en la página de la revista.'}</p>
            {p.resumen_interno && <p className="eq-ayuda">Viene de {p.resumen_origen === 'europepmc' ? 'Europe PMC' : 'OpenAlex'}. Solo lo ve el equipo.</p>}
            {p.mesh.length > 0 && <p className="eq-ayuda">Términos MeSH: {p.mesh.join(' · ')}</p>}
            {p.temas_externos.length > 0 && <p className="eq-ayuda">Temas (OpenAlex): {p.temas_externos.join(' · ')}</p>}
          </section>
          <section className="eq-caja">
            <h2>Dónde leerlo</h2>
            <ul className="eq-lista">
              {identificadores.map((i) => (
                <li key={`${i.tipo}:${i.valor}`}>
                  <span className="campo__nombre">{i.tipo.toUpperCase()}</span>{' '}
                  <a className="enlace" href={ENLACE_ID[i.tipo]?.(i.valor) ?? '#'} target="_blank" rel="noreferrer noopener">
                    {i.valor}
                  </a>
                </li>
              ))}
              {accesos.map((a) => (
                <li key={a.id}>
                  <a className="enlace" href={a.url} target="_blank" rel="noreferrer noopener">
                    {a.tipo === 'pdf' ? 'PDF' : 'Página'}
                    {a.es_oa ? ' (acceso abierto)' : ''}
                  </a>
                  <span className="eq-tabla__chico">{[a.version, a.licencia_texto, a.proveedor].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
          </section>
          {relaciones.length > 0 && (
            <section className="eq-caja">
              <h2>¿Es el mismo artículo?</h2>
              <ul className="eq-lista">
                {relaciones.map((r) => (
                  <li key={r.id}>
                    {r.otra ? <Link href={`/equipo/biblioteca/${r.otra.id}`}>{r.otra.titulo}</Link> : 'Otra publicación'}{' '}
                    <span className="eq-tabla__chico">
                      {r.otra?.anio} · {r.motivo} · {r.estado === 'sugerida' ? 'sin decidir' : r.estado}
                    </span>
                    {r.estado === 'sugerida' && (
                      <div className="eq-botones">
                        <Forma accion={resolverRelacion.bind(null, r.id, 'descartada')} boton="No, son distintos" variante="claro" className="" />
                        <Forma accion={resolverRelacion.bind(null, r.id, 'confirmada')} boton="Sí, es el mismo" variante="secundario" className="" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="eq-ayuda">Si es el mismo (por ejemplo, el preprint y la versión publicada), conviene aprobar solo uno: el publicado.</p>
            </section>
          )}
        </div>

        <aside className="eq-form">
          {p.estado === 'candidata' && (
            <section className="eq-caja">
              <h2>¿Sirve como fuente?</h2>
              <p className="eq-ayuda">Agregada por {p.agregada_por ? nombres[p.agregada_por] ?? '—' : '—'} el {fecha(p.creada_en)}. Si nadie la manda a revisión, vence el {fecha(p.vence_en)}.</p>
              <Forma accion={enviarPublicacion.bind(null, p.id)} boton="Mandar a revisión" className="" />
            </section>
          )}
          {p.estado === 'en_revision' && yo.rol === 'validador' && p.huella && (
            <section className="eq-caja">
              <h2>Tu decisión</h2>
              <Revisar accion={revisarPublicacion.bind(null, p.id)} huella={p.huella} propia={p.agregada_por === yo.id} que="publicacion" />
            </section>
          )}
          {p.estado === 'en_revision' && (
            <section className="eq-caja">
              <h2>En revisión</h2>
              <p className="eq-ayuda">Desde {fechaHora(p.enviada_en)}.</p>
              <Forma accion={sacarDeRevision.bind(null, p.id)} boton="Sacar de revisión" variante="claro" className="" />
            </section>
          )}

          <section className="eq-caja">
            <h2>Licencia</h2>
            <p>
              <strong>{licencia?.nombre ?? 'Sin verificar'}</strong>
              {p.licencia_revisar && <span className="eq-tabla__chico">Hay que revisarla: las fuentes no coinciden.</span>}
            </p>
            {licencia && <p className="eq-ayuda">{POLITICA_PASAJE[licencia.pasaje]}</p>}
            {puedeLicencia && p.estado !== 'rechazada' && (
              <details className="eq-detalles">
                <summary>Fijarla a mano</summary>
                <p className="eq-ayuda">Después de mirarla en la página de la revista. Lo automático ya no la cambia.</p>
                <Forma accion={fijarLicencia.bind(null, p.id)} boton="Fijar licencia">
                  <select className="campo__entrada" name="licencia" defaultValue={p.licencia_codigo ?? ''} required>
                    <option value="">Elegí…</option>
                    {licencias.map((l) => (
                      <option key={l.codigo} value={l.codigo}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </Forma>
              </details>
            )}
            {verificaciones.length > 0 && (
              <details className="eq-detalles">
                <summary>Cómo se verificó</summary>
                <ul className="eq-lista">
                  {verificaciones.map((v) => (
                    <li key={v.id} className="eq-tabla__chico">
                      {fechaHora(v.verificada_en)} · {v.senal_origen}: “{v.senal_texto || '—'}” → {v.licencia_detectada} ({RESULTADO[v.resultado] ?? v.resultado})
                      {v.verificada_por ? ` · ${nombres[v.verificada_por] ?? ''}` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="eq-caja">
            <h2>Historia</h2>
            <ul className="eq-lista">
              {revisiones.map((r) => (
                <li key={r.id} className="eq-tabla__chico">
                  {DECISION[r.decision]}: {nombres[r.revisor_id] ?? '—'}, {fechaHora(r.creada_en)}
                  {r.autoaprobada ? ' (la misma persona que la agregó)' : ''}
                  {r.comentario ? ` — “${r.comentario}”` : ''}
                </li>
              ))}
              {procedencias.map((x) => (
                <li key={x.id} className="eq-tabla__chico">
                  {fechaHora(x.obtenida_en)} · datos de {x.proveedor === 'openalex' ? 'OpenAlex' : 'Europe PMC'} ({x.id_externo})
                  {x.campos_aportados.length ? `: ${x.campos_aportados.join(', ')}` : ''}
                </li>
              ))}
            </ul>
          </section>

          {p.estado === 'aprobada' && puedeLicencia && (
            <section className="eq-caja eq-caja--peligro">
              <h2>Retirar</h2>
              <p className="eq-ayuda">Las fichas que la tienen como única fuente se retiran también, y las que están en revisión vuelven a borrador.</p>
              <Forma accion={retirarPublicacion.bind(null, p.id)} boton="Retirar como fuente" variante="claro" confirmar="¿Retirar este artículo como fuente? Las fichas que dependen solo de él salen del asistente.">
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
