/*
  CÉLULAS QUE VIAJAN, SIN LUPA (para otras pantallas, como la de roles)

  Las mismas células de la portada (FloatingCells) con el mismo viaje
  (deriva.ts): eligen destinos despejados por toda la pantalla, van en
  curvas, giran y "respiran" apenas, y esquivan los textos. La portada usa
  su propia versión (animarPortada.ts) porque además tiene que mover las
  copias ampliadas dentro de la lupa en el mismo cuadro.

  - capa: el contenedor de FloatingCells, que mide 1920 × 1080 unidades
    (ESCENA) escaladas a la pantalla.
  - evitar: selector de lo que las células no tapan. Con data-…="texto" se
    mide solo el ancho del texto (no la caja entera).
  - Con "reducir movimiento" no se mueven (la que quedó debajo de un texto se
    corre lo justo).
  Devuelve cómo desarmarlo.
*/
import gsap from 'gsap';
import { avanzar, nuevoRumbo, type Mundo, type Rumbo } from './deriva';
import { ESCENA, type Celula } from './escena';
import { nuevoEstadoCelula, salirDeZonas, transformAfuera, type Rect } from './movimiento';

const azar = (min: number, max: number) => min + Math.random() * (max - min);

export function animarCelulas(capa: HTMLElement, celulas: Celula[], evitar: string) {
  const imagenes = [...capa.querySelectorAll<HTMLElement>('[data-capa="afuera"]')];
  const estados = celulas.map(nuevoEstadoCelula);
  const rumbos: Rumbo[] = [];
  const mundo: Mundo = { zonas: [], azar: Math.random };
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vivo = true;
  let tiempo = 0;

  function dibujar() {
    celulas.forEach((c, i) => {
      if (imagenes[i]) imagenes[i].style.transform = transformAfuera(c, estados[i]);
    });
  }

  /* lo que no se tapa, en unidades de la capa */
  function medir() {
    const marco = capa.getBoundingClientRect();
    if (!marco.width) return;
    const k = ESCENA.ancho / marco.width;
    const zonas: Rect[] = [];
    document.querySelectorAll<HTMLElement>(evitar).forEach((el) => {
      let r = el.getBoundingClientRect();
      const atributo = evitar.match(/\[data-([a-z-]+)/)?.[1];
      if (atributo && el.getAttribute(`data-${atributo}`) === 'texto') {
        const rango = document.createRange();
        rango.selectNodeContents(el);
        const t = rango.getBoundingClientRect();
        r = new DOMRect(t.left, t.top, t.width, t.height);
      }
      if (r.width && r.height) {
        zonas.push({ izq: (r.left - marco.left) * k, der: (r.right - marco.left) * k, arr: (r.top - marco.top) * k, aba: (r.bottom - marco.top) * k });
      }
    });
    mundo.zonas = zonas;
    if (reducido) {
      celulas.forEach((c, i) => {
        const { ox, oy } = salirDeZonas(c, zonas);
        Object.assign(estados[i], { dx: ox, dy: oy });
      });
      dibujar();
    }
  }

  /* una vez por cuadro; si el cuadro tardó mucho, en pasos chicos para que nadie salte */
  function cuadro(_t: number, ms: number) {
    let dt = Math.min(ms / 1000, 0.25) * gsap.globalTimeline.timeScale();
    tiempo += dt;
    while (dt > 0) {
      const paso = Math.min(dt, 1 / 30);
      avanzar(celulas, estados, rumbos, paso, tiempo, mundo);
      dt -= paso;
    }
    dibujar();
  }
  function girar(i: number) {
    if (!vivo) return;
    const amplio = i % 4 === 0;
    gsap.to(estados[i], { giro: azar(-1, 1) * (amplio ? azar(14, 22) : azar(4, 9)), duration: azar(11, 20), ease: 'sine.inOut', onComplete: () => girar(i) });
  }
  function respirar(i: number) {
    if (!vivo) return;
    gsap.to(estados[i], { escala: azar(0.975, 1.025), duration: azar(5, 9), ease: 'sine.inOut', onComplete: () => respirar(i) });
  }

  medir();
  const observador = new ResizeObserver(medir);
  observador.observe(capa);
  document.fonts?.ready.then(() => vivo && medir());

  if (!reducido) {
    celulas.forEach((c, i) => {
      rumbos[i] = nuevoRumbo(c, mundo);
      girar(i);
      respirar(i);
    });
    gsap.ticker.add(cuadro);
  }

  return () => {
    vivo = false;
    gsap.ticker.remove(cuadro);
    gsap.killTweensOf(estados);
    observador.disconnect();
  };
}
