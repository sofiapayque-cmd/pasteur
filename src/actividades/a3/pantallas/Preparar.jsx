import { useRef, useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import Aviso from '../../../components/Aviso';
import { OBJETIVOS } from '../contenido';

const DESTINO = { x: 268, y: 241 }; // dónde queda el portaobjetos sobre la platina
const ORIGEN = { x: 24, y: 418 };

/* ETAPA 3 · Preparar el microscopio: poner la muestra en la platina y prender la lámpara */
export default function Preparar({ progreso, muestra }) {
  const datos = progreso.datos;
  const [puesta, setPuesta] = useState(false);
  const [luz, setLuz] = useState(false);
  const [pos, setPos] = useState(ORIGEN);
  const [arrastre, setArrastre] = useState(null);
  const [aviso, setAviso] = useState(null);
  const svgRef = useRef(null);

  const aSvg = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  const poner = () => {
    setPuesta(true);
    setPos(DESTINO);
    setAviso(null);
  };
  const empezarArrastre = (e) => {
    if (puesta) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = aSvg(e);
    setArrastre({ dx: p.x - pos.x, dy: p.y - pos.y });
  };
  const mover = (e) => {
    if (!arrastre) return;
    const p = aSvg(e);
    setPos({ x: p.x - arrastre.dx, y: p.y - arrastre.dy });
  };
  const soltar = () => {
    if (!arrastre) return;
    setArrastre(null);
    if (Math.hypot(pos.x - DESTINO.x, pos.y - DESTINO.y) < 80) poner();
    else setPos(ORIGEN);
  };
  const prender = () => {
    setLuz((l) => !l);
    setAviso(null);
  };
  const error = (tipo) => {
    const errores = { ...(datos.errores || {}) };
    errores.preparar = (errores.preparar || 0) + 1;
    progreso.guardar({ errores });
    setAviso(tipo);
  };
  const mirar = () => {
    if (!puesta) return error('sinMuestra');
    if (!luz) return error('oscuro');
    progreso.ir('microscopio', { preparado: [...new Set([...(datos.preparado || []), muestra.id])] });
  };

  const titulo = !puesta ? 'Poné la muestra en la platina' : !luz ? 'Prendé la lámpara' : '¡Listo para mirar!';
  const bajada = !puesta
    ? 'Arrastrá el portaobjetos hasta la platina, o tocá el botón.'
    : !luz
      ? 'La luz atraviesa la muestra y llega hasta tu ojo.'
      : 'Siempre se empieza con el objetivo más chico: 4x.';

  return (
    <section className="a3-pantalla a3-preparar">
      <div className="a3-preparar__dibujo anim-entrar">
        <svg ref={svgRef} viewBox="0 0 520 470" role="img" aria-label="Microscopio óptico con sus partes" onPointerMove={mover} onPointerUp={soltar}>
          <defs>
            <linearGradient id="a3-haz" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#F2B13B" stopOpacity=".9" />
              <stop offset="1" stopColor="#FFF4CF" stopOpacity=".15" />
            </linearGradient>
            <radialGradient id="a3-lampara">
              <stop offset="0" stopColor="#FFF6D8" />
              <stop offset="1" stopColor="#F2B13B" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* mesa */}
          <rect x="0" y="446" width="520" height="24" rx="6" fill="#D4DCF7" />
          {/* base y brazo */}
          <rect x="150" y="408" width="270" height="38" rx="16" fill="#2F4A85" />
          <path d="M176 410 L176 300 C176 205 205 160 246 128 L276 150 C246 176 220 214 220 300 L220 410 Z" fill="#2F4A85" />
          {/* cabezal, tubo y ocular */}
          <rect x="232" y="96" width="128" height="52" rx="14" fill="#2F4A85" />
          <g transform="rotate(-24 330 104)">
            <rect x="314" y="28" width="34" height="80" rx="6" fill="#3E5CA0" />
            <rect x="309" y="18" width="44" height="18" rx="5" fill="#22232A" />
          </g>
          {/* revólver con objetivos (anillos de color reales) */}
          <path d="M296 148 h70 l-8 16 h-54 z" fill="#3E5CA0" />
          {[-16, 0, 16].map((g, i) => (
            <g key={g} transform={`rotate(${g} 331 160)`}>
              <rect x="322" y="162" width="18" height={i === 1 ? 54 : 44} rx="3" fill="#D4DCF7" stroke="#2F4A85" strokeWidth="2" />
              <rect x="322" y={i === 1 ? 196 : 188} width="18" height="5" fill={OBJETIVOS[i].anillo} />
            </g>
          ))}
          {/* haz de luz */}
          {luz && <path d="M318 392 L344 392 L340 270 L322 270 Z" fill="url(#a3-haz)" className="a3-haz" />}
          {luz && puesta && <path d="M325 240 L337 240 L333 218 L329 218 Z" fill="#FFF4CF" opacity=".8" className="a3-haz" />}
          {/* platina con pinzas */}
          <rect x="232" y="252" width="200" height="16" rx="4" fill="#2F4A85" />
          <rect x="324" y="252" width="14" height="16" fill={luz ? '#FFE9A8' : '#1B2A4F'} />
          <path d="M252 250 q20 -8 44 -4" stroke="#93AEEB" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M366 246 q24 -4 44 4" stroke="#93AEEB" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* condensador */}
          <rect x="314" y="270" width="34" height="16" rx="3" fill="#3E5CA0" />
          {/* tornillos macro y micrométrico */}
          <circle cx="198" cy="330" r="27" fill="#93AEEB" stroke="#2F4A85" strokeWidth="4" />
          <circle cx="198" cy="330" r="13" fill="#D4DCF7" stroke="#2F4A85" strokeWidth="3" />
          {/* lámpara (se puede tocar) */}
          <g
            className="a3-lampara"
            role="button"
            tabIndex={0}
            aria-label={luz ? 'Apagar la lámpara' : 'Prender la lámpara'}
            onClick={prender}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), prender())}
          >
            {luz && <circle cx="331" cy="396" r="46" fill="url(#a3-lampara)" className="a3-brillo" />}
            <rect x="306" y="392" width="50" height="16" rx="8" fill="#22232A" />
            <circle cx="331" cy="396" r="12" fill={luz ? '#FFF2C2' : '#5E6070'} stroke="#22232A" strokeWidth="3" />
          </g>
          {/* rótulos */}
          <g className="a3-rotulos" aria-hidden="true">
            <line x1="352" y1="40" x2="392" y2="40" />
            <text x="398" y="45">OCULAR</text>
            <line x1="350" y1="200" x2="392" y2="200" />
            <text x="398" y="205">OBJETIVOS</text>
            <line x1="434" y1="262" x2="446" y2="262" />
            <text x="450" y="267">PLATINA</text>
            <line x1="362" y1="400" x2="398" y2="400" />
            <text x="404" y="405">LÁMPARA</text>
            <line x1="170" y1="330" x2="128" y2="330" />
            <text x="122" y="326" textAnchor="end">TORNILLOS</text>
            <text x="122" y="342" textAnchor="end">DE ENFOQUE</text>
          </g>
          {/* portaobjetos */}
          <g
            transform={`translate(${pos.x} ${pos.y})`}
            className={`a3-portaobjetos ${puesta ? 'a3-portaobjetos--puesto' : ''} ${arrastre ? 'a3-portaobjetos--arrastre' : ''}`}
            onPointerDown={empezarArrastre}
          >
            <rect width="126" height="12" rx="2" fill="#EAF2FB" stroke="#93AEEB" strokeWidth="2" />
            <rect width="34" height="12" rx="2" fill="#FBF9F1" stroke="#93AEEB" strokeWidth="2" />
            <ellipse cx="64" cy="6" rx="14" ry="4" fill={muestra.color} />
            {!puesta && (
              <text x="0" y="-10" className="a3-portaobjetos__rotulo">
                {muestra.codigo}
              </text>
            )}
          </g>
        </svg>
      </div>
      <div className="a3-preparar__panel">
        <span className="etiqueta">Preparar el microscopio</span>
        <h1>{titulo}</h1>
        <p>{bajada}</p>
        <div className="a3-acciones a3-acciones--columna">
          {!puesta && (
            <button className="btn btn--secundario" onClick={poner}>
              Poner la muestra
            </button>
          )}
          {puesta && (
            <button className="btn btn--experimentar" onClick={prender} aria-pressed={luz}>
              {luz ? 'Apagar la lámpara' : 'Prender la lámpara'}
            </button>
          )}
          <button className="btn btn--primario btn--grande" onClick={mirar}>
            Mirar por el ocular
          </button>
        </div>
        {aviso === 'oscuro' && (
          <Aviso tipo="error" titulo="Está todo oscuro" accion="Prender la lámpara" onAccion={prender}>
            Sin luz no se ve nada: el microscopio necesita que la luz atraviese la muestra.
          </Aviso>
        )}
        {aviso === 'sinMuestra' && (
          <Aviso tipo="error" titulo="No hay nada que mirar" accion="Poner la muestra" onAccion={poner}>
            Primero hay que poner el portaobjetos sobre la platina y sujetarlo con las pinzas.
          </Aviso>
        )}
      </div>
      {!aviso && <GloboMoli texto={puesta && luz ? 'Las pinzas sostienen el vidrio para que no se mueva.' : 'Así es un microscopio de verdad.'} />}
    </section>
  );
}
