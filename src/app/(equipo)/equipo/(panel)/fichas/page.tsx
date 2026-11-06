import Link from 'next/link';
import { exigirMiembro } from '@/datos/equipo';
import { listarFichas, nombresDelEquipo } from '@/datos/fichas';
import { ACTIVIDADES, NOMBRE_ESTADO, fecha } from '@/lib/equipo/comun';

/* /equipo/fichas · Todas las fichas, filtradas por estado */
const FILTROS = [
  { clave: '', texto: 'Todas' },
  { clave: 'borrador', texto: 'Borradores' },
  { clave: 'en_revision', texto: 'En revisión' },
  { clave: 'publicada', texto: 'Publicadas' },
  { clave: 'retirada', texto: 'Retiradas' },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await exigirMiembro();
  const { estado = '' } = await searchParams;
  const [fichas, nombres] = await Promise.all([listarFichas(), nombresDelEquipo()]);

  const filas = fichas.map((f) => {
    const abierta = f.ficha_versiones.find((v) => v.estado === 'borrador' || v.estado === 'en_revision');
    const ultima = [...f.ficha_versiones].sort((a, b) => b.numero - a.numero)[0];
    const muestra = abierta ?? ultima;
    const estadoVisible = f.estado === 'retirada' ? 'retirada' : abierta?.estado === 'en_revision' ? 'en_revision' : f.estado === 'publicada' ? 'publicada' : 'borrador';
    return { f, abierta, muestra, estadoVisible };
  });
  const visibles = filas.filter((x) => !estado || x.estadoVisible === estado || (estado === 'borrador' && x.abierta?.estado === 'borrador'));

  return (
    <main className="eq-cuerpo">
      <div className="eq-fila" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Fichas</h1>
          <p className="eq-bajada">Cada ficha es una pregunta con su respuesta, o un dato breve. Lo que los chicos ven es siempre la versión publicada.</p>
        </div>
        <Link className="btn btn--primario btn--chico" href="/equipo/fichas/nueva">
          Nueva ficha
        </Link>
      </div>
      <nav className="eq-pestanas" aria-label="Filtrar por estado">
        {FILTROS.map((x) => (
          <Link key={x.clave} href={x.clave ? `/equipo/fichas?estado=${x.clave}` : '/equipo/fichas'} aria-current={estado === x.clave ? 'true' : undefined}>
            {x.texto}
          </Link>
        ))}
      </nav>
      <section className="eq-caja">
        {visibles.length === 0 ? (
          <p className="eq-bajada">Todavía no hay fichas acá.</p>
        ) : (
          <table className="eq-tabla">
            <thead>
              <tr>
                <th>Ficha</th>
                <th>Estado</th>
                <th>Actividad</th>
                <th>Quién</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(({ f, muestra, estadoVisible, abierta }) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/equipo/fichas/${f.id}`}>{muestra?.pregunta || muestra?.version_infantil?.slice(0, 90) || f.slug}</Link>
                    <span className="eq-tabla__chico">
                      {f.formato === 'pregunta' ? 'Pregunta' : 'Dato'} · versión {muestra?.numero ?? 1}
                      {abierta && f.estado === 'publicada' ? ' · hay una versión nueva en curso' : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`eq-estado eq-estado--${estadoVisible}`}>{NOMBRE_ESTADO[estadoVisible]}</span>
                  </td>
                  <td>{f.actividad ? ACTIVIDADES[f.actividad] : '—'}</td>
                  <td>
                    {muestra ? nombres[muestra.autor_id] ?? '—' : '—'}
                    <span className="eq-tabla__chico">{fecha(muestra?.enviada_en ?? muestra?.creada_en)}</span>
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
