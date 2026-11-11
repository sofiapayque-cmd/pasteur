/*
  PORTADA ILUSTRADA · movimiento

  Cómo funciona:
  - GSAP solo cambia números: el estado de cada célula (movimiento.ts), el
    de la lupa y el de cada científico. Nunca toca React.
  - Una sola función, `dibujar`, corre una vez por cuadro (gsap.ticker): lee
    esos números y mueve las imágenes. Así la célula de afuera y su copia
    ampliada salen del mismo estado en el mismo cuadro y no pueden desfasarse.
  - Con "reducir movimiento" (prefers-reduced-motion) no se mueve nada: queda
    la composición quieta, con la lupa ampliando igual.
*/
import { gsap } from 'gsap';
import { CELULAS, CIENTIFICOS, ESCENA, LENTE } from './escena';
import {
  LUPA_ACTIVA,
  LUPA_REPOSO,
  centroOptico,
  nuevoEstadoCelula,
  recorridoLibre,
  transformAdentro,
  transformAfuera,
  type EstadoCelula,
  type EstadoLupa,
  type Rect,
  type Recorrido,
} from './movimiento';

const azar = gsap.utils.random as (min: number, max: number) => number;

/* Profundidad: 0 = célula chica (lejos), 1 = grande (cerca). Las lejanas van más lento. */
const profundidad = (d: number) => gsap.utils.clamp(0, 1, (d - 36) / (150 - 36));

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
  let recorridos: Recorrido[] = CELULAS.map(() => ({ ox: 0, oy: 0, caja: { izq: 0, der: 0, arr: 0, aba: 0 } }));
  let vivo = true;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Dibujar: una vez por cuadro ---------- */
  function dibujar() {
    const giro = lupa.giro + lupa.vaiven;
    const ls = centroOptico(giro, lupa.escala);

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
      const t = transformAdentro(c, e, ls);
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
    // textos de la portada y de la página (logo, "Pedí acceso"): todo lo marcado con data-hero-evitar
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
    recorridos = CELULAS.map((c) => recorridoLibre(c, zonas));
    // quieta ("reducir movimiento"): igual se corre la que quedó debajo de un texto
    if (reducido) {
      recorridos.forEach((rec, i) => Object.assign(estados[i], { dx: rec.ox, dy: rec.oy }));
      dibujar();
    }
  }

  /* ---------- Movimiento de las células ---------- */
  /*
    Cada eje se mueve por su cuenta, hacia un punto al azar dentro de su caja,
    con duraciones distintas: el camino es una curva que no se repite y la
    célula casi nunca se detiene del todo.
  */
  function derivar(i: number, eje: 'dx' | 'dy') {
    if (!vivo) return;
    const c = CELULAS[i];
    const { ox, oy, caja } = recorridos[i];
    const [base, menos, mas] = eje === 'dx' ? [ox, caja.izq, caja.der] : [oy, caja.arr, caja.aba];
    const lento = 1.35 - 0.5 * profundidad(c.d);
    gsap.to(estados[i], {
      [eje]: base + azar(-menos, mas),
      duration: azar(7, 13) * lento,
      ease: 'sine.inOut',
      onComplete: () => derivar(i, eje),
    });
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
    raiz.dataset.lupa = 'activa';
    gsap.to(lupa, { ...LUPA_ACTIVA, duration: 1.3, ease: 'elastic.out(1, 0.9)', overwrite: 'auto' });
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
    CELULAS.forEach((_, i) => {
      const { ox, oy } = recorridos[i];
      if (ox || oy) {
        // quedó debajo de un texto (pantalla chica): primero sale, sin saltar
        gsap.to(estados[i], { dx: ox, dy: oy, duration: 0.9, ease: 'power2.out', onComplete: () => (derivar(i, 'dx'), derivar(i, 'dy')) });
      } else {
        derivar(i, 'dx');
        derivar(i, 'dy');
      }
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
    gsap.ticker.add(dibujar);
  }

  /* Solo en desarrollo: para las pruebas automáticas (pruebas/portada.e2e.mjs). */
  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as Record<string, unknown>).__portada = {
      estados,
      lupa,
      recorridos: () => recorridos,
      activar,
      desactivar,
      // detiene una célula y la pone donde se le pide (para probar trayectorias)
      fijar(id: string, dx: number, dy: number) {
        const i = CELULAS.findIndex((c) => c.id === id);
        gsap.killTweensOf(estados[i]);
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
    gsap.ticker.remove(dibujar);
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
