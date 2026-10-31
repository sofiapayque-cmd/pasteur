import { useId } from 'react';
import { COLORES_CUERPO, CANTIDAD_ESPICULAS } from './modelo';

/*
  El virus de A4: organismo espiculado del kit de la marca.
  - Membrana (cápsula): círculo apenas irregular; su borde cambia según la letra 4.
  - Citoplasma: degradado radial del color del cuerpo (letra 1).
  - "Núcleo": un ovillo de ARN (su receta) adentro.
  - Apéndices: espículas que cruzan el borde, con punta según la letra 2 y cantidad según la letra 3.

  La geometría se arma como caminos SVG ("d") para usarla igual en SVG y en Canvas (Path2D).
*/

export const SOMBRA = ['#D06A8C', '#C98A1B', '#3F9C82', '#5677C9'];
const PUNTA = '#EF6F5E';
const GRIS = '#BEC1CB';
const GRIS_OSCURO = '#8D909C';

const f = (n) => Math.round(n * 100) / 100;

function circulo(cx, cy, r) {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

// Contorno cerrado y suave a partir de radios por ángulo
function contorno(r, puntos, radio) {
  const pts = [];
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const rr = radio(a, i);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  let d = '';
  for (let i = 0; i < puntos; i++) {
    const p0 = pts[(i - 1 + puntos) % puntos];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % puntos];
    const p3 = pts[(i + 2) % puntos];
    if (i === 0) d += `M${f(p1[0])} ${f(p1[1])}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/*
  partesVirus(genoma, r, roto) → lista de capas { d, fill, stroke, w, op, grad }
  r = radio del cuerpo. Todo centrado en 0,0. El dibujo completo mide ~3,2·r de ancho.
*/
export function partesVirus(g, r = 20, roto = false) {
  const color = roto ? GRIS : COLORES_CUERPO[g[0]];
  const sombra = roto ? GRIS_OSCURO : SOMBRA[g[0]];
  const tipoPunta = g[1];
  const n = CANTIDAD_ESPICULAS[g[2]];
  const capsula = g[3];
  const capas = [];

  // Apéndices: espículas (trazo + punta) que cruzan el borde
  let espiculas = '';
  let puntas = '';
  let anillos = '';
  const desfase = 0.3;
  for (let i = 0; i < n; i++) {
    if (roto && i % 3 === 1) continue; // a la copia rota le faltan espículas
    const doblada = roto && i % 3 === 2 ? 0.5 : 0;
    const a = desfase + (i / n) * Math.PI * 2;
    const a2 = a + doblada;
    const x0 = Math.cos(a) * r * 0.9;
    const y0 = Math.sin(a) * r * 0.9;
    const x1 = Math.cos(a2) * r * 1.42;
    const y1 = Math.sin(a2) * r * 1.42;
    espiculas += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
    const t = r * 0.17;
    const ct = Math.cos(a2);
    const st = Math.sin(a2);
    if (tipoPunta === 0) puntas += circulo(x1 + ct * t * 0.6, y1 + st * t * 0.6, t);
    else if (tipoPunta === 1) {
      for (const s of [-0.5, 0.5]) {
        const b = a2 + s;
        const x2 = x1 + Math.cos(b) * r * 0.26;
        const y2 = y1 + Math.sin(b) * r * 0.26;
        espiculas += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
        puntas += circulo(x2, y2, r * 0.1);
      }
    } else if (tipoPunta === 2) {
      const px = x1 + ct * t * 1.5;
      const py = y1 + st * t * 1.5;
      const bx = -st * t * 0.95;
      const by = ct * t * 0.95;
      puntas += `M${f(px)} ${f(py)}L${f(x1 + bx - ct * t * 0.2)} ${f(y1 + by - st * t * 0.2)}L${f(x1 - bx - ct * t * 0.2)} ${f(y1 - by - st * t * 0.2)}Z`;
    } else {
      anillos += circulo(x1 + ct * t * 0.9, y1 + st * t * 0.9, t * 0.95);
    }
  }
  capas.push({ d: espiculas, stroke: sombra, w: r * 0.09, op: 0.85 });

  // Membrana / cápsula
  const lobulos = capsula === 2 ? 11 : 0;
  const cuerpo = contorno(r, capsula === 2 ? 44 : 10, (a, i) => {
    let rr = r * (1 + 0.04 * Math.sin(a * 3 + 1.3));
    if (lobulos) rr += r * 0.07 * Math.sin(a * lobulos);
    if (roto && i % 4 === 1) rr *= 0.9;
    return rr;
  });
  capas.push({ d: cuerpo, grad: ['#FFFFFF', color], op: roto ? 0.75 : 0.95 });
  if (capsula === 1) {
    capas.push({ d: cuerpo, stroke: sombra, w: r * 0.16, op: 0.9 });
    capas.push({ d: circulo(0, 0, r * 0.74), stroke: sombra, w: r * 0.06, op: 0.45 });
  } else if (capsula === 3) {
    capas.push({ d: cuerpo, stroke: sombra, w: r * 0.1, op: 0.9, dash: [r * 0.12, r * 0.16] });
  } else {
    capas.push({ d: cuerpo, stroke: '#FFFFFF', w: r * 0.07, op: 0.7 });
  }

  // Puntas (apéndices) encima del borde
  if (puntas) capas.push({ d: puntas, fill: roto ? GRIS_OSCURO : PUNTA, op: 0.95 });
  if (anillos) capas.push({ d: anillos, stroke: roto ? GRIS_OSCURO : PUNTA, w: r * 0.08, op: 0.95 });

  // Ovillo de ARN: la receta adentro
  const ovillo = roto
    ? `M${f(-r * 0.3)} ${f(-r * 0.05)}q${f(r * 0.12)} ${f(-r * 0.2)} ${f(r * 0.22)} 0M${f(r * 0.05)} ${f(r * 0.1)}q${f(r * 0.12)} ${f(r * 0.18)} ${f(r * 0.22)} 0`
    : `M${f(-r * 0.42)} ${f(r * 0.12)}q${f(r * 0.105)} ${f(-r * 0.3)} ${f(r * 0.21)} ${f(-r * 0.04)}t${f(r * 0.21)} ${f(-r * 0.04)}t${f(r * 0.21)} ${f(-r * 0.04)}t${f(r * 0.21)} ${f(-r * 0.04)}`;
  capas.push({ d: ovillo, stroke: '#2F4A85', w: r * 0.09, op: roto ? 0.35 : 0.55 });

  // Grieta de la copia que no funciona
  if (roto) capas.push({ d: `M${f(-r * 0.75)} ${f(-r * 0.55)}l${f(r * 0.35)} ${f(r * 0.3)}l${f(-r * 0.05)} ${f(r * 0.25)}l${f(r * 0.4)} ${f(r * 0.2)}`, stroke: GRIS_OSCURO, w: r * 0.08, op: 0.9 });
  return capas;
}

/* Versión SVG (para el árbol, las tarjetas y las copias). */
export function VirusSVG({ genoma, tamano = 64, roto = false, className = '', titulo, style, x, y }) {
  const uid = useId().replace(/:/g, '');
  const r = 20;
  const capas = partesVirus(genoma, r, roto);
  return (
    <svg
      className={`a4-virus ${className}`}
      viewBox="-34 -34 68 68"
      x={x}
      y={y}
      width={tamano}
      height={tamano}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      style={style}
    >
      <defs>
        <radialGradient id={`v${uid}`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".6" stopColor={capas.find((c) => c.grad).grad[1]} />
        </radialGradient>
      </defs>
      {capas.map((c, i) => (
        <path
          key={i}
          d={c.d}
          fill={c.grad ? `url(#v${uid})` : c.fill || 'none'}
          stroke={c.stroke || 'none'}
          strokeWidth={c.w}
          strokeDasharray={c.dash ? c.dash.join(' ') : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={c.op}
        />
      ))}
    </svg>
  );
}

/* Versión Canvas: se pre-dibuja cada variante una vez (sprite) y después se copia. */
const sprites = new Map();
export function spriteVirus(genoma, roto, px) {
  const k = `${genoma.slice(0, 4).join('')}${roto ? 'r' : ''}${px}`;
  let c = sprites.get(k);
  if (c) return c;
  if (sprites.size > 400) sprites.clear();
  c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  const r = px / 3.4;
  ctx.translate(px / 2, px / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const capa of partesVirus(genoma, r, roto)) {
    const p = new Path2D(capa.d);
    ctx.globalAlpha = capa.op ?? 1;
    if (capa.grad) {
      const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.05, 0, 0, r * 1.1);
      gr.addColorStop(0, capa.grad[0]);
      gr.addColorStop(0.6, capa.grad[1]);
      gr.addColorStop(1, capa.grad[1]);
      ctx.fillStyle = gr;
      ctx.fill(p);
    } else if (capa.fill) {
      ctx.fillStyle = capa.fill;
      ctx.fill(p);
    }
    if (capa.stroke) {
      ctx.strokeStyle = capa.stroke;
      ctx.lineWidth = capa.w;
      ctx.setLineDash(capa.dash || []);
      ctx.stroke(p);
    }
  }
  sprites.set(k, c);
  return c;
}
