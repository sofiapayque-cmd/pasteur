'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/*
  MENÚ CON GOTA (panel del equipo, 14/11, pedido de Sofia).
  Un menú de pastillas dentro de un "pozo" hundido. La opción elegida tiene
  debajo una gota azul con relieve. Al pasar de una opción a otra, la gota se
  mueve como un líquido, con el estilo de movimiento de los diseños de Bius:
  el borde que va adelante sale primero y el de atrás lo sigue, así la gota
  se alarga un poco, se afina, y se vuelve a juntar al llegar. Mientras viaja
  queda medio transparente.
  · Nunca se estira más que ESTIRA_MAX píxeles de más (aunque salte de una
    punta a la otra del menú) ni se sale del menú: los dos bordes van siempre
    entre la opción vieja y la nueva, con una curva que no se pasa de largo.
  · Si se cambia DURACION, ajustar el retraso de las letras blancas en
    equipo.css ([data-gota-aca]).

  · Lo elegido lo dicen los propios hijos, con aria-current (los links del
    menú, o los botones de unas pestañas). Funciona con links del servidor.
  · Responde al clic enseguida (no espera a que cargue la otra página) y
    también si aria-current cambia por otro motivo.
  · Sin JavaScript, o antes de cargar, la opción elegida se ve igual de
    elegida por CSS (clase con-gota sin "lista").
  · Con "reducir movimiento", la gota salta sin animación.
*/
type Props = { children: ReactNode; className?: string; etiqueta: string; como?: 'nav' | 'div' };
type Caja = { x: number; y: number; w: number; h: number };

const ELEGIDO = '[aria-current]:not([aria-current="false"])';
// Cuánto tarda la gota en pasar de una opción a otra (milisegundos)
const DURACION = 640;
// Cuánto se puede alargar como máximo, además del ancho de la opción (px)
const ESTIRA_MAX = 48;
// Qué tan transparente se pone mientras viaja (1 = opaca)
const EN_VIAJE = 0.66;
// Curva de los diseños de Bius: sale decidida y frena suave, sin pasarse
const BIUS = curva(0.2, 0.7, 0.2, 1);

/* Una curva cubic-bezier(x1, y1, x2, y2) como función: tiempo (0–1) → avance (0–1). */
function curva(x1: number, y1: number, x2: number, y2: number) {
  const bez = (t: number, p1: number, p2: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let bajo = 0;
    let alto = 1;
    for (let i = 0; i < 24; i++) {
      const medio = (bajo + alto) / 2;
      if (bez(medio, x1, x2) < x) bajo = medio;
      else alto = medio;
    }
    return bez((bajo + alto) / 2, y1, y2);
  };
}
const medir = (el: HTMLElement): Caja => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
const iguales = (a: Caja | null, b: Caja) => Boolean(a) && a!.x === b.x && a!.y === b.y && a!.w === b.w && a!.h === b.h;
const quieto = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export default function ConGota({ children, className = '', etiqueta, como = 'nav' }: Props) {
  const caja = useRef<HTMLElement | null>(null);
  const gota = useRef<HTMLSpanElement>(null);
  const actual = useRef<Caja | null>(null);

  useEffect(() => {
    const nav = caja.current;
    const g = gota.current;
    const fondo = g?.parentElement;
    const [pIzq, pDer, pMedio] = Array.from(g?.children ?? []) as HTMLElement[];
    if (!nav || !g || !fondo || !pIzq || !pMedio || !pDer) return undefined;
    const piezas = [pIzq, pMedio, pDer];

    // Dónde va cada pieza para una gota entre izq y der (afina: 1 = alto normal)
    const formas = (izq: number, der: number, y: number, h: number, afina = 1) => {
      const medio = Math.max(0, der - izq - h) / 100;
      const sy = afina.toFixed(3);
      return [
        `translate(${izq}px, ${y}px) scaleY(${sy})`,
        `translate(${izq + h / 2}px, ${y}px) scale(${medio.toFixed(4)}, ${sy})`,
        `translate(${der - h}px, ${y}px) scaleY(${sy})`,
      ];
    };

    const poner = (b: Caja) => {
      for (const p of [pIzq, pDer]) p.style.width = p.style.height = `${b.h}px`;
      pMedio.style.height = `${b.h}px`;
      formas(b.x, b.x + b.w, b.y, b.h).forEach((t, i) => (piezas[i].style.transform = t));
    };

    // En el celular el menú se desliza de costado: que lo elegido quede a la vista
    const centrar = (destino: HTMLElement, suave: boolean) => {
      if (nav.scrollWidth <= nav.clientWidth + 1) return;
      const left = destino.offsetLeft - (nav.clientWidth - destino.offsetWidth) / 2;
      nav.scrollTo({ left, behavior: suave && !quieto() ? 'smooth' : 'auto' });
    };

    // Qué opción tiene la gota debajo (sus letras se ponen blancas cuando la
    // gota llega). Se marca al hacer clic, sin esperar a que cargue la página.
    const marcar = (destino: HTMLElement | null) => {
      nav.querySelectorAll<HTMLElement>('[data-gota-aca]').forEach((el) => {
        if (el !== destino) el.removeAttribute('data-gota-aca');
      });
      destino?.setAttribute('data-gota-aca', '');
    };

    const ir = (destino: HTMLElement | null, animar: boolean) => {
      marcar(destino);
      if (destino) centrar(destino, animar);
      if (!destino) {
        g.style.opacity = '0';
        actual.current = null;
        return;
      }
      const b = medir(destino);
      const a = actual.current;
      if (iguales(a, b)) return;
      piezas.forEach((p) => p.getAnimations().forEach((x) => x.cancel()));
      fondo.getAnimations().forEach((x) => x.cancel());
      poner(b);
      g.style.opacity = '1';
      actual.current = b;
      nav.classList.add('lista');
      if (!animar || !a || quieto()) return;

      if (a.y !== b.y) {
        // Otra fila (menú partido en dos renglones): aparece en su lugar
        fondo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DURACION * 0.5, easing: 'ease-out' });
        return;
      }

      // Mientras viaja queda medio transparente
      fondo.animate(
        [
          { opacity: 1 },
          { opacity: EN_VIAJE, offset: 0.22 },
          { opacity: EN_VIAJE, offset: 0.55 },
          { opacity: 1 },
        ],
        { duration: DURACION, easing: 'ease-in-out' },
      );

      // Los dos bordes: el de adelante sale primero, el de atrás lo sigue
      const derecha = b.x > a.x;
      const adelante = (t: number) => BIUS(Math.min(1, t / 0.78));
      const atras = (t: number) => BIUS(Math.max(0, (t - 0.2) / 0.8));
      const maximo = Math.max(a.w, b.w) + ESTIRA_MAX;
      const pasos = 30;
      const cuadros: Keyframe[][] = [[], [], []];
      for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const pIzq = derecha ? atras(t) : adelante(t);
        const pDer = derecha ? adelante(t) : atras(t);
        let izq = a.x + (b.x - a.x) * pIzq;
        let der = a.x + a.w + (b.x + b.w - (a.x + a.w)) * pDer;
        // Que no se alargue de más: el borde de atrás se acerca
        if (der - izq > maximo) {
          if (derecha) izq = der - maximo;
          else der = izq + maximo;
        }
        const ancho = der - izq;
        const normal = a.w + (b.w - a.w) * BIUS(t);
        // Cuanto más se alarga, más se afina (sin pasar nunca su alto)
        const afina = 1 - 0.1 * Math.min(1, Math.max(0, ancho - normal) / ESTIRA_MAX);
        formas(izq, der, b.y, b.h, afina).forEach((t, k) => cuadros[k].push({ transform: t }));
      }
      piezas.forEach((p, k) => p.animate(cuadros[k], { duration: DURACION }));
    };

    // Al cargar: en su lugar, sin animación
    ir(nav.querySelector<HTMLElement>(ELEGIDO), false);

    // Al elegir otra opción: enseguida, sin esperar a la página nueva
    const alClic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const opcion = (e.target as HTMLElement).closest<HTMLElement>('a, button');
      if (opcion && nav.contains(opcion) && opcion.parentElement === nav) ir(opcion, true);
    };
    nav.addEventListener('click', alClic);

    // Si cambia lo elegido por otro motivo (por ejemplo, volver atrás)
    const cambios = new MutationObserver(() => ir(nav.querySelector<HTMLElement>(ELEGIDO), true));
    cambios.observe(nav, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });

    // Si cambia el tamaño (letras que cargan, ventana), se acomoda sin animación
    const tamano = new ResizeObserver(() => {
      actual.current = null;
      ir(nav.querySelector<HTMLElement>(ELEGIDO), false);
    });
    tamano.observe(nav);

    return () => {
      nav.removeEventListener('click', alClic);
      cambios.disconnect();
      tamano.disconnect();
    };
  }, []);

  const capa = (
    <span className="gota-capa" aria-hidden="true">
      <span ref={gota} className="gota">
        <span className="gota__punta" />
        <span className="gota__punta" />
        {/* el medio va arriba de las puntas: tapa sus mitades de adentro */}
        <span className="gota__medio" />
      </span>
    </span>
  );

  const clases = `con-gota ${className}`.trim();
  return como === 'div' ? (
    <div ref={(el) => void (caja.current = el)} className={clases} role="group" aria-label={etiqueta}>
      {capa}
      {children}
    </div>
  ) : (
    <nav ref={(el) => void (caja.current = el)} className={clases} aria-label={etiqueta}>
      {capa}
      {children}
    </nav>
  );
}
