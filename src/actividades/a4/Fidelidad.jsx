import { useMemo, useState } from 'react';
import GloboMoli from '../../components/GloboMoli';
import { FIDELIDADES, HIPOTESIS, ORIGINAL, RESULTADOS, copiar, fidelidadN } from './modelo';
import { VirusSVG } from './virus';

/*
  Etapa 2 · Fidelidad de copia + hipótesis.
  Metáfora: copiar un dibujo despacio (calcando) o a toda velocidad sin mirar.
  Un control grande de 5 posiciones; 8 copias de prueba muestran qué pasa con esa fidelidad.
*/
const RUIDO = [0, 0.9, 2.4, 5, 9];

function dibujo(amp, semilla) {
  let s = semilla * 97 + 13;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = 30 + (i < 24 ? r() * amp * 1.4 : 0);
    pts.push([60 + Math.cos(a) * rr, 60 + Math.sin(a) * rr]);
  }
  pts[24] = pts[0];
  let d = `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}`;
  for (let i = 0; i < 8; i++) {
    if (amp > 6 && i % 3 === 1) continue; // sin mirar, se olvidan partes
    const a = 0.3 + (i / 8) * Math.PI * 2 + r() * amp * 0.03;
    const l = 46 + r() * amp * 1.6;
    const x1 = 60 + Math.cos(a) * 30;
    const y1 = 60 + Math.sin(a) * 30;
    const x2 = 60 + Math.cos(a) * l;
    const y2 = 60 + Math.sin(a) * l;
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    d += `M${(x2 + 4).toFixed(1)} ${y2.toFixed(1)}a4 4 0 1 0 -8 0a4 4 0 1 0 8 0`;
  }
  d += `M${(48 + r() * amp).toFixed(1)} ${(62 + r() * amp).toFixed(1)}q8 -14 14 -2t14 0`;
  return d;
}

export default function Fidelidad({ progreso }) {
  const datos = progreso.datos;
  const [nivel, setNivel] = useState(datos.fidelidad || 3);
  const [hip, setHip] = useState(null);
  const [tanda, setTanda] = useState(1);
  const fid = fidelidadN(nivel);

  const prueba = useMemo(
    () => Array.from({ length: 8 }, () => copiar(ORIGINAL, fid.mu)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nivel, tanda]
  );
  const cambiaron = prueba.filter((c) => c.cambios.length && !c.rota).length;
  const rotas = prueba.filter((c) => c.rota).length;
  const corridas = datos.corridas || [];

  const empezar = () => {
    const n = corridas.reduce((m, c) => Math.max(m, c.n || 0), 0) + 1;
    progreso.ir('generaciones', {
      fidelidad: nivel,
      hipotesis: hip,
      semilla: Math.floor(Math.random() * 1e9),
      corrida: n,
      gen: 0,
      ambiente: null,
      genAmbiente: null,
      respuesta: null,
    });
  };

  const texto = !hip
    ? corridas.length
      ? '¿Y si probás otra fidelidad? Así comparás.'
      : 'Mové el control y mirá las copias de prueba.'
    : 'Una hipótesis es lo que creés que va a pasar. ¡A probarla!';

  return (
    <section className="a4-etapa a4-fidelidad">
      <header className="a4-cabeza a4-cabeza--fila">
        <div>
          <span className="etiqueta">Fidelidad de copia</span>
          <h1>¿Qué tan bien se copian?</h1>
        </div>
        <p className="a4-instruccion">Es como copiar un dibujo: despacio y mirando, o a toda velocidad. Mové el control.</p>
      </header>

      <div className="a4-fidelidad__grilla">
        <div className="tarjeta a4-fidelidad__control">
          <div className="a4-dibujos" aria-hidden="true">
            <figure>
              <svg viewBox="0 0 120 120" width="96" height="96">
                <path d={dibujo(0, 1)} />
              </svg>
              <figcaption className="etiqueta">Original</figcaption>
            </figure>
            <span className="a4-dibujos__flecha" />
            <figure>
              <svg viewBox="0 0 120 120" width="96" height="96">
                <path key={nivel} className="a4-dibujos__copia" d={dibujo(RUIDO[nivel - 1], nivel + tanda)} />
              </svg>
              <figcaption className="etiqueta">Copia</figcaption>
            </figure>
            <p className="a4-dibujos__modo">{fid.dibujo}</p>
          </div>

          <label className="a4-perilla">
            <span className="solo-lector">Fidelidad de copia</span>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={nivel}
              onChange={(e) => {
                setNivel(Number(e.target.value));
                setHip(null);
              }}
              aria-valuetext={`${fid.nombre}: ${fid.errores}`}
            />
            <span className="a4-perilla__marcas" aria-hidden="true">
              {FIDELIDADES.map((x) => (
                <i key={x.n} className={x.n === nivel ? 'is-actual' : ''} />
              ))}
            </span>
            <span className="a4-perilla__extremos" aria-hidden="true">
              <span>Copia muy exacta</span>
              <span>Copia con muchos errores</span>
            </span>
          </label>
          <p className="a4-fidelidad__nivel">
            <b>{fid.nombre}</b>
            <span>{fid.errores}</span>
          </p>

          <div className="a4-prueba">
            <div className="a4-prueba__cabeza">
              <span className="etiqueta">8 copias de prueba</span>
              <span className="a4-prueba__resumen">
                <span className="a4-punto a4-punto--cambio" /> {cambiaron} cambiaron
                <span className="a4-punto a4-punto--rota" /> {rotas} no funcionan
              </span>
              <button className="enlace" onClick={() => setTanda((t) => t + 1)}>
                Copiar otras 8
              </button>
            </div>
            <ul className="a4-prueba__copias" key={`${nivel}-${tanda}`}>
              {prueba.map((c, i) => (
                <li key={i} className={`anim-crecer ${c.rota ? 'is-rota' : c.cambios.length ? 'is-cambio' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <VirusSVG genoma={c.genoma} roto={c.rota} tamano={48} titulo={c.rota ? 'Copia que no funciona' : c.cambios.length ? 'Copia distinta' : 'Copia igual'} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="a4-fidelidad__lado">
          <fieldset className="a4-hipotesis">
            <legend>
              Tu hipótesis: si se copian así muchas veces, <b>¿qué va a pasar?</b>
            </legend>
            {HIPOTESIS.map((h) => (
              <button key={h.id} type="button" className={`a4-opcion ${hip === h.id ? 'is-elegida' : ''}`} aria-pressed={hip === h.id} onClick={() => setHip(h.id)}>
                {h.texto}
              </button>
            ))}
          </fieldset>
          <button className="btn btn--experimentar btn--grande" disabled={!hip} onClick={empezar}>
            Empezar a copiar
          </button>
          {corridas.length > 0 && (
            <div className="a4-ya">
              <span className="etiqueta">Ya probaste</span>
              <ul>
                {corridas.map((c) => (
                  <li key={c.n}>
                    <b>{fidelidadN(c.fid).nombre}</b> · {RESULTADOS[c.res]?.corto}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <GloboMoli texto={texto} animo={hip ? 'eureka' : 'piensa'} />
    </section>
  );
}
