import Link from 'next/link';
import { notFound } from 'next/navigation';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import PieInstitucional from '@/components/PieInstitucional';
import { ACTIVIDADES } from '@/data/contenido';
import { INFO_ACTIVIDADES } from '@/actividades/info';

/*
  FICHA PÚBLICA DE UNA ACTIVIDAD (pedido de Sofia, 8/11).
  Es lo que ve alguien sin sesión en /explorar/aN: de qué se trata, qué se
  investiga y el recorrido. La actividad en sí no se arma ni se manda al
  navegador: para hacerla hay que entrar con la tarjeta o con la cuenta docente.
  Solo usa textos que ya existen (nombre, bajada, guía y etapas).
*/
type Info = { GUIA?: { titulo?: string; objetivos?: string[] }; ETAPAS?: { id: string; nombre: string }[] };

export default function FichaActividad({ act }: { act: string }) {
  const actividad = ACTIVIDADES.find((a) => a.id === act);
  if (!actividad) notFound();
  const info = (INFO_ACTIVIDADES as Record<string, Info>)[act] ?? {};
  const objetivos = info.GUIA?.objetivos ?? [];
  const etapas = info.ETAPAS ?? [];

  return (
    <main className="pantalla ficha-act" style={{ background: actividad.fondo }}>
      <FondoVivo semilla={11} opacidad={0.4} />
      <Cabecera volverA="/explorar" miga={`Laboratorio ${actividad.numero}`} />
      <div className="ficha-act__cuerpo">
        <section className="ficha-act__presentacion">
          <span className="panel__placa" style={{ background: actividad.placa }} aria-hidden="true" />
          <span className="etiqueta">Laboratorio {actividad.numero}</span>
          <h1>{actividad.nombre}</h1>
          <p className="ficha-act__bajada">{actividad.bajada}</p>
          {!actividad.disponible && actividad.pausa && <p className="panel__pronto">{actividad.pausa}</p>}
        </section>

        <section className="tarjeta ficha-act__detalle" aria-labelledby="ficha-act-hacerla">
          {objetivos.length > 0 && (
            <>
              <h2>Qué se investiga</h2>
              <ul>
                {objetivos.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </>
          )}
          {etapas.length > 0 && (
            <>
              <h2>El recorrido</h2>
              <ol className="ficha-act__etapas">
                {etapas.map((e) => (
                  <li key={e.id}>{e.nombre}</li>
                ))}
              </ol>
            </>
          )}
          <h2 id="ficha-act-hacerla">Para hacerla</h2>
          <p>Las actividades se hacen con una cuenta. Los chicos entran con la tarjeta que les da su maestra.</p>
          <div className="ficha-act__botones">
            <Link className="btn btn--primario" href="/clase">
              Entrar con mi tarjeta
            </Link>
            <Link className="btn btn--secundario" href="/maestra/entrar">
              Soy docente
            </Link>
          </div>
          <Link className="enlace" href="/pedir-acceso">
            ¿Tu escuela todavía no tiene acceso? Pedilo acá
          </Link>
        </section>
      </div>
      <PieInstitucional />
    </main>
  );
}
