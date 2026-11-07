import Link from 'next/link';
import { exigirMiembro } from '@/datos/equipo';
import { listarPublicaciones } from '@/datos/biblioteca';
import { NOMBRE_ESTADO, fecha } from '@/lib/equipo/comun';
import Buscador from '@/pantallas/equipo/Buscador';

/* /equipo/biblioteca · Buscar artículos (en vivo) y ver los que ya están en la biblioteca */
export const maxDuration = 30;

const FILTROS = [
  { clave: '', texto: 'Para decidir' },
  { clave: 'aprobada', texto: 'Aprobadas' },
  { clave: 'cerradas', texto: 'Rechazadas o retiradas' },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await exigirMiembro();
  const { ver = '' } = await searchParams;
  const todas = await listarPublicaciones();
  const visibles = todas.filter((p) =>
    ver === 'aprobada' ? p.estado === 'aprobada' : ver === 'cerradas' ? ['rechazada', 'retirada'].includes(p.estado) : ['candidata', 'en_revision'].includes(p.estado),
  );
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Biblioteca científica</h1>
        <p className="eq-bajada">
          Artículos que respaldan las fichas. Se buscan en PubMed, OpenAlex y Europe PMC; al agregarlos quedan como <strong>candidatos</strong> y una validadora los aprueba como fuente.
          No se guarda el texto completo de ningún artículo: solo sus datos, el resumen (para el equipo) y el pasaje que cita cada ficha.
        </p>
      </div>
      <Buscador />
      <section className="eq-caja">
        <h2>En la biblioteca</h2>
        <nav className="eq-pestanas" aria-label="Filtrar">
          {FILTROS.map((x) => (
            <Link key={x.clave} href={x.clave ? `/equipo/biblioteca?ver=${x.clave}` : '/equipo/biblioteca'} aria-current={ver === x.clave ? 'true' : undefined}>
              {x.texto}
            </Link>
          ))}
        </nav>
        {visibles.length === 0 ? (
          <p className="eq-bajada">Nada por acá todavía.</p>
        ) : (
          <table className="eq-tabla">
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/equipo/biblioteca/${p.id}`}>{p.titulo}</Link>
                    <span className="eq-tabla__chico">
                      {[p.revista, p.anio].filter(Boolean).join(', ')}
                      {p.del_instituto ? ' · Institut Pasteur de Montevideo' : ''}
                      {p.retractada ? ' · RETRACTADA' : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`eq-estado eq-estado--${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span>
                    {p.estado === 'candidata' && p.vence_en && <span className="eq-tabla__chico">vence {fecha(p.vence_en)}</span>}
                  </td>
                  <td>
                    {p.licencia_codigo ?? 'sin verificar'}
                    {p.licencia_revisar && <span className="eq-tabla__chico">las fuentes no coinciden</span>}
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
