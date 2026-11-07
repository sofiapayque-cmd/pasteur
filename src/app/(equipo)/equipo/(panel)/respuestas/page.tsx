import Link from 'next/link';
import { exigirMiembro } from '@/datos/equipo';
import { nombresDelEquipo } from '@/datos/fichas';
import { listarPreguntasSinRespuesta, listarRespuestas, NOMBRE_GRUPO, type Grupo } from '@/datos/respuestas';
import { iaConfigurada } from '@/lib/ia/openai';
import { ACTIVIDADES } from '@/lib/equipo/comun';
import PedirRespuestas from '@/pantallas/equipo/PedirRespuestas';
import PreguntasDeClases from '@/pantallas/equipo/PreguntasDeClases';
import Tarjeta from '@/pantallas/equipo/TarjetaRespuesta';

/*
  /equipo/respuestas · Tablero de respuestas.
  Arriba, cuántas hay en cada estado; abajo, una tarjeta por respuesta con la
  pregunta, lo que van a leer los chicos y sus fuentes. La validadora entra
  acá y revisa; el resto del equipo le pide respuestas nuevas a la IA.
  Pedir respuestas tarda (buscar + redactar): por eso maxDuration.
*/
export const maxDuration = 300;

const PESTANAS: (Grupo | 'todas')[] = ['espera', 'cambios', 'aprobada', 'rechazada', 'borrador', 'todas'];
const DECISION: Record<string, string> = { aprobar: 'aprobaste', pedir_cambios: 'pediste cambios en', rechazar: 'rechazaste' };

export default async function Page({ searchParams }: { searchParams: Promise<{ ver?: string; actividad?: string; origen?: string; revisada?: string }> }) {
  const yo = await exigirMiembro();
  const sp = await searchParams;
  const [todas, nombres, deClases] = await Promise.all([listarRespuestas(), nombresDelEquipo(), listarPreguntasSinRespuesta().catch(() => [])]);
  const validadora = yo.rol === 'validador';

  const cuenta = (g: Grupo) => todas.filter((r) => r.grupo === g).length;
  const ver = (PESTANAS as string[]).includes(sp.ver ?? '') ? (sp.ver as Grupo | 'todas') : cuenta('espera') ? 'espera' : 'todas';
  const actividad = sp.actividad && ACTIVIDADES[sp.actividad] ? sp.actividad : '';
  const soloIa = sp.origen === 'ia';
  const visibles = todas
    .filter((r) => (ver === 'todas' ? r.grupo !== 'retirada' : r.grupo === ver))
    .filter((r) => !actividad || r.actividad === actividad)
    .filter((r) => !soloIa || r.ia)
    // Las que esperan, de la más vieja a la más nueva (así no queda ninguna olvidada)
    .sort((a, b) => (ver === 'espera' ? (a.enviadaEn ?? '').localeCompare(b.enviadaEn ?? '') : 0));
  const primera = todas.filter((r) => r.grupo === 'espera').sort((a, b) => (a.enviadaEn ?? '').localeCompare(b.enviadaEn ?? ''))[0];

  const enlace = (cambios: Record<string, string>) => {
    const p = new URLSearchParams({ ver, actividad, origen: soloIa ? 'ia' : '', ...cambios });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const q = p.toString();
    return q ? `/equipo/respuestas?${q}` : '/equipo/respuestas';
  };
  const pedir = iaConfigurada() ? (
    <>
      {deClases.length > 0 && <PreguntasDeClases preguntas={deClases} />}
      <PedirRespuestas />
    </>
  ) : (
    <p className="eq-caja eq-caja--aviso">Para pedir respuestas a la IA falta cargar la clave de OpenAI en el servidor (OPENAI_API_KEY).</p>
  );

  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Respuestas</h1>
        <p className="eq-bajada">
          Lo que van a leer los chicos cuando pregunten. La IA las prepara con artículos científicos y una validadora del Instituto las aprueba: solo las aprobadas llevan
          el sello.
        </p>
      </div>

      {sp.revisada && DECISION[sp.revisada] && (
        <p className="eq-caja eq-caja--ok" role="status">
          Listo: {DECISION[sp.revisada]} la respuesta.{' '}
          {validadora && primera ? (
            <Link className="enlace" href={`/equipo/revisar/${primera.versionId}?desde=respuestas`}>
              Seguir con la próxima →
            </Link>
          ) : null}
        </p>
      )}

      <div className="eq-tablero">
        {(['espera', 'cambios', 'aprobada', 'rechazada'] as Grupo[]).map((g) => (
          <Link key={g} href={enlace({ ver: g })} className={`eq-tablero__item eq-tablero__item--${g}`} aria-current={ver === g ? 'true' : undefined}>
            <span className="eq-numero">{cuenta(g)}</span>
            <span>{NOMBRE_GRUPO[g]}</span>
          </Link>
        ))}
      </div>

      {validadora && primera && !sp.revisada && (
        <div className="eq-caja eq-caja--aviso eq-fila" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>
            {cuenta('espera') === 1 ? 'Hay una respuesta esperando tu revisión.' : `Hay ${cuenta('espera')} respuestas esperando tu revisión.`}
          </p>
          <Link className="btn btn--primario btn--chico" href={`/equipo/revisar/${primera.versionId}?desde=respuestas`}>
            Empezar por la más vieja
          </Link>
        </div>
      )}

      {!validadora && pedir}

      <section className="eq-form" aria-labelledby="lista-titulo">
        <h2 id="lista-titulo" className="solo-lector">
          Lista de respuestas
        </h2>
        <div className="eq-fila" style={{ alignItems: 'center' }}>
          <nav className="eq-pestanas" aria-label="Estado">
            {PESTANAS.map((g) => (
              <Link key={g} href={enlace({ ver: g })} aria-current={ver === g ? 'true' : undefined}>
                {g === 'todas' ? 'Todas' : `${NOMBRE_GRUPO[g]} (${cuenta(g)})`}
              </Link>
            ))}
          </nav>
          <nav className="eq-pestanas" aria-label="Actividad y origen">
            <Link href={enlace({ actividad: '' })} aria-current={!actividad ? 'true' : undefined}>
              Todas las actividades
            </Link>
            {Object.entries(ACTIVIDADES).map(([k, v]) => (
              <Link key={k} href={enlace({ actividad: k })} aria-current={actividad === k ? 'true' : undefined}>
                {v.split(' · ')[0]}
              </Link>
            ))}
            <Link href={enlace({ origen: soloIa ? '' : 'ia' })} aria-current={soloIa ? 'true' : undefined}>
              Solo las de la IA
            </Link>
          </nav>
        </div>

        {visibles.length === 0 ? (
          <p className="eq-caja eq-bajada">
            {ver === 'espera' ? 'No hay respuestas esperando revisión.' : 'Todavía no hay respuestas acá.'}
            {!validadora && ver === 'espera' ? ' Pedile algunas a la IA más arriba.' : ''}
          </p>
        ) : (
          <ul className="eq-tarjetas">
            {visibles.map((r) => (
              <Tarjeta key={r.versionId} r={r} nombres={nombres} validadora={validadora} />
            ))}
          </ul>
        )}
      </section>

      {validadora && (
        <details className="eq-caja eq-detalles">
          <summary>Pedir respuestas nuevas a la IA</summary>
          <div style={{ marginTop: 'var(--space-3)' }}>{pedir}</div>
        </details>
      )}
    </main>
  );
}
