import Link from 'next/link';
import { exigirMiembro } from '@/datos/equipo';
import { nombresDelEquipo, pendientesDeRevision } from '@/datos/fichas';
import { fechaHora } from '@/lib/equipo/comun';

/* /equipo/revisar · Lo que espera una validadora: fichas y publicaciones en revisión, las más viejas primero */
export default async function Page() {
  const yo = await exigirMiembro();
  const [{ versiones, publicaciones }, nombres] = await Promise.all([pendientesDeRevision(), nombresDelEquipo()]);
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Para revisar</h1>
        <p className="eq-bajada">
          {yo.rol === 'validador'
            ? 'Primero las fuentes (los artículos), porque una ficha solo se puede aprobar si sus fuentes están aprobadas.'
            : 'Solo las validadoras aprueban. Acá ves qué está esperando.'}
        </p>
      </div>
      <section className="eq-caja">
        <h2>Artículos ({publicaciones.length})</h2>
        {publicaciones.length === 0 ? (
          <p className="eq-bajada">Nada esperando.</p>
        ) : (
          <table className="eq-tabla">
            <tbody>
              {publicaciones.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/equipo/biblioteca/${p.id}`}>{p.titulo}</Link>
                    <span className="eq-tabla__chico">
                      {[p.revista, p.anio].filter(Boolean).join(', ')} · licencia {p.licencia_codigo ?? 'sin verificar'}
                      {p.retractada ? ' · RETRACTADA' : ''}
                    </span>
                  </td>
                  <td>
                    {p.agregada_por ? nombres[p.agregada_por] ?? '—' : '—'}
                    <span className="eq-tabla__chico">{fechaHora(p.enviada_en)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="eq-caja">
        <h2>Fichas ({versiones.length})</h2>
        {versiones.length === 0 ? (
          <p className="eq-bajada">Nada esperando.</p>
        ) : (
          <table className="eq-tabla">
            <tbody>
              {versiones.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link href={yo.rol === 'validador' ? `/equipo/revisar/${v.id}` : `/equipo/fichas/${v.fichas.id}`}>
                      {v.pregunta || v.version_infantil.slice(0, 90) || v.fichas.slug}
                    </Link>
                    <span className="eq-tabla__chico">
                      {v.fichas.formato === 'pregunta' ? 'Pregunta' : 'Dato'} · versión {v.numero}
                      {v.autor_id === yo.id ? ' · la escribiste vos' : ''}
                    </span>
                  </td>
                  <td>
                    {nombres[v.autor_id] ?? '—'}
                    <span className="eq-tabla__chico">{fechaHora(v.enviada_en)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
