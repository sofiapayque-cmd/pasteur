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
  · La gota es una sola pastilla. Sus dos bordes (left y right) se mueven con
    transiciones de CSS, con la curva de Bius que ya trae el navegador.
  · El borde de atrás sale apenas después que el de adelante: lo justo para
    que la gota se estire unos ESTIRA píxeles, salte poco o mucho.
  · Si se cambia MUEVE, ajustar el retraso de las letras blancas en
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
// La curva de los diseños de Bius: sale decidida y frena suave, sin pasarse
const CURVA = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
// Cuánto tarda cada borde en llegar (milisegundos)
const MUEVE = 500;
// Cuánto se alarga más o menos, además del ancho de la opción (px)
const ESTIRA = 48;
// Qué tan transparente se pone mientras viaja (1 = opaca)
const EN_VIAJE = 0.66;

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
    if (!nav || !g || !fondo) return undefined;

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
      actual.current = b;
      nav.classList.add('lista');
      const mover = animar && a && !quieto();

      if (mover && a.y === b.y) {
        // El de atrás sale un poquito después. Cuanto más lejos va, menos espera:
        // la curva arranca 3,5 veces más rápido que un movimiento parejo. Entre
        // opciones de distinto ancho se estira un poco más, para pasar a la más ancha.
        const estira = ESTIRA + Math.abs(b.w - a.w) / 2;
        const atras = Math.min(130, (MUEVE * estira) / (3.5 * Math.abs(b.x - a.x)));
        const [esperaIzq, esperaDer] = b.x > a.x ? [atras, 0] : [0, atras];
        g.style.transition = `left ${MUEVE}ms ${CURVA} ${esperaIzq}ms, right ${MUEVE}ms ${CURVA} ${esperaDer}ms`;
        // Mientras viaja se afina un poco y queda medio transparente
        const quieta = { opacity: 1, transform: 'none' };
        const viaje = { opacity: EN_VIAJE, transform: 'scaleY(0.9)' };
        g.animate([quieta, { ...viaje, offset: 0.22 }, { ...viaje, offset: 0.55 }, quieta], { duration: MUEVE + atras, easing: 'ease-in-out' });
      } else {
        g.style.transition = 'none';
        // Otra fila (menú partido en dos renglones): aparece en su lugar
        if (mover) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MUEVE / 2, easing: 'ease-out' });
      }
      g.style.top = `${b.y}px`;
      g.style.height = `${b.h}px`;
      g.style.left = `${b.x}px`;
      g.style.right = `${fondo.clientWidth - b.x - b.w}px`;
      g.style.opacity = '1';
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
      <span ref={gota} className="gota" />
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
