import { useCallback, useEffect, useRef, useState } from 'react';
import { mezclar, posiciones } from './modelo';

/*
  Visor 3D liviano en Canvas 2D (pensado para las Ceibal):
  - proyecta esferas rotadas con perspectiva y las ordena por profundidad
  - cada esfera es un "sprite" prerenderizado (gradiente mate tipo gel)
  - solo dibuja cuando algo cambia; el bucle continuo corre solo si `vibrar`
  - rotar: arrastrar, flechas del teclado o botones; zoom: botones o + / -
*/

const MAX_DPR = 1.5;
const sprites = new Map();

function sprite(color, brillo) {
  const clave = color + (brillo ? '*' : '');
  if (sprites.has(clave)) return sprites.get(clave);
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const m = S / 2;
  const r = brillo ? S * 0.34 : S * 0.48;
  if (brillo) {
    const halo = g.createRadialGradient(m, m, r * 0.9, m, m, S / 2);
    halo.addColorStop(0, 'rgba(255,255,255,0.95)');
    halo.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, S, S);
  }
  const grd = g.createRadialGradient(m - r * 0.38, m - r * 0.42, r * 0.05, m, m, r);
  grd.addColorStop(0, mezclar(color, '#FFFFFF', 0.62));
  grd.addColorStop(0.5, color);
  grd.addColorStop(0.92, mezclar(color, '#2F4A85', 0.32));
  grd.addColorStop(1, mezclar(color, '#2F4A85', 0.42));
  g.fillStyle = grd;
  g.beginPath();
  g.arc(m, m, r, 0, Math.PI * 2);
  g.fill();
  // luz de borde suave (rebote del fondo)
  const borde = g.createRadialGradient(m + r * 0.3, m + r * 0.35, r * 0.55, m, m, r);
  borde.addColorStop(0, 'rgba(230,244,239,0)');
  borde.addColorStop(1, 'rgba(230,244,239,0.35)');
  g.fillStyle = borde;
  g.beginPath();
  g.arc(m, m, r, 0, Math.PI * 2);
  g.fill();
  const out = { c, prop: r / (S / 2) };
  sprites.set(clave, out);
  return out;
}

const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const ROT_INICIAL = { yaw: -0.38, pitch: 0.95, zoom: 1 };

export default function Visor({
  modelo,
  estado,
  vibrar = false,
  quieto = false,
  resaltado = null,
  onTocar,
  rot: rotExt,
  onRot,
  controles = true,
  interactivo = true,
  etiqueta = 'Modelo de la molécula',
  atenuar = 0.28,
  acercar = 1,
  giroInicial = false,
  alto,
  className = '',
  children,
}) {
  const lienzo = useRef(null);
  const caja = useRef(null);
  const [rotInt, setRotInt] = useState(ROT_INICIAL);
  const rot = rotExt || rotInt;
  const setRot = useCallback(
    (f) => {
      const nuevo = typeof f === 'function' ? f(rot) : f;
      if (onRot) onRot(nuevo);
      else setRotInt(nuevo);
    },
    [rot, onRot]
  );

  // Últimas props para el dibujo (sin re-crear el bucle)
  const vivo = useRef({});
  vivo.current = { modelo, estado, resaltado, rot, quieto: quieto || reducido(), atenuar, acercar };
  const reloj = useRef(0);
  const proyectadas = useRef([]);
  const pedido = useRef(0);

  const dibujar = useCallback(() => {
    pedido.current = 0;
    const cv = lienzo.current;
    if (!cv) return;
    const { modelo: m, estado: est, resaltado: res, rot: R, quieto: q, atenuar: at, acercar: ac } = vivo.current;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const pos = posiciones(m, est, reloj.current, q);
    const cy = Math.cos(R.yaw);
    const sy = Math.sin(R.yaw);
    const cp = Math.cos(R.pitch);
    const sp = Math.sin(R.pitch);
    const D = m.radio * 4.2;
    const escala = (Math.min(w / 2, (h / 2) * 1.12) * 0.9 * R.zoom * ac) / m.radio;
    const ox = w / 2;
    const oy = h / 2;

    const lista = pos.map((p, i) => {
      const x1 = p[0] * cy - p[1] * sy;
      const y1 = p[0] * sy + p[1] * cy;
      const z1 = p[2];
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;
      const f = D / (D + y2);
      const s = m.esferas[i];
      return { i, x: ox + x1 * escala * f, y: oy - z2 * escala * f, d: y2, r: s.r * escala * f, s };
    });

    // enlaces de la cadena (el "collar"), detrás de todo
    g.lineCap = 'round';
    // el collar se nota sobre todo cuando la proteína se desarma
    const suelta = est?.resultado === 'desarmada' ? Math.min(1, Math.max(0, ((est.t || 0) - 0.2) * 2)) : 0;
    g.strokeStyle = `rgba(47, 74, 133, ${(res ? 0.04 : 0.1) + suelta * 0.22})`;
    g.lineWidth = Math.max(1.5, escala * 0.28);
    g.beginPath();
    for (let i = 1; i < lista.length; i++) {
      const a = lista[i - 1];
      const b = lista[i];
      if (a.s.copia !== b.s.copia) continue;
      const pa = pos[i - 1];
      const pb = pos[i];
      if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) > 3.2) continue;
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
    }
    g.stroke();

    const orden = [...lista].sort((a, b) => b.d - a.d);
    const rango = m.radio * 1.4;
    for (const o of orden) {
      const destacada = res && o.s.dom === res;
      const sp2 = sprite(o.s.color, destacada);
      const lado = (2 * o.r) / sp2.prop;
      const niebla = Math.min(1, Math.max(0, (o.d + rango) / (2 * rango)));
      g.globalAlpha = (res && !destacada ? at : 1) * (1 - niebla * 0.38);
      g.drawImage(sp2.c, o.x - lado / 2, o.y - lado / 2, lado, lado);
    }
    g.globalAlpha = 1;
    proyectadas.current = orden;
  }, []);

  const pedirDibujo = useCallback(() => {
    if (!pedido.current) pedido.current = requestAnimationFrame(dibujar);
  }, [dibujar]);

  // Redibujar cuando cambian las props
  useEffect(() => {
    pedirDibujo();
  }, [modelo, estado, resaltado, rot, quieto, atenuar, acercar, pedirDibujo]);

  // Al aparecer, la molécula gira un poquito (invita a girarla)
  useEffect(() => {
    if (!giroInicial || rotExt || reducido()) return undefined;
    let id = 0;
    const inicio = performance.now();
    const paso = (ahora) => {
      const k = Math.min(1, (ahora - inicio) / 1400);
      const e = 1 - Math.pow(1 - k, 3);
      setRotInt({ ...ROT_INICIAL, yaw: ROT_INICIAL.yaw - 1.6 * (1 - e) });
      if (k < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tamaño responsivo
  useEffect(() => {
    const cv = lienzo.current;
    if (!cv || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => pedirDibujo());
    ro.observe(cv);
    return () => ro.disconnect();
  }, [pedirDibujo]);

  // Bucle de vibración (solo mientras haga falta), ~30 cuadros por segundo
  useEffect(() => {
    if (!vibrar || reducido()) return undefined;
    let id = 0;
    let antes = performance.now();
    const paso = (ahora) => {
      const dt = Math.min(0.1, (ahora - antes) / 1000);
      if (dt >= 1 / 32) {
        antes = ahora;
        reloj.current += dt;
        dibujar();
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [vibrar, dibujar]);

  useEffect(
    () => () => {
      cancelAnimationFrame(pedido.current);
      pedido.current = 0;
    },
    []
  );

  // Arrastrar para rotar; un toque sin arrastre elige una parte
  const arrastre = useRef(null);
  const alApretar = (ev) => {
    lienzo.current.setPointerCapture?.(ev.pointerId);
    arrastre.current = { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, rot };
  };
  const alMover = (ev) => {
    const a = arrastre.current;
    if (!a) return;
    const dx = ev.clientX - a.x0;
    const dy = ev.clientY - a.y0;
    setRot({ ...a.rot, yaw: a.rot.yaw + dx * 0.009, pitch: Math.max(-1.5, Math.min(1.5, a.rot.pitch + dy * 0.009)) });
  };
  const alSoltar = (ev) => {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a || !onTocar) return;
    if (Math.hypot(ev.clientX - a.x0, ev.clientY - a.y0) > 6) return;
    const b = lienzo.current.getBoundingClientRect();
    const px = ev.clientX - b.left;
    const py = ev.clientY - b.top;
    const lista = proyectadas.current;
    for (let k = lista.length - 1; k >= 0; k--) {
      const o = lista[k];
      if (Math.hypot(px - o.x, py - o.y) <= o.r * 1.05) {
        onTocar(o.s.dom);
        return;
      }
    }
    onTocar(null);
  };

  const girar = (dy, dp) => setRot((r) => ({ ...r, yaw: r.yaw + dy, pitch: Math.max(-1.5, Math.min(1.5, r.pitch + dp)) }));
  const zoom = (f) => setRot((r) => ({ ...r, zoom: Math.max(0.6, Math.min(2.2, r.zoom * f)) }));
  const alTecla = (ev) => {
    const mapa = {
      ArrowLeft: () => girar(-0.26, 0),
      ArrowRight: () => girar(0.26, 0),
      ArrowUp: () => girar(0, -0.26),
      ArrowDown: () => girar(0, 0.26),
      '+': () => zoom(1.2),
      '=': () => zoom(1.2),
      '-': () => zoom(1 / 1.2),
    };
    if (mapa[ev.key]) {
      ev.preventDefault();
      mapa[ev.key]();
    }
  };

  return (
    <div className={`a2-visor ${interactivo ? 'a2-visor--interactivo' : ''} ${className}`} ref={caja} style={alto ? { height: alto } : undefined}>
      <canvas
        ref={lienzo}
        className="a2-visor__lienzo"
        role="img"
        aria-label={interactivo ? `${etiqueta}. Usá las flechas para girarla y + o − para acercarla.` : etiqueta}
        {...(interactivo
          ? {
              tabIndex: 0,
              onPointerDown: alApretar,
              onPointerMove: alMover,
              onPointerUp: alSoltar,
              onPointerCancel: () => (arrastre.current = null),
              onKeyDown: alTecla,
            }
          : { style: { pointerEvents: 'none' } })}
      />
      {children}
      {controles && (
        <div className="a2-visor__controles" aria-label="Girar y acercar">
          <button type="button" className="a2-ctrl" onClick={() => girar(-0.4, 0)} aria-label="Girar a la izquierda">
            <Flecha dir={180} />
          </button>
          <button type="button" className="a2-ctrl" onClick={() => girar(0, -0.4)} aria-label="Girar hacia arriba">
            <Flecha dir={270} />
          </button>
          <button type="button" className="a2-ctrl" onClick={() => girar(0, 0.4)} aria-label="Girar hacia abajo">
            <Flecha dir={90} />
          </button>
          <button type="button" className="a2-ctrl" onClick={() => girar(0.4, 0)} aria-label="Girar a la derecha">
            <Flecha dir={0} />
          </button>
          <span className="a2-visor__sep" />
          <button type="button" className="a2-ctrl" onClick={() => zoom(1 / 1.25)} aria-label="Alejar">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="a2-ctrl" onClick={() => zoom(1.25)} aria-label="Acercar">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="a2-ctrl" onClick={() => setRot(ROT_INICIAL)} aria-label="Volver a la vista del principio" title="Centrar">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function Flecha({ dir }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ transform: `rotate(${dir}deg)` }}>
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
