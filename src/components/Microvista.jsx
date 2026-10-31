import { useId, useMemo } from 'react';

/*
  Vista microscópica de una muestra.
  Es una REPRESENTACIÓN ilustrada con el kit de organismos del sistema visual
  (membrana apenas irregular, citoplasma con degradado, núcleo, orgánulos y
  apéndices que cruzan el borde). Qué microorganismos aparecen en cada
  ambiente se define con el laboratorio.

  Props: colores (lista), semilla, tamano (px), etiqueta, cantidad (cuántos organismos).
  Animación: respirar (cocos), fluir (bacilos que nadan), girar (colonias); solo transform.
*/

// Números pseudoaleatorios fijos: la misma muestra siempre se ve igual
function azar(semilla) {
  let s = Math.abs(Math.floor(semilla)) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Membrana "apenas irregular": círculo con 10 puntos levemente desplazados
function membrana(r, rnd, puntos = 10) {
  const p = [];
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const k = r * (0.93 + rnd() * 0.12);
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

export default function Microvista({ colores, semilla = 7, tamano = 420, etiqueta, cantidad = 22 }) {
  const uid = useId().replace(/:/g, '');
  const paleta = colores?.length ? colores : ['#93AEEB', '#F4A6BD', '#8ED5C3'];

  const formas = useMemo(() => {
    const r = azar(semilla);
    const lista = [];
    for (let i = 0; i < cantidad; i++) {
      const v = r();
      const tipo = v < 0.42 ? 'coco' : v < 0.74 ? 'bacilo' : v < 0.9 ? 'colonia' : 'espiral';
      const ang = r() * Math.PI * 2;
      const dist = Math.sqrt(r()) * 165;
      lista.push({
        tipo,
        x: 200 + Math.cos(ang) * dist,
        y: 200 + Math.sin(ang) * dist,
        c: i % paleta.length,
        tam: 8 + r() * 12,
        giro: Math.round(r() * 180),
        retraso: (r() * 6).toFixed(2),
        dur: (4 + r() * 4).toFixed(1),
        d: membrana(1, r),
        orgs: Array.from({ length: 3 + Math.floor(r() * 4) }, () => [(r() - 0.5) * 1.1, (r() - 0.5) * 1.1]),
        cilios: r() < 0.5,
      });
    }
    return lista;
  }, [semilla, cantidad, paleta.length]);

  return (
    <svg className="microvista" viewBox="0 0 400 400" width={tamano} height={tamano} role="img" aria-label={etiqueta || 'Vista con microscopio de la muestra'}>
      <style>{ESTILO}</style>
      <defs>
        <clipPath id={`lente${uid}`}>
          <circle cx="200" cy="200" r="190" />
        </clipPath>
        <radialGradient id={`fondo${uid}`} cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".75" stopColor="#F1F4FD" />
          <stop offset="1" stopColor="#DCE3F8" />
        </radialGradient>
        {paleta.map((c, i) => (
          <radialGradient key={i} id={`cito${uid}${i}`} cx="35%" cy="32%" r="75%">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".9" />
            <stop offset=".45" stopColor={c} stopOpacity=".95" />
            <stop offset="1" stopColor={c} />
          </radialGradient>
        ))}
      </defs>
      <circle cx="200" cy="200" r="198" fill="#FFFFFF" />
      <g clipPath={`url(#lente${uid})`}>
        <rect width="400" height="400" fill={`url(#fondo${uid})`} />
        {/* partículas de fondo (fluyen) */}
        <g className="mv-fluir" opacity=".35">
          {formas.slice(0, 10).map((f, i) => (
            <circle key={i} cx={(f.x * 1.7) % 400} cy={(f.y * 2.3) % 400} r="2" fill="#93AEEB" />
          ))}
        </g>
        {formas.map((f, i) => {
          const fill = `url(#cito${uid}${f.c})`;
          const color = paleta[f.c];
          return (
            <g key={i} transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.giro})`}>
              <g className={`mv-forma mv-${f.tipo}`} style={{ animationDelay: `-${f.retraso}s`, animationDuration: `${f.dur}s` }}>
                {f.tipo === 'coco' && (
                  <g transform={`scale(${f.tam})`}>
                    {f.cilios &&
                      [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
                        <path key={k} d="M0 -1.02 L0 -1.4" transform={`rotate(${k * 45})`} stroke="#7272EE" strokeWidth=".09" strokeLinecap="round" />
                      ))}
                    <path d={f.d} fill={fill} />
                    <path d={f.d} fill="none" stroke={color} strokeWidth=".08" opacity=".9" />
                    <circle r=".24" fill="#2F4A85" opacity=".45" />
                    {f.orgs.map(([ox, oy], k) => (
                      <circle key={k} cx={ox} cy={oy} r=".07" fill="#2F4A85" opacity=".35" />
                    ))}
                  </g>
                )}
                {f.tipo === 'bacilo' && (
                  <>
                    <path d={`M${f.tam * 1.35} 0 q8 -6 16 0 t16 0`} stroke="#7272EE" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <rect x={-f.tam * 1.4} y={-f.tam * 0.55} width={f.tam * 2.8} height={f.tam * 1.1} rx={f.tam * 0.55} fill={fill} />
                    <ellipse cx={-f.tam * 0.2} cy="0" rx={f.tam * 0.36} ry={f.tam * 0.22} fill="#2F4A85" opacity=".35" />
                    <circle cx={f.tam * 0.8} cy={-f.tam * 0.15} r="1.4" fill="#2F4A85" opacity=".35" />
                    <circle cx={-f.tam * 0.95} cy={f.tam * 0.15} r="1.2" fill="#2F4A85" opacity=".35" />
                  </>
                )}
                {f.tipo === 'colonia' &&
                  [0, 1, 2, 3, 4, 5, 6].map((k) => (
                    <g key={k} transform={`translate(${(Math.cos(k * 2.4) * Math.sqrt(k) * 6.5).toFixed(1)} ${(Math.sin(k * 2.4) * Math.sqrt(k) * 6.5).toFixed(1)})`}>
                      <circle r={f.tam * 0.36} fill={fill} />
                      <circle r={f.tam * 0.1} fill="#2F4A85" opacity=".35" />
                    </g>
                  ))}
                {f.tipo === 'espiral' && (
                  <path d="M-18 0 q4.5 -8 9 0 t9 0 t9 0 t9 0" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
                )}
              </g>
            </g>
          );
        })}
        {/* brillo de la lente */}
        <path d="M70 120 A150 150 0 0 1 150 52" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".7" />
      </g>
      <circle cx="200" cy="200" r="190" fill="none" stroke="#2F4A85" strokeOpacity=".25" strokeWidth="2" />
      <circle cx="200" cy="200" r="196" fill="none" stroke="#2F4A85" strokeOpacity=".08" strokeWidth="6" />
    </svg>
  );
}

const ESTILO = `
.microvista .mv-forma{transform-box:fill-box;transform-origin:50% 50%}
.microvista .mv-coco{animation:mv-respirar 5s ease-in-out infinite}
.microvista .mv-bacilo{animation:mv-nadar 6s ease-in-out infinite}
.microvista .mv-colonia{animation:mv-girar 8s ease-in-out infinite}
.microvista .mv-espiral{animation:mv-nadar 4s ease-in-out infinite}
.microvista .mv-fluir{animation:mv-fluir 14s linear infinite alternate}
@keyframes mv-respirar{50%{transform:scale(1.1)}}
@keyframes mv-nadar{50%{transform:translateX(9px) rotate(6deg)}}
@keyframes mv-girar{50%{transform:rotate(14deg) scale(1.04)}}
@keyframes mv-fluir{to{transform:translate(18px,-12px)}}
@media (prefers-reduced-motion:reduce){.microvista *{animation:none!important}}
`;
