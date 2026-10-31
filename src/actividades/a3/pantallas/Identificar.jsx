import { useEffect, useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import Aviso from '../../../components/Aviso';
import { Foto, TarjetaCaso, describirLuz } from './comunes';
import { CAMPO, PLANOS, escenaDe, evaluar } from '../motor';

function medir() {
  if (typeof window === 'undefined') return 440;
  const w = window.innerWidth;
  const ancho = w >= 1180 ? 460 : w >= 1000 ? w - 80 - 236 - 300 - 80 : w - 120;
  return Math.round(Math.max(300, Math.min(460, window.innerHeight - 250, ancho)));
}
const TOL_PX = 16; // cuánto se perdona al tocar (en píxeles de pantalla)

const COLONIAS = ['#F4A6BD', '#8ED5C3', '#F2B13B', '#7272EE', '#E3EEA0', '#93AEEB', '#EF6F5E', '#8ED5C3', '#F4A6BD', '#F2B13B', '#7272EE', '#93AEEB'];

/* ETAPA 5 · Identificar: elegir una foto y señalar lo que encontró */
export default function Identificar({ progreso, muestra, mision }) {
  const datos = progreso.datos;
  const escena = escenaDe(muestra.id);
  const buenas = (datos.fotos || []).filter((f) => f.m === muestra.id && !f.e);
  const [sel, setSel] = useState(buenas.length ? buenas[buenas.length - 1].id : null);
  const [marca, setMarca] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [res, setRes] = useState(null);
  const [tam, setTam] = useState(medir);
  const foto = buenas.find((f) => f.id === sel) || buenas[buenas.length - 1];
  const pistas = datos.pistas?.[mision.id] || 1;

  useEffect(() => {
    const r = () => setTam(medir());
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const elegir = (id) => {
    setSel(id);
    setMarca(null);
    setRes(null);
    setCursor(null);
  };

  const evaluarEn = (px, py) => {
    if (!foto || res?.tipo === 'acierto') return;
    if (Math.hypot(px - tam / 2, py - tam / 2) > tam / 2) return;
    const k = CAMPO[foto.a] / tam;
    const wx = foto.x + (px - tam / 2) * k;
    const wy = foto.y + (py - tam / 2) * k;
    const r = evaluar(escena, mision, foto, wx, wy, TOL_PX * k);
    setMarca({ px, py, wx, wy });
    setRes(r);
    if (r.tipo !== 'acierto') {
      const errores = { ...(datos.errores || {}) };
      errores.identificar = (errores.identificar || 0) + 1;
      progreso.guardar({ errores });
    }
  };
  const tocar = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    evaluarEn(e.clientX - r.left, e.clientY - r.top);
  };
  const teclas = (e) => {
    const c = cursor || { px: tam / 2, py: tam / 2 };
    const s = 10;
    const mapa = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (mapa[e.key]) {
      e.preventDefault();
      setCursor({ px: Math.max(0, Math.min(tam, c.px + mapa[e.key][0])), py: Math.max(0, Math.min(tam, c.py + mapa[e.key][1])) });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      evaluarEn(c.px, c.py);
    }
  };
  const guardarLogro = () => {
    const logro = { m: muestra.id, mi: mision.id, f: foto, px: Math.round(marca.wx * 10) / 10, py: Math.round(marca.wy * 10) / 10, n: pistas };
    const logros = [...(datos.logros || []).filter((l) => !(l.m === muestra.id && l.mi === mision.id)), logro];
    progreso.ir('galeria', { logros });
  };
  const otraVez = () => {
    setMarca(null);
    setRes(null);
  };
  const otraPista = () => progreso.guardar({ pistas: { ...(datos.pistas || {}), [mision.id]: Math.min(mision.pistas.length, pistas + 1) } });

  if (!foto) {
    return (
      <section className="a3-pantalla">
        <div className="a3-titular">
          <span className="etiqueta">Identificar</span>
          <h1>Todavía no tenés fotos nítidas</h1>
          <p>Volvé al microscopio y sacá una foto bien enfocada.</p>
          <button className="btn btn--primario btn--grande" onClick={() => progreso.ir('microscopio')}>
            Volver al microscopio
          </button>
        </div>
        <GloboMoli texto="Sin una buena foto no podemos confirmar nada." animo="piensa" />
      </section>
    );
  }

  const acierto = res?.tipo === 'acierto';
  const ka = tam / CAMPO[foto.a];

  return (
    <section className="a3-ident">
      <aside className="a3-ident__lado">
        <TarjetaCaso mision={mision} pistas={pistas} onPista={acierto ? null : otraPista} />
        <div className="a3-control">
          <span className="etiqueta">Tus fotos nítidas</span>
          <ul className="a3-ident__fotos">
            {buenas
              .slice()
              .reverse()
              .map((f) => (
                <li key={f.id}>
                  <button className="a3-ident__mini" aria-pressed={f.id === foto.id} aria-label={`Foto con ${f.a}x, plano ${f.z + 1}`} onClick={() => elegir(f.id)} disabled={acierto}>
                    <Foto foto={f} tam={72} />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </aside>

      <div className="a3-ident__centro">
        <div className={`a3-ident__foto ${acierto ? 'a3-ident__foto--acierto' : ''}`} style={{ width: tam, height: tam }}>
          {acierto &&
            COLONIAS.map((c, i) => {
              const ang = (i / COLONIAS.length) * Math.PI * 2 + 0.3;
              const rr = tam / 2 + 14 + (i % 3) * 10;
              const t = 18 + (i % 4) * 9;
              return (
                <span
                  key={i}
                  className="a3-colonia"
                  style={{
                    left: tam / 2 + Math.cos(ang) * rr - t / 2,
                    top: tam / 2 + Math.sin(ang) * rr - t / 2,
                    width: t,
                    height: t,
                    background: c,
                    animationDelay: `${i * 0.07}s, ${0.8 + i * 0.1}s`,
                  }}
                />
              );
            })}
          <Foto
            foto={foto}
            tam={tam}
            className="a3-ident__campo"
            onClick={tocar}
            onKeyDown={teclas}
            tabIndex={0}
            role="application"
            aria-label="Tu foto. Tocá donde está lo que buscabas, o mové la mira con las flechas y apretá Enter."
          >
            {marca && <Mira x={marca.px} y={marca.py} t={Math.max(34, Math.min(70, 4 * ka))} ok={acierto} />}
            {!marca && cursor && <Mira x={cursor.px} y={cursor.py} t={34} cursor />}
          </Foto>
        </div>
        <p className="a3-ident__datos etiqueta">
          {foto.a}x · plano {foto.z + 1}/{PLANOS} · {describirLuz(foto)}
        </p>
      </div>

      <div className="a3-ident__panel">
        {!res && (
          <div className="anim-entrar">
            <span className="etiqueta">Identificar</span>
            <h1>Señalá lo que encontraste</h1>
            <p>Tocá en tu foto justo encima de lo que buscabas.</p>
            <button className="enlace a3-volver" onClick={() => progreso.ir('microscopio')}>
              Volver al microscopio
            </button>
          </div>
        )}
        {acierto && (
          <Aviso tipo="acierto" titulo={`¡Encontraste: ${mision.nombre}!`} accion="Guardar en mi álbum" onAccion={guardarLogro}>
            {mision.explicacion}
          </Aviso>
        )}
        {res && !acierto && (
          <Aviso
            tipo={res.tipo === 'distractor' ? 'error' : 'pista'}
            titulo={TITULOS[res.tipo]}
            accion="Volver al microscopio"
            onAccion={() => progreso.ir('microscopio')}
            secundaria="Probar otra vez"
            onSecundaria={otraVez}
          >
            {mensaje(res, mision, foto)}
          </Aviso>
        )}
      </div>
      {!res && <GloboMoli texto="Un científico siempre confirma lo que vio en sus imágenes." animo="escucha" tamano={104} />}
    </section>
  );
}

export function Mira({ x, y, t = 34, ok, cursor }) {
  return <span className={`a3-mira ${ok ? 'a3-mira--ok' : ''} ${cursor ? 'a3-mira--cursor' : ''}`} style={{ left: x - t / 2, top: y - t / 2, width: t, height: t }} />;
}

const TITULOS = {
  aumento: '¡Estás muy cerca!',
  luz: 'Casi: falta confirmarlo',
  plano: 'Está en otro plano',
  blanqueo: 'Se gastó la fluorescencia',
  distractor: 'Eso no es',
  nada: 'Ahí no hay nada',
};

function mensaje(res, mision, foto) {
  switch (res.tipo) {
    case 'aumento':
      return `Está ahí, pero con ${foto.a}x no se distingue bien. Sacale una foto con ${mision.aumentoMin}x o más.`;
    case 'luz':
      return mision.sinLuz;
    case 'plano':
      return 'En tu foto se ve borroso porque está más arriba o más abajo. Probá otra profundidad y sacá otra foto.';
    case 'blanqueo':
      return 'Está ahí, pero el tinte ya se había apagado con la luz. Buscá otra zona que no hayas iluminado.';
    case 'distractor':
      return mision.distractores[res.tag] || 'Eso no es lo que buscás. Mirá otra vez las pistas.';
    default:
      return 'Tocá justo encima de lo que encontraste en la foto.';
  }
}
