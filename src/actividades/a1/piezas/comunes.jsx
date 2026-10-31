import { useEffect, useRef, useState } from 'react';
import Aviso from '../../../components/Aviso';

/* Cabeza de pantalla: etiqueta de laboratorio, titular y UNA instrucción. */
export function Cabeza({ etiqueta, titulo, children, extra }) {
  return (
    <header className="a1-cabeza">
      <div className="a1-cabeza__textos">
        {etiqueta && <span className="etiqueta etiqueta--oscura">{etiqueta}</span>}
        <h1>{titulo}</h1>
        {children && <p className="a1-cabeza__instruccion">{children}</p>}
      </div>
      {extra && <div className="a1-cabeza__extra">{extra}</div>}
    </header>
  );
}

/* Aviso de Moli encima de todo (el resto queda atenuado). */
export function Capa({ children, onCerrar }) {
  const ref = useRef(null);
  useEffect(() => {
    const boton = ref.current?.querySelector('button');
    boton?.focus();
    const tecla = (e) => e.key === 'Escape' && onCerrar?.();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  return (
    <div className="a1-capa" ref={ref}>
      <div className="a1-capa__aviso">{children}</div>
    </div>
  );
}

export function AvisoCapa(props) {
  return (
    <Capa onCerrar={props.onAccion}>
      <Aviso {...props} />
    </Capa>
  );
}

/* Temporizador que se limpia solo al desmontar */
export function useTiempos() {
  const ids = useRef([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return (fn, ms) => {
    const id = setTimeout(fn, ms);
    ids.current.push(id);
    return id;
  };
}

export const sinMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* Hilo de pasos dentro de una etapa (Esterilizar · Sembrar · …) */
export function Pasos({ lista, actual }) {
  const i = lista.findIndex((p) => p.id === actual);
  return (
    <ol className="a1-pasos" aria-label="Pasos">
      {lista.map((p, n) => (
        <li key={p.id} className={n < i ? 'hecho' : n === i ? 'actual' : ''}>
          <span className="a1-pasos__punto" aria-hidden="true" />
          <span className="a1-pasos__nombre">{p.nombre}</span>
        </li>
      ))}
    </ol>
  );
}

/* Chip con el color del ambiente */
export function ChipAmbiente({ ambiente, extra }) {
  if (!ambiente) return null;
  return (
    <span className="a1-chip">
      <i style={{ background: ambiente.color }} aria-hidden="true" />
      {ambiente.nombre}
      {extra && <b>{extra}</b>}
    </span>
  );
}

export function useRecordar(valor) {
  const [v, setV] = useState(valor);
  useEffect(() => setV(valor), [valor]);
  return [v, setV];
}

/* Fecha de hoy, en castellano */
export const hoy = () => {
  try {
    return new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

/* Errores que el niño tuvo (se guardan como contadores chicos) */
export function sumarError(progreso, clave) {
  const e = progreso.datos.errores || {};
  progreso.guardar({ errores: { ...e, [clave]: (e[clave] || 0) + 1 } });
}
