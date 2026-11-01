import { useCallback, useEffect, useRef, useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import Aviso from '../../../components/Aviso';
import Campo from '../Campo';
import { Foto, TarjetaCaso } from './comunes';
import { ERRORES_FOTO, LUCES, OBJETIVOS } from '../contenido';
import { CAMPO, FOCO_OK, PLANOS, desenfoque, escenaDe, exponer, factorBlanqueo } from '../motor';

const IDX = { b: 0, g: 1, r: 2 };
const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function medirOcular() {
  if (typeof window === 'undefined') return 520;
  const w = window.innerWidth;
  const alto = window.innerHeight - 200;
  // Pantalla grande: 3 columnas. Tablet apaisada: 3 columnas más angostas. Más chica: una columna.
  const ancho = w >= 1180 ? 540 : w >= 1000 ? w - 80 - 236 - 250 - 44 - 36 : w - 120;
  return Math.round(Math.max(320, Math.min(540, alto, ancho)));
}

/* ETAPA 4 · El microscopio: mover, aumento, enfoque, profundidad, luces y fotos */
export default function Microscopio({ progreso, muestra, mision, vivo }) {
  const escena = escenaDe(muestra.id);
  const datos = progreso.datos;
  const [v, setV] = useState(
    () => vivo.vistas[muestra.id] || { x: escena.ancho / 2, y: escena.alto / 2, a: 4, z: escena.zInicio, foco: 50, l: 'w', aceite: false }
  );
  const vRef = useRef(v);
  vRef.current = v;
  if (!vivo.expos[muestra.id]) vivo.expos[muestra.id] = [];
  const [version, setVersion] = useState(0);
  const [, setTick] = useState(0);
  const [tam, setTam] = useState(medirOcular);
  const [aviso, setAviso] = useState(null);
  const [gota, setGota] = useState(0);
  const statsRef = useRef({ nitidas: 1 });
  const ultimoCambio = useRef(Date.now());
  const enBlanqueo = useRef(false);
  const zoomRef = useRef(null);
  const flashRef = useRef(null);
  const arrastre = useRef(null);

  useEffect(() => {
    vivo.vistas[muestra.id] = v;
  }, [v, vivo, muestra.id]);

  useEffect(() => {
    const r = () => setTam(medirOcular());
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // Cada segundo: la luz de fluorescencia "gasta" la zona iluminada (fotoblanqueo)
  const pausada = progreso.pausada;
  useEffect(() => {
    const id = setInterval(() => {
      const vista = vRef.current;
      const fluo = vista.l && vista.l !== 'w';
      if (fluo && !pausada && document.visibilityState === 'visible') {
        vivo.expos[muestra.id] = exponer(vivo.expos[muestra.id], vista);
        setVersion((x) => x + 1);
      }
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [pausada, vivo, muestra.id]);

  const blanqueo = useCallback((x, y) => factorBlanqueo(vivo.expos[muestra.id], x, y), [vivo, muestra.id]);
  const cambiar = (cambio) => {
    ultimoCambio.current = Date.now();
    setAviso((a) => (a === 'ok' ? a : null));
    setV((prev) => ({ ...prev, ...cambio }));
  };

  /* ---- Controles ---- */
  const mover = (dx, dy) => {
    const p = vRef.current;
    cambiar({ x: Math.max(0, Math.min(escena.ancho, p.x + dx)), y: Math.max(0, Math.min(escena.alto, p.y + dy)) });
  };
  const paso = () => CAMPO[vRef.current.a] * 0.18;
  const aumento = (a) => {
    if (a === v.a) return;
    const el = zoomRef.current;
    if (el?.animate && !sinMovimiento()) {
      const desde = Math.max(0.15, Math.min(6, v.a / a));
      el.animate([{ transform: `scale(${desde})`, opacity: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
    }
    cambiar({ a });
  };
  const luz = (c) => {
    let l;
    if (c === 'w') l = v.l === 'w' ? '' : 'w';
    else {
      const actual = v.l === 'w' ? '' : v.l;
      const nueva = actual.includes(c) ? actual.replace(c, '') : actual + c;
      l = 'bgr'
        .split('')
        .filter((x) => nueva.includes(x))
        .join('');
    }
    cambiar({ l });
  };
  const ponerAceite = () => {
    setGota((g) => g + 1);
    cambiar({ aceite: true });
  };

  /* ---- Arrastrar la platina ---- */
  const bajar = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    arrastre.current = { cx: e.clientX, cy: e.clientY, x: v.x, y: v.y };
  };
  const moverPuntero = (e) => {
    const a = arrastre.current;
    if (!a) return;
    const k = CAMPO[v.a] / tam;
    cambiar({
      x: Math.max(0, Math.min(escena.ancho, a.x - (e.clientX - a.cx) * k)),
      y: Math.max(0, Math.min(escena.alto, a.y - (e.clientY - a.cy) * k)),
    });
  };
  const soltar = () => {
    arrastre.current = null;
  };
  const teclas = (e) => {
    const s = paso();
    const mapa = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (mapa[e.key]) {
      e.preventDefault();
      mover(...mapa[e.key]);
    }
  };

  /* ---- Estado actual ---- */
  const d = desenfoque(escena, v);
  const fluo = Boolean(v.l) && v.l !== 'w';
  const fb = factorBlanqueo(vivo.expos[muestra.id], v.x, v.y);
  const minBlanqueo = fluo ? Math.min(...v.l.split('').map((c) => fb[IDX[c]])) : 1;
  const lechosa = v.a === 100 && !v.aceite;
  const quieto = Date.now() - ultimoCambio.current;

  useEffect(() => {
    const ahora = fluo && minBlanqueo < 0.55;
    if (ahora && !enBlanqueo.current) {
      const errores = { ...(progreso.datos.errores || {}) };
      errores.blanqueo = (errores.blanqueo || 0) + 1;
      progreso.guardar({ errores });
    }
    enBlanqueo.current = ahora;
  });

  /* ---- Capturar ---- */
  const capturar = () => {
    const vista = vRef.current;
    let e = '';
    if (!vista.l) e = 'oscura';
    else if (vista.a === 100 && !vista.aceite) e = 'lechosa';
    else if (d > FOCO_OK) e = 'borrosa';
    else if (fluo && vista.l.split('').every((c) => fb[IDX[c]] < 0.4)) e = 'apagada';
    else if (statsRef.current.nitidas === 0) e = 'vacia';
    const foto = {
      id: Date.now().toString(36),
      m: muestra.id,
      mi: mision.id,
      x: Math.round(vista.x * 10) / 10,
      y: Math.round(vista.y * 10) / 10,
      a: vista.a,
      z: vista.z,
      l: vista.l,
      d: Math.round(d * 10) / 10,
      ac: vista.aceite ? 1 : 0,
      bl: fluo ? fb.map((x) => Math.round(x * 100) / 100) : [1, 1, 1],
      e,
    };
    const errores = { ...(datos.errores || {}) };
    if (e) errores[e] = (errores[e] || 0) + 1;
    progreso.guardar({ fotos: [...(datos.fotos || []), foto].slice(-10), nFotos: (datos.nFotos || 0) + 1, errores });
    if (flashRef.current?.animate && !sinMovimiento()) {
      flashRef.current.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
    }
    setAviso(e || 'ok');
  };
  useEffect(() => {
    if (aviso !== 'ok') return undefined;
    const t = setTimeout(() => setAviso(null), 2200);
    return () => clearTimeout(t);
  }, [aviso]);

  const fotosMuestra = (datos.fotos || []).filter((f) => f.m === muestra.id);
  const buenas = fotosMuestra.filter((f) => !f.e);
  const pistas = datos.pistas?.[mision.id] || 1;
  const otraPista = () => progreso.guardar({ pistas: { ...(datos.pistas || {}), [mision.id]: Math.min(mision.pistas.length, pistas + 1) } });

  /* ---- Lo que dice Moli ---- */
  let moli = ['Cuando veas una pista, sacale una foto.', 'feliz'];
  if (!v.l) moli = ['Todo negro: prendé una luz.', 'duda'];
  else if (lechosa) moli = ['A 100x hace falta una gota de aceite.', 'piensa'];
  else if (fluo && minBlanqueo < 0.55) moli = ['¡Se apaga! La luz gasta el tinte: es fotoblanqueo. Movete a otra zona.', 'duda'];
  else if (d > 2.5 && quieto > 2500) moli = ['Se ve borroso: girá el tornillo de enfoque.', 'piensa'];
  else if (statsRef.current.nitidas === 0 && quieto > 1500) moli = ['Acá no hay nada en foco. Probá otro plano o mové la muestra.', 'piensa'];
  else if (fotosMuestra.length > 0 && !buenas.length) moli = ['Para decir «¡Lo encontré!» necesitás una foto nítida.', 'piensa'];
  else if (fotosMuestra.length === 0 && v.a === 4 && v.l === 'w') moli = ['Arrastrá la muestra para recorrerla. Con 4x ves mucho lugar.', 'feliz'];
  else if (v.l === 'w' && muestra.id !== 'hoja') moli = ['Casi todo es transparente. Probá prender un color.', 'piensa'];
  else if (v.l === 'w') moli = ['Con luz blanca la hoja se ve verde. ¿Y con fluorescencia?', 'piensa'];
  else if (v.a >= 40) moli = ['Con más aumento ves menos lugar, pero más detalle.', 'feliz'];
  else if (v.a === 4) moli = ['Para ver detalles, subí el aumento.', 'feliz'];

  const errorFoto = aviso && aviso !== 'ok' ? ERRORES_FOTO[aviso] : null;

  return (
    <section className="a3-micro">
      {/* Izquierda: caso, objetivos y luces */}
      <aside className="a3-micro__lado">
        <TarjetaCaso mision={mision} pistas={pistas} onPista={otraPista} />
        <fieldset className="a3-control">
          <legend className="etiqueta">Objetivo · aumento</legend>
          <div className="a3-grilla2">
            {OBJETIVOS.map((o) => (
              <button key={o.a} className="a3-boton a3-objetivo" aria-pressed={v.a === o.a} onClick={() => aumento(o.a)}>
                <svg viewBox="0 0 16 28" width="14" height="26" aria-hidden="true">
                  <rect x="2" y="1" width="12" height="22" rx="2" fill="#D4DCF7" stroke="#2F4A85" strokeWidth="1.6" />
                  <rect x="2" y="14" width="12" height="4" fill={o.anillo} stroke="#2F4A85" strokeWidth="1" />
                  <rect x="5" y="23" width="6" height="4" rx="1" fill="#2F4A85" />
                </svg>
                <span>{o.a}x</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="a3-control">
          <legend className="etiqueta">Luz · canales</legend>
          <div className="a3-grilla2">
            {LUCES.map((c) => {
              const on = c.id === 'w' ? v.l === 'w' : v.l !== 'w' && v.l.includes(c.id);
              return (
                <button key={c.id} className={`a3-boton a3-luz a3-luz--${c.id}`} aria-pressed={on} onClick={() => luz(c.id)}>
                  <span className="a3-luz__punto" style={{ '--c': c.color }} aria-hidden="true" />
                  <span className="a3-luz__texto">
                    <strong>{c.id === 'w' ? 'Blanca' : c.nombre}</strong>
                    <small>{muestra.canales[c.id]}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </aside>

      {/* Centro: el ocular */}
      <div className="a3-micro__centro">
        <div className={`a3-ocular ${fluo ? 'a3-ocular--fluo' : ''}`} style={{ width: tam, height: tam }}>
          <div className="a3-ocular__esquina a3-ocular__esquina--si">
            <span className="a3-ocular__aumento">{v.a}x</span>
            <span>OBJETIVO</span>
          </div>
          <div className="a3-ocular__esquina a3-ocular__esquina--sd" aria-live="off">
            <span>X {Math.round(v.x)} µm</span>
            <span>Y {Math.round(v.y)} µm</span>
            <span>
              PLANO {v.z + 1}/{PLANOS}
            </span>
          </div>
          <Mapa escena={escena} v={v} fotos={fotosMuestra} onIr={(x, y) => cambiar({ x, y })} />
          <div className="a3-ocular__esquina a3-ocular__esquina--id">
            {v.a === 100 &&
              (v.aceite ? (
                <span className="a3-ocular__aceite">CON ACEITE</span>
              ) : (
                <button className="btn btn--claro a3-ocular__boton-aceite" onClick={ponerAceite}>
                  <svg viewBox="0 0 20 26" width="16" height="20" aria-hidden="true">
                    <path d="M10 1 C10 1 2 12 2 17 a8 8 0 0 0 16 0 C18 12 10 1 10 1z" fill="#F2B13B" />
                  </svg>
                  Gota de aceite
                </button>
              ))}
          </div>
          <div className="a3-ocular__circulo">
            <div ref={zoomRef} className="a3-ocular__zoom">
              <Campo
                escena={escena}
                vista={v}
                tam={tam}
                blanqueo={blanqueo}
                desenfoque={d}
                lechosa={lechosa}
                version={version}
                onStats={(s) => (statsRef.current = s)}
                className="a3-ocular__campo"
                tabIndex={0}
                role="application"
                aria-label={`Campo del microscopio. Objetivo ${v.a}x, plano ${v.z + 1}. Usá las flechas del teclado para mover la muestra.`}
                onPointerDown={bajar}
                onPointerMove={moverPuntero}
                onPointerUp={soltar}
                onPointerCancel={soltar}
                onKeyDown={teclas}
              />
            </div>
            <div ref={flashRef} className="a3-ocular__flash" />
            {gota > 0 && <span key={gota} className="a3-ocular__gota" aria-hidden="true" />}
          </div>
          <button className="a3-flecha a3-flecha--n" aria-label="Mover la muestra hacia arriba" onClick={() => mover(0, -paso())}>
            <Flecha giro={0} />
          </button>
          <button className="a3-flecha a3-flecha--s" aria-label="Mover la muestra hacia abajo" onClick={() => mover(0, paso())}>
            <Flecha giro={180} />
          </button>
          <button className="a3-flecha a3-flecha--o" aria-label="Mover la muestra hacia la izquierda" onClick={() => mover(-paso(), 0)}>
            <Flecha giro={-90} />
          </button>
          <button className="a3-flecha a3-flecha--e" aria-label="Mover la muestra hacia la derecha" onClick={() => mover(paso(), 0)}>
            <Flecha giro={90} />
          </button>
          {errorFoto && (
            <div className="a3-ocular__aviso">
              <Aviso tipo="error" titulo={errorFoto.titulo} accion="Entendido" onAccion={() => setAviso(null)}>
                {errorFoto.texto}
              </Aviso>
            </div>
          )}
          {aviso === 'ok' && (
            <p className="a3-ocular__guardada anim-crecer" role="status">
              Foto guardada
            </p>
          )}
        </div>
      </div>

      {/* Derecha: enfoque, profundidad, fotos */}
      <aside className="a3-micro__lado a3-micro__lado--der">
        <div className="a3-perillas">
          <fieldset className="a3-control">
            <legend className="etiqueta">Enfoque</legend>
            <Perilla valor={v.foco} onCambio={(foco) => cambiar({ foco })} />
            <div className="a3-perilla__botones">
              <button className="a3-boton a3-boton--chico" aria-label="Enfocar menos" onClick={() => cambiar({ foco: Math.max(0, v.foco - 1) })}>
                −
              </button>
              <button className="a3-boton a3-boton--chico" aria-label="Enfocar más" onClick={() => cambiar({ foco: Math.min(100, v.foco + 1) })}>
                +
              </button>
            </div>
          </fieldset>
          <fieldset className="a3-control a3-profundidad">
            <legend className="etiqueta">Profundidad</legend>
            <span className="a3-profundidad__extremo">arriba</span>
            <div className="a3-profundidad__capas">
              {Array.from({ length: PLANOS }, (_, i) => PLANOS - 1 - i).map((z) => (
                <button key={z} className="a3-capa" aria-pressed={v.z === z} aria-label={`Plano ${z + 1} de ${PLANOS}`} onClick={() => cambiar({ z })}>
                  {z + 1}
                </button>
              ))}
            </div>
            <span className="a3-profundidad__extremo">abajo</span>
          </fieldset>
        </div>
        <button className="btn btn--experimentar btn--grande a3-capturar" onClick={capturar}>
          <svg viewBox="0 0 28 22" width="26" height="20" aria-hidden="true">
            <rect x="1" y="4" width="26" height="17" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M9 4 l2 -3 h6 l2 3" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="14" cy="12.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
          Sacar foto
        </button>
        <button className="btn btn--primario a3-encontre" disabled={!buenas.length} onClick={() => progreso.ir('identificar')}>
          ¡Lo encontré!
        </button>
        {fotosMuestra.length > 0 && (
          <ul className="a3-tira" aria-label="Tus últimas fotos">
            {fotosMuestra
              .slice(-4)
              .reverse()
              .map((f) => (
                <li key={f.id} className={f.e ? 'a3-tira__foto--mal' : ''}>
                  <Foto foto={f} tam={60} />
                  {f.e && <span className="a3-tira__marca">{f.e}</span>}
                </li>
              ))}
          </ul>
        )}
      </aside>

      {!errorFoto && <GloboMoli texto={moli[0]} animo={moli[1]} tamano={104} />}
    </section>
  );
}

function Flecha({ giro }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" style={{ transform: `rotate(${giro}deg)` }} aria-hidden="true">
      <path d="M12 5 L19 14 H5 Z" fill="currentColor" />
    </svg>
  );
}

/* Mapa de la platina: dónde estás parado en el vidrio y dónde sacaste fotos. Tocarlo te lleva ahí. */
function Mapa({ escena, v, fotos, onIr }) {
  const ref = useRef(null);
  const ir = (e) => {
    const r = ref.current.getBoundingClientRect();
    onIr(((e.clientX - r.left) / r.width) * escena.ancho, ((e.clientY - r.top) / r.height) * escena.alto);
  };
  return (
    <div className="a3-ocular__esquina a3-ocular__esquina--ii">
      <svg ref={ref} className="a3-mapa" viewBox={`0 0 ${escena.ancho} ${escena.alto}`} onClick={ir} role="img" aria-label="Mapa de la muestra">
        <rect width={escena.ancho} height={escena.alto} rx={escena.ancho * 0.08} className="a3-mapa__vidrio" />
        {fotos.map((f) => (
          <circle key={f.id} cx={f.x} cy={f.y} r={escena.ancho * 0.022} className={f.e ? 'a3-mapa__foto a3-mapa__foto--mal' : 'a3-mapa__foto'} />
        ))}
        <circle cx={v.x} cy={v.y} r={Math.max(CAMPO[v.a] / 2, escena.ancho * 0.03)} className="a3-mapa__campo" />
      </svg>
      <span>MAPA</span>
    </div>
  );
}

/* Perilla del tornillo micrométrico: se gira arrastrando en círculo, con flechas del teclado o con − / + */
function Perilla({ valor, onCambio }) {
  const ref = useRef(null);
  const giro = useRef(null);
  const centro = () => {
    const r = ref.current.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const bajar = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [cx, cy] = centro();
    giro.current = { ang: Math.atan2(e.clientY - cy, e.clientX - cx), v: valor };
  };
  const mover = (e) => {
    const g = giro.current;
    if (!g) return;
    const [cx, cy] = centro();
    const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
    let delta = ang - g.ang;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    g.ang = ang;
    g.v = Math.max(0, Math.min(100, g.v + (delta / (Math.PI * 2)) * 30));
    onCambio(Math.round(g.v * 2) / 2);
  };
  const soltar = () => {
    giro.current = null;
  };
  const teclas = (e) => {
    const pasos = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 };
    if (pasos[e.key] !== undefined) {
      e.preventDefault();
      onCambio(Math.max(0, Math.min(100, valor + pasos[e.key])));
    }
  };
  return (
    <div
      ref={ref}
      className="a3-perilla"
      role="slider"
      tabIndex={0}
      aria-label="Tornillo de enfoque"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      onPointerDown={bajar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onKeyDown={teclas}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="56" className="a3-perilla__aro" />
        <g style={{ transform: `rotate(${valor * 12}deg)`, transformOrigin: '60px 60px' }}>
          {Array.from({ length: 24 }, (_, i) => (
            <rect key={i} x="58.5" y="6" width="3" height="10" rx="1.5" transform={`rotate(${i * 15} 60 60)`} className="a3-perilla__estria" />
          ))}
          <circle cx="60" cy="60" r="38" className="a3-perilla__cuerpo" />
          <circle cx="60" cy="31" r="6" className="a3-perilla__marca" />
        </g>
      </svg>
    </div>
  );
}
