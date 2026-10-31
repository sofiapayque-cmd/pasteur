import { useMemo } from 'react';
import { K, genomaDe, ambientePorId, COLORES_CUERPO } from './modelo';
import { VirusSVG, SOMBRA } from './virus';

/*
  Árbol de variantes que se arma en vivo.
  - Eje horizontal: generaciones (el tiempo).
  - Cada rama es una variante; nace de la variante de la que se copió.
  - El grosor de la rama es cuántos virus de esa variante hay en cada generación.
  - En la punta, cómo se ve la variante hoy (o un puntito si desapareció).
  Se muestran las variantes que llegaron a ser al menos el 5% de la placa (máx. MAX_RAMAS).
*/
const W = 820;
const H = 330;
const IZQ = 30;
const DER = 78;
const ARR = 40;
const ABA = 30;
const MAX_RAMAS = 15;

const f = (n) => Math.round(n * 10) / 10;

function suave(pts) {
  if (!pts.length) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

export function armarArbol(sim) {
  const todos = [...sim.nodos.values()];
  const raiz = todos.find((n) => n.padre == null);
  const candidatas = todos
    .filter((n) => n.padre != null && n.cuenta != null)
    .sort((a, b) => b.max - a.max)
    .slice(0, MAX_RAMAS);
  const visibles = new Set([raiz.k]);
  for (const n of candidatas) {
    let x = n;
    while (x && !visibles.has(x.k)) {
      visibles.add(x.k);
      x = sim.nodos.get(x.padre);
    }
  }
  const hijos = new Map();
  for (const k of visibles) {
    const n = sim.nodos.get(k);
    if (n.padre == null) continue;
    if (!hijos.has(n.padre)) hijos.set(n.padre, []);
    hijos.get(n.padre).push(n);
  }
  for (const l of hijos.values()) l.sort((a, b) => a.nace - b.nace);

  // Orden de filas: la raíz al medio, las hijas alternan arriba y abajo
  const filas = (n) => {
    const arriba = [];
    const abajo = [];
    (hijos.get(n.k) || []).forEach((h, i) => (i % 2 ? arriba : abajo).push(...filas(h)));
    return [...arriba, n, ...abajo];
  };
  const orden = filas(raiz);
  return { orden, hijos, raiz };
}

export default function Arbol({ sim, version, destacado, seleccion, onElegir, mostrarAmbiente = true, etiqueta = 'Árbol de variantes' }) {
  const datos = useMemo(() => {
    const { orden } = armarArbol(sim);
    const genMax = Math.max(sim.gen, 14);
    const x = (g) => IZQ + (g / genMax) * (W - IZQ - DER);
    const alto = H - ARR - ABA;
    const paso = Math.min(40, alto / Math.max(orden.length, 1));
    const y0 = ARR + alto / 2 - (paso * (orden.length - 1)) / 2;
    const fila = new Map(orden.map((n, i) => [n.k, y0 + i * paso]));
    const indice = new Map(orden.map((n, i) => [n.k, i]));
    // Las ramas ondulan apenas, como filamentos (fluir), sin cruzarse
    const amp = Math.min(3, paso * 0.18);
    const yEn = (k, g) => fila.get(k) + amp * Math.sin(g * 0.55 + indice.get(k) * 1.7);
    const media = Math.max(4, Math.min(paso * 0.85, 22)); // las ramas gruesas se superponen un poco (multiplicar)

    const ramas = orden.map((n) => {
      const y = fila.get(n.k);
      const sup = [];
      const inf = [];
      let ultimaViva = -1;
      const ejePts = [];
      // la rama se dibuja hasta una generación después de la última en que hubo virus
      let ultimoConVirus = 0;
      n.hist.forEach((c, i) => {
        if (c > 0) ultimoConVirus = i;
      });
      n.hist.slice(0, ultimoConVirus + 2).forEach((c, i) => {
        const g = n.nace + i;
        const w = c > 0 ? 1.2 + media * Math.sqrt(c / K) : 0.4;
        const yy = yEn(n.k, g);
        sup.push([x(g), yy - w]);
        inf.push([x(g), yy + w]);
        if (c > 0) {
          ultimaViva = g;
          ejePts.push([x(g), yy]);
        }
      });
      if (sup.length === 1) {
        sup.push([sup[0][0] + 4, sup[0][1]]);
        inf.push([inf[0][0] + 4, inf[0][1]]);
      }
      const cuerpo = `${suave(sup)}L${suave(inf.slice().reverse()).slice(1)}Z`;
      const xn = x(n.nace);
      const xp = x(Math.max(0, n.nace - 1));
      const padreY = n.padre != null ? yEn(n.padre, Math.max(0, n.nace - 1)) : null;
      const yNace = yEn(n.k, n.nace);
      const conector = padreY != null ? `M${f(xp)} ${f(padreY)}C${f(xp + (xn - xp) * 0.6)} ${f(padreY)} ${f(xn - (xn - xp) * 0.5)} ${f(yNace)} ${f(xn)} ${f(yNace)}` : '';
      const gFin = ultimaViva >= 0 ? ultimaViva : n.nace;
      const viva = (n.hist[n.hist.length - 1] || 0) > 0 && n.nace + n.hist.length - 1 === sim.gen;
      return {
        n,
        y,
        cuerpo,
        conector,
        origen: padreY != null ? [xp, padreY] : null,
        nacimiento: [xn, yNace],
        punta: [x(gFin), yEn(n.k, gFin)],
        eje: ejePts.length > 1 ? suave(ejePts) : '',
        fila: indice.get(n.k),
        viva,
        hoy: sim.pop.get(n.k) || 0,
        g: genomaDe(n.k),
      };
    });
    /*
      Ramitas grises: las copias que salieron rotas en cada generación.
      Nacen de la rama más grande de ese momento y no siguen (no pueden copiarse).
    */
    const ramitas = [];
    for (let g = 1; g <= sim.gen; g++) {
      const h = sim.historia[g];
      if (!h || !h.fallidas) continue;
      const proporcion = h.fallidas / (h.fallidas + (h.viables || 0));
      const n = Math.round(proporcion * 4);
      if (!n) continue;
      let mejor = null;
      let max = 0;
      for (const nd of orden) {
        const c = nd.hist[g - 1 - nd.nace] || 0;
        if (c > max) {
          max = c;
          mejor = nd;
        }
      }
      if (!mejor) continue;
      const x0 = x(g - 1);
      const y0r = yEn(mejor.k, g - 1);
      const dx = (x(g) - x0) * 0.75;
      for (let i = 0; i < n; i++) {
        const lado = (g + i) % 2 ? 1 : -1;
        const alto = (9 + i * 6) * lado;
        ramitas.push({ d: `M${f(x0)} ${f(y0r)}q${f(dx * 0.5)} ${f(alto * 0.1)} ${f(dx)} ${f(alto)}`, fin: [x0 + dx, y0r + alto] });
      }
    }
    const marcas = [];
    const salto = genMax > 40 ? 10 : 5;
    for (let g = 0; g <= genMax; g += salto) marcas.push(g);
    return { ramas, x, marcas, paso, ramitas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, version]);

  const { ramas, x, marcas } = datos;
  const amb = sim.ambiente ? ambientePorId(sim.ambiente) : null;
  // Íconos: si las filas están apretadas, se alternan en dos columnas para poder ser más grandes
  const apretado = datos.paso < 26;
  const tamIcono = apretado ? Math.max(24, Math.min(30, datos.paso * 1.6)) : Math.min(34, datos.paso * 0.95);
  const dest = ramas.find((r) => r.n.k === destacado);
  // dónde termina la última rama (para el cartel "se apagó")
  const ultima = ramas.reduce((m, r) => (!m || r.punta[0] > m.punta[0] ? r : m), null);

  const teclado = (k) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onElegir?.(k);
    }
  };

  return (
    <svg className="a4-arbol" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={etiqueta}>
      {/* retícula de laboratorio */}
      <g className="a4-arbol__reticula" aria-hidden="true">
        {marcas.map((g) => (
          <g key={g}>
            <line x1={x(g)} x2={x(g)} y1={ARR - 18} y2={H - ABA + 4} />
            <text x={x(g)} y={H - 12} textAnchor="middle">
              {g === 0 ? 'GEN 0' : g}
            </text>
          </g>
        ))}
      </g>

      {mostrarAmbiente && amb && sim.genAmbiente != null && (
        <g className="a4-arbol__ambiente" aria-label={`Cambio de ambiente en la generación ${sim.genAmbiente}: ${amb.nombre}`}>
          <rect x={x(sim.genAmbiente)} y={ARR - 24} width={Math.max(0, x(sim.gen) - x(sim.genAmbiente))} height={H - ARR - ABA + 28} fill={amb.color} opacity=".12" />
          <line x1={x(sim.genAmbiente)} x2={x(sim.genAmbiente)} y1={ARR - 24} y2={H - ABA + 4} stroke={amb.color} />
          <text x={x(sim.genAmbiente) + 8} y={ARR - 30}>
            {amb.nombre.toUpperCase()}
          </text>
        </g>
      )}

      {/* copias rotas: ramitas grises que no siguen */}
      <g className="a4-arbol__ramitas" aria-hidden="true">
        {datos.ramitas.map((r, i) => (
          <g key={i}>
            <path d={r.d} />
            <circle cx={r.fin[0]} cy={r.fin[1]} r="2.2" />
          </g>
        ))}
      </g>

      {/* conectores: filamentos desde el punto donde se copió con un error */}
      {ramas.map((r) =>
        r.conector ? (
          <path key={`c${r.n.k}`} className="a4-arbol__conector" d={r.conector} stroke={SOMBRA[r.g[0]]} />
        ) : null
      )}

      {ramas.map((r) => {
        const sel = seleccion === r.n.k;
        return (
          <g
            key={r.n.k}
            className={`a4-arbol__rama ${sel ? 'is-sel' : ''} ${r.viva ? '' : 'is-extinta'} ${dest ? (dest === r ? 'is-destacada' : 'is-atenuada') : ''}`}
            role="button"
            tabIndex={onElegir ? 0 : -1}
            aria-pressed={sel}
            aria-label={`${r.n.padre == null ? 'Virus original' : 'Variante'}: nació en la generación ${r.n.nace}, ${r.viva ? `hoy hay ${r.hoy} virus` : 'ya no queda ninguno'}`}
            onClick={() => onElegir?.(r.n.k)}
            onKeyDown={teclado(r.n.k)}
          >
            <path className="a4-arbol__cuerpo" d={r.cuerpo} fill={COLORES_CUERPO[r.g[0]]} />
            {r.eje && <path className="a4-arbol__eje" d={r.eje} stroke={SOMBRA[r.g[0]]} />}
            {r.origen && <circle className="a4-arbol__mutacion" cx={r.origen[0]} cy={r.origen[1]} r="3.2" fill={SOMBRA[r.g[0]]} />}
            {r.viva ? (
              <g className="a4-arbol__punta" transform={`translate(${f(r.punta[0] + tamIcono * (apretado && r.fila % 2 ? 1.55 : 0.6))} ${f(r.punta[1])})`}>
                <g className="a4-arbol__icono">
                  <VirusSVG genoma={r.g} tamano={tamIcono} x={-tamIcono / 2} y={-tamIcono / 2} style={{ overflow: 'visible' }} />
                </g>
              </g>
            ) : (
              <circle className="a4-arbol__fin" cx={r.punta[0] + 5} cy={r.punta[1]} r="3.5" />
            )}
            <rect className="a4-arbol__toque" x={r.nacimiento[0] - 6} y={r.y - 12} width={Math.max(30, r.punta[0] - r.nacimiento[0] + tamIcono + 12)} height="24" />
          </g>
        );
      })}

      {dest && (
        <g className="a4-arbol__destacado" aria-hidden="true">
          <circle className="a4-arbol__pulso" cx={dest.nacimiento[0]} cy={dest.nacimiento[1]} r="14" />
          <circle cx={dest.nacimiento[0]} cy={dest.nacimiento[1]} r="6" fill="#2F4A85" />
          <g transform={`translate(${f(Math.max(48, dest.nacimiento[0]))} ${f(dest.nacimiento[1] - 16)})`}>
            <rect x="-40" y="-20" width="80" height="20" rx="10" fill="#2F4A85" />
            <text y="-6" textAnchor="middle">
              NACE ACÁ
            </text>
          </g>
        </g>
      )}

      {sim.total === 0 && ultima && (
        <text className="a4-arbol__apagada" x={ultima.punta[0] + 44} y={ultima.punta[1] + 4}>
          SE APAGÓ
        </text>
      )}
    </svg>
  );
}

export const ARBOL_W = W;
export const ARBOL_H = H;
