import { useId, useMemo, useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import { ambientePorId } from '../datos';
import {
  ANTIBIOTICOS, RADIO_DISCO, RADIO_HALO, NOMBRE_HALO, LUGARES_DISCOS,
  azar, coloresColonias, temperaturaPorId, resultadoAntibiotico, halosEncimados, masResistido,
} from '../laboratorio';
import { Cabeza, AvisoCapa, Pasos, sumarError, useTiempos } from '../piezas/comunes';
import Arrastrable from '../piezas/Arrastrable';
import Placa, { Colonia, DefsColonias, PlacaVidrio } from '../piezas/Placa';
import { firma, tono } from '../colonias';
import { Disco } from '../piezas/Instrumentos';
import Reloj from '../piezas/Reloj';
import { Termometro } from './Cultivo';

const PASOS = [
  { id: 'discos', nombre: 'Discos' },
  { id: 'prediccion', nombre: 'Predecir' },
  { id: 'incubar', nombre: 'Incubar' },
  { id: 'tiempo', nombre: 'Esperar' },
  { id: 'resultado', nombre: 'Leer' },
];

const PREDICCIONES = [
  { id: 'nada', nombre: 'No va a crecer nada en toda la placa' },
  { id: 'halos', nombre: 'Alrededor de algunos discos no van a crecer' },
  { id: 'igual', nombre: 'Va a crecer todo igual, como si nada' },
];

const MAX = 176 - RADIO_DISCO - 6;
const adentro = (x, y) => {
  const d = Math.hypot(x - 200, y - 200);
  if (d <= MAX) return { x: Math.round(x), y: Math.round(y) };
  return { x: Math.round(200 + ((x - 200) / d) * MAX), y: Math.round(200 + ((y - 200) / d) * MAX) };
};

/* Placa sembrada "en césped" con discos de antibiótico. Donde el antibiótico frena, queda un halo. */
export function PlacaCesped({ ambiente, discos, momento = 0, tamano = 360, onToque, destino, semilla = 5, etiqueta }) {
  const uid = useId().replace(/:/g, '');
  const [c1] = coloresColonias(ambiente);
  const morfo = firma(ambiente)[0];
  const resultados = discos.map((d) => ({ ...d, ...resultadoAntibiotico(ambiente, d.id) }));
  const resistentes = useMemo(() => {
    const r = azar(semilla * 13 + 1);
    const lista = [];
    resultados.forEach((d) => {
      const R = RADIO_HALO[d.halo];
      for (let i = 0; i < d.resistentes; i++) {
        const ang = r() * Math.PI * 2;
        const dist = RADIO_DISCO + 7 + r() * Math.max(4, R - RADIO_DISCO - 14);
        lista.push({ x: d.x + Math.cos(ang) * dist, y: d.y + Math.sin(ang) * dist, tam: 4 + r() * 3, semilla: 3 + lista.length * 17, giro: lista.length * 53 });
      }
    });
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(discos), ambiente, semilla]);

  const opacidad = momento === 0 ? 0.08 : momento === 1 ? 0.55 : 1;

  function click(e) {
    if (!onToque) return;
    const r = e.currentTarget.getBoundingClientRect();
    onToque(((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 400);
  }

  return (
    <div className={`a1-cesped ${onToque ? 'a1-cesped--activa' : ''}`} data-destino={destino} onClick={click}>
      <PlacaVidrio tamano={tamano} tapa={momento > 0} etiqueta={etiqueta || 'Placa con antibióticos'}>
        <defs>
          <DefsColonias uid={`r${uid}`} ambiente={ambiente} />
          {/* Césped: una capa de bacterias pareja y mate sobre todo el agar */}
          <radialGradient id={`cg${uid}`} cx=".45" cy=".42" r=".62">
            <stop offset="0" stopColor={tono(c1, 0.24)} />
            <stop offset=".75" stopColor={c1} />
            <stop offset="1" stopColor={tono(c1, -0.14)} />
          </radialGradient>
          <pattern id={`pc${uid}`} width="14" height="14" patternUnits="userSpaceOnUse">
            <ellipse cx="3" cy="4" rx="2.2" ry="1.6" fill={tono(c1, -0.3)} opacity=".16" />
            <ellipse cx="10" cy="10" rx="1.8" ry="1.3" fill={tono(c1, -0.3)} opacity=".13" />
            <circle cx="10" cy="3" r="1.1" fill="#FFFFFF" opacity=".24" />
            <circle cx="4" cy="11" r=".9" fill="#FFFFFF" opacity=".2" />
          </pattern>
          {/* Halo: el borde es nítido pero no cortado a cuchillo */}
          <radialGradient id={`hm${uid}`}>
            <stop offset=".92" stopColor="#000" />
            <stop offset="1" stopColor="#FFF" />
          </radialGradient>
          <mask id={`mk${uid}`}>
            <rect width="400" height="400" fill="#fff" />
            {momento > 0 && resultados.map((d) => <circle key={d.id} cx={d.x} cy={d.y} r={RADIO_HALO[d.halo] + 2} fill={`url(#hm${uid})`} />)}
          </mask>
        </defs>
        <g mask={`url(#mk${uid})`} className="a1-cesped__capa" style={{ opacity: opacidad }}>
          <circle cx="200" cy="200" r="176" fill={`url(#cg${uid})`} opacity={morfo.translucida ? 0.8 : 0.94} />
          <circle cx="200" cy="200" r="176" fill={`url(#pc${uid})`} />
        </g>
        {momento > 0 &&
          resultados.map((d) => (
            <circle key={`h${d.id}`} cx={d.x} cy={d.y} r={RADIO_HALO[d.halo]} fill="none" stroke="#8F7440" strokeWidth="1.2" opacity=".4" />
          ))}
        {resistentes.map((c, i) => (
          <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
            <g className="a1-colonia" style={{ transform: `scale(${momento === 2 ? 1 : momento === 1 ? 0.45 : 0})`, opacity: momento ? 1 : 0 }}>
              <Colonia c={{ ...c, forma: morfo.id, color: morfo.color, tam: c.tam * 1.25 }} uid={`r${uid}`} />
            </g>
          </g>
        ))}
        {discos.map((d) => {
          const ab = ANTIBIOTICOS.find((a) => a.id === d.id);
          return (
            <g key={d.id} transform={`translate(${d.x} ${d.y})`} className="a1-disco-en-placa">
              <circle r={RADIO_DISCO} fill="#fff" stroke={ab.color} strokeWidth="3" />
              <text y="5" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="14" fill="#22232A">
                {d.id}
              </text>
            </g>
          );
        })}
      </PlacaVidrio>
    </div>
  );
}

/* 7 · ANTIBIÓTICOS: discos sobre una placa en césped, predicción, incubación y halos. */
export default function Antibioticos({ progreso }) {
  const cultivos = progreso.datos.cultivos || [];
  const limpias = cultivos.filter((c) => !c.contaminada);
  const habilitado = progreso.desbloqueado('antibioticos');
  const tiempo = useTiempos();

  const [baseId, setBaseId] = useState(limpias.length === 1 ? limpias[0].id : null);
  const [paso, setPaso] = useState('discos');
  const [discos, setDiscos] = useState([]);
  const [elegido, setElegido] = useState(null);
  const [prediccion, setPrediccion] = useState(null);
  const [momento, setMomento] = useState(0);
  const [error, setError] = useState(null);
  const [respuesta, setRespuesta] = useState(null);
  const [fin, setFin] = useState(false);

  if (!habilitado) {
    return (
      <section className="a1-antibioticos">
        <Cabeza etiqueta="Antibióticos" titulo="Todavía no está habilitado">
          Tu maestra lo va a habilitar cuando sea el momento.
        </Cabeza>
        <button className="btn btn--primario" onClick={() => progreso.ir('mesa')}>
          Volver a la mesa
        </button>
        <GloboMoli texto="¡Paciencia! Mientras tanto podés comparar tus placas." animo="escucha" />
      </section>
    );
  }

  if (!limpias.length) {
    return (
      <section className="a1-antibioticos">
        <Cabeza etiqueta="Antibióticos" titulo="Necesitás una placa sin contaminar">
          Cultivá una muestra (¡con el asa esterilizada!) y volvé.
        </Cabeza>
        <button className="btn btn--primario" onClick={() => progreso.ir('mesa')}>
          Volver a la mesa
        </button>
        <GloboMoli texto="Con una placa contaminada no sabríamos qué bacterias estamos probando." animo="piensa" />
      </section>
    );
  }

  const base = limpias.find((c) => c.id === baseId);

  // ---- elegir la placa ----
  if (!base) {
    return (
      <section className="a1-antibioticos">
        <Cabeza etiqueta="Antibióticos" titulo="¿Con qué placa probamos?">
          Elegí una de tus placas. Vamos a sembrar esas bacterias en toda una placa nueva.
        </Cabeza>
        <ul className="a1-elegir-placa">
          {limpias.map((c, i) => {
            const amb = ambientePorId(c.ambiente);
            return (
              <li key={c.id} className="anim-crecer" style={{ animationDelay: `${i * 0.08}s` }}>
                <button className="a1-elegir-placa__boton" onClick={() => setBaseId(c.id)}>
                  <Placa placa={c} tamano={150} />
                  <span className="a1-chip">
                    <i style={{ background: amb?.color }} aria-hidden="true" />
                    {amb?.nombre}
                  </span>
                  <small>{temperaturaPorId(c.temp).nombre} · {c.colonias} colonias</small>
                </button>
              </li>
            );
          })}
        </ul>
        <GloboMoli texto="Los antibióticos son remedios contra bacterias. ¿Funcionarán con todas?" animo="piensa" />
      </section>
    );
  }

  const amb = ambientePorId(base.ambiente);
  const t = temperaturaPorId(base.temp);
  const libres = ANTIBIOTICOS.filter((a) => !discos.some((d) => d.id === a.id));
  const resultados = discos.map((d) => resultadoAntibiotico(base.ambiente, d.id));
  const mas = masResistido(resultados);

  function poner(id, x, y) {
    if (paso !== 'discos' || !id) return;
    const p = adentro(x, y);
    setDiscos((ds) => [...ds.filter((d) => d.id !== id), { id, ...p }]);
    setElegido(null);
  }
  function lugarLibre(id) {
    const libre = LUGARES_DISCOS.find((l) => !discos.some((d) => Math.hypot(d.x - l.x, d.y - l.y) < 40)) || LUGARES_DISCOS[0];
    poner(id, libre.x, libre.y);
  }
  function soltar(id, destino, { x, y, el }) {
    if (destino !== 'placa') return;
    const r = el.getBoundingClientRect();
    poner(id, ((x - r.left) / r.width) * 400, ((y - r.top) / r.height) * 400);
  }
  function esperar() {
    const sig = momento + 1;
    setMomento(sig);
    if (sig === 2) {
      tiempo(() => {
        if (halosEncimados(base.ambiente, discos)) {
          setError('discos');
          sumarError(progreso, 'discos');
        } else setPaso('resultado');
      }, 1600);
    }
  }
  function otraVez() {
    setError(null);
    setDiscos([]);
    setMomento(0);
    setPrediccion(null);
    setPaso('discos');
  }
  function anotar() {
    const lista = progreso.datos.antibioticos || [];
    progreso.guardar({
      antibioticos: [...lista, { placa: base.id, ambiente: base.ambiente, prediccion, discos, resultados, masResistido: mas }].slice(-3),
    });
    setFin(true);
  }

  // ---- textos ----
  let titulo = 'Poné los discos de antibiótico';
  let instruccion = 'Arrastrá cada disco a la placa (o tocá un disco y después la placa).';
  let moli = 'Sembramos tus bacterias en TODA la placa, como un césped. Cada disco tiene un antibiótico distinto.';
  let animo = 'feliz';
  if (paso === 'discos' && discos.length === 3) {
    moli = '¿Quedaron bien ubicados? Si querés, movelos.';
    animo = 'piensa';
  }
  if (paso === 'prediccion') {
    titulo = '¿Qué va a pasar?';
    instruccion = 'Antes de incubar, los científicos hacen una predicción.';
    moli = 'No hay respuesta mala: después vemos si pasó lo que pensaste.';
    animo = 'piensa';
  }
  if (paso === 'incubar') {
    titulo = 'Lista para incubar';
    instruccion = `La incubadora queda en ${t.nombre.toLowerCase()}, como tu placa.`;
    moli = 'Tengo ganas de ver qué pasa…';
    animo = 'escucha';
  }
  if (paso === 'tiempo') {
    titulo = momento === 0 ? 'A esperar' : momento === 1 ? 'Algo se ve…' : '¡Mirá los discos!';
    instruccion = 'Adelantá el reloj y mirá alrededor de cada disco.';
    moli = momento === 0 ? 'Las bacterias necesitan tiempo para crecer.' : momento === 1 ? 'Alrededor de algunos discos no crece nada…' : '¡Aparecieron halos!';
    animo = momento ? 'eureka' : 'escucha';
  }
  if (paso === 'resultado') {
    titulo = 'Leé tu placa';
    instruccion = 'El halo es la zona donde las bacterias NO crecieron.';
    moli = respuesta ? (respuesta === mas ? '¡Exacto! Esas bacterias resistieron.' : 'Mirá de nuevo: ¿dónde crecieron colonias igual?') : 'Fijate: ¿hay colonias adentro de algún halo?';
    animo = respuesta ? (respuesta === mas ? 'alegria' : 'duda') : 'piensa';
  }

  const placaLado =
    paso === 'discos' ? (
      <div className="a1-dispensador" role="group" aria-label="Discos de antibiótico">
        <span className="etiqueta etiqueta--oscura">Discos</span>
        {ANTIBIOTICOS.map((ab) => {
          const puesto = discos.some((d) => d.id === ab.id);
          return (
            <div key={ab.id} className={`a1-dispensador__fila ${puesto ? 'a1-dispensador__fila--puesto' : ''}`}>
              <Arrastrable
                className="a1-dispensador__disco"
                etiqueta={`${ab.nombre}${puesto ? ' (en la placa: arrastralo para moverlo)' : ''}`}
                elegido={elegido === ab.id}
                onToque={() => setElegido(elegido === ab.id ? null : ab.id)}
                onSoltar={(d, info) => soltar(ab.id, d, info)}
              >
                <Disco letra={ab.id} color={ab.color} tam={50} />
              </Arrastrable>
              <span className="a1-dispensador__nombre">
                {ab.nombre}
                {puesto && <small>En la placa</small>}
              </span>
              {elegido === ab.id && (
                <button className="btn btn--claro a1-btn-chico" onClick={() => lugarLibre(ab.id)}>
                  Ponerlo en un lugar libre
                </button>
              )}
            </div>
          );
        })}
        <button className="btn btn--experimentar btn--grande" disabled={libres.length > 0} onClick={() => setPaso('prediccion')}>
          Listo, ya están
        </button>
      </div>
    ) : paso === 'prediccion' ? (
      <fieldset className="a1-pregunta a1-prediccion">
        <legend>¿Qué pensás que va a pasar?</legend>
        {PREDICCIONES.map((p) => (
          <button key={p.id} className={`a1-opcion a1-opcion--ancha ${prediccion === p.id ? 'a1-opcion--sel' : ''}`} aria-pressed={prediccion === p.id} onClick={() => setPrediccion(p.id)}>
            {p.nombre}
          </button>
        ))}
        <button className="btn btn--primario" disabled={!prediccion} onClick={() => setPaso('incubar')}>
          Esa es mi predicción
        </button>
      </fieldset>
    ) : paso === 'incubar' ? (
      <div className="a1-incubar-ab">
        <Termometro nivel={t.nivel} color={t.color} alto={90} />
        <p className="a1-incubar-ab__pred">
          <span className="etiqueta etiqueta--oscura">Tu predicción</span>
          {PREDICCIONES.find((p) => p.id === prediccion)?.nombre}
        </p>
        <button className="btn btn--experimentar btn--grande" onClick={() => setPaso('tiempo')}>
          Meter en la incubadora
        </button>
        <button
          className="btn btn--secundario"
          onClick={() => {
            setError('incubar');
            sumarError(progreso, 'incubar');
          }}
        >
          Mirar el resultado ya
        </button>
      </div>
    ) : paso === 'tiempo' ? (
      <div className="a1-espera__lado">
        <Reloj vueltas={momento} />
        <ol className="a1-linea" aria-label="Tiempo en la incubadora">
          {t.tiempos.map((x, i) => (
            <li key={x} className={i <= momento ? 'hecho' : ''}>
              <span className="a1-linea__punto" />
              <span>{x}</span>
            </li>
          ))}
        </ol>
        {momento < 2 && (
          <button className="btn btn--experimentar btn--grande" onClick={esperar}>
            Esperar {t.tiempos[momento + 1]}
          </button>
        )}
      </div>
    ) : (
      <div className="a1-lectura">
        <ul className="a1-lectura__tabla">
          {resultados.map((r) => {
            const ab = ANTIBIOTICOS.find((a) => a.id === r.id);
            return (
              <li key={r.id} className="anim-crecer">
                <Disco letra={r.id} color={ab.color} tam={40} />
                <span className="a1-lectura__halo">
                  <span className="a1-lectura__barra">
                    <span style={{ transform: `scaleX(${RADIO_HALO[r.halo] / RADIO_HALO.grande})` }} />
                  </span>
                  <small>{NOMBRE_HALO[r.halo]}</small>
                </span>
                <span className="a1-lectura__res">
                  {r.halo === 'nada' ? 'No las frenó' : r.resistentes ? `${r.resistentes} resistente${r.resistentes > 1 ? 's' : ''}` : 'Ninguna resistió'}
                </span>
              </li>
            );
          })}
        </ul>
        <fieldset className="a1-pregunta">
          <legend>¿Con cuál antibiótico resistieron más bacterias?</legend>
          <div className="a1-opciones">
            {ANTIBIOTICOS.map((ab) => (
              <button key={ab.id} className={`a1-opcion ${respuesta === ab.id ? (respuesta === mas ? 'a1-opcion--bien' : 'a1-opcion--mal') : ''}`} aria-pressed={respuesta === ab.id} onClick={() => setRespuesta(ab.id)}>
                {ab.nombre}
              </button>
            ))}
          </div>
        </fieldset>
        {respuesta === mas && (
          <button className="btn btn--primario anim-crecer" onClick={anotar}>
            Anotar en mi cuaderno
          </button>
        )}
      </div>
    );

  const textoPrediccion = {
    halos: '¡Pasó lo que predijiste! Alrededor de algunos discos no crecieron.',
    nada: 'Predijiste que no iba a crecer nada, pero lejos de los discos crecieron igual: el antibiótico solo llega cerca del disco.',
    igual: 'Predijiste que crecería todo igual, pero alrededor de algunos discos no crecieron: ahí el antibiótico las frenó.',
  };

  return (
    <section className="a1-antibioticos">
      <Cabeza etiqueta={`Antibióticos · ${amb.nombre}`} titulo={titulo} extra={<Pasos lista={PASOS} actual={paso} />}>
        {instruccion}
      </Cabeza>

      <div className="a1-antibioticos__cuerpo">
        <div className="a1-antibioticos__placa">
          <PlacaCesped
            ambiente={base.ambiente}
            discos={discos}
            momento={momento}
            semilla={base.semilla}
            tamano={paso === 'resultado' ? 340 : 360}
            destino={paso === 'discos' ? 'placa' : undefined}
            onToque={paso === 'discos' && elegido ? (x, y) => poner(elegido, x, y) : undefined}
            etiqueta={`Placa con ${discos.length} discos de antibiótico`}
          />
        </div>
        {placaLado}
      </div>

      {error === 'incubar' && (
        <AvisoCapa tipo="error" titulo="No pasó nada… todavía" accion="Meter en la incubadora" onAccion={() => { setError(null); setPaso('tiempo'); }}>
          Sin incubar, las bacterias no tuvieron tiempo ni la temperatura para crecer. Todavía no hay nada que leer.
        </AvisoCapa>
      )}
      {error === 'discos' && (
        <AvisoCapa tipo="error" titulo="Los halos se juntaron" accion="Probar otra vez" onAccion={otraVez}>
          Los discos quedaron muy juntos: los halos se mezclaron y no se puede saber qué antibiótico frenó a qué bacterias. Separalos más.
        </AvisoCapa>
      )}
      {fin && (
        <AvisoCapa tipo="dato" titulo="Algunas bacterias resisten" accion="Volver a la mesa" onAccion={() => progreso.ir('mesa')}>
          {textoPrediccion[prediccion]} Algunas colonias crecieron igual: son resistentes. Por eso los antibióticos se usan solo cuando los indica un médico.
        </AvisoCapa>
      )}

      {!error && !fin && <GloboMoli texto={moli} animo={animo} />}
    </section>
  );
}
