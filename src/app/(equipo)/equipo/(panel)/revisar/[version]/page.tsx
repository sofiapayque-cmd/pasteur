import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { exigirMiembro } from '@/datos/equipo';
import { nombresDelEquipo, obtenerVersion } from '@/datos/fichas';
import { revisarVersion } from '@/acciones/fichas';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { fechaHora } from '@/lib/equipo/comun';
import { dividirOraciones, oracionesDeUbicacion } from '@/lib/ia/redaccion';
import VistaVersion from '@/pantallas/equipo/VistaVersion';
import Revisar from '@/pantallas/equipo/Revisar';

/*
  /equipo/revisar/[version] · La validadora lee la versión entera (con sus
  fuentes y la versión publicada al lado, si hay) y decide. El formulario
  lleva la huella de ESTE texto: si alguien lo cambia mientras tanto, la base
  no deja aprobar y pide volver a cargar. Si cita artículos que también
  esperan revisión, se aprueban junto con la ficha (con sus huellas).
*/
export default async function Page({ params, searchParams }: { params: Promise<{ version: string }>; searchParams: Promise<{ desde?: string }> }) {
  const yo = await exigirMiembro();
  const { version: id } = await params;
  const { desde } = await searchParams;
  const datos = await obtenerVersion(id);
  if (!datos) notFound();
  const { version, ficha, citas, publicada } = datos;
  if (yo.rol !== 'validador' || version.estado !== 'en_revision' || !version.huella) redirect(`/equipo/fichas/${ficha.id}`);
  const nombres = await nombresDelEquipo();

  // Artículos citados: huella de los que esperan revisión y la oración del resumen de cada cita
  const idsPub = [...new Set(citas.map((c) => c.publicacion_id).filter((x): x is string => Boolean(x)))];
  const db = (await crearClienteServidor())!;
  const { data: pubs } = idsPub.length
    ? await db.from('publicaciones').select('id, estado, huella, resumen_interno').in('id', idsPub)
    : { data: [] as { id: string; estado: string; huella: string | null; resumen_interno: string | null }[] };
  const porId = Object.fromEntries((pubs ?? []).map((p) => [p.id, p]));
  const articulos = Object.fromEntries((pubs ?? []).filter((p) => p.estado === 'en_revision' && p.huella).map((p) => [p.id, p.huella as string]));
  const bloqueadas = (pubs ?? []).filter((p) => p.estado !== 'en_revision' && p.estado !== 'aprobada');
  const evidencia: Record<string, string> = {};
  for (const c of citas) {
    if (c.pasaje || !c.publicacion_id) continue;
    const nums = oracionesDeUbicacion(c.ubicacion);
    const oraciones = dividirOraciones(porId[c.publicacion_id]?.resumen_interno);
    const texto = nums.map((n) => oraciones[n - 1]).filter(Boolean).join(' ');
    if (texto) evidencia[c.id] = texto;
  }
  const volver = desde === 'respuestas' ? '/equipo/respuestas' : undefined;

  return (
    <main className="eq-cuerpo">
      <div>
        <Link className="enlace" href={volver ?? '/equipo/revisar'}>
          ← {volver ? 'Respuestas' : 'Para revisar'}
        </Link>
        <h1>{version.pregunta || 'Dato'}</h1>
        <p className="eq-bajada">
          Enviada {fechaHora(version.enviada_en)} por {nombres[version.autor_id] ?? '—'}{version.asistida_por_ia ? ' (la redactó la IA)' : ''}.{' '}
          <Link href={`/equipo/fichas/${ficha.id}`}>Corregir algo antes de decidir</Link> (después volvé a esta página).
        </p>
      </div>
      {bloqueadas.length > 0 && (
        <p className="eq-caja eq-caja--aviso">
          Cita {bloqueadas.length === 1 ? 'un artículo que volvió a candidato o fue rechazado' : `${bloqueadas.length} artículos que volvieron a candidatos o fueron rechazados`}: así no se puede
          aprobar. Pedí cambios, o sacá esa fuente corrigiendo la ficha.
        </p>
      )}
      <div className="eq-dos">
        <section className="eq-caja">
          <h2>Para revisar</h2>
          <VistaVersion v={version} formato={ficha.formato} citas={citas} autor={nombres[version.autor_id]} evidencia={evidencia} />
        </section>
        <aside className="eq-form">
          <section className="eq-caja">
            <h2>Tu decisión</h2>
            <Revisar
              accion={revisarVersion.bind(null, version.id)}
              huella={version.huella}
              propia={version.autor_id === yo.id}
              articulos={articulos}
              volver={volver}
            />
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
