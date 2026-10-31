import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import GloboMoli from '../../components/GloboMoli';
import Aviso from '../../components/Aviso';
import {
  AMBIENTES,
  HIPOTESIS,
  K,
  ORIGINAL,
  PASO,
  RASGOS,
  RESULTADOS,
  ambientePorId,
  cambiarAmbiente,
  conRasgo,
  fidelidadN,
  genomaDe,
  paso,
  queHubo,
  reconstruir,
  resultado,
  variantes,
} from './modelo';
import Placa from './Placa';
import Arbol, { armarArbol } from './Arbol';
import Receta from './Receta';
import { VirusSVG, SOMBRA } from './virus';
import { COLORES_CUERPO } from './modelo';


/*
  Etapas 3 a 6 (generaciones, árbol, ambiente, observar) comparten la MISMA simulación:
  este componente queda montado mientras el niño pasa por ellas.
  Si se recarga la página, la corrida se vuelve a armar igual desde la semilla guardada.
*/
const VELOCIDADES = [
  { id: 'lenta', nombre: 'Lento', ms: 1500 },
  { id: 'normal', nombre: 'Normal', ms: 900 },
  { id: 'rapida', nombre: 'Rápido', ms: 420 },
];
const TOPE_SIN_AMBIENTE = 30;
const DESPUES_DEL_AMBIENTE = 14;
const tope = (sim) => (sim.genAmbiente != null ? sim.genAmbiente + DESPUES_DEL_AMBIENTE : TOPE_SIN_AMBIENTE);

export default function Laboratorio({ progreso, reducido }) {
  const { etapa, datos } = progreso;
  const prog = useRef(progreso);
  prog.current = progreso;

  const [sim] = useState(() =>
    reconstruir({
      semilla: datos.semilla ?? 1,
      fidelidad: datos.fidelidad ?? 3,
      gen: datos.gen ?? 0,
      ambiente: datos.ambiente ?? null,
      genAmbiente: datos.genAmbiente ?? null,
    })
  );
  const [version, setVersion] = useState(sim.gen);
  const [, refrescar] = useReducer((x) => x + 1, 0);
  const [enMarcha, setEnMarcha] = useState(() => !reducido && sim.total > 0 && sim.gen < tope(sim) && etapa !== 'ambiente');
  const [vel, setVel] = useState('normal');
  const [sel, setSel] = useState(null);
  const intervalo = VELOCIDADES.find((v) => v.id === vel).ms;
  const fid = fidelidadN(datos.fidelidad);
  const amb = sim.ambiente ? ambientePorId(sim.ambiente) : null;
  const apagada = sim.total === 0;
  const terminada = apagada || sim.gen >= tope(sim);

  const registrar = useCallback(() => {
    const d = prog.current.datos;
    const c = {
      n: d.corrida ?? 1,
      fid: d.fidelidad ?? 3,
      hip: d.hipotesis ?? null,
      amb: sim.ambiente,
      genAmb: sim.genAmbiente,
      gen: sim.gen,
      res: resultado(sim),
      var: variantes(sim),
      sem: d.semilla ?? 1,
    };
    return [...(d.corridas || []).filter((x) => x.n !== c.n), c];
  }, [sim]);

  const avanzar = useCallback(
    (n = 1) => {
      for (let i = 0; i < n; i++) {
        if (sim.total === 0 || sim.gen >= tope(sim)) break;
        paso(sim);
      }
      setVersion(sim.gen);
      const fin = sim.total === 0 || sim.gen >= tope(sim);
      if (fin) setEnMarcha(false);
      if (fin) prog.current.guardar({ gen: sim.gen, corridas: registrar() });
      else if (sim.gen % 5 === 0) prog.current.guardar({ gen: sim.gen });
    },
    [sim, registrar]
  );

  // Reloj de la simulación (se detiene en pausa y cuando la pestaña no se ve)
  useEffect(() => {
    if (!enMarcha) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) avanzar(1);
    }, intervalo);
    return () => clearInterval(id);
  }, [enMarcha, intervalo, avanzar]);

  // Al llegar a "ambiente" se pausa hasta que el niño elige
  useEffect(() => {
    if (etapa === 'ambiente' && !sim.ambiente) setEnMarcha(false);
    if (etapa === 'arbol' && !reducido && !terminada) setEnMarcha(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa]);

  const elegirAmbiente = (id) => {
    if (sim.ambiente) return;
    cambiarAmbiente(sim, id);
    prog.current.guardar({ ambiente: id, genAmbiente: sim.gen, gen: sim.gen });
    refrescar();
    if (!reducido) setEnMarcha(true);
  };

  const arbol = useMemo(() => armarArbol(sim), [sim, version]);
  const destacado = useMemo(() => {
    if (!amb) return null;
    const vivas = arbol.orden.filter((n) => amb.ayuda(genomaDe(n.k)) && (sim.pop.get(n.k) || 0) > 0);
    const antes = vivas.filter((n) => n.nace <= sim.genAmbiente);
    const lista = antes.length ? antes : vivas;
    return lista.sort((a, b) => (sim.pop.get(b.k) || 0) - (sim.pop.get(a.k) || 0))[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arbol, amb]);

  const irA = (e) => prog.current.ir(e, { gen: sim.gen, corridas: registrar() });
  const otraFidelidad = () => irA('fidelidad');

  const controles = (
    <Controles
      sim={sim}
      enMarcha={enMarcha}
      setEnMarcha={setEnMarcha}
      vel={vel}
      setVel={setVel}
      avanzar={avanzar}
      reducido={reducido}
      terminada={terminada}
      compacto={etapa !== 'generaciones'}
    />
  );
  const nVar = variantes(sim);

  /* ---------- 3 · Generaciones ---------- */
  if (etapa === 'generaciones') {
    let texto = 'Mirá: cada virus se copia y la placa se llena.';
    if (sim.gen >= 8) texto = nVar ? '¡Ya hay variantes! Mirá su árbol.' : 'Casi todas las copias salen iguales.';
    else if (fid.n >= 4 && sim.gen >= 2) texto = 'Los grises son copias rotas: no funcionan.';
    else if (sim.gen >= 3 && nVar) texto = 'Cada destello violeta es una variante nueva.';
    return (
      <section className="a4-etapa a4-lab a4-lab--generaciones">
        <div className="a4-lab__placa">
          <Placa sim={sim} version={version} enMarcha={enMarcha} intervalo={intervalo} reducido={reducido} tamano={430} etiqueta={`Placa con ${sim.total} virus`} />
          <Composicion sim={sim} version={version} />
        </div>
        <div className="a4-lab__panel">
          <header className="a4-cabeza">
            <span className="etiqueta">Fidelidad {fid.corto}</span>
            <h1>Generación tras generación</h1>
          </header>
          {controles}
          <Contadores sim={sim} nVar={nVar} />
          {apagada ? (
            <Aviso tipo="error" titulo="La población se apagó" accion="Probar otra fidelidad" onAccion={otraFidelidad} secundaria="Ver su árbol" onSecundaria={() => irA('arbol')}>
              Casi todas las copias salían rotas, y cada vez quedaban menos virus. Los científicos le dicen <b>catástrofe de error</b>.
              <Comparar datos={datos} sim={sim} />
            </Aviso>
          ) : (
            sim.gen >= 8 && (
              <button className="btn btn--primario btn--grande anim-crecer" onClick={() => irA('arbol')}>
                Ver el árbol de variantes
              </button>
            )
          )}
        </div>
        {!apagada && <GloboMoli texto={texto} animo={nVar ? 'eureka' : 'feliz'} />}
      </section>
    );
  }

  /* ---------- 4 · Árbol ---------- */
  if (etapa === 'arbol') {
    const nodo = sel && sim.nodos.get(sel);
    let texto = 'Cada rama es una variante. Tocá una.';
    if (nodo) texto = nodo.padre == null ? 'Ese es el tronco: el virus original.' : `Nació en la generación ${nodo.nace}, por un error al copiarse.`;
    if (apagada) texto = 'Las ramitas grises son copias rotas.';
    else if (fid.n >= 4 && !nodo) texto = 'Las ramitas grises son copias que no funcionan.';
    else if (fid.n === 1 && !nVar && !nodo) texto = 'Casi no hay ramas: copian casi perfecto.';
    const puede = progreso.desbloqueado('ambiente');
    return (
      <section className="a4-etapa a4-lab a4-lab--arbol">
        <div className="a4-lab__arbol">
          <header className="a4-cabeza a4-cabeza--fila">
            <div>
              <span className="etiqueta">
                Fidelidad {fid.corto} · {sim.total} virus · {nVar} {nVar === 1 ? 'variante' : 'variantes'}
              </span>
              <h1>Las ramas del virus</h1>
            </div>
            {apagada ? (
              <button className="btn btn--primario" onClick={otraFidelidad}>
                Probar otra fidelidad
              </button>
            ) : puede ? (
              <button className="btn btn--experimentar btn--grande" onClick={() => irA('ambiente')}>
                Cambiar el ambiente
              </button>
            ) : (
              <p className="a4-espera">
                <span className="etiqueta">En un ratito</span>
                Tu maestra va a habilitar el cambio de ambiente.
              </p>
            )}
          </header>
          <div className="a4-arbol__marco">
            <Arbol sim={sim} version={version} seleccion={sel} onElegir={(k) => setSel(k === sel ? null : k)} />
          </div>
        </div>
        <div className="a4-lab__lado">
          {nodo ? (
            <FichaVariante sim={sim} nodo={nodo} onCerrar={() => setSel(null)} />
          ) : (
            <Placa sim={sim} version={version} enMarcha={enMarcha} intervalo={intervalo} reducido={reducido} tamano={200} etiqueta={`Placa con ${sim.total} virus`} />
          )}
          {controles}
        </div>
        <GloboMoli texto={texto} animo={nodo ? 'eureka' : 'feliz'} />
      </section>
    );
  }

  /* ---------- 5 · Ambiente ---------- */
  if (etapa === 'ambiente') {
    const habilitados = progreso.opciones?.ambientes?.length ? AMBIENTES.filter((a) => progreso.opciones.ambientes.includes(a.id)) : AMBIENTES;
    const conR = amb ? conRasgo(sim, amb.id) : 0;
    const pasaron = amb ? sim.gen - sim.genAmbiente : 0;
    let texto = 'Elegí un cambio. ¿Algún virus podrá zafar?';
    if (amb) texto = pasaron < 2 ? 'Mirá la placa: ¿quiénes quedan?' : apagada ? 'No quedó ningún virus en la placa.' : conR > sim.total / 2 ? `Los que tienen ${amb.si.toLowerCase()} siguen copiándose.` : 'Cada vez quedan menos virus...';
    return (
      <section className="a4-etapa a4-lab a4-lab--ambiente">
        <div className="a4-lab__placa">
          <Placa sim={sim} version={version} enMarcha={enMarcha} intervalo={intervalo} reducido={reducido} tamano={380} ambiente={sim.ambiente} etiqueta={`Placa con ${sim.total} virus`} />
          {amb && (
            <>
              <div className="a4-seleccion" aria-live="polite">
                <Barra etiqueta={amb.si} valor={conR} color={amb.color} />
                <Barra etiqueta={amb.no} valor={sim.total - conR} color="#BEC1CB" />
              </div>
              {controles}
            </>
          )}
        </div>
        <div className="a4-lab__panel">
          <header className="a4-cabeza">
            <span className="etiqueta">Generación {sim.gen}</span>
            <h1>Cambiá el ambiente</h1>
            <p className="a4-instruccion">{amb ? 'Mirá qué pasa en la placa.' : 'Elegí qué cambia. Fijate a qué virus les sirve.'}</p>
          </header>
          <div className="a4-ambientes" role="radiogroup" aria-label="Ambientes">
            {habilitados.map((a) => (
              <button
                key={a.id}
                role="radio"
                aria-checked={sim.ambiente === a.id}
                className={`a4-ambiente ${sim.ambiente === a.id ? 'is-elegido' : ''}`}
                disabled={Boolean(sim.ambiente) && sim.ambiente !== a.id}
                onClick={() => elegirAmbiente(a.id)}
              >
                <IconoAmbiente id={a.id} />
                <b>{a.nombre}</b>
                <small>{a.detalle}</small>
              </button>
            ))}
          </div>
          {amb && (pasaron >= 3 || apagada || reducido) && (
            <button className="btn btn--primario btn--grande anim-crecer" onClick={() => irA('observar')}>
              Ver qué pasó en el árbol
            </button>
          )}
        </div>
        <GloboMoli texto={texto} animo={amb ? 'escucha' : 'piensa'} />
      </section>
    );
  }

  /* ---------- 6 · Observar ---------- */
  const respuesta = datos.respuesta;
  const correcta = destacado ? (destacado.nace <= sim.genAmbiente ? 'antes' : 'despues') : null;
  const listaPregunta = Boolean(amb && destacado && terminada);
  const cerrada = Boolean(amb && terminada && (apagada || !destacado || respuesta === correcta));
  let texto = 'Mirá qué ramas crecen y cuáles se achican.';
  if (!amb) texto = 'Primero cambiá el ambiente.';
  else if (listaPregunta && !respuesta) texto = '¿Cuándo nació la rama marcada?';
  else if (respuesta && respuesta !== correcta) texto = 'Seguí la rama hasta donde nace.';
  return (
    <section className="a4-etapa a4-lab a4-lab--observar">
      <div className="a4-lab__arbol">
        <header className="a4-cabeza a4-cabeza--fila">
          <div>
            <span className="etiqueta">
              Fidelidad {fid.corto} · {amb ? amb.nombre.toLowerCase() : 'sin cambio'} · {sim.total} virus
            </span>
            <h1>¿Qué ramas siguieron?</h1>
          </div>
          {!amb ? (
            <button className="btn btn--experimentar" onClick={() => irA('ambiente')}>
              Cambiar el ambiente
            </button>
          ) : cerrada ? (
            <div className="a4-cabeza__botones anim-crecer">
              <button className="btn btn--secundario" onClick={otraFidelidad}>
                Probar otra fidelidad
              </button>
              <button className="btn btn--primario" onClick={() => irA('conclusion')}>
                Ir a la conclusión
              </button>
            </div>
          ) : null}
        </header>
        <div className="a4-arbol__marco">
          <Arbol sim={sim} version={version} destacado={listaPregunta ? destacado?.k : null} seleccion={sel} onElegir={(k) => setSel(k === sel ? null : k)} />
        </div>
      </div>
      <div className="a4-lab__lado">
        {cerrada ? (
          <>
            {apagada ? (
              <Aviso tipo="error" titulo="La población desapareció">
                Casi no había variantes. Cuando cambió el ambiente, ninguno tenía {amb.favorece}.
              </Aviso>
            ) : correcta === 'antes' ? (
              <Aviso tipo="acierto" titulo="¡Ya estaba antes!">
                Apareció por azar, sin que nadie la necesitara. Con el cambio, le tocó ser de las que mejor andan.
              </Aviso>
            ) : (
              <Aviso tipo="acierto" titulo="¡Bien mirado!">
                Esta apareció después, también por azar. El ambiente no la fabricó: solo la favoreció.
              </Aviso>
            )}
            <div className="tarjeta a4-resultado">
              <span className="etiqueta">
                Corrida {datos.corrida ?? 1} · {RESULTADOS[resultado(sim)].corto}
              </span>
              <Comparar datos={datos} sim={sim} />
            </div>
          </>
        ) : listaPregunta ? (
          <>
            {respuesta && respuesta !== correcta ? (
              <Aviso tipo="pista" titulo="Mirá dónde nace" accion="Responder otra vez" onAccion={() => prog.current.guardar({ respuesta: null })}>
                Seguí la rama marcada hasta su punto de partida y compará con la línea del cambio.
              </Aviso>
            ) : (
              <div className="tarjeta a4-pregunta">
                <p>
                  La rama marcada tiene <b>{amb.si.toLowerCase()}</b> y siguió creciendo. ¿Cuándo apareció?
                </p>
                <div className="a4-pregunta__botones">
                  <button className="btn btn--secundario" onClick={() => prog.current.guardar({ respuesta: 'antes' })}>
                    Antes del cambio
                  </button>
                  <button className="btn btn--secundario" onClick={() => prog.current.guardar({ respuesta: 'despues' })}>
                    Después del cambio
                  </button>
                </div>
              </div>
            )}
            <Placa sim={sim} version={version} enMarcha={false} intervalo={intervalo} reducido={reducido} tamano={150} ambiente={sim.ambiente} etiqueta={`Placa con ${sim.total} virus`} />
          </>
        ) : (
          <>
            <Placa sim={sim} version={version} enMarcha={enMarcha} intervalo={intervalo} reducido={reducido} tamano={200} ambiente={sim.ambiente} etiqueta={`Placa con ${sim.total} virus`} />
            {!terminada && controles}
          </>
        )}
      </div>
      <GloboMoli texto={cerrada ? null : texto} animo={apagada ? 'duda' : cerrada ? 'alegria' : 'piensa'} />
    </section>
  );
}

/* ---------- Piezas ---------- */

function Controles({ sim, enMarcha, setEnMarcha, vel, setVel, avanzar, reducido, terminada, compacto }) {
  return (
    <div className={`a4-controles ${compacto ? 'a4-controles--compacto' : ''}`}>
      <div className="a4-contador" aria-live="off">
        <span className="etiqueta">Generación</span>
        <b>{sim.gen}</b>
      </div>
      <div className="a4-controles__botones">
        {reducido ? (
          <>
            <button className="btn btn--primario" onClick={() => avanzar(1)} disabled={terminada}>
              +1 generación
            </button>
            <button className="btn btn--secundario" onClick={() => avanzar(5)} disabled={terminada}>
              +5
            </button>
          </>
        ) : (
          <>
            <button className="btn btn--primario a4-play" onClick={() => setEnMarcha(!enMarcha)} disabled={terminada} aria-pressed={enMarcha}>
              <span className={`a4-play__icono ${enMarcha ? 'is-pausa' : ''}`} aria-hidden="true" />
              {enMarcha ? 'Pausa' : 'Seguir'}
            </button>
            <button className="btn btn--secundario" onClick={() => avanzar(1)} disabled={terminada || enMarcha} title="Avanzar una generación">
              +1
            </button>
          </>
        )}
      </div>
      {!reducido && (
        <div className="a4-velocidad" role="radiogroup" aria-label="Velocidad">
          {VELOCIDADES.map((v) => (
            <button key={v.id} role="radio" aria-checked={vel === v.id} className={vel === v.id ? 'is-actual' : ''} onClick={() => setVel(v.id)}>
              {v.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Contadores({ sim, nVar }) {
  const intentos = sim.fallidas + sim.viables;
  const rotas = intentos ? Math.round((sim.fallidas / intentos) * 10) : 0;
  return (
    <dl className="a4-contadores">
      <div>
        <dt className="etiqueta">Virus que funcionan</dt>
        <dd>
          <b>{sim.total}</b>
          <span className="a4-barrita">
            <i style={{ transform: `scaleX(${sim.total / K})` }} />
          </span>
        </dd>
      </div>
      <div>
        <dt className="etiqueta">Copias rotas</dt>
        <dd>
          <b>{rotas}</b> <span>de cada 10</span>
          <span className="a4-barrita a4-barrita--gris">
            <i style={{ transform: `scaleX(${rotas / 10})` }} />
          </span>
        </dd>
      </div>
      <div>
        <dt className="etiqueta">Variantes</dt>
        <dd>
          <b>{nVar}</b>
        </dd>
      </div>
    </dl>
  );
}

/* Barra de composición: qué parte de la placa es cada variante */
function Composicion({ sim }) {
  const lista = [...sim.pop.entries()].sort((a, b) => b[1] - a[1]);
  const top = lista.slice(0, 8);
  const resto = lista.slice(8).reduce((s, [, c]) => s + c, 0);
  const total = sim.total || 1;
  return (
    <div className="a4-composicion" aria-label="Qué parte de la placa es cada variante">
      <span className="etiqueta">Quiénes hay en la placa</span>
      <div className="a4-composicion__barra">
        {top.map(([k, c]) => {
          const g = genomaDe(k);
          return <i key={k} style={{ flexGrow: c / total, background: COLORES_CUERPO[g[0]], borderColor: SOMBRA[g[0]] }} title={`${c} virus`} />;
        })}
        {resto > 0 && <i className="is-resto" style={{ flexGrow: resto / total }} title="Otras variantes" />}
        {!sim.total && <i className="is-vacia" style={{ flexGrow: 1 }} />}
      </div>
    </div>
  );
}

function Barra({ etiqueta, valor, color }) {
  return (
    <div className="a4-barra">
      <span>{etiqueta}</span>
      <span className="a4-barra__pista">
        <i style={{ transform: `scaleX(${Math.min(1, valor / K)})`, background: color }} />
      </span>
      <b>{valor}</b>
    </div>
  );
}

function FichaVariante({ sim, nodo, onCerrar }) {
  const g = genomaDe(nodo.k);
  const cambios = g.map((v, i) => (v !== ORIGINAL[i] ? i : -1)).filter((i) => i >= 0);
  const hoy = sim.pop.get(nodo.k) || 0;
  return (
    <div className="a4-ficha anim-crecer" role="dialog" aria-label="Variante elegida">
      <button className="a4-ficha__cerrar" onClick={onCerrar} aria-label="Cerrar">
        ×
      </button>
      <VirusSVG genoma={g} tamano={92} />
      <div>
        <span className="etiqueta">{nodo.padre == null ? 'Virus original' : `Nació en la generación ${nodo.nace}`}</span>
        <Receta genoma={g} cambios={cambios} compacta etiqueta="Receta de la variante" />
        <p>
          {cambios.length ? cambios.map((i) => `${RASGOS[i].nombre.toLowerCase()}: ${RASGOS[i].valores[g[i]]}`).join(' · ') : 'Igual al original'}
        </p>
        <p className="a4-ficha__cuantos">{hoy ? `Hoy hay ${hoy} virus así` : 'Ya no queda ninguno'}</p>
      </div>
    </div>
  );
}

function Comparar({ datos, sim }) {
  const hip = HIPOTESIS.find((h) => h.id === datos.hipotesis);
  if (!hip) return null;
  const ocurrio = queHubo(sim);
  const ok = ocurrio === hip.id;
  return (
    <div className={`a4-comparar ${ok ? 'is-ok' : ''}`}>
      <span>
        <span className="etiqueta">Tu hipótesis</span> {hip.texto}
      </span>
      <span>
        <span className="etiqueta">Pasó</span> {PASO[ocurrio]}
      </span>
      <span className="a4-comparar__veredicto">{ok ? 'Se cumplió' : 'No se cumplió: ¡así se aprende!'}</span>
    </div>
  );
}

export function IconoAmbiente({ id, tamano = 64 }) {
  return (
    <svg className="a4-icono-amb" viewBox="0 0 64 64" width={tamano} height={tamano} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill={id === 'calor' ? '#FDE9C4' : id === 'celulas' ? '#DDF3EC' : '#E4E4FC'} />
      {id === 'defensas' && (
        <g stroke="#7272EE" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M22 46V34L14 25M22 34l8-9" />
          <path d="M44 44V33l-7-8M44 33l7-8" />
          <circle cx="32" cy="17" r="4.5" fill="#EF6F5E" stroke="none" />
          <path d="M32 21v7" stroke="#D06A8C" />
        </g>
      )}
      {id === 'celulas' && (
        <g>
          <circle cx="32" cy="34" r="17" fill="#8ED5C3" opacity=".7" />
          <circle cx="32" cy="34" r="6" fill="#3F9C82" opacity=".6" />
          <path d="M26 17v-6M38 17v-6M26 11l-4-4M26 11l4-4M38 11l-4-4M38 11l4-4" stroke="#2F4A85" strokeWidth="2.6" strokeLinecap="round" />
        </g>
      )}
      {id === 'calor' && (
        <g fill="none" strokeLinecap="round">
          <circle cx="32" cy="34" r="11" fill="#F2B13B" />
          <path d="M14 20q4-4 0-8M24 16q4-4 0-8M40 16q4-4 0-8M50 20q4-4 0-8" stroke="#EF6F5E" strokeWidth="2.8" />
          <circle cx="32" cy="34" r="16" stroke="#C98A1B" strokeWidth="3" strokeDasharray="1 5" />
        </g>
      )}
    </svg>
  );
}
