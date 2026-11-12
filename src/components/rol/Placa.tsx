import type { CSSProperties } from 'react';
import type { Rol } from './escenaRol';

/*
  Una de las dos opciones: una placa de Petri vista desde arriba (la "placa"
  del sistema de diseño: círculo que es marco y botón). Es un <button> de
  verdad: funciona con mouse, teclado y lector de pantalla.
*/

type Colonia = { t: number; cx: string; cy: string; c: string };

const COLONIAS: Record<Rol, Colonia[]> = {
  maestra: [
    { t: 16, cx: '27%', cy: '77%', c: 'rgba(147, 174, 235, 0.55)' },
    { t: 9, cx: '32%', cy: '82%', c: 'rgba(147, 174, 235, 0.45)' },
    { t: 12, cx: '70%', cy: '80%', c: 'rgba(142, 213, 195, 0.6)' },
  ],
  alumno: [
    { t: 16, cx: '67%', cy: '76%', c: 'rgba(114, 114, 238, 0.35)' },
    { t: 9, cx: '62%', cy: '82%', c: 'rgba(114, 114, 238, 0.3)' },
    { t: 12, cx: '28%', cy: '79%', c: 'rgba(142, 213, 195, 0.6)' },
  ],
};

type Props = {
  rol: Rol;
  titulo: string;
  texto: string;
  /** Moli está sentada en esta placa (se ve su sombra) */
  conMoli?: boolean;
  onElegir: (rol: Rol) => void;
};

export default function Placa({ rol, titulo, texto, conMoli = false, onElegir }: Props) {
  return (
    <button
      type="button"
      className={`rol-placa rol-placa--${rol}`}
      data-placa={rol}
      data-con-moli={conMoli ? '' : undefined}
      onClick={() => onElegir(rol)}
    >
      <span className="rol-placa__sombra" aria-hidden="true" />
      <span className="rol-placa__brillo" aria-hidden="true" />
      {COLONIAS[rol].map((c, i) => (
        <span key={i} className="rol-placa__colonia" aria-hidden="true" style={{ '--t': c.t, '--cx': c.cx, '--cy': c.cy, '--c': c.c } as CSSProperties} />
      ))}
      <span className="rol-placa__titulo">{titulo}</span>
      <span className="rol-placa__texto">{texto}</span>
      <span className="rol-placa__ir" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
