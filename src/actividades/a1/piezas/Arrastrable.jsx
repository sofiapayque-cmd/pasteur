import { useEffect, useRef, useState } from 'react';

/*
  Algo que se puede arrastrar hasta un "destino" (cualquier elemento con
  data-destino="id"). Siempre tiene alternativa: tocarlo / Enter lo
  "elige" (onToque) y después se toca el destino o un botón.

  Props:
  - onSoltar(destino, { x, y, el }) al soltarlo sobre un destino
  - onToque() al tocarlo sin arrastrar (o Enter / Espacio)
  - elegido: muestra que está elegido
*/
function destinoEn(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const d = el.closest?.('[data-destino]');
    if (d) return d;
  }
  return null;
}

export default function Arrastrable({ onSoltar, onToque, elegido, disabled, className = '', children, etiqueta, ...resto }) {
  const [delta, setDelta] = useState(null);
  const inicio = useRef(null);
  const sobre = useRef(null);
  const ignorarClick = useRef(false);

  useEffect(() => () => sobre.current?.classList.remove('a1-destino--sobre'), []);

  function marcar(el) {
    if (sobre.current === el) return;
    sobre.current?.classList.remove('a1-destino--sobre');
    sobre.current = el;
    el?.classList.add('a1-destino--sobre');
  }

  function abajo(e) {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    inicio.current = { x: e.clientX, y: e.clientY, mov: false, id: e.pointerId };
    // Capturamos desde el principio: si el dedo sale rápido del botón, el arrastre sigue
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura */
    }
  }
  function mover(e) {
    const st = inicio.current;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (!st.mov) {
      if (Math.hypot(dx, dy) < 8) return;
      st.mov = true;
    }
    setDelta({ dx, dy });
    marcar(destinoEn(e.clientX, e.clientY));
  }
  function arriba(e) {
    const st = inicio.current;
    inicio.current = null;
    if (!st) return;
    if (st.mov) {
      ignorarClick.current = true;
      setTimeout(() => (ignorarClick.current = false), 50);
      const d = destinoEn(e.clientX, e.clientY);
      marcar(null);
      setDelta(null);
      if (d) onSoltar?.(d.dataset.destino, { x: e.clientX, y: e.clientY, el: d });
    }
  }
  function cancelar() {
    inicio.current = null;
    marcar(null);
    setDelta(null);
  }
  function click() {
    if (ignorarClick.current) {
      ignorarClick.current = false;
      return;
    }
    if (!disabled) onToque?.();
  }

  return (
    <button
      type="button"
      className={`a1-arrastrable ${delta ? 'a1-arrastrable--movil' : ''} ${elegido ? 'a1-arrastrable--elegido' : ''} ${className}`}
      style={delta ? { transform: `translate(${delta.dx}px, ${delta.dy}px) scale(1.06)` } : undefined}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={arriba}
      onPointerCancel={cancelar}
      onClick={click}
      aria-pressed={elegido ? true : undefined}
      aria-label={etiqueta}
      disabled={disabled}
      {...resto}
    >
      {children}
    </button>
  );
}
