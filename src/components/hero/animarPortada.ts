/*
  PORTADA ILUSTRADA · movimiento

  Cómo funciona:
  - Todo se maneja con números: el estado de cada célula, el de la lupa y el
    de cada científico. GSAP los anima (lupa, científicos, giro y respiro de
    las células) y, una vez por cuadro (gsap.ticker), las células avanzan por
    la pantalla (deriva.ts). Nunca se toca React.
  - Después, en el mismo cuadro, `dibujar` lee esos números y mueve las
    imágenes. Así la célula de afuera y su copia ampliada salen del mismo
    estado y no pueden desfasarse.
  - Con "reducir movimiento" (prefers-reduced-motion) no se mueve nada: queda
    la composición quieta, con la lupa ampliando igual.
*/
import { gsap } from 'gsap';
import { avanzar, nuevoRumbo, type Mundo, type Rumbo } from './deriva';
import { CELULAS, CIENTIFICOS, ESCENA, LENTE, RADIO_VIDRIO } from './escena';
import {
  LUPA_ACTIVA,
  LUPA_REPOSO,
  centroOptico,
  nuevoEstadoCelula,
  salirDeZonas,
  transformAdentro,
  transformAfuera,
  type EstadoCelula,
  type EstadoLupa,
  type Rect,
} from './movimiento';

const azar = gsap.utils.random as (min: number, max: number) => number;

type EstadoCientifico = { balanceo: number; respiro: number; reaccion: number };

/* Cuánto se inclina cada uno hacia la lupa cuando se activa (grados). El más cercano, más. */
const REACCION: Record<string, number> = { pelirroja: 1.1, rulos: 1.5, rodete: 2.1 };

export function animarPortada(raiz: HTMLElement): () => void {
  const escena = raiz.querySelector<HTMLElement>('[data-escena]');
  const lupaEl = raiz.querySelector<HTMLElement>('[data-lupa]');
  const ampliadoEl = raiz.querySelector<HTMLElement>('[data-ampliado]');
  const enlace = raiz.querySelector<HTMLElement>('[data-lente-enlace]');
  const entrar = raiz.querySelector<HTMLElement>('[data-entrar]');
  if (!escena || !lupaEl || !ampliadoEl || !enlace) return () => {};

  const afuera = CELULAS.map((c) => raiz.querySelector<HTMLElement>(`[data-capa="afuera"][data-celula="${c.id}"]`));
  const adentro = CELULAS.map((c) => raiz.querySelector<HTMLElement>(`[data-capa="adentro"][data-celula="${c.id}"]`));
  const gente = CIENTIFICOS.map((c) => raiz.querySelector<HTMLElement>(`[data-cientifico="${c.id}"]`));

  /* ---------- Estado (lo único que mueve GSAP) ---------- */
  const lupa: EstadoLupa = { ...LUPA_REPOSO, vaiven: 0 };
  const estados: EstadoCelula[] = CELULAS.map(nuevoEstadoCelula);
  const personas: EstadoCientifico[] = CIENTIFICOS.map(() => ({ balanceo: 0, respiro: 1, reaccion: 0 }));
  // la copia ampliada arranca como la dejó React (visible solo si toca el vidrio)
  const visInicial = adentro.map((el) => el?.style.visibility ?? '');
  const visibles = visInicial.map((v) => v !== 'hidden');
  // para viajar: textos que no se tapan y dónde está la lupa (se actualizan solos)
  const mundo: Mundo = { zonas: [], lente: { x: LENTE.x, y: LENTE.y }, azar: Math.random };
  const rumbos: Rumbo[] = CELULAS.map((c) => nuevoRumbo(c, mundo));
  const fijas = CELULAS.map(() => false); // solo para las pruebas
  let tiempo = 0;
  let vivo = true;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Dibujar: una vez por cuadro ---------- */
  function dibujar() {
    const giro = lupa.giro + lupa.vaiven;
    const ls = centroOptico(giro, lupa.escala);
    const lente = { ...ls, escala: lupa.escala, aumento: lupa.aumento };
    mundo.lente = ls;
    mundo.vista = (RADIO_VIDRIO * lupa.escala) / lupa.aumento;

    // la lupa entera gira y crece desde la punta del mango (transform-origin en CSS)
    lupaEl!.style.transform = `rotate(${giro.toFixed(3)}deg) scale(${lupa.escala.toFixed(4)})`;
    // lo que se ve por el vidrio no gira con la lupa (una lupa real no da vuelta la imagen)
    ampliadoEl!.style.transform = `rotate(${(-giro).toFixed(3)}deg)`;
    // el enlace (para hacer clic) acompaña al vidrio
    const r2 = 2 * LENTE.radio;
    enlace!.style.transform = `translate(${(((ls.x - LENTE.x) / r2) * 100).toFixed(3)}%, ${(((ls.y - LENTE.y) / r2) * 100).toFixed(3)}%) scale(${lupa.escala.toFixed(4)})`;

    for (let i = 0; i < CELULAS.length; i++) {
      const c = CELULAS[i];
      const e = estados[i];
      const a = afuera[i];
      if (a) a.style.transform = transformAfuera(c, e);
      const d = adentro[i];
      if (!d) continue;
      const t = transformAdentro(c, e, lente);
      if (t.visible !== visibles[i]) {
        d.style.visibility = t.visible ? 'visible' : 'hidden';
        visibles[i] = t.visible;
      }
      if (t.visible) d.style.transform = t.transform;
    }

    for (let i = 0; i < gente.length; i++) {
      const p = personas[i];
      const el = gente[i];
      if (el) el.style.transform = `rotate(${(p.balanceo + p.reaccion).toFixed(3)}deg) scaleY(${p.respiro.toFixed(4)})`;
    }
  }

  /* ---------- Por dónde puede andar cada célula (lejos de los textos) ---------- */
  let marco = escena.getBoundingClientRect();
  function aEscena(r: DOMRect): Rect {
    const k = ESCENA.ancho / marco.width;
    return {
      izq: (r.left - marco.left) * k,
      der: (r.right - marco.left) * k,
      arr: (r.top - marco.top) * k,
      aba: (r.bottom - marco.top) * k,
    };
  }
  function medir() {
    marco = escena!.getBoundingClientRect();
    if (!marco.width) return;
    const zonas: Rect[] = [];
    // textos de la portada y de la página ("Pedí acceso"): todo lo marcado con data-hero-evitar
    document.querySelectorAll<HTMLElement>('[data-hero-evitar]').forEach((el) => {
      let r = el.getBoundingClientRect();
      // del título: el ancho del texto (la caja ocupa toda la pantalla) y el alto del renglón
      if (el.dataset.heroEvitar === 'texto') {
        const rango = document.createRange();
        rango.selectNodeContents(el);
        const t = rango.getBoundingClientRect();
        r = new DOMRect(t.left, r.top, t.width, r.height);
      }
      if (r.width && r.height) zonas.push(aEscena(r));
    });
    mundo.zonas = zonas;
    // quieta ("reducir movimiento"): igual se corre la que quedó debajo de un texto
    if (reducido) {
      CELULAS.forEach((c, i) => {
        const { ox, oy } = salirDeZonas(c, zonas);
        Object.assign(estados[i], { dx: ox, dy: oy });
      });
      dibujar();
    }
  }

  /* ---------- Movimiento de las células ---------- */
  /*
    Una vez por cuadro: avanzan por la pantalla (deriva.ts). Si el cuadro
    tardó mucho (pestaña oculta, compu lenta), se avanza en pasos chicos para
    que nadie salte.
  */
  function cuadro(_t: number, msDesdeElAnterior: number) {
    let dt = Math.min(msDesdeElAnterior / 1000, 0.25) * gsap.globalTimeline.timeScale();
    tiempo += dt;
    while (dt > 0) {
      const paso = Math.min(dt, 1 / 30);
      avanzar(CELULAS, estados, rumbos, paso, tiempo, mundo, fijas);
      dt -= paso;
    }
    dibujar();
  }
  function girar(i: number) {
    if (!vivo) return;
    const amplio = i % 4 === 0; // algunas giran un poco más
    gsap.to(estados[i], {
      giro: azar(-1, 1) * (amplio ? azar(14, 22) : azar(4, 9)),
      duration: azar(11, 20),
      ease: 'sine.inOut',
      onComplete: () => girar(i),
    });
  }
  function respirar(i: number) {
    if (!vivo) return;
    gsap.to(estados[i], {
      escala: azar(0.975, 1.025),
      duration: azar(5, 9),
      ease: 'sine.inOut',
      onComplete: () => respirar(i),
    });
  }

  /* ---------- La lupa: reposo y activa ---------- */
  let activa = false;
  function activar() {
    if (activa) return;
    activa = true;
    mundo.activa = true; // si el vidrio está vacío, enseguida va alguna célula
    raiz.dataset.lupa = 'activa';
    gsap.to(lupa, { giro: LUPA_ACTIVA.giro, escala: LUPA_ACTIVA.escala, duration: 1.3, ease: 'elastic.out(1, 0.9)', overwrite: 'auto' });
    // agranda más, sin rebote (el zoom no tiembla)
    gsap.to(lupa, { aumento: LUPA_ACTIVA.aumento, duration: 1, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(personas, {
      reaccion: (i: number) => REACCION[CIENTIFICOS[i].id] ?? 1.5,
      duration: 0.9,
      ease: 'back.out(1.8)',
      stagger: { each: 0.07, from: 'end' },
      overwrite: 'auto',
    });
  }
  function desactivar() {
    if (!activa) return;
    activa = false;
    mundo.activa = false;
    delete raiz.dataset.lupa;
    gsap.to(lupa, { ...LUPA_REPOSO, duration: 0.85, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.to(personas, { reaccion: 0, duration: 0.8, ease: 'power2.inOut', stagger: 0.05, overwrite: 'auto' });
  }

  /*
    ¿El mouse está sobre la lupa? Se calcula con la posición real de la lupa.
    Para soltarla, el mouse tiene que salir de la lupa levantada Y del lugar
    donde estaba en reposo: así no tiembla cuando el mouse queda en el borde.
  */
  const levantada = centroOptico(LUPA_ACTIVA.giro, LUPA_ACTIVA.escala);
  function alMover(ev: PointerEvent) {
    if (ev.pointerType === 'touch' || !marco.width) return;
    const k = ESCENA.ancho / marco.width;
    const x = (ev.clientX - marco.left) * k;
    const y = (ev.clientY - marco.top) * k;
    const ls = centroOptico(lupa.giro + lupa.vaiven, lupa.escala);
    const sobreLaLupa = Math.hypot(x - ls.x, y - ls.y) < LENTE.radio * lupa.escala;
    if (!activa) {
      if (sobreLaLupa) activar();
      return;
    }
    const margen = 10;
    const cerca =
      sobreLaLupa ||
      Math.hypot(x - LENTE.x, y - LENTE.y) < LENTE.radio + margen ||
      Math.hypot(x - levantada.x, y - levantada.y) < LENTE.radio * LUPA_ACTIVA.escala + margen;
    if (!cerca) desactivar();
  }
  const alSalir = () => desactivar();
  // con el teclado: al llegar a «Comenzá a experimentar», la lupa se levanta
  const alEnfocar = () => {
    if (entrar?.matches(':focus-visible')) activar();
  };

  /* ---------- Arrancar ---------- */
  medir();
  const observador = new ResizeObserver(medir);
  observador.observe(escena);
  document.fonts?.ready.then(() => vivo && medir());

  if (!reducido) {
    // las células arrancan en la composición aprobada y salen a recorrer la pantalla
    // (si alguna quedó debajo de un texto, sale de a poco: ver deriva.ts)
    CELULAS.forEach((c, i) => {
      rumbos[i] = nuevoRumbo(c, mundo);
      girar(i);
      respirar(i);
    });
    // la lupa en reposo: un vaivén casi imperceptible
    gsap.fromTo(lupa, { vaiven: 0 }, { vaiven: 0.35, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    // científicos: se balancean apenas desde los pies y respiran (no flotan)
    personas.forEach((p, i) => {
      const amplitud = azar(0.45, 0.75) * (i % 2 ? 1 : -1);
      const ida = azar(5, 7.5);
      gsap
        .timeline({ delay: azar(0, 1.5) })
        .to(p, { balanceo: amplitud, duration: ida / 2, ease: 'sine.out' })
        .to(p, { balanceo: -amplitud, duration: ida, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(p, { respiro: 1.007, duration: azar(3.2, 4.2), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: azar(0, 2) });
    });
    window.addEventListener('pointermove', alMover, { passive: true });
    document.documentElement.addEventListener('pointerleave', alSalir);
    window.addEventListener('blur', alSalir);
    entrar?.addEventListener('focus', alEnfocar);
    entrar?.addEventListener('blur', alSalir);
    gsap.ticker.add(cuadro);
  }

  /* Solo en desarrollo: para las pruebas automáticas (pruebas/portada.e2e.mjs). */
  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as Record<string, unknown>).__portada = {
      estados,
      lupa,
      rumbos,
      activar,
      desactivar,
      // detiene una célula y la pone donde se le pide (para probar trayectorias)
      fijar(id: string, dx: number, dy: number) {
        const i = CELULAS.findIndex((c) => c.id === id);
        gsap.killTweensOf(estados[i]);
        fijas[i] = true;
        Object.assign(estados[i], { dx, dy, giro: 0, escala: 1 });
      },
      // acelera o frena todo el movimiento (1 = normal)
      velocidad(v: number) {
        gsap.globalTimeline.timeScale(v);
      },
    };
  }

  /* ---------- Desarmar (al salir de la portada o si cambia "reducir movimiento") ---------- */
  return () => {
    vivo = false;
    gsap.ticker.remove(cuadro);
    gsap.killTweensOf([lupa, ...estados, ...personas]);
    observador.disconnect();
    window.removeEventListener('pointermove', alMover);
    document.documentElement.removeEventListener('pointerleave', alSalir);
    window.removeEventListener('blur', alSalir);
    entrar?.removeEventListener('focus', alEnfocar);
    entrar?.removeEventListener('blur', alSalir);
    delete raiz.dataset.lupa;
    // volver a la composición quieta de CSS
    [lupaEl, ampliadoEl, enlace, ...afuera, ...adentro, ...gente].forEach((el) => {
      if (el) el.style.transform = '';
    });
    adentro.forEach((el, i) => el && (el.style.visibility = visInicial[i]));
    if (process.env.NODE_ENV !== 'production') delete (window as unknown as Record<string, unknown>).__portada;
  };
}
