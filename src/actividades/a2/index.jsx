import { useEffect, useMemo, useRef, useState } from 'react';
import GloboMoli from '../../components/GloboMoli';
import Aviso from '../../components/Aviso';
import Visor, { ROT_INICIAL } from './Visor';
import { construir, curvaCambio } from './modelo';
import {
  ESTRUCTURAS,
  estructura as buscarEstructura,
  INICIAL,
  PRESETS_T,
  PRESETS_PH,
  zonaT,
  zonaPh,
  fmtPh,
  resultado as calcularResultado,
  forma,
  CAMBIOS,
  PREDICCIONES,
  textoHipotesis,
  NOMBRE_RESULTADO,
  CAMBIOS_VISIBLES,
  cambiosVerdaderos,
  esControl,
  iguales,
} from './ciencia';
import './a2.css';

/*
  A2 · Simulaciones Biomoleculares
  El niño elige una proteína (dengue, zika o una de control), la gira y conoce
  sus partes, hace una hipótesis, ajusta temperatura y pH, mira la simulación
  y compara. Termina con un informe de simulación.
*/

const modelos = new Map();
const modeloDe = (id) => {
  if (!modelos.has(id)) modelos.set(id, construir(id));
  return modelos.get(id);
};

const ultima = (lista) => lista[lista.length - 1];
const condicion = (c) => `${c.t} °C · pH ${fmtPh(c.ph)}`;

export default function ActividadA2({ progreso }) {
  const d = progreso.datos || {};
  const habilitadas = useMemo(() => {
    const ids = progreso.opciones?.estructuras;
    const lista = ids?.length ? ESTRUCTURAS.filter((e) => ids.includes(e.id)) : ESTRUCTURAS;
    return lista.length ? lista : ESTRUCTURAS;
  }, [progreso.opciones]);
  const idEst = d.estructura && habilitadas.some((e) => e.id === d.estructura) ? d.estructura : null;
  const modelo = idEst ? modeloDe(idEst) : null;

  let etapa = progreso.etapa;
  if (!modelo && etapa !== 'estructura') etapa = 'estructura';

  const props = { progreso, d, modelo };
  switch (etapa) {
    case 'explorar':
      return <Explorar {...props} />;
    case 'hipotesis':
      return <Hipotesis {...props} />;
    case 'condiciones':
      return d.hipotesis ? <Condiciones {...props} /> : <Hipotesis {...props} />;
    case 'simulacion':
      return d.corridas?.length ? <Simulacion key={d.corridas.length + condicion(ultima(d.corridas))} {...props} /> : <Condiciones {...props} />;
    case 'comparar':
      return d.corridas?.length ? <Comparar {...props} /> : <Condiciones {...props} />;
    case 'conclusion':
      return d.corridas?.length ? <Conclusion {...props} /> : <Condiciones {...props} />;
    default:
      return <Elegir progreso={progreso} habilitadas={habilitadas} />;
  }
}

/* ---------------- 1. Elegir la molécula ---------------- */
function Elegir({ progreso, habilitadas }) {
  const elegir = (id) =>
    progreso.ir('explorar', { estructura: id, vistas: [], hipotesis: null, corridas: [], ronda: 1, cumplida: null, marcadas: [] });
  return (
    <section className="a2-etapa">
      <header className="a2-titulo anim-entrar">
        <span className="etiqueta etiqueta--oscura">Laboratorio de Simulaciones Biomoleculares</span>
        <h1>Elegí una molécula para simular</h1>
        <p>Son tan chiquitas que no se ven con un microscopio común. Por eso los científicos las estudian con computadoras.</p>
      </header>
      <ul className="a2-modelos">
        {habilitadas.map((e, i) => (
          <li key={e.id} className="anim-crecer" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
            <button type="button" className="a2-modelo" onClick={() => elegir(e.id)}>
              <Visor modelo={modeloDe(e.id)} estado={null} quieto controles={false} interactivo={false} acercar={e.pares ? 1.25 : 1} etiqueta={`Modelo de ${e.nombre}`} className="a2-visor--mini" />
              <span className="etiqueta">
                Modelo 0{i + 1}
                {e.control ? ' · control' : ''}
              </span>
              <span className="a2-modelo__nombre">{e.nombre}</span>
              <span className="a2-modelo__detalle">{e.detalle}</span>
            </button>
          </li>
        ))}
      </ul>
      <GloboMoli texto="Elegí una. Las tres son proteínas: piezas chiquitísimas." animo="feliz" />
    </section>
  );
}

/* ---------------- 2. Explorar: girar y conocer las partes ---------------- */
function Explorar({ progreso, d, modelo }) {
  const e = modelo.e;
  const vistas = d.vistas || [];
  const [sel, setSel] = useState(null);
  const todas = e.partes.every((p) => vistas.includes(p.id));
  const parte = e.partes.find((p) => p.id === sel);

  const tocar = (dom) => {
    setSel(dom);
    if (dom && !vistas.includes(dom)) progreso.guardar({ vistas: [...vistas, dom] });
  };

  let moli = 'Arrastrá para girarla. Tocá un color para saber qué parte es.';
  if (todas) moli = '¡Ya conocés todas sus partes! Ahora, a experimentar.';
  else if (e.pares && vistas.length >= 2) moli = '¿Viste? Hay dos copias iguales: en el virus van de a pares.';
  else if (vistas.length === 1) moli = 'Cada esfera es un grupito de aminoácidos, en fila como un collar.';

  return (
    <section className="a2-etapa a2-dos">
      <Visor modelo={modelo} estado={null} quieto resaltado={sel} onTocar={tocar} giroInicial etiqueta={`Modelo de ${e.nombre}`} className="a2-visor--grande">
        <span className="a2-visor__marca etiqueta">Visor 3D · modelo simplificado</span>
        {parte && (
          <div className="a2-ficha anim-crecer" key={parte.id}>
            <span className="etiqueta">{parte.tecnico}</span>
            <span className="a2-ficha__nombre">{parte.nombre}</span>
            <p>{parte.detalle}</p>
          </div>
        )}
      </Visor>
      <div className="a2-panel">
        <span className="etiqueta etiqueta--oscura">
          {e.corto} · {vistas.length} de {e.partes.length} partes
        </span>
        <h1 className="a2-h">Tocá cada color</h1>
        <ul className="a2-partes">
          {e.partes.map((p) => {
            const vista = vistas.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`a2-parte ${sel === p.id ? 'a2-parte--sel' : ''} ${vista ? 'a2-parte--vista' : ''}`}
                  onClick={() => tocar(sel === p.id ? null : p.id)}
                  aria-pressed={sel === p.id}
                >
                  <span className="a2-punto" style={{ background: p.color }} />
                  <span>{vista ? p.nombre : 'Parte sin descubrir'}</span>
                  {vista && <Tilde />}
                </button>
              </li>
            );
          })}
        </ul>
        {todas && (
          <button type="button" className="btn btn--primario btn--grande anim-crecer" onClick={() => progreso.ir('hipotesis')}>
            Ya la conozco
          </button>
        )}
      </div>
      <GloboMoli texto={moli} animo={todas ? 'alegria' : vistas.length ? 'eureka' : 'feliz'} />
    </section>
  );
}

/* ---------------- 3. Hipótesis ---------------- */
function Hipotesis({ progreso, d, modelo }) {
  const [cambio, setCambio] = useState(d.hipotesis?.cambio || null);
  const [prediccion, setPrediccion] = useState(d.hipotesis?.prediccion || null);
  const listo = cambio && prediccion;
  return (
    <section className="a2-etapa a2-hipo-dos">
      <div className="a2-hipo">
      <header className="a2-titulo anim-entrar">
        <span className="etiqueta etiqueta--oscura">Antes de simular</span>
        <h1>¿Qué creés que va a pasar?</h1>
      </header>
      <div className="a2-frase">
        <span className="a2-frase__conector">Si</span>
        {CAMBIOS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`a2-opcion a2-opcion--fila ${cambio === c.id ? 'a2-opcion--sel' : ''}`}
            onClick={() => setCambio(c.id)}
            aria-pressed={cambio === c.id}
          >
            {c.id === 'calor' ? <IconoTermometro /> : <IconoGota />}
            {c.texto}
          </button>
        ))}
      </div>
      <div className="a2-frase a2-frase--pred">
        <span className="a2-frase__conector">la proteína…</span>
        {PREDICCIONES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`a2-opcion a2-opcion--carta ${prediccion === p.id ? 'a2-opcion--sel' : ''}`}
            onClick={() => setPrediccion(p.id)}
            aria-pressed={prediccion === p.id}
          >
            <IconoForma tipo={p.id} />
            {p.texto}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn btn--primario btn--grande"
        disabled={!listo}
        onClick={() => progreso.ir('condiciones', { hipotesis: { cambio, prediccion } })}
      >
        Guardar mi hipótesis
      </button>
      </div>
      <Visor
        modelo={modelo}
        estado={null}
        quieto
        controles={false}
        resaltado={prediccion === 'cambia' && modelo.e.pares ? 'lazo' : null}
        atenuar={0.6}
        etiqueta={`Tu molécula: ${modelo.e.nombre}`}
      >
        <span className="a2-visor__marca etiqueta">{modelo.e.corto} · antes de simular</span>
      </Visor>
      <GloboMoli
        texto={listo ? 'Buena predicción. ¡Ahora vamos a ponerla a prueba!' : 'Los científicos predicen antes de experimentar. ¡Equivocarse vale!'}
        animo={listo ? 'eureka' : 'piensa'}
      />
    </section>
  );
}

/* ---------------- 4. Condiciones: temperatura y pH ---------------- */
function Condiciones({ progreso, d, modelo }) {
  const ronda = d.ronda || 1;
  const previa = d.corridas?.[ronda - 1];
  const [t, setT] = useState(previa?.t ?? INICIAL.t);
  const [ph, setPh] = useState(previa?.ph ?? INICIAL.ph);
  const [pista, setPista] = useState(false);
  const h = d.hipotesis || {};

  const simular = (forzar) => {
    const noProbo = (h.cambio === 'calor' && t < 45 && ronda === 1) || (h.cambio === 'acido' && ph >= 6.6 && ronda === 1);
    if (noProbo && !forzar) {
      setPista(true);
      return;
    }
    const nueva = { t, ph, r: calcularResultado(modelo.id, t, ph) };
    const corridas = (d.corridas || []).slice(0, ronda - 1).concat(nueva);
    progreso.ir('simulacion', { corridas });
  };

  const moli =
    ronda > 1
      ? 'Segunda corrida: cambiá algo distinto para poder comparar.'
      : h.cambio === 'acido'
        ? 'El pH dice cuán ácido es algo. ¡Probá moverlo!'
        : 'Mové la temperatura. ¿Cuánto calor aguantará?';

  return (
    <section className="a2-etapa a2-dos a2-dos--cond">
      <div className="a2-instrumentos">
        <div className="a2-instrumento anim-crecer">
          <Termometro t={t} />
          <div className="a2-instrumento__cuerpo">
            <div className="a2-instrumento__lectura">
              <label htmlFor="a2-temp" className="etiqueta etiqueta--oscura">
                Temperatura
              </label>
              <span className="a2-valor">{t} °C</span>
              <span className="a2-zona">{zonaT(t)}</span>
            </div>
            <input
              id="a2-temp"
              type="range"
              min="0"
              max="100"
              step="1"
              value={t}
              onChange={(ev) => {
                setT(Number(ev.target.value));
                setPista(false);
              }}
              className="a2-rango a2-rango--temp"
              aria-valuetext={`${t} grados, ${zonaT(t)}`}
            />
            <div className="a2-presets">
              {PRESETS_T.map((p) => (
                <button key={p.v} type="button" className={`a2-preset ${t === p.v ? 'a2-preset--sel' : ''}`} onClick={() => (setT(p.v), setPista(false))}>
                  {p.nombre} <b>{p.v}°</b>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="a2-instrumento anim-crecer" style={{ animationDelay: '0.12s' }}>
          <TiraPh ph={ph} />
          <div className="a2-instrumento__cuerpo">
            <div className="a2-instrumento__lectura">
              <label htmlFor="a2-ph" className="etiqueta etiqueta--oscura">
                Acidez (pH)
              </label>
              <span className="a2-valor">pH {fmtPh(ph)}</span>
              <span className="a2-zona">{zonaPh(ph)}</span>
            </div>
            <input
              id="a2-ph"
              type="range"
              min="1"
              max="13"
              step="0.1"
              value={ph}
              onChange={(ev) => {
                setPh(Number(ev.target.value));
                setPista(false);
              }}
              className="a2-rango a2-rango--ph"
              aria-valuetext={`pH ${fmtPh(ph)}, ${zonaPh(ph)}`}
            />
            <div className="a2-presets">
              {PRESETS_PH.map((p) => (
                <button key={p.v} type="button" className={`a2-preset ${ph === p.v ? 'a2-preset--sel' : ''}`} onClick={() => (setPh(p.v), setPista(false))}>
                  {p.nombre} <b>{fmtPh(p.v)}</b>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="a2-panel">
        <span className="etiqueta etiqueta--oscura">
          {modelo.e.corto} · corrida {ronda}
        </span>
        <h1 className="a2-h">Ajustá las condiciones</h1>
        {pista ? null : ronda === 1 ? (
          <div className="a2-recuerdo">
            <span className="etiqueta">Tu hipótesis</span>
            <p>{textoHipotesis(h)}</p>
          </div>
        ) : (
          <div className="a2-recuerdo">
            <span className="etiqueta">Corrida 1</span>
            <p>
              {condicion(d.corridas[0])} · {NOMBRE_RESULTADO[d.corridas[0].r]}
            </p>
          </div>
        )}
        {pista ? (
          <Aviso
            tipo="pista"
            titulo={h.cambio === 'calor' ? 'Tu hipótesis habla de mucho calor' : 'Tu hipótesis habla de acidez'}
            accion={h.cambio === 'calor' ? 'Subir la temperatura' : 'Bajar el pH'}
            onAccion={() => {
              setPista(false);
              document.getElementById(h.cambio === 'calor' ? 'a2-temp' : 'a2-ph')?.focus();
            }}
            secundaria="Simular igual"
            onSecundaria={() => simular(true)}
          >
            {h.cambio === 'calor' ? `Pero la temperatura está en ${t} °C.` : `Pero el pH está en ${fmtPh(ph)}: eso no es ácido.`}
          </Aviso>
        ) : (
          <button type="button" className="btn btn--experimentar btn--grande a2-simular" onClick={() => simular(false)}>
            <IconoPlay /> Simular
          </button>
        )}
      </div>
      <GloboMoli texto={pista ? '' : moli} animo="piensa" />
    </section>
  );
}

/* ---------------- 5. Simulación ---------------- */
const DURACION = 7; // segundos de reproducción para 100 ns simulados

function Simulacion({ progreso, d, modelo }) {
  const ronda = d.ronda || 1;
  const c = ultima(d.corridas);
  const r = c.r;
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [fase, setFase] = useState('calcula');
  const [calc, setCalc] = useState(0);
  const [t, setT] = useState(0);
  const [jugando, setJugando] = useState(false);
  const terminado = t >= 1;

  // La computadora calcula (barra breve)
  useEffect(() => {
    if (fase !== 'calcula') return undefined;
    const total = reducido ? 600 : 2800;
    const inicio = performance.now();
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - inicio) / total);
      setCalc(k);
      if (k >= 1) {
        clearInterval(id);
        setFase('mira');
        setJugando(true);
      }
    }, 80);
    return () => clearInterval(id);
  }, [fase, reducido]);

  // Línea de tiempo
  useEffect(() => {
    if (!jugando) return undefined;
    let id = 0;
    let antes = performance.now();
    const paso = (ahora) => {
      const dt = (ahora - antes) / 1000;
      antes = ahora;
      setT((x) => {
        const n = Math.min(1, x + dt / DURACION);
        if (n >= 1) setJugando(false);
        return n;
      });
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [jugando]);

  // Al terminar la primera corrida, se guarda si se cumplió la hipótesis
  const guardado = useRef(false);
  useEffect(() => {
    if (terminado && ronda === 1 && !guardado.current) {
      guardado.current = true;
      progreso.guardar({ cumplida: forma(r) === d.hipotesis?.prediccion });
    }
  }, [terminado, ronda, r, d.hipotesis, progreso]);

  const estado = useMemo(() => ({ resultado: r, t, temp: c.t }), [r, t, c.t]);
  const curva = useMemo(() => curvaCambio(modelo, { resultado: r, temp: c.t }), [modelo, r, c.t]);

  if (fase === 'calcula') return <Calculando k={calc} modelo={modelo} c={c} />;

  const ns = Math.round(t * 100);
  let moli = 'Mirá cómo se mueve. Podés pausar y volver atrás.';
  let animo = 'escucha';
  if (terminado) {
    if (r === 'desarmada') {
      moli = '¡Se desnaturalizó! Como cuando se cocina un huevo.';
      animo = 'duda';
    } else if (r === 'cambia') {
      moli = '¡Cambió de forma! Fijate dónde quedó el gancho.';
      animo = 'eureka';
    } else {
      moli = 'Mantuvo su forma. ¿Era lo que esperabas?';
      animo = 'piensa';
    }
  }

  const reiniciarTiempo = () => {
    setT(0);
    setJugando(true);
  };

  return (
    <section className="a2-etapa a2-dos">
      <div className="a2-columna">
        <Visor
          modelo={modelo}
          estado={estado}
          vibrar={jugando}
          resaltado={terminado && r === 'cambia' ? 'lazo' : null}
          atenuar={0.62}
          etiqueta={`Simulación de ${modelo.e.nombre} a ${condicion(c)}`}
          className="a2-visor--sim"
        >
          <span className="a2-visor__marca etiqueta">Tiempo simulado · {ns} ns</span>
        </Visor>
        <div className="a2-linea">
          <button
            type="button"
            className="a2-play"
            onClick={() => (terminado ? reiniciarTiempo() : setJugando((j) => !j))}
            aria-label={jugando ? 'Pausar' : terminado ? 'Ver de nuevo' : 'Reproducir'}
          >
            {jugando ? <IconoPausa /> : terminado ? <IconoOtraVez /> : <IconoPlay />}
          </button>
          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(t * 1000)}
            onChange={(ev) => {
              setJugando(false);
              setT(Number(ev.target.value) / 1000);
            }}
            className="a2-rango a2-rango--tiempo"
            aria-label="Línea de tiempo de la simulación"
            aria-valuetext={`${ns} nanosegundos`}
            style={{ '--avance': `${t * 100}%` }}
          />
          <span className="etiqueta etiqueta--oscura a2-linea__fin">100 ns</span>
        </div>
      </div>
      <div className="a2-panel">
        <div className="a2-chips">
          <span className="a2-chip">{modelo.e.corto}</span>
          <span className="a2-chip">{c.t} °C</span>
          <span className="a2-chip">pH {fmtPh(c.ph)}</span>
          <span className="a2-chip a2-chip--claro">corrida {ronda}</span>
        </div>
        {terminado ? (
          <Resultado r={r} c={c} modelo={modelo} progreso={progreso} />
        ) : (
          <Grafico curva={curva} t={t} />
        )}
      </div>
      <GloboMoli texto={moli} animo={animo} />
    </section>
  );
}

function Calculando({ k, modelo, c }) {
  const pasos = Math.round(k * 50000);
  const nucleos = Array.from({ length: 24 });
  return (
    <section className="a2-etapa a2-calcula" aria-live="polite">
      <div className="a2-compu anim-crecer">
        <span className="etiqueta">La computadora del laboratorio está calculando</span>
        <div className="a2-compu__nucleos" aria-hidden="true">
          {nucleos.map((_, i) => (
            <span key={i} style={{ animationDelay: `${(i * 137) % 900}ms` }} />
          ))}
        </div>
        <div className="a2-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(k * 100)}>
          <span style={{ transform: `scaleX(${k})` }} />
        </div>
        <ul className="a2-compu__log">
          <li>
            Molécula: {modelo.e.nombre} · {modelo.n} esferas
          </li>
          <li>Condiciones: {condicion(c)}</li>
          <li>Calculando cómo se empuja cada esfera con las demás…</li>
          <li>
            Paso {pasos.toLocaleString('es-UY')} de 50.000 · cada paso dura 2 femtosegundos
          </li>
        </ul>
        <p className="a2-compu__nota">Una simulación de verdad puede tardar días en computadoras muy potentes. Esta es una versión cortita.</p>
      </div>
      <GloboMoli texto="Los científicos no pueden ver esto: por eso lo calculan." animo="piensa" />
    </section>
  );
}

function Grafico({ curva, t }) {
  const W = 400;
  const H = 170;
  const max = Math.max(4, ...curva.map((p) => p[1])) * 1.1;
  const X = (x) => 52 + x * (W - 68);
  const Y = (y) => H - 26 - (y / max) * (H - 46);
  const visibles = curva.filter((p) => p[0] <= t + 0.0001);
  const linea = visibles.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  const ult = ultima(visibles) || curva[0];
  return (
    <figure className="a2-grafico">
      <figcaption>
        <span className="a2-grafico__titulo">¿Cuánto cambió su forma?</span>
        <span className="etiqueta">Los científicos lo miran así (RMSD)</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de cuánto se alejó la proteína de su forma inicial a lo largo del tiempo">
        <line x1={52} y1={H - 26} x2={W - 16} y2={H - 26} stroke="#2F4A85" strokeOpacity="0.35" />
        <line x1={52} y1={14} x2={52} y2={H - 26} stroke="#2F4A85" strokeOpacity="0.35" />
        <text x={46} y={22} textAnchor="end" className="a2-grafico__eje">
          mucho
        </text>
        <text x={46} y={H - 28} textAnchor="end" className="a2-grafico__eje">
          igual
        </text>
        <text x={52} y={H - 8} className="a2-grafico__eje">
          0 ns
        </text>
        <text x={W - 16} y={H - 8} textAnchor="end" className="a2-grafico__eje">
          100 ns
        </text>
        <path d={linea} fill="none" stroke="#2F4A85" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(ult[0])} cy={Y(ult[1])} r="7" fill="#8ED5C3" stroke="#2F4A85" strokeWidth="2.5" />
      </svg>
    </figure>
  );
}

function Resultado({ r, c, modelo, progreso }) {
  const e = modelo.e;
  const otra = () => progreso.ir('condiciones');
  const comparar = () => progreso.ir('comparar');
  if (r === 'desarmada') {
    const porCalor = c.t >= e.tDesarma;
    return (
      <Aviso tipo="error" titulo="¡Se desnaturalizó!" accion="Probar otras condiciones" onAccion={otra} secundaria="Comparar igual" onSecundaria={comparar}>
        {porCalor
          ? `A ${c.t} °C la proteína perdió su forma: el collar se soltó. Los científicos dicen que se desnaturalizó, como la clara de un huevo cuando se cocina.`
          : `Con un pH tan ${c.ph < 7 ? 'ácido' : 'básico'}, la proteína perdió su forma: el collar se soltó. Los científicos dicen que se desnaturalizó.`}
      </Aviso>
    );
  }
  if (r === 'cambia')
    return (
      <Aviso tipo="dato" titulo="¡Cambió de forma!" accion="Comparar" onAccion={comparar}>
        {/* VALIDAR: explicación simplificada del cambio de la proteína E con pH ácido (en el virus real se agrupan de a tres). */}
        Con acidez, las dos copias se separan y se paran con el gancho arriba. Así el virus se engancha a la célula para entrar.
      </Aviso>
    );
  const textos = {
    agitada: ['Vibra mucho, pero aguanta', 'Con calor las moléculas se mueven más. Su forma todavía sigue igual.'],
    fria: ['Casi quieta', 'Con frío las moléculas se mueven poquito. Por eso guardamos muestras en la heladera.'],
    estable: ['Siguió igual', 'Se movió un poquito, como siempre, pero mantuvo su forma.'],
  };
  if (r === 'estable' && e.control && c.ph <= 6.2) textos.estable = ['Siguió igual', 'La lisozima no cambia con esta acidez. Probá con la del dengue: ¡esa sí!'];
  const [titulo, cuerpo] = textos[r];
  return (
    <Aviso tipo="dato" titulo={titulo} accion="Comparar" onAccion={comparar}>
      {cuerpo}
    </Aviso>
  );
}

/* ---------------- 6. Comparar ---------------- */
function Comparar({ progreso, d, modelo }) {
  const e = modelo.e;
  const corridas = d.corridas;
  const ronda = d.ronda || 1;
  const ult = ultima(corridas);
  const n = corridas.length;
  const [rot, setRot] = useState(ROT_INICIAL);
  const [marcadas, setMarcadas] = useState(d.marcadas || []);
  const [revision, setRevision] = useState(null); // null | {ok, mensaje}
  const [intentos, setIntentos] = useState(0);
  const resuelto = revision?.ok || intentos >= 2;
  const { req, ok } = cambiosVerdaderos(ult.r, ult.t, e.pares);
  const opciones = CAMBIOS_VISIBLES.filter((x) => e.pares || x.id !== 'separa');

  const paneles = [
    { id: 'ini', titulo: 'Al empezar', sub: condicion(INICIAL), estado: { resultado: 'estable', t: 0, temp: INICIAL.t } },
    ...corridas.map((c, i) => ({ id: `c${i}`, titulo: `Corrida ${i + 1}`, sub: condicion(c), estado: { resultado: c.r, t: 1, temp: c.t } })),
  ];

  const alternar = (id) => {
    setRevision(null);
    setMarcadas((m) => {
      if (m.includes(id)) return m.filter((x) => x !== id);
      if (id === 'nada') return ['nada'];
      return [...m.filter((x) => x !== 'nada'), id];
    });
  };

  const PISTAS = {
    mueve: 'Fijate cuánto tiemblan las esferas en cada una.',
    quieta: 'Fijate: ¿tiemblan más o menos que al empezar?',
    forma: 'Mirá la forma: ¿es la misma que al empezar?',
    separa: 'Mirá las dos copias: ¿siguen juntitas?',
    desarma: '¿Sigue plegada o se soltó el collar?',
    nada: 'Si no ves ningún cambio, marcá "No cambió nada".',
  };

  const revisar = () => {
    const sobra = marcadas.filter((x) => !ok.has(x));
    const falta = [...req].filter((x) => !marcadas.includes(x));
    if (!sobra.length && !falta.length) {
      setRevision({ ok: true });
      progreso.guardar({ marcadas });
      return;
    }
    const intento = intentos + 1;
    setIntentos(intento);
    const txt = (id) => CAMBIOS_VISIBLES.find((x) => x.id === id)?.texto;
    if (intento >= 2) {
      progreso.guardar({ marcadas });
      setRevision({ ok: false, final: true, mensaje: `Lo que se ve: ${[...req].map(txt).join(' y ').toLowerCase()}.` });
    } else if (sobra.length)
      setRevision({ ok: false, mensaje: `"${txt(sobra[0])}" no se ve en la corrida ${n}. ${falta.length ? PISTAS[falta[0]] : 'Mirá otra vez las dos.'}` });
    else setRevision({ ok: false, mensaje: PISTAS[falta[0]] });
  };

  const control = esControl(ult);
  const repetida = n > 1 && iguales(corridas[0], corridas[1]);
  const cumplida = d.cumplida;

  let moli = 'Las moléculas giran juntas: arrastrá una y mirá las otras.';
  if (resuelto) moli = cumplida ? '¡Tu hipótesis se cumplió!' : 'Los científicos también se equivocan: por eso simulan.';

  return (
    <section className="a2-etapa a2-dos a2-dos--comparar">
      <div className="a2-columna">
        <div className={`a2-comparar a2-comparar--${paneles.length}`}>
          {paneles.map((p) => (
            <div key={p.id} className="a2-comparar__panel">
              <Visor modelo={modelo} estado={p.estado} vibrar rot={rot} onRot={setRot} controles={false} etiqueta={`${p.titulo}: ${p.sub}`} className="a2-visor--comp" />
              <div className="a2-comparar__pie">
                <b>{p.titulo}</b>
                <span>{p.sub}</span>
              </div>
            </div>
          ))}
        </div>
        {(control || repetida) && !revision && (
          <Aviso
            tipo="dato"
            titulo={repetida ? 'Repetiste las mismas condiciones' : 'No cambiaste nada'}
            accion="Cambiar algo y simular"
            onAccion={() => progreso.ir('condiciones')}
          >
            {repetida
              ? 'Por eso dio lo mismo. Para comparar, hay que cambiar algo.'
              : 'Simulaste como en el cuerpo. Eso se llama control: sirve para comparar después.'}
          </Aviso>
        )}
        {revision && !revision.ok && !revision.final && (
          <Aviso tipo="pista" titulo="Mirá otra vez">
            {revision.mensaje}
          </Aviso>
        )}
        {resuelto && (
          <Veredicto d={d} revision={revision}>
            {ronda === 1 && n === 1 && (
              <button type="button" className="btn btn--secundario" onClick={() => progreso.ir('condiciones', { ronda: 2, marcadas: [] })}>
                Hacer otra corrida
              </button>
            )}
            <button type="button" className="btn btn--primario" onClick={() => progreso.ir('conclusion')}>
              Ver mi informe
            </button>
          </Veredicto>
        )}
      </div>
      <div className="a2-panel">
        <h1 className="a2-h">¿Qué cambió?</h1>
        <p className="a2-instruccion">
          Compará el inicio con la corrida {n}. Marcá todo lo que veas.
        </p>
        <div className="a2-marcas" role="group" aria-label="Cambios que ves">
          {opciones.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`a2-marca ${marcadas.includes(o.id) ? 'a2-marca--sel' : ''}`}
              aria-pressed={marcadas.includes(o.id)}
              onClick={() => alternar(o.id)}
              disabled={resuelto}
            >
              <span className="a2-marca__caja">{marcadas.includes(o.id) && <Tilde />}</span>
              {o.texto}
            </button>
          ))}
        </div>
        {!resuelto && (
          <button type="button" className="btn btn--primario" disabled={!marcadas.length} onClick={revisar}>
            Revisar
          </button>
        )}
      </div>
      <GloboMoli texto={moli} animo={resuelto ? (cumplida ? 'alegria' : 'piensa') : 'escucha'} />
    </section>
  );
}

function Veredicto({ d, revision, children }) {
  const c = d.corridas[0];
  const h = d.hipotesis;
  return (
    <div className="a2-veredicto anim-crecer">
      {revision?.ok ? (
        <p className="a2-veredicto__bien">
          <Tilde /> ¡Bien mirado!
        </p>
      ) : (
        <p className="a2-veredicto__bien">{revision?.mensaje}</p>
      )}
      <div className="a2-veredicto__fila">
        <div>
          <span className="etiqueta">Tu hipótesis</span>
          <p>{textoHipotesis(h)}</p>
        </div>
        <div>
          <span className="etiqueta">Corrida 1 · {condicion(c)}</span>
          <p>{NOMBRE_RESULTADO[c.r]}.</p>
        </div>
        <Sello cumplida={d.cumplida} chico />
      </div>
      <div className="a2-acciones">{children}</div>
    </div>
  );
}

/* ---------------- 7. Informe de simulación ---------------- */
function Conclusion({ progreso, d, modelo }) {
  const e = modelo.e;
  const c = d.corridas;
  const numero = useMemo(() => String(100 + ((e.id.length * 37 + c[0].t * 3 + Math.round(c[0].ph * 10)) % 900)), [e.id, c]);
  const estado = useMemo(() => ({ resultado: c[0].r, t: 1, temp: c[0].t }), [c]);
  return (
    <section className="a2-etapa a2-informe-etapa">
      <article className="a2-informe anim-crecer" aria-labelledby="a2-informe-titulo">
        <header className="a2-informe__cabeza">
          <span className="etiqueta">Informe de simulación · Nº {numero}</span>
          <h1 id="a2-informe-titulo">{e.nombre}</h1>
        </header>
        <div className="a2-informe__cuerpo">
          <Visor modelo={modelo} estado={estado} quieto controles={false} etiqueta="Resultado de la corrida 1" className="a2-visor--informe" />
          <dl className="a2-informe__datos">
            <div>
              <dt className="etiqueta">Hipótesis</dt>
              <dd>{textoHipotesis(d.hipotesis)}</dd>
            </div>
            {c.map((x, i) => (
              <div key={i}>
                <dt className="etiqueta">
                  Corrida {i + 1} · {condicion(x)}
                </dt>
                <dd>{NOMBRE_RESULTADO[x.r]}</dd>
              </div>
            ))}
          </dl>
          <Sello cumplida={d.cumplida} />
        </div>
        <p className="a2-informe__cierre">
          Con computadoras, los científicos ven cómo se mueven moléculas que nadie puede ver y prueban muchas condiciones sin gastar
          materiales. Así estudian virus como el dengue y el zika.
        </p>
        <div className="a2-acciones">
          <button
            type="button"
            className="btn btn--experimentar"
            onClick={() => progreso.ir('estructura', { estructura: null, vistas: [], hipotesis: null, corridas: [], ronda: 1, cumplida: null, marcadas: [] })}
          >
            Simular otra molécula
          </button>
          <button type="button" className="btn btn--secundario" onClick={() => window.print()}>
            Imprimir informe
          </button>
        </div>
      </article>
      <GloboMoli texto="¡Informe listo! Así trabaja un laboratorio de simulación." animo="alegria" />
    </section>
  );
}

function Sello({ cumplida, chico }) {
  return (
    <div className={`a2-sello ${cumplida ? 'a2-sello--si' : 'a2-sello--no'} ${chico ? 'a2-sello--chico' : ''}`}>
      <span>Hipótesis</span>
      <b>{cumplida ? 'Cumplida' : 'No se cumplió'}</b>
      {!cumplida && !chico && <span>¡A seguir investigando!</span>}
    </div>
  );
}

/* ---------------- Íconos e instrumentos (SVG) ---------------- */
function Tilde() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="a2-tilde">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconoPlay() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}
function IconoPausa() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
    </svg>
  );
}
function IconoOtraVez() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M5 12a7 7 0 1 0 2.2-5.1" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M6 3.5v4.2h4.2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconoTermometro() {
  return (
    <svg viewBox="0 0 32 48" width="26" height="40" aria-hidden="true">
      <rect x="11" y="3" width="10" height="30" rx="5" fill="#fff" stroke="#2F4A85" strokeWidth="2" />
      <circle cx="16" cy="37" r="8" fill="#EF6F5E" stroke="#2F4A85" strokeWidth="2" />
      <rect x="14" y="14" width="4" height="22" rx="2" fill="#EF6F5E" />
    </svg>
  );
}
function IconoGota() {
  return (
    <svg viewBox="0 0 32 48" width="26" height="40" aria-hidden="true">
      <path d="M16 4C16 4 5 19 5 28a11 11 0 0 0 22 0C27 19 16 4 16 4z" fill="#E3EEA0" stroke="#2F4A85" strokeWidth="2" />
      <circle cx="12" cy="29" r="3" fill="#fff" opacity="0.8" />
    </svg>
  );
}

// Mini ilustración de cada predicción (esferas como el modelo)
function IconoForma({ tipo }) {
  const bolitas = {
    igual: [
      [38, 34], [50, 30], [62, 34], [44, 44], [56, 44], [50, 54], [68, 46], [32, 46],
    ],
    cambia: [
      [34, 22], [34, 34], [38, 46], [32, 58], [66, 22], [66, 34], [62, 46], [68, 58],
    ],
    desarma: [
      [14, 50], [24, 40], [36, 46], [46, 36], [56, 44], [66, 32], [78, 38], [88, 28],
    ],
  }[tipo];
  const colores = ['#F4A6BD', '#F2B13B', '#93AEEB', '#8ED5C3'];
  return (
    <svg viewBox="0 0 100 72" width="120" height="86" aria-hidden="true" className="a2-icono-forma">
      {tipo === 'desarma' && (
        <polyline points={bolitas.map((b) => b.join(',')).join(' ')} fill="none" stroke="#2F4A85" strokeOpacity="0.3" strokeWidth="3" />
      )}
      {bolitas.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" fill={colores[i % 4]} stroke="#2F4A85" strokeOpacity="0.25" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function Termometro({ t }) {
  const k = Math.max(0, Math.min(1, t / 100));
  const color = t < 15 ? '#93AEEB' : t < 39 ? '#8ED5C3' : t < 55 ? '#F2B13B' : '#EF6F5E';
  const alto = 112;
  return (
    <svg viewBox="0 0 60 170" width="60" height="170" aria-hidden="true" className="a2-termometro">
      <rect x="20" y="8" width="20" height={alto + 24} rx="10" fill="#fff" stroke="#2F4A85" strokeWidth="2.5" />
      {[0, 37, 100].map((v) => (
        <line key={v} x1="42" x2="50" y1={136 - (v / 100) * alto} y2={136 - (v / 100) * alto} stroke="#2F4A85" strokeWidth="2" />
      ))}
      <rect x="25" y={136 - k * alto} width="10" height={k * alto + 8} rx="5" fill={color} style={{ transition: 'all 0.3s' }} />
      <circle cx="30" cy="148" r="16" fill={color} stroke="#2F4A85" strokeWidth="2.5" style={{ transition: 'fill 0.3s' }} />
    </svg>
  );
}

// Tira de pH: como el papel indicador del laboratorio
const COLORES_PH = ['#E9604F', '#EF6F5E', '#F2895A', '#F2B13B', '#EBCB56', '#E3EEA0', '#B9E2A6', '#8ED5C3', '#7FC4C9', '#93AEEB', '#8A94E6', '#7272EE', '#6658C9'];
function TiraPh({ ph }) {
  const idx = Math.max(0, Math.min(12, Math.round(ph) - 1));
  return (
    <svg viewBox="0 0 60 170" width="60" height="170" aria-hidden="true" className="a2-tira">
      <rect x="16" y="4" width="28" height="162" rx="6" fill="#fff" stroke="#2F4A85" strokeWidth="2.5" />
      {COLORES_PH.map((c, i) => (
        <rect key={i} x="20" y={8 + (12 - i) * 12} width="20" height="11" rx="2" fill={c} opacity={i === idx ? 1 : 0.55} />
      ))}
      <path
        d={`M4 ${8 + (12 - idx) * 12 + 5.5} l10 -6 v12z`}
        fill="#2F4A85"
        style={{ transition: 'transform 0.3s' }}
      />
      <rect x="18" y={7 + (12 - idx) * 12} width="24" height="13" rx="3" fill="none" stroke="#2F4A85" strokeWidth="2.5" />
    </svg>
  );
}
