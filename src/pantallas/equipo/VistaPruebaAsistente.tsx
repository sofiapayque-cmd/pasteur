import type { Chequeo, FilaPrueba } from '@/datos/pruebaAsistente';
import { resumir } from '@/lib/ia/pruebaAsistente';
import { fechaHora } from '@/lib/equipo/comun';
import { CorrerPrueba, PedirFaltantes } from './PruebaAsistente';

/*
  Lo que se ve en /equipo/asistente (sin pedir datos: los trae la página).
  Chequeos, respuestas que faltan, correr la prueba y la última corrida.
*/
const GRUPOS: { id: FilaPrueba['grupo']; titulo: string; ayuda: string }[] = [
  { id: 'variante', titulo: 'Formas de preguntar', ayuda: 'La pregunta de referencia y cómo la diría un chico. Si hay respuesta aprobada, tiene que aparecer (directa o entre las parecidas).' },
  { id: 'trampa', titulo: 'Trampas', ayuda: 'Del mismo tema, pero necesitan otra respuesta. Nunca pueden mostrar una respuesta como "la misma" (salvo la suya, si un día se aprueba).' },
  { id: 'otro_tema', titulo: 'Otros temas', ayuda: 'No son de las actividades. No pueden mostrar ninguna respuesta como "la misma".' },
];

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export type PropsVista = {
  lista: Chequeo[];
  faltan: string[];
  total: number;
  aprobadas: number;
  iaLista: boolean;
  ultima: { creadaEn: string; pedidaPor: string | null; filas: FilaPrueba[] } | null;
  nombres: Record<string, string>;
  pregunta: Map<string, string>;
};

export default function VistaPruebaAsistente({ lista, faltan, total, aprobadas, iaLista, ultima, nombres, pregunta }: PropsVista) {
  const r = ultima ? resumir(ultima.filas) : null;
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Prueba del asistente</h1>
        <p className="eq-bajada">
          Prueba &ldquo;Preguntale al Pasteur&rdquo; igual que si escribiera una maestra: muchas formas de hacer cada pregunta, trampas del mismo tema y preguntas de otros
          temas. Sirve para saber si muestra la respuesta correcta y nunca una equivocada.
        </p>
      </div>

      <section className="eq-caja eq-form" aria-labelledby="chequeos">
        <h2 id="chequeos">Solo respuestas aprobadas, con sus fuentes</h2>
        <ul className="eq-lista eq-prueba__chequeos">
          {lista.map((c) => (
            <li key={c.titulo}>
              <span className={`eq-estado ${c.ok ? 'eq-estado--aprobada' : 'eq-estado--rechazada'}`}>{c.ok ? 'Bien' : 'Revisar'}</span> {c.titulo}
              {c.problemas.length > 0 && (
                <ul className="eq-tabla__chico">
                  {c.problemas.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {faltan.length > 0 && (
        <section className="eq-caja eq-form" aria-labelledby="faltan">
          <div>
            <h2 id="faltan">Respuestas que la prueba necesita ({faltan.length})</h2>
            <p className="eq-bajada">
              Mientras no estén aprobadas, la prueba las toma como trampas: ninguna otra respuesta puede mostrarse en su lugar. Se piden de a 4.
            </p>
          </div>
          <ul className="eq-lista">
            {faltan.map((f, i) => (
              <li key={f} className={i < 4 ? '' : 'eq-ayuda'}>
                {f}
              </li>
            ))}
          </ul>
          {iaLista ? <PedirFaltantes preguntas={faltan} /> : <p className="eq-ayuda">Falta la clave de OpenAI en el servidor.</p>}
        </section>
      )}

      <section className="eq-caja eq-form" aria-labelledby="correr">
        <div>
          <h2 id="correr">Correr la prueba</h2>
          <p className="eq-bajada">
            {aprobadas === 1 ? 'Hay 1 respuesta aprobada.' : `Hay ${aprobadas} respuestas aprobadas.`} No gasta el cupo de ninguna maestra
            ni anota nada en &ldquo;Preguntas de las clases&rdquo;.
          </p>
        </div>
        {iaLista ? <CorrerPrueba casos={total} respuestas={aprobadas} /> : <p className="eq-ayuda">Falta la clave de OpenAI en el servidor.</p>}
      </section>

      {ultima && r && (
        <section className="eq-form eq-prueba" aria-labelledby="resultados">
          <div>
            <h2 id="resultados">Última prueba</h2>
            <p className="eq-ayuda">
              {fechaHora(ultima.creadaEn)}
              {ultima.pedidaPor && nombres[ultima.pedidaPor] ? ` · la corrió ${nombres[ultima.pedidaPor]}` : ''} · {r.casos} preguntas
            </p>
          </div>
          <div className="eq-tablero">
            <div className={`eq-tablero__item ${r.equivocadas ? 'eq-tablero__item--rechazada' : 'eq-tablero__item--aprobada'}`}>
              <span className="eq-numero">{r.equivocadas}</span>
              <span>Mostró una respuesta equivocada (tiene que ser 0)</span>
            </div>
            <div className={`eq-tablero__item ${pct(r.encontradas, r.conRespuesta) >= 80 ? 'eq-tablero__item--aprobada' : 'eq-tablero__item--espera'}`}>
              <span className="eq-numero">{r.conRespuesta ? `${pct(r.encontradas, r.conRespuesta)}%` : '—'}</span>
              <span>
                Encontró la respuesta: {r.encontradas} de {r.conRespuesta} (meta: 80%)
              </span>
            </div>
            <div className="eq-tablero__item">
              <span className="eq-numero">{r.conRespuesta ? `${pct(r.directas, r.conRespuesta)}%` : '—'}</span>
              <span>
                La mostró directa: {r.directas} de {r.conRespuesta}
              </span>
            </div>
            {r.errores > 0 && (
              <div className="eq-tablero__item eq-tablero__item--espera">
                <span className="eq-numero">{r.errores}</span>
                <span>No se pudieron probar</span>
              </div>
            )}
          </div>

          {GRUPOS.map((g) => {
            const filas = ultima.filas.filter((f) => f.grupo === g.id);
            if (!filas.length) return null;
            return (
              <div key={g.id} className="eq-caja">
                <h3>{g.titulo}</h3>
                <p className="eq-ayuda">{g.ayuda}</p>
                <div className="eq-prueba__tabla">
                  <table className="eq-tabla">
                    <thead>
                      <tr>
                        <th>Pregunta</th>
                        <th>Esperada</th>
                        <th>Qué vio la maestra</th>
                        <th>Parecido</th>
                        <th>Control</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f) => (
                        <tr key={f.orden} className={!f.correcta ? 'eq-prueba--mal' : f.encontrada === false ? 'eq-prueba--falta' : ''}>
                          <td>{f.consulta}</td>
                          <td className="eq-prueba__chico">{f.esperada_id ? pregunta.get(f.esperada_id) ?? 'una aprobada' : 'ninguna'}</td>
                          <td>
                            {f.resultado === 'respuesta' ? (
                              <>
                                <strong>{f.correcta ? 'La respuesta: ' : 'EQUIVOCADA: '}</strong>
                                {pregunta.get(f.mostrada_id ?? '') ?? 'otra'}
                              </>
                            ) : f.resultado === 'parecidas' ? (
                              <>Parecidas: {f.parecidas.map((id) => pregunta.get(id) ?? '…').join(' · ')}</>
                            ) : f.resultado === 'nada' ? (
                              'Todavía no la tenemos'
                            ) : (
                              `No se pudo probar${f.detalle.error ? ` (${f.detalle.error})` : ''}`
                            )}
                          </td>
                          <td className="eq-prueba__chico">{f.similitud === null ? '—' : f.similitud.toFixed(2)}</td>
                          <td className="eq-prueba__chico">
                            {f.eleccion === null ? (f.resultado === 'nada' ? '—' : 'no respondió') : f.eleccion === 0 ? 'ninguna' : `eligió la ${f.eleccion}.ª`}
                            {f.detalle.motivo ? (
                              <details>
                                <summary>por qué</summary>
                                {f.detalle.motivo}
                              </details>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
