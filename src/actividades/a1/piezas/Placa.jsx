import { forwardRef, useId, useMemo } from 'react';
import { azar, colonias as calcularColonias } from '../laboratorio';
import { MORFOTIPOS, arrugas, firma, formaColonia, tono } from '../colonias';

/*
  Placa de Petri ilustrada (viewBox 400×400, centro 200,200; el agar mide r=176).
  - placa: { ambiente, temp, semilla, contaminada, trazo } → colonias
  - momento: 0 (recién sembrada), 1 (primer tiempo), 2 (final): las colonias CRECEN
  - tapa: dibuja la tapa transparente encima
  - children: capas extra dentro del SVG (trazo en vivo, discos, halos…)

  Bloque 7 (7/11): agar como gel translúcido y colonias con la "firma" de cada
  ambiente (forma, borde, relieve, brillo o arrugas: ver ../colonias.js).
  Todo es SVG sin filtros, para que ande liviano en las Ceibal.
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

/* Degradés de cada tipo de colonia (uno por placa y por tipo, no uno por colonia). */
function degrade(id, m) {
  const c = m.color;
  const transp = m.translucida ? 0.62 : 0.9;
  if (m.relieve === 'convexa') {
    // Abombada: la luz pega arriba a la izquierda y el borde es más fino (más transparente)
    return (
      <radialGradient key={id} id={id} cx=".5" cy=".5" r=".5" fx=".36" fy=".33">
        <stop offset="0" stopColor={tono(c, 0.5)} />
        <stop offset=".42" stopColor={tono(c, 0.12)} />
        <stop offset=".86" stopColor={c} stopOpacity={m.translucida ? 0.85 : 1} />
        <stop offset="1" stopColor={tono(c, -0.22)} stopOpacity={transp} />
      </radialGradient>
    );
  }
  if (m.superficie === 'tiza') {
    // Centro alto y más oscuro, y un borde blanco como de polvo
    return (
      <radialGradient key={id} id={id} cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor={tono(c, -0.2)} />
        <stop offset=".34" stopColor={tono(c, -0.05)} />
        <stop offset=".72" stopColor={c} />
        <stop offset="1" stopColor={tono(c, 0.55)} stopOpacity=".95" />
      </radialGradient>
    );
  }
  // Plana (seca, mate o mucosa): más densa en el centro, el borde que avanza es finito
  return (
    <radialGradient key={id} id={id} cx=".5" cy=".5" r=".5" fx=".44" fy=".42">
      <stop offset="0" stopColor={tono(c, m.superficie === 'mucosa' ? 0.25 : -0.07)} />
      <stop offset=".66" stopColor={c} stopOpacity={m.translucida ? 0.8 : 1} />
      <stop offset="1" stopColor={tono(c, 0.2)} stopOpacity={m.translucida ? 0.5 : 0.78} />
    </radialGradient>
  );
}

/** Los degradés de las colonias de un ambiente, para poner dentro de <defs>. */
export function DefsColonias({ uid, ambiente }) {
  return <>{firma(ambiente).map((m) => degrade(`${uid}-${m.id}`, m))}</>;
}

function Hongo({ t, giro }) {
  // Moho que entró por no esterilizar: algodonoso, con el centro verde-azulado de las esporas
  return (
    <g>
      {Array.from({ length: 26 }, (_, k) => (
        <path key={k} d={`M0 0 L${t * (1.05 + (k % 3) * 0.08)} 0`} transform={`rotate(${k * 13.8 + giro})`} stroke="#E9ECE4" strokeWidth="1.3" strokeLinecap="round" opacity=".8" />
      ))}
      <circle r={t * 0.92} fill="#F2F3EE" opacity=".85" />
      <circle r={t * 0.7} fill="#B9C9B6" />
      <circle r={t * 0.5} fill="#6F8C7C" />
      <circle r={t * 0.26} fill="#4F6B5E" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <circle key={k} cx={Math.cos(k * 1.1 + giro) * t * 0.36} cy={Math.sin(k * 1.1 + giro) * t * 0.36} r={t * 0.06} fill="#3D5248" opacity=".7" />
      ))}
    </g>
  );
}

export function Colonia({ c, uid }) {
  const t = c.tam;
  if (c.forma === 'hongo') return <Hongo t={t} giro={c.giro} />;
  if (c.forma === 'rara') {
    return <path d={borde(t, c.x * 3 + c.y, 0.5, 7)} fill={c.color} stroke="#8A8270" strokeWidth="1" opacity=".95" />;
  }
  const m = MORFOTIPOS[c.forma];
  if (!m || !uid) {
    // Por si llega una colonia sin tipo conocido: redonda y brillante
    return (
      <g>
        <circle r={t} fill={c.color} stroke="#8A6A4A" strokeOpacity=".45" strokeWidth="1.2" />
        <circle cx={-t * 0.35} cy={-t * 0.35} r={t * 0.22} fill="#FFFFFF" opacity=".7" />
      </g>
    );
  }
  const cuerpo = formaColonia(m.borde, t, c.semilla);
  const giro = `rotate(${c.giro})`;
  const brilla = m.superficie === 'brillante' || m.superficie === 'mucosa';
  const relleno = (
    <path d={cuerpo} transform={giro} fill={`url(#${uid}-${c.forma})`} stroke={tono(m.color, -0.42)} strokeOpacity={m.translucida ? 0.3 : 0.45} strokeWidth={Math.max(0.6, t * 0.05)} />
  );
  return (
    <g>
      {m.pigmento && <circle r={t * 1.9} fill={m.pigmento} opacity=".14" />}
      {m.superficie === 'tiza' && <circle r={t * 1.14} fill="none" stroke="#6B5530" strokeOpacity=".2" strokeWidth={t * 0.1} />}
      {/* Sombra sobre el agar (la luz viene de arriba a la izquierda) */}
      <path d={cuerpo} transform={`translate(${(t * 0.08).toFixed(2)} ${(t * 0.12).toFixed(2)}) ${giro}`} fill="#4A361A" opacity={m.relieve === 'plana' ? 0.14 : 0.26} />
      {relleno}
      {m.relieve === 'umbonada' && <circle r={t * 0.36} fill={tono(m.color, -0.14)} opacity=".5" />}
      {m.superficie === 'arrugada' && (
        <path d={arrugas(t, c.semilla)} transform={giro} stroke={tono(m.color, -0.4)} strokeOpacity=".32" strokeWidth={Math.max(0.6, t * 0.055)} strokeLinecap="round" fill="none" />
      )}
      {m.superficie === 'tiza' && <path d={polvo(t)} fill="#FFFFFF" opacity=".55" />}
      {brilla && (
        <ellipse cx={-t * 0.32} cy={-t * 0.36} rx={t * 0.3} ry={t * 0.16} transform={`rotate(-35 ${-t * 0.32} ${-t * 0.36})`} fill="#FFFFFF" opacity={m.superficie === 'mucosa' ? 0.45 : 0.72} />
      )}
    </g>
  );
}

/* Puntitos blancos de una colonia "de tiza", todos en un solo trazado (más liviano). */
function polvo(t) {
  const r = t * 0.07;
  let d = '';
  for (let k = 0; k < 7; k++) {
    const x = Math.cos(k * 0.9) * t * (0.55 + (k % 3) * 0.12);
    const y = Math.sin(k * 0.9) * t * (0.55 + (k % 3) * 0.12);
    d += `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;
  }
  return d;
}

/* Agar nutritivo: ámbar claro y translúcido (sobre él, las colonias opacas se notan) */
export const AGAR = '#D9BB78';

export const PlacaVidrio = forwardRef(function PlacaVidrio({ tamano = 320, tapa = false, children, etiqueta, className = '', agar = AGAR, ...resto }, ref) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg ref={ref} viewBox="0 0 400 400" width={tamano} height={tamano} className={`a1-placa ${className}`} role="img" aria-label={etiqueta || 'Placa de Petri'} {...resto}>
      <defs>
        {/* Agar: gel color paja, translúcido; más claro donde le da la luz */}
        <radialGradient id={`agar${uid}`} cx="44%" cy="40%" r="66%">
          <stop offset="0" stopColor={tono(agar, 0.42)} />
          <stop offset=".55" stopColor={tono(agar, 0.12)} />
          <stop offset=".9" stopColor={agar} />
          <stop offset="1" stopColor={tono(agar, -0.18)} />
        </radialGradient>
        <linearGradient id={`fondo${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".6" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#7A5A1E" stopOpacity=".12" />
        </linearGradient>
        <clipPath id={`clip${uid}`}>
          <circle cx="200" cy="200" r="176" />
        </clipPath>
      </defs>
      <ellipse cx="200" cy="384" rx="150" ry="10" fill="#2F4A85" opacity=".12" />
      {/* Vidrio de la base */}
      <circle cx="200" cy="200" r="192" fill="#F3F5F9" stroke="#C4CCDC" strokeWidth="3" />
      <circle cx="200" cy="200" r="186" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity=".8" />
      {/* Agar */}
      <circle cx="200" cy="200" r="176" fill={`url(#agar${uid})`} />
      <circle cx="200" cy="200" r="176" fill={`url(#fondo${uid})`} />
      <ellipse cx="150" cy="140" rx="92" ry="58" transform="rotate(-28 150 140)" fill="#FFFFFF" opacity=".16" />
      <g clipPath={`url(#clip${uid})`}>{children}</g>
      {/* Menisco: el agar sube un poquito por el vidrio */}
      <circle cx="200" cy="200" r="172" fill="none" stroke={tono(agar, -0.3)} strokeWidth="6" opacity=".18" />
      <circle cx="200" cy="200" r="175.5" fill="none" stroke="#FFF7DF" strokeWidth="1.6" opacity=".7" />
      <g className={`a1-placa__tapa ${tapa ? 'a1-placa__tapa--puesta' : ''}`}>
        <circle cx="200" cy="200" r="196" fill="#FFFFFF" fillOpacity=".2" stroke="#AEB9D0" strokeWidth="3" />
        <path d="M78 110 A150 150 0 0 1 170 50" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" fill="none" opacity=".85" />
        <path d="M320 300 A150 150 0 0 1 290 330" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" fill="none" opacity=".6" />
      </g>
    </svg>
  );
});

const ESCALA = { 0: 0, 1: 0.5, 2: 1 };

export default function Placa({ placa, momento = 2, tamano = 320, tapa = true, children, etiqueta, mostrarTrazo = false, ...resto }) {
  const uid = 'c' + useId().replace(/:/g, '');
  const lista = useMemo(() => (placa ? calcularColonias(placa) : []), [placa]);
  return (
    <PlacaVidrio tamano={tamano} tapa={tapa} etiqueta={etiqueta} {...resto}>
      {placa && (
        <defs>
          <DefsColonias uid={uid} ambiente={placa.ambiente} />
        </defs>
      )}
      {mostrarTrazo && placa?.trazo?.length > 1 && (
        <polyline points={placa.trazo.map((p) => p.join(',')).join(' ')} fill="none" stroke="#C9A85E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
      )}
      {lista.map((c, i) => {
        const s = c.aparece <= momento ? (momento === 1 ? ESCALA[1] : ESCALA[2]) : 0;
        return (
          <g key={i} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
            <g className="a1-colonia" style={{ transform: `scale(${s})`, opacity: s ? 1 : 0, transitionDelay: `${(i % 7) * 0.06}s` }}>
              <Colonia c={c} uid={uid} />
            </g>
          </g>
        );
      })}
      {children}
    </PlacaVidrio>
  );
}
