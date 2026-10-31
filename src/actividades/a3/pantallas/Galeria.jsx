import GloboMoli from '../../../components/GloboMoli';
import { Foto, Metadatos } from './comunes';
import { Mira } from './Identificar';
import { MUESTRA, buscarMision } from '../contenido';
import { CAMPO } from '../motor';

const TAM = 220;

/* ETAPA 6 · Álbum de laboratorio: lo que encontró, con los datos de cada imagen */
export default function Galeria({ progreso }) {
  const datos = progreso.datos;
  const logros = (datos.logros || []).filter((l) => l.f && MUESTRA[l.m]);
  const usadas = new Set(logros.map((l) => l.f.id));
  const otras = (datos.fotos || []).filter((f) => !f.e && !usadas.has(f.id)).slice(-4).reverse();
  const muestra = MUESTRA[datos.muestra];
  const quedan = muestra ? muestra.misiones.filter((m) => !logros.some((l) => l.m === muestra.id && l.mi === m.id)).length : 0;
  const err = datos.errores || {};
  const nErrores = Object.values(err).reduce((a, b) => a + (b || 0), 0);

  return (
    <section className="a3-pantalla a3-album">
      <header className="a3-album__cabeza anim-entrar">
        <div>
          <span className="etiqueta">Álbum de laboratorio</span>
          <h1>Lo que descubriste</h1>
        </div>
        <ul className="a3-album__cuenta" aria-label="Resumen">
          <li>
            <strong>{logros.length}</strong> {logros.length === 1 ? 'caso resuelto' : 'casos resueltos'}
          </li>
          <li>
            <strong>{datos.nFotos || 0}</strong> {datos.nFotos === 1 ? 'foto' : 'fotos'}
          </li>
          <li>
            <strong>{nErrores}</strong> {nErrores === 1 ? 'error para aprender' : 'errores para aprender'}
          </li>
        </ul>
      </header>

      <ul className="a3-album__hojas">
        {logros.map((l, i) => {
          const mi = buscarMision(l.m, l.mi);
          const k = TAM / CAMPO[l.f.a];
          return (
            <li key={`${l.m}-${l.mi}`} className="a3-hoja anim-crecer" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
              <Foto foto={l.f} tam={TAM}>
                <Mira x={TAM / 2 + (l.px - l.f.x) * k} y={TAM / 2 + (l.py - l.f.y) * k} ok />
              </Foto>
              <div className="a3-hoja__texto">
                <span className="etiqueta">{MUESTRA[l.m].nombre}</span>
                <h2>{mi?.nombre}</h2>
                <Metadatos
                  foto={l.f}
                  extra={
                    <div>
                      <dt>Pistas</dt>
                      <dd>
                        {l.n || 1} de {mi?.pistas.length || 3}
                      </dd>
                    </div>
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>

      {otras.length > 0 && (
        <div className="a3-album__otras">
          <span className="etiqueta">Otras fotos nítidas</span>
          <ul>
            {otras.map((f) => (
              <li key={f.id}>
                <Foto foto={f} tam={96} />
                <span className="etiqueta">
                  {f.a}x · plano {f.z + 1}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="a3-acciones">
        {muestra && quedan > 0 && (
          <button className="btn btn--experimentar btn--grande" onClick={() => progreso.ir('mision', { mision: null })}>
            Otro caso con {muestra.nombre.toLowerCase()}
          </button>
        )}
        <button className="btn btn--secundario btn--grande" onClick={() => progreso.ir('muestra', { mision: null })}>
          Otra muestra
        </button>
      </div>
      <GloboMoli texto="Así trabaja la bioimagenología: mirar, probar y registrar." animo="alegria" tamano={104} />
    </section>
  );
}
