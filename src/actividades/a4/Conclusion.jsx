import { useMemo } from 'react';
import GloboMoli from '../../components/GloboMoli';
import Aviso from '../../components/Aviso';
import { HIPOTESIS, RESULTADOS, ambientePorId, fidelidadN, reconstruir } from './modelo';
import Arbol from './Arbol';

/*
  Etapa 7 · Conclusión: cuaderno de laboratorio.
  Su último árbol, sus corridas (fidelidad → qué pasó), una última pregunta
  sobre la idea central, y el mensaje en palabras simples. Se puede imprimir.
*/
const OPCIONES_FINAL = [
  { id: 'necesidad', texto: 'El virus la fabricó porque la necesitaba' },
  { id: 'azar', texto: 'Ya había aparecido por azar, y justo le sirvió' },
];

function Medidor({ n }) {
  return (
    <span className="a4-medidor" aria-label={`Fidelidad ${fidelidadN(n).nombre}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i === n ? 'is-actual' : ''} />
      ))}
    </span>
  );
}

export default function Conclusion({ progreso }) {
  const { datos } = progreso;
  const corridas = datos.corridas || [];
  const conAmbiente = corridas.filter((c) => c.amb);
  const ultima = conAmbiente[conAmbiente.length - 1] || corridas[corridas.length - 1];
  const sim = useMemo(
    () => (ultima ? reconstruir({ semilla: ultima.sem, fidelidad: ultima.fid, gen: ultima.gen, ambiente: ultima.amb, genAmbiente: ultima.genAmb }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ultima?.n, ultima?.gen]
  );
  const entendio = datos.entendio;
  const fecha = new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
  const probadas = new Set(corridas.map((c) => c.fid));

  let texto = '¿Por qué sobrevivió la rama? Elegí una respuesta.';
  if (entendio === 'azar') texto = probadas.size < 3 ? '¡Exacto! ¿Probaste con muchas fidelidades?' : '¡Exacto! Así investigan la evolución.';
  if (entendio === 'necesidad') texto = 'Pensalo otra vez: mirá dónde nace la rama.';

  return (
    <section className="a4-etapa a4-conclusion">
      <article className="a4-cuaderno">
        <header className="a4-cuaderno__cabeza">
          <div>
            <span className="etiqueta">Cuaderno de laboratorio · Evolución de virus</span>
            <h1>Lo que descubrí</h1>
          </div>
          <span className="etiqueta">{fecha}</span>
        </header>

        <div className="a4-cuaderno__grilla">
          <div className="a4-cuaderno__arbol">
            <span className="etiqueta">Mi árbol · corrida {ultima?.n ?? '-'}</span>
            {sim ? <Arbol sim={sim} version={sim.gen} etiqueta="Mi último árbol de variantes" /> : <p className="pendiente">Todavía no hiciste ninguna corrida.</p>}
            {ultima && (
              <p className="a4-cuaderno__pie">
                Fidelidad <b>{fidelidadN(ultima.fid).corto}</b>
                {ultima.amb ? (
                  <>
                    {' '}
                    · {ambientePorId(ultima.amb).nombre.toLowerCase()} · <b>{RESULTADOS[ultima.res]?.corto}</b>
                  </>
                ) : null}
              </p>
            )}
            <fieldset className="a4-hipotesis a4-hipotesis--final">
              <legend>Cuando cambió el ambiente, ¿por qué sobrevivió esa rama?</legend>
              {OPCIONES_FINAL.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`a4-opcion ${entendio === o.id ? 'is-elegida' : ''}`}
                  aria-pressed={entendio === o.id}
                  onClick={() => progreso.guardar({ entendio: o.id })}
                >
                  {o.texto}
                </button>
              ))}
            </fieldset>
            {entendio === 'necesidad' && (
              <Aviso tipo="pista" titulo="Mirá el árbol otra vez">
                Esa rama nació de un error de copia, al azar. El virus no sabía que el ambiente iba a cambiar.
              </Aviso>
            )}
          </div>

          <div className="a4-cuaderno__lado">
            <span className="etiqueta">Mis corridas</span>
            <ol className="a4-corridas">
              {corridas.map((c) => (
                <li key={c.n}>
                  <Medidor n={c.fid} />
                  <span>
                    <b>{fidelidadN(c.fid).nombre}</b>
                    <small>
                      {c.var} {c.var === 1 ? 'variante' : 'variantes'} · {RESULTADOS[c.res]?.corto}
                      {c.hip ? ` · pensé: «${HIPOTESIS.find((h) => h.id === c.hip)?.texto.toLowerCase()}»` : ''}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
            {probadas.size < 2 && (
              <p className="a4-cuaderno__nota">Probá con otra fidelidad para comparar: muy exacta, intermedia y con muchísimos errores.</p>
            )}

          </div>
        </div>

        {entendio === 'azar' && (
          <div className="a4-mensaje anim-entrar">
            <p>
              Las variaciones aparecen <em>al azar</em>, por errores al copiarse. No aparecen porque el virus las necesite.
            </p>
            <p>Cuando cambia el ambiente, algunas que ya estaban resultan mejores, y se multiplican.</p>
          </div>
        )}

        <footer className="a4-cuaderno__acciones">
          <button className="btn btn--secundario" onClick={() => progreso.ir('fidelidad')}>
            Investigar otra vez
          </button>
          <button className="btn btn--primario" onClick={() => window.print()}>
            Imprimir mi cuaderno
          </button>
        </footer>
      </article>
      <GloboMoli texto={entendio === 'azar' ? texto : null} animo={entendio === 'azar' ? 'alegria' : entendio ? 'duda' : 'piensa'} />
    </section>
  );
}
