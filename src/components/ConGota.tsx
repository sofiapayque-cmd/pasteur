'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

/*
  MENÚ CON GOTA (panel del equipo, 14/11, pedido de Sofia).
  Un menú de pastillas dentro de un "pozo" hundido. La opción elegida tiene
  debajo una gota azul con relieve. Al pasar de una opción a otra, la gota se
  estira hacia la nueva como un líquido, se vuelve medio transparente mientras
  viaja, se pasa un poquito de largo y vuelve con un vaivén de gelatina; una
  gotita que se desprende la sigue y se vuelve a unir (filtro "goo": las
  formas cercanas se funden como líquido).
  Ajustada el 14/11 a pedido de Sofia ("más dinámica, medio transparente
  cuando pasa"): DURACION, EN_VIAJE y las curvas de abajo. Si se cambia
  DURACION, ajustar el retraso de las letras blancas en equipo.css
  ([data-gota-aca]).

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
const DURACION = 850;
// Arranca rápido y estira con ganas
const ESTIRA = 'cubic-bezier(.55,0,.25,1)';
// Se suelta y sale disparada hacia la nueva
const SUELTA = 'cubic-bezier(.3,0,.15,1)';
// Vaivén de gelatina al llegar
const VAIVEN = 'cubic-bezier(.45,0,.55,1)';
// Qué tan transparente se pone mientras viaja (1 = opaca)
const EN_VIAJE = 0.55;
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
  const resto = useRef<HTMLSpanElement>(null);
  const actual = useRef<Caja | null>(null);
  const filtro = `gota-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    const nav = caja.current;
    const g = gota.current;
    const r = resto.current;
    const fondo = g?.parentElement;
    if (!nav || !g || !r || !fondo) return undefined;

    const poner = (b: Caja) => {
      g.style.width = `${b.w}px`;
      g.style.height = `${b.h}px`;
      g.style.transform = `translate(${b.x}px, ${b.y}px)`;
    };

    // En el celular el menú se desliza de costado: que lo elegido quede a la vista
    const centrar = (destino: HTMLElement, suave: boolean) => {
      if (nav.scrollWidth <= nav.clientWidth + 1) return;
      const left = destino.offsetLeft - (nav.clientWidth - destino.offsetWidth) / 2;
      nav.scrollTo({ left, behavior: suave && !quieto() ? 'smooth' : 'auto' });
    };

    // Qué opción tiene la gota debajo (sus letras se ponen blancas cuando la gota llega).
    // Se marca al hacer clic, sin esperar a que cargue la página nueva.
    // La que la gota deja sigue con letras blancas un ratito, mientras la gota se va.
    const relojes = new Set<number>();
    const marcar = (destino: HTMLElement | null, animar: boolean) => {
      nav.querySelectorAll<HTMLElement>('[data-gota-aca]').forEach((el) => {
        if (el === destino) return;
        el.removeAttribute('data-gota-aca');
        if (!animar) return;
        el.setAttribute('data-gota-sale', '');
        const reloj = window.setTimeout(() => {
          el.removeAttribute('data-gota-sale');
          relojes.delete(reloj);
        }, DURACION * 0.18);
        relojes.add(reloj);
      });
      destino?.removeAttribute('data-gota-sale');
      destino?.setAttribute('data-gota-aca', '');
    };

    const ir = (destino: HTMLElement | null, animar: boolean) => {
      marcar(destino, animar && !quieto());
      if (destino) centrar(destino, animar);
      if (!destino) {
        g.style.opacity = '0';
        actual.current = null;
        return;
      }
      const b = medir(destino);
      const a = actual.current;
      if (iguales(a, b)) return;
      g.getAnimations().forEach((x) => x.cancel());
      r.getAnimations().forEach((x) => x.cancel());
      fondo.getAnimations().forEach((x) => x.cancel());
      poner(b);
      g.style.opacity = '1';
      actual.current = b;
      nav.classList.add('lista');
      if (!animar || !a || quieto()) return;

      // Mientras viaja, la gota se vuelve medio transparente (como vidrio
      // líquido) y vuelve a ser opaca al llegar. Se hace sobre la capa, después
      // del filtro "goo": la opacidad de la gota misma la borraría el filtro.
      const vidrio = (duracion: number) =>
        fondo.animate(
          [
            { opacity: 1 },
            { opacity: EN_VIAJE, offset: 0.2 },
            { opacity: EN_VIAJE, offset: 0.52 },
            { opacity: 1 },
          ],
          { duration: duracion, easing: VAIVEN },
        );

      if (a.y !== b.y) {
        // Otra fila (menú partido en dos renglones): la gota cae y rebota en su lugar
        vidrio(DURACION * 0.7);
        g.animate(
          [
            { transform: `translate(${b.x}px, ${b.y}px) scale(.6, .4)`, opacity: 0, easing: SUELTA },
            { transform: `translate(${b.x}px, ${b.y}px) scale(1.08, .88)`, opacity: 1, offset: 0.5, easing: VAIVEN },
            { transform: `translate(${b.x}px, ${b.y}px) scale(.96, 1.05)`, opacity: 1, offset: 0.75, easing: VAIVEN },
            { transform: `translate(${b.x}px, ${b.y}px)`, opacity: 1 },
          ],
          { duration: DURACION * 0.7 },
        );
        return;
      }
      const izq = Math.min(a.x, b.x);
      const der = Math.max(a.x + a.w, b.x + b.w);
      // Hacia dónde va (+1 derecha, -1 izquierda) y cuánto se pasa de largo
      const lado = b.x > a.x ? 1 : -1;
      const pasa = lado * Math.min(12, Math.max(5, Math.abs(b.x - a.x) * 0.05));
      vidrio(DURACION);
      // 1. se estira hacia la nueva opción y se afina;
      // 2. suelta la vieja y sale disparada, se pasa un poquito de largo;
      // 3. vuelve con un vaivén de gelatina (se aplasta y se estira) y queda quieta
      g.animate(
        [
          { transform: `translate(${a.x}px, ${a.y}px)`, width: `${a.w}px`, easing: ESTIRA },
          { transform: `translate(${izq}px, ${a.y}px) scaleY(.82)`, width: `${der - izq}px`, offset: 0.4, easing: SUELTA },
          { transform: `translate(${b.x + pasa}px, ${b.y}px) scale(1.05, .86)`, width: `${b.w}px`, offset: 0.68, easing: VAIVEN },
          { transform: `translate(${b.x - pasa * 0.35}px, ${b.y}px) scale(.97, 1.06)`, width: `${b.w}px`, offset: 0.84, easing: VAIVEN },
          { transform: `translate(${b.x}px, ${b.y}px)`, width: `${b.w}px` },
        ],
        { duration: DURACION },
      );
      // La gotita que se desprende de donde estaba y la alcanza
      const d = Math.round(b.h * 0.62);
      const desde = { x: a.x + a.w / 2 - d / 2, y: a.y + (a.h - d) / 2 };
      const hasta = { x: b.x + b.w / 2 - d / 2, y: b.y + (b.h - d) / 2 };
      r.style.width = r.style.height = `${d}px`;
      r.animate(
        [
          { transform: `translate(${desde.x}px, ${desde.y}px) scale(.95)`, opacity: 1 },
          { transform: `translate(${desde.x + (hasta.x - desde.x) * 0.45}px, ${desde.y - 3}px) scale(.75)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${hasta.x}px, ${hasta.y}px) scale(.3)`, opacity: 0 },
        ],
        { duration: DURACION * 0.85, delay: DURACION * 0.18, easing: ESTIRA, fill: 'backwards' },
      );
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
      relojes.forEach((reloj) => window.clearTimeout(reloj));
    };
  }, []);

  const capa = (
    <span className="gota-capa" aria-hidden="true" style={{ filter: `url(#${filtro}) drop-shadow(0 6px 9px rgba(47, 74, 133, 0.32)) drop-shadow(0 1px 1px rgba(47, 74, 133, 0.28))` }}>
      <svg className="gota-filtro" width="0" height="0" focusable="false">
        <filter id={filtro}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="borroso" />
          <feColorMatrix in="borroso" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="liquido" />
          <feComposite in="SourceGraphic" in2="liquido" operator="atop" />
        </filter>
      </svg>
      <span ref={gota} className="gota" />
      <span ref={resto} className="gota gota--resto" />
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
