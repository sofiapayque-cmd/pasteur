import { useEffect, useRef } from 'react';
import { K, genomaDe } from './modelo';
import { spriteVirus } from './virus';

/*
  La placa: un pocillo con células donde los virus se copian.
  Canvas 2D con requestAnimationFrame. Se dibujan como máximo MAX_P virus
  (una muestra proporcional de la población real del modelo).

  - Cada generación, algunos virus "se copian": la copia sale del virus padre (dividirse).
  - Si la copia salió distinta (mutación), aparece con un destello.
  - Las copias que no funcionan aparecen grises, rotas, y se deshacen.
  - El bucle se detiene si la simulación está en pausa, si la pestaña no se ve,
    o con prefers-reduced-motion (entonces se dibuja solo cuando cambia algo).
*/
const MAX_P = 110;
const NACER = 650;
const MORIR = 520;
const VIDA_ROTA = 1000;

function repartir(pop, n) {
  const total = [...pop.values()].reduce((a, b) => a + b, 0);
  const out = new Map();
  if (!total || !n) return out;
  const restos = [];
  let usados = 0;
  for (const [k, c] of pop) {
    const exacto = (c / total) * n;
    const base = Math.floor(exacto);
    out.set(k, base);
    usados += base;
    restos.push([k, exacto - base]);
  }
  restos.sort((a, b) => b[1] - a[1]);
  for (let i = 0; usados < n && i < restos.length; i++, usados++) out.set(restos[i][0], out.get(restos[i][0]) + 1);
  return out;
}

const mezclar = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function Placa({ sim, version, enMarcha, intervalo = 900, reducido, tamano = 440, ambiente, etiqueta }) {
  const lienzo = useRef(null);
  const parts = useRef([]);
  const anticuerpos = useRef([]);
  const raf = useRef(0);
  const ultimo = useRef(0);
  const marcha = useRef(enMarcha);
  const dibujarRef = useRef(null);
  marcha.current = enMarcha && !reducido;

  const radio = tamano / 2;
  const rv = tamano / 42; // radio del cuerpo de cada virus (misma densidad en placas grandes y chicas)

  const dentro = () => {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (radio - rv * 2.2);
    return { x: radio + Math.cos(a) * d, y: radio + Math.sin(a) * d };
  };

  const nueva = (k, x, y, extra = {}) => ({
    k,
    g: genomaDe(k),
    x,
    y,
    vx: (Math.random() - 0.5) * 0.02,
    vy: (Math.random() - 0.5) * 0.02,
    ang: Math.random() * Math.PI * 2,
    va: (Math.random() - 0.5) * 0.0006,
    t0: 0,
    muere: null,
    ...extra,
  });

  // Al montar: la población actual, sin animación
  useEffect(() => {
    const n = sim.total > 0 ? Math.max(1, Math.round((MAX_P * sim.total) / K)) : 0;
    const lista = [];
    for (const [k, c] of repartir(sim.pop, n)) for (let i = 0; i < c; i++) {
      const p = dentro();
      lista.push(nueva(k, p.x, p.y));
    }
    parts.current = lista;
    anticuerpos.current = Array.from({ length: 9 }, () => ({ ...dentro(), ang: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.001 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, tamano]);

  // Cada generación nueva: reconciliar las partículas con la población del modelo
  const genPrev = useRef(version);
  useEffect(() => {
    if (genPrev.current === version) return;
    genPrev.current = version;
    const ahora = performance.now();
    const anima = !reducido;
    const ventana = anima ? Math.min(intervalo * 0.7, 900) : 0;
    // sin animaciones: lo que se fue desaparece de una, y las rotas quedan hasta la próxima generación
    if (!anima) parts.current = parts.current.filter((p) => !p.roto && !p.muere);
    const previas = parts.current.filter((p) => !p.muere && !p.roto);
    const n = sim.total > 0 ? Math.max(1, Math.round((MAX_P * sim.total) / K)) : 0;
    const objetivo = repartir(sim.pop, n);

    const porK = new Map();
    for (const p of previas) {
      if (!porK.has(p.k)) porK.set(p.k, []);
      porK.get(p.k).push(p);
    }
    const quedan = [];
    for (const [k, lista] of porK) {
      mezclar(lista);
      const quiero = objetivo.get(k) || 0;
      let mantener = Math.min(lista.length, quiero);
      if (anima) mantener -= Math.floor(mantener * 0.22); // recambio: unos se van y otros nacen
      lista.forEach((p, i) => {
        if (i < mantener) quedan.push(p);
        else p.muere = anima ? ahora + Math.random() * ventana : ahora - MORIR;
      });
    }
    const cuentaQuedan = new Map();
    for (const p of quedan) cuentaQuedan.set(p.k, (cuentaQuedan.get(p.k) || 0) + 1);

    const nuevas = [];
    // Destello solo para las variantes que aparecieron de verdad en esta generación (mutación nueva)
    const mutantes = new Set(sim.ultimos.map((u) => u.k));
    const conDestello = new Set();
    const padreDe = (k) => {
      const nodo = sim.nodos.get(k);
      const delPadre = nodo?.padre && porK.get(nodo.padre);
      if (mutantes.has(k) && delPadre?.length) return delPadre[Math.floor(Math.random() * delPadre.length)];
      const mismos = porK.get(k);
      if (mismos?.length) return mismos[Math.floor(Math.random() * mismos.length)];
      if (delPadre?.length) return delPadre[Math.floor(Math.random() * delPadre.length)];
      if (previas.length) return previas[Math.floor(Math.random() * previas.length)];
      return { x: radio, y: radio, k };
    };
    for (const [k, quiero] of objetivo) {
      const faltan = quiero - (cuentaQuedan.get(k) || 0);
      for (let i = 0; i < faltan; i++) {
        const padre = padreDe(k);
        const a = Math.random() * Math.PI * 2;
        const dist = rv * (2.6 + Math.random() * 3.5);
        // sin movimiento, las copias se reparten por toda la placa (no se pueden alejar solas)
        const lugar = anima ? null : dentro();
        let x = lugar ? lugar.x : padre.x + Math.cos(a) * dist;
        let y = lugar ? lugar.y : padre.y + Math.sin(a) * dist;
        const dx = x - radio;
        const dy = y - radio;
        const lim = radio - rv * 2.2;
        const d = Math.hypot(dx, dy);
        if (d > lim) {
          x = radio + (dx / d) * lim;
          y = radio + (dy / d) * lim;
        }
        const destello = anima && mutantes.has(k) && !conDestello.has(k);
        if (destello) conDestello.add(k);
        nuevas.push(nueva(k, x, y, { t0: anima ? ahora + Math.random() * ventana : ahora - NACER, ox: padre.x, oy: padre.y, flash: destello }));
      }
    }

    // Copias que no funcionan (grises): la proporción real de esta generación
    const intentos = sim.fallidas + sim.viables;
    if (sim.fallidas > 0 && previas.length) {
      const nRotas = Math.min(45, Math.round((sim.fallidas / intentos) * Math.max(previas.length, 6) * 0.8));
      for (let i = 0; i < nRotas; i++) {
        const padre = previas[Math.floor(Math.random() * previas.length)];
        const a = Math.random() * Math.PI * 2;
        const t0 = anima ? ahora + Math.random() * ventana : ahora - NACER;
        nuevas.push(
          nueva(padre.k, padre.x + Math.cos(a) * rv * 2.4, padre.y + Math.sin(a) * rv * 2.4, {
            roto: true,
            t0,
            ox: padre.x,
            oy: padre.y,
            muere: anima ? t0 + VIDA_ROTA : null,
          })
        );
      }
    }
    parts.current = [...parts.current, ...nuevas];
    if (dibujarRef.current) dibujarRef.current(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Dibujo y bucle
  useEffect(() => {
    const c = lienzo.current;
    if (!c) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = tamano * dpr;
    c.height = tamano * dpr;
    const ctx = c.getContext('2d');
    const px = Math.round(rv * 3.4 * dpr);
    const lado = rv * 3.4;

    const dibujar = (forzar) => {
      const ahora = performance.now();
      const dt = Math.min(64, ahora - (ultimo.current || ahora));
      ultimo.current = ahora;
      const mover = marcha.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);

      // Defensas (anticuerpos con forma de Y)
      if (ambiente === 'defensas') {
        ctx.strokeStyle = '#7272EE';
        ctx.lineWidth = 2.4 * dpr;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.55;
        for (const a of anticuerpos.current) {
          if (mover) a.ang += a.va * dt;
          const s = rv * 1.3 * dpr;
          ctx.setTransform(Math.cos(a.ang), Math.sin(a.ang), -Math.sin(a.ang), Math.cos(a.ang), a.x * dpr, a.y * dpr);
          ctx.beginPath();
          ctx.moveTo(0, s);
          ctx.lineTo(0, 0);
          ctx.lineTo(-s * 0.7, -s * 0.8);
          ctx.moveTo(0, 0);
          ctx.lineTo(s * 0.7, -s * 0.8);
          ctx.stroke();
        }
      }

      let pendientes = false;
      const vivas = [];
      const lim = radio - rv * 2.2;
      if (mover) {
        const ps = parts.current;
        const min = rv * 2.6;
        const min2 = min * min;
        for (let i = 0; i < ps.length; i++) {
          const a = ps[i];
          if (a.roto || ahora < a.t0) continue;
          for (let j = i + 1; j < ps.length; j++) {
            const b = ps[j];
            if (b.roto || ahora < b.t0) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 0.01 && d2 < min2) {
              const d = Math.sqrt(d2);
              const emp = ((min - d) / min) * 0.0009 * dt;
              const ux = (dx / d) * emp;
              const uy = (dy / d) * emp;
              a.vx -= ux;
              a.vy -= uy;
              b.vx += ux;
              b.vy += uy;
            }
          }
        }
      }
      for (const p of parts.current) {
        if (p.muere && ahora >= p.muere + MORIR) continue;
        vivas.push(p);
        if (ahora < p.t0) {
          pendientes = true;
          continue;
        }
        let esc = 1;
        let alfa = 1;
        let x = p.x;
        let y = p.y;
        const b = Math.min(1, (ahora - p.t0) / NACER);
        if (b < 1) {
          pendientes = true;
          // dividirse: la copia se separa del padre
          const e = 1 - Math.pow(1 - b, 3);
          if (p.ox != null) {
            x = p.ox + (p.x - p.ox) * e;
            y = p.oy + (p.y - p.oy) * e;
          }
          esc = 0.45 + 0.55 * e;
          alfa = Math.min(1, b * 2);
        }
        if (p.muere && ahora >= p.muere) {
          pendientes = true;
          const d = Math.min(1, (ahora - p.muere) / MORIR);
          alfa *= 1 - d;
          esc *= 1 - 0.45 * d;
        } else if (p.muere) pendientes = true;
        if (mover && b >= 1) {
          p.vx += (Math.random() - 0.5) * 0.0016 * dt;
          p.vy += (Math.random() - 0.5) * 0.0016 * dt;
          p.vx *= 0.985;
          p.vy *= 0.985;
          p.x += p.vx * dt * 0.6;
          p.y += p.vy * dt * 0.6;
          p.ang += p.va * dt;
          const dx = p.x - radio;
          const dy = p.y - radio;
          const d = Math.hypot(dx, dy);
          if (d > lim) {
            p.x = radio + (dx / d) * lim;
            p.y = radio + (dy / d) * lim;
            p.vx *= -0.5;
            p.vy *= -0.5;
          }
          x = p.x;
          y = p.y;
        }
        const spr = spriteVirus(p.g, p.roto, px);
        const s = esc * dpr;
        const co = Math.cos(p.ang) * s;
        const si = Math.sin(p.ang) * s;
        ctx.globalAlpha = alfa * (p.roto ? 0.85 : 1);
        ctx.setTransform(co, si, -si, co, x * dpr, y * dpr);
        ctx.drawImage(spr, -lado / 2, -lado / 2, lado, lado);

        // destello de mutación
        if (p.flash && b < 1) {
          ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
          ctx.globalAlpha = (1 - b) * 0.9;
          ctx.strokeStyle = '#7272EE';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, rv * (1.3 + b * 1.7), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = (1 - b) * 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, rv * 0.9 * (1 - b), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.flash && b >= 1) p.flash = false;
      }
      parts.current = vivas;
      ctx.globalAlpha = 1;
      return pendientes || mover;
    };
    dibujarRef.current = (despertar) => {
      if (despertar && !raf.current && !document.hidden) raf.current = requestAnimationFrame(bucle);
    };

    function bucle() {
      raf.current = 0;
      const seguir = dibujar();
      if (seguir && !document.hidden) raf.current = requestAnimationFrame(bucle);
    }
    ultimo.current = 0;
    bucle();

    const alCambiarVisibilidad = () => {
      if (!document.hidden && !raf.current) {
        ultimo.current = 0;
        raf.current = requestAnimationFrame(bucle);
      }
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      dibujarRef.current = null;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamano, ambiente, sim]);

  // Si se vuelve a poner en marcha, despertar el bucle
  useEffect(() => {
    if (enMarcha && dibujarRef.current) dibujarRef.current(true);
  }, [enMarcha]);

  return (
    <div className={`a4-placa ${ambiente ? `a4-placa--${ambiente}` : ''}`} style={{ width: tamano, height: tamano }}>
      <svg className="a4-placa__celulas" viewBox="0 0 100 100" aria-hidden="true">
        {CELULAS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </svg>
      <canvas ref={lienzo} className="a4-placa__lienzo" style={{ width: tamano, height: tamano }} role="img" aria-label={etiqueta} />
    </div>
  );
}

// Mosaico fijo de células del fondo (la "fábrica" donde se copian los virus)
const CELULAS = (() => {
  const out = [];
  let s = 17;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let y = 6; y < 100; y += 11) {
    for (let x = 6 + ((y / 11) % 2) * 5.5; x < 100; x += 11) {
      const dx = x - 50;
      const dy = y - 50;
      if (dx * dx + dy * dy > 46 * 46) continue;
      out.push([x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, 4.6 + r() * 1.4]);
    }
  }
  return out;
})();
