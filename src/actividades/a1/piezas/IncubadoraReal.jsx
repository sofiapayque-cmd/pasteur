import { useRef } from 'react';

/*
  INCUBADORA "DE VERDAD": un gabinete de laboratorio con puerta de vidrio,
  estante para la placa, pantalla digital con los grados, botones ▲ ▼
  y un termómetro grande que el niño sube o baja con el dedo.

  - grados: número (null = apagada, muestra "--")
  - onCambiar(grados): si no viene, la incubadora es solo para mirar (paso de esperar)
  Rangos (los mismos tres de siempre, ver laboratorio.js):
  frío hasta 12 °C · templado de 13 a 30 °C · tibio desde 31 °C.
  VALIDAR con el laboratorio: rangos y temperaturas de referencia.
*/
export const MIN = 4;
export const MAX = 40;
export const zonaDe = (g) => (g == null ? null : g <= 12 ? 'frio' : g <= 30 ? 'templado' : 'tibio');

export const REFERENCIAS = [
  { grados: 4, nombre: 'Heladera', detalle: '4 °C' },
  { grados: 22, nombre: 'Día de primavera', detalle: '22 °C' },
  { grados: 37, nombre: 'Tu cuerpo', detalle: '37 °C' },
];

const COLOR = { frio: '#93AEEB', templado: '#8ED5C3', tibio: '#F2B13B' };
const NOMBRE = { frio: 'Frío', templado: 'Templado', tibio: 'Tibio' };

function Termometro({ grados, onCambiar }) {
  const ref = useRef(null);
  const arrastrando = useRef(false);
  const zona = zonaDe(grados);
  const nivel = grados == null ? 0 : (grados - MIN) / (MAX - MIN);
  const color = zona ? COLOR[zona] : '#D4DCF7';
  const interactivo = Boolean(onCambiar);

  function desdePuntero(e) {
    const r = ref.current.getBoundingClientRect();
    // el tubo va de y=14 a y=214 en el viewBox de 260 de alto
    const y = ((e.clientY - r.top) / r.height) * 260;
    const t = 1 - (y - 14) / 200;
    onCambiar(Math.round(MIN + Math.max(0, Math.min(1, t)) * (MAX - MIN)));
  }
  function abajo(e) {
    if (!interactivo) return;
    arrastrando.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    desdePuntero(e);
  }
  function mover(e) {
    if (arrastrando.current) desdePuntero(e);
  }
  function soltar() {
    arrastrando.current = false;
  }
  function tecla(e) {
    if (!interactivo) return;
    const actual = grados ?? 20;
    const pasos = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 };
    if (pasos[e.key]) {
      e.preventDefault();
      onCambiar(Math.max(MIN, Math.min(MAX, actual + pasos[e.key])));
    }
    if (e.key === 'Home') onCambiar(MIN);
    if (e.key === 'End') onCambiar(MAX);
  }

  const marcas = [4, 10, 20, 30, 40];
  return (
    <svg
      ref={ref}
      viewBox="0 0 90 260"
      className={`a1-inc__termo ${interactivo ? 'a1-inc__termo--activo' : ''}`}
      role={interactivo ? 'slider' : 'img'}
      tabIndex={interactivo ? 0 : undefined}
      aria-label="Termómetro de la incubadora"
      aria-valuemin={interactivo ? MIN : undefined}
      aria-valuemax={interactivo ? MAX : undefined}
      aria-valuenow={interactivo ? grados ?? undefined : undefined}
      aria-valuetext={grados == null ? 'Sin elegir' : `${grados} grados`}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onKeyDown={tecla}
    >
      {marcas.map((m) => {
        const y = 214 - ((m - MIN) / (MAX - MIN)) * 200;
        return (
          <g key={m}>
            <line x1="56" y1={y} x2="66" y2={y} stroke="#8D97B0" strokeWidth="2" />
            <text x="70" y={y + 4} fontSize="11" fill="#5E6070" style={{ fontFamily: 'var(--font-mono)' }}>
              {m}°
            </text>
          </g>
        );
      })}
      <rect x="28" y="8" width="24" height="216" rx="12" fill="#FFFFFF" stroke="#AEB9D0" strokeWidth="3" />
      <rect className="a1-inc__mercurio" x="34" y={14 + 200 * (1 - nivel)} width="12" height={200 * nivel + 16} rx="6" fill={color} />
      <circle cx="40" cy="232" r="20" fill={color} stroke="#AEB9D0" strokeWidth="3" />
      <ellipse cx="34" cy="226" rx="5" ry="7" fill="#FFFFFF" opacity=".5" />
      {interactivo && (
        <g className="a1-inc__tirador" transform={`translate(0 ${14 + 200 * (1 - (grados == null ? 0.45 : nivel))})`}>
          <rect x="18" y="-9" width="44" height="18" rx="9" fill="#2F4A85" />
          <path d="M32 -3 h16 M32 3 h16" stroke="#FBF9F1" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export default function IncubadoraReal({ grados, onCambiar, encendida = false, children }) {
  const zona = zonaDe(grados);
  const color = zona ? COLOR[zona] : '#D4DCF7';
  const interactivo = Boolean(onCambiar);
  const subir = (d) => onCambiar(Math.max(MIN, Math.min(MAX, (grados ?? 20) + d)));

  return (
    <div className={`a1-inc ${encendida ? 'a1-inc--encendida' : ''}`} style={{ '--tinte': color }}>
      <div className="a1-inc__gabinete">
        <div className="a1-inc__cabeza">
          <span className="a1-inc__marca">INCUBADORA</span>
          <div className="a1-inc__pantalla" aria-live="polite">
            <span className="a1-inc__digitos">{grados == null ? '--' : grados}</span>
            <span className="a1-inc__unidad">°C</span>
          </div>
          {interactivo && (
            <div className="a1-inc__botones">
              <button type="button" className="a1-inc__boton" onClick={() => subir(1)} aria-label="Subir un grado">
                ▲
              </button>
              <button type="button" className="a1-inc__boton" onClick={() => subir(-1)} aria-label="Bajar un grado">
                ▼
              </button>
            </div>
          )}
          <span className="a1-inc__led" aria-hidden="true" />
        </div>
        <div className="a1-inc__puerta">
          <div className="a1-inc__vidrio">
            <div className="a1-inc__estante">{children}</div>
            <span className="a1-inc__reflejo" aria-hidden="true" />
          </div>
          <span className="a1-inc__manija" aria-hidden="true" />
        </div>
        <div className="a1-inc__patas" aria-hidden="true">
          <span />
          <span />
        </div>
      </div>
      <div className="a1-inc__lado">
        <Termometro grados={grados} onCambiar={onCambiar} />
        <span className={`a1-inc__zona ${zona ? `a1-inc__zona--${zona}` : ''}`}>{zona ? NOMBRE[zona] : interactivo ? 'Subí o bajá' : ''}</span>
      </div>
    </div>
  );
}
