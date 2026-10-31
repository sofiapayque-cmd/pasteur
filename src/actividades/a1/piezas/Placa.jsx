import { forwardRef, useId, useMemo } from 'react';
import { azar, colonias as calcularColonias } from '../laboratorio';

/*
  Placa de Petri ilustrada (viewBox 400×400, centro 200,200; el agar mide r=176).
  - placa: { ambiente, temp, semilla, contaminada, trazo } → colonias
  - momento: 0 (recién sembrada), 1 (primer tiempo), 2 (final): las colonias CRECEN
  - tapa: dibuja la tapa transparente encima
  - children: capas extra dentro del SVG (trazo en vivo, discos, halos…)
*/

function borde(r, semilla, irregular = 0.18, puntos = 11) {
  const rnd = azar(semilla + 11);
  const p = [];
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const k = r * (1 - irregular / 2 + rnd() * irregular);
    p.push([Math.cos(a) * k, Math.sin(a) * k]);
  }
  let d = `M${((p[0][0] + p[puntos - 1][0]) / 2).toFixed(1)} ${((p[0][1] + p[puntos - 1][1]) / 2).toFixed(1)}`;
  for (let i = 0; i < puntos; i++) {
    const a = p[i];
    const b = p[(i + 1) % puntos];
    d += ` Q${a[0].toFixed(1)} ${a[1].toFixed(1)} ${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  }
  return d + 'Z';
}

export function Colonia({ c }) {
  const t = c.tam;
  if (c.forma === 'hongo') {
    return (
      <g>
        {Array.from({ length: 18 }, (_, k) => (
          <path key={k} d={`M0 0 L${t * 1.15} 0`} transform={`rotate(${k * 20 + c.giro})`} stroke="#8EA27A" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
        ))}
        <circle r={t * 0.85} fill="#C9D4BD" opacity=".9" />
        <circle r={t * 0.55} fill="#9DB08A" />
        <circle r={t * 0.28} fill="#5E7350" />
        {[0, 1, 2, 3, 4].map((k) => (
          <circle key={k} cx={Math.cos(k * 1.3) * t * 0.4} cy={Math.sin(k * 1.3) * t * 0.4} r="1.6" fill="#3E4A35" opacity=".6" />
        ))}
      </g>
    );
  }
  if (c.forma === 'rara') {
    return <path d={borde(t, c.x * 3 + c.y, 0.5, 7)} fill={c.color} stroke="#8A8270" strokeWidth="1" opacity=".95" />;
  }
  if (c.forma === 'puntito') {
    return (
      <g>
        <circle r={t} fill={c.color} stroke="#8A6A4A" strokeOpacity=".4" strokeWidth="1" />
        <circle cx={-t * 0.3} cy={-t * 0.3} r={t * 0.35} fill="#FFFFFF" opacity=".6" />
      </g>
    );
  }
  if (c.forma === 'rugosa') {
    return (
      <g>
        <path d={borde(t, c.semilla, 0.32)} fill={c.color} stroke="#8A6A4A" strokeOpacity=".45" strokeWidth="1.4" />
        <path d={`M${-t * 0.5} ${-t * 0.1} q${t * 0.3} ${-t * 0.4} ${t * 0.6} 0 M${-t * 0.2} ${t * 0.35} q${t * 0.3} ${-t * 0.3} ${t * 0.55} 0`} stroke="#22232A" strokeOpacity=".16" strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  // lisa
  return (
    <g>
      <circle r={t} fill={c.color} stroke="#8A6A4A" strokeOpacity=".45" strokeWidth="1.4" />
      <circle r={t * 0.62} fill="#FFFFFF" opacity=".28" />
      <circle cx={-t * 0.35} cy={-t * 0.35} r={t * 0.22} fill="#FFFFFF" opacity=".7" />
    </g>
  );
}

export const PlacaVidrio = forwardRef(function PlacaVidrio({ tamano = 320, tapa = false, children, etiqueta, className = '', agar = '#EFD99F', ...resto }, ref) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg ref={ref} viewBox="0 0 400 400" width={tamano} height={tamano} className={`a1-placa ${className}`} role="img" aria-label={etiqueta || 'Placa de Petri'} {...resto}>
      <defs>
        <radialGradient id={`agar${uid}`} cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FBEFCB" />
          <stop offset=".7" stopColor={agar} />
          <stop offset="1" stopColor="#E0C27A" />
        </radialGradient>
        <clipPath id={`clip${uid}`}>
          <circle cx="200" cy="200" r="176" />
        </clipPath>
      </defs>
      <ellipse cx="200" cy="384" rx="150" ry="10" fill="#2F4A85" opacity=".12" />
      <circle cx="200" cy="200" r="192" fill="#F4F6FA" stroke="#C4CCDC" strokeWidth="3" />
      <circle cx="200" cy="200" r="176" fill={`url(#agar${uid})`} />
      <g clipPath={`url(#clip${uid})`}>{children}</g>
      <circle cx="200" cy="200" r="176" fill="none" stroke="#D9C083" strokeWidth="2" opacity=".6" />
      <g className={`a1-placa__tapa ${tapa ? 'a1-placa__tapa--puesta' : ''}`}>
        <circle cx="200" cy="200" r="196" fill="#FFFFFF" fillOpacity=".22" stroke="#AEB9D0" strokeWidth="3" />
        <path d="M78 110 A150 150 0 0 1 170 50" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" fill="none" opacity=".85" />
        <path d="M320 300 A150 150 0 0 1 290 330" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" fill="none" opacity=".6" />
      </g>
    </svg>
  );
});

const ESCALA = { 0: 0, 1: 0.5, 2: 1 };

export default function Placa({ placa, momento = 2, tamano = 320, tapa = true, children, etiqueta, mostrarTrazo = false, ...resto }) {
  const lista = useMemo(() => (placa ? calcularColonias(placa) : []), [placa]);
  return (
    <PlacaVidrio tamano={tamano} tapa={tapa} etiqueta={etiqueta} {...resto}>
      {mostrarTrazo && placa?.trazo?.length > 1 && (
        <polyline points={placa.trazo.map((p) => p.join(',')).join(' ')} fill="none" stroke="#C9A85E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
      )}
      {lista.map((c, i) => {
        const s = c.aparece <= momento ? (momento === 1 ? ESCALA[1] : ESCALA[2]) : 0;
        return (
          <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
            <g className="a1-colonia" style={{ transform: `scale(${s})`, opacity: s ? 1 : 0, transitionDelay: `${(i % 7) * 0.06}s` }}>
              <Colonia c={c} />
            </g>
          </g>
        );
      })}
      {children}
    </PlacaVidrio>
  );
}
