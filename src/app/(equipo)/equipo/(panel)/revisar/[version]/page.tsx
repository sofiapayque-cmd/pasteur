import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { exigirMiembro } from '@/datos/equipo';
import { nombresDelEquipo, obtenerVersion } from '@/datos/fichas';
import { revisarVersion } from '@/acciones/fichas';
import { fechaHora } from '@/lib/equipo/comun';
import VistaVersion from '@/pantallas/equipo/VistaVersion';
import Revisar from '@/pantallas/equipo/Revisar';

/*
  /equipo/revisar/[version] · La validadora lee la versión entera (con sus
  fuentes y la versión publicada al lado, si hay) y decide. El formulario
  lleva la huella de ESTE texto: si alguien lo cambia mientras tanto, la base
  no deja aprobar y pide volver a cargar.
*/
export default async function Page({ params }: { params: Promise<{ version: string }> }) {
  const yo = await exigirMiembro();
  const { version: id } = await params;
  const datos = await obtenerVersion(id);
  if (!datos) notFound();
  const { version, ficha, citas, publicada } = datos;
  if (yo.rol !== 'validador' || version.estado !== 'en_revision' || !version.huella) redirect(`/equipo/fichas/${ficha.id}`);
  const nombres = await nombresDelEquipo();
  const fuentesSinAprobar = citas.filter((c) => c.publicaciones && c.publicaciones.estado !== 'aprobada');

  return (
    <main className="eq-cuerpo">
      <div>
        <Link className="enlace" href="/equipo/revisar">
          ← Para revisar
        </Link>
        <h1>{version.pregunta || 'Dato'}</h1>
        <p className="eq-bajada">
          Enviada {fechaHora(version.enviada_en)} por {nombres[version.autor_id] ?? '—'}.{' '}
          <Link href={`/equipo/fichas/${ficha.id}`}>Corregir algo antes de decidir</Link> (después volvé a esta página).
        </p>
      </div>
      {fuentesSinAprobar.length > 0 && (
        <p className="eq-caja eq-caja--aviso">
          Cita {fuentesSinAprobar.length === 1 ? 'un artículo que todavía no está aprobado' : `${fuentesSinAprobar.length} artículos que todavía no están aprobados`} como fuente.
          Revisalos primero en Biblioteca.
        </p>
      )}
      <div className="eq-dos">
        <section className="eq-caja">
          <h2>Para revisar</h2>
          <VistaVersion v={version} formato={ficha.formato} citas={citas} autor={nombres[version.autor_id]} />
        </section>
        <aside className="eq-form">
          <section className="eq-caja">
            <h2>Tu decisión</h2>
            <Revisar accion={revisarVersion.bind(null, version.id)} huella={version.huella} propia={version.autor_id === yo.id} />
          </section>
          {publicada && (
            <section className="eq-caja">
              <h2>Lo que está publicado hoy</h2>
              <VistaVersion v={publicada} formato={ficha.formato} />
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
