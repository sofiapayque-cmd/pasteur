/*
  Portada ilustrada, en el navegador: la lupa, las células y los textos.

  npm run test:portada-navegador
  · Levanta la web sola (next dev) en un puerto libre, o usa E2E_URL si ya
    hay una corriendo. Necesita la web en modo desarrollo: usa un acceso de
    prueba (window.__portada) que no existe en producción.
  · Necesita Playwright con Chromium (igual que test:actividades).

  Revisa que:
    1. la copia ampliada esté siempre donde la vería una lupa real
       (centro óptico + aumento × distancia), con las células moviéndose,
       con la lupa quieta y levantada;
    2. distintas células (chica, mediana, grande) que cruzan la lupa por
       distintos caminos se vean ampliadas solo mientras pasan por el vidrio;
    3. al pasar el mouse la lupa suba entre 40 y 60 px y crezca un 10 %, sin
       temblar en el borde, y vuelva al sacar el mouse; con el teclado, igual;
    4. ninguna célula tape el título, el subtítulo, el logo ni "Pedí acceso";
    5. con "reducir movimiento" no se mueva nada;
    6. la lupa lleve a "¿Quién explora hoy?";
    7. no haya errores en la consola.
*/
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Falta Playwright: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

const PUERTO = Number(process.env.E2E_PUERTO || 3172);

async function levantar() {
  if (process.env.E2E_URL) return { url: process.env.E2E_URL.replace(/\/$/, ''), parar: () => {} };
  const proceso = spawn('npx', ['next', 'dev', '-p', String(PUERTO)], { stdio: 'ignore', detached: true });
  const url = `http://localhost:${PUERTO}`;
  const limite = Date.now() + 180_000;
  while (Date.now() < limite) {
    try {
      const r = await fetch(url + '/');
      if (r.ok) break;
    } catch {
      /* todavía arrancando */
    }
    await new Promise((ok) => setTimeout(ok, 1500));
  }
  return { url, parar: () => { try { process.kill(-proceso.pid); } catch { /* ya terminó */ } } };
}

const fallas = [];
function revisar(condicion, mensaje) {
  if (!condicion) fallas.push(mensaje);
  return condicion;
}

/*
  Una foto del estado en un mismo cuadro: dónde está cada célula afuera y
  adentro, el vidrio y la escala de la lupa. Todo leído de la página, en px.
*/
const FOTO = () => {
  const centro = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const vidrio = document.querySelector('.hero-lente');
  const p = window.__portada;
  const escala = p.lupa.escala;
  const celulas = [...document.querySelectorAll('[data-capa="afuera"]')].map((a, i) => {
    const id = a.dataset.celula;
    const d = document.querySelector(`[data-capa="adentro"][data-celula="${id}"]`);
    return {
      id,
      afuera: centro(a),
      radio: (a.offsetWidth / 2) * p.estados[i].escala,
      adentro: centro(d),
      radioAdentro: (d.offsetWidth / 2) * p.estados[i].escala * escala,
      visible: getComputedStyle(d).visibility === 'visible',
    };
  });
  return { vidrio: centro(vidrio), radioVidrio: (vidrio.offsetWidth / 2) * escala, escala, celulas };
};

const AUMENTO = 1.7;

/* Compara cada copia ampliada con donde la vería una lupa real. Devuelve cuántas había adentro. */
function comprobarFoto(f, etiqueta) {
  const k = AUMENTO * f.escala;
  let adentro = 0;
  for (const c of f.celulas) {
    const esperado = { x: f.vidrio.x + k * (c.afuera.x - f.vidrio.x), y: f.vidrio.y + k * (c.afuera.y - f.vidrio.y) };
    const borde = Math.hypot(esperado.x - f.vidrio.x, esperado.y - f.vidrio.y) - c.radioAdentro - f.radioVidrio;
    if (Math.abs(borde) < 3) continue; // justo en el borde: el redondeo decide
    const debeVerse = borde < 0;
    revisar(c.visible === debeVerse, `${etiqueta} · ${c.id}: ${debeVerse ? 'debería verse' : 'no debería verse'} ampliada`);
    if (debeVerse && c.visible) {
      adentro++;
      const error = Math.hypot(c.adentro.x - esperado.x, c.adentro.y - esperado.y);
      revisar(error < 1.5, `${etiqueta} · ${c.id}: la copia está a ${error.toFixed(2)} px de donde la vería una lupa real`);
    }
  }
  return adentro;
}

const esperar = (pag, ms) => pag.waitForTimeout(ms);
const dosCuadros = (pag) => pag.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));

async function probarAmpliacion(pag) {
  // 1 · con las células moviéndose (tiempo acelerado), lupa quieta y levantada
  await pag.evaluate(() => window.__portada.velocidad(6));
  let conAlguna = 0;
  for (const estado of ['reposo', 'activa']) {
    if (estado === 'activa') {
      await pag.evaluate(() => window.__portada.activar());
      await esperar(pag, 600);
    }
    for (let i = 0; i < 40; i++) {
      await esperar(pag, 120);
      if (comprobarFoto(await pag.evaluate(FOTO), `moviéndose, lupa ${estado}`) > 0) conAlguna++;
    }
  }
  revisar(conAlguna > 20, `casi nunca hubo células pasando por la lupa (${conAlguna} de 80 fotos)`);
  await pag.evaluate(() => { window.__portada.desactivar(); window.__portada.velocidad(1); });
  await esperar(pag, 1200);

  // 2 · tres células distintas, por tres caminos que cruzan la lupa
  const caminos = [
    { id: 'e', nombre: 'chica, de izquierda a derecha', desde: [-420, 0], hasta: [420, 0] },
    { id: 'h', nombre: 'mediana, en diagonal', desde: [-330, -330], hasta: [330, 330] },
    { id: 'a', nombre: 'grande, de abajo hacia arriba', desde: [40, 420], hasta: [40, -420] },
  ];
  for (const estado of ['reposo', 'activa']) {
    if (estado === 'activa') {
      await pag.evaluate(() => window.__portada.activar());
      await esperar(pag, 1600);
    }
    for (const c of caminos) {
      const vistas = [];
      for (let t = 0; t <= 1.0001; t += 0.05) {
        // posición respecto del centro óptico en reposo (953, 597), en unidades de la escena
        await pag.evaluate(
          ([id, x, y]) => {
            const cel = { a: [185, 205], e: [1735, 285], h: [1385, 655] }[id];
            window.__portada.fijar(id, 953 + x - cel[0], 597 + y - cel[1]);
          },
          [c.id, c.desde[0] + (c.hasta[0] - c.desde[0]) * t, c.desde[1] + (c.hasta[1] - c.desde[1]) * t],
        );
        await dosCuadros(pag);
        const f = await pag.evaluate(FOTO);
        comprobarFoto(f, `camino ${c.nombre}, lupa ${estado}`);
        vistas.push(f.celulas.find((x) => x.id === c.id).visible);
      }
      const entra = vistas.indexOf(true);
      const sale = vistas.lastIndexOf(true);
      revisar(entra > 0 && sale < vistas.length - 1, `camino ${c.nombre}, lupa ${estado}: debería empezar y terminar afuera de la lupa`);
      revisar(entra >= 0 && vistas.slice(entra, sale + 1).every(Boolean), `camino ${c.nombre}, lupa ${estado}: se dejó de ver en el medio`);
    }
  }
  await pag.evaluate(() => window.__portada.desactivar());
}

async function probarHover(pag) {
  await pag.mouse.move(40, 40);
  await esperar(pag, 1200);
  const antes = await pag.locator('.hero-lente').boundingBox();
  const centro = { x: antes.x + antes.width / 2, y: antes.y + antes.height / 2 };
  await pag.mouse.move(centro.x, centro.y, { steps: 6 });
  await esperar(pag, 1700);
  const despues = await pag.locator('.hero-lente').boundingBox();
  const sube = centro.y - (despues.y + despues.height / 2);
  const escala = await pag.evaluate(() => window.__portada.lupa.escala);
  revisar(sube >= 40 && sube <= 60, `al pasar el mouse la lupa sube ${sube.toFixed(1)} px (se esperaba entre 40 y 60)`);
  revisar(escala >= 1.08 && escala <= 1.12, `al pasar el mouse la lupa crece ×${escala.toFixed(3)} (se esperaba entre 1,08 y 1,12)`);

  // en el borde de abajo (dentro de donde estaba, fuera de donde está): no tiembla
  await pag.mouse.move(centro.x, centro.y + antes.height * 0.47, { steps: 3 });
  const estados = [];
  for (let i = 0; i < 15; i++) {
    await esperar(pag, 100);
    estados.push(await pag.evaluate(() => document.querySelector('.hero').dataset.lupa ?? 'reposo'));
  }
  revisar(estados.every((e) => e === 'activa'), `con el mouse en el borde la lupa tiembla: ${estados.join(',')}`);

  await pag.mouse.move(40, 40, { steps: 4 });
  await esperar(pag, 1100);
  const vuelta = await pag.locator('.hero-lente').boundingBox();
  revisar(Math.abs(vuelta.y - antes.y) < 4, `al sacar el mouse la lupa no volvió a su lugar (${(vuelta.y - antes.y).toFixed(1)} px)`);

  // con el teclado: al llegar a «Comenzá a experimentar» la lupa se levanta
  await pag.locator('[data-entrar]').focus();
  await pag.keyboard.press('Shift+Tab');
  await pag.keyboard.press('Tab');
  await esperar(pag, 300);
  const conTeclado = await pag.evaluate(() => document.querySelector('.hero').dataset.lupa ?? 'reposo');
  revisar(conTeclado === 'activa', 'con el teclado, al llegar al subtítulo la lupa no se levanta');
  await pag.evaluate(() => document.activeElement.blur());
  await esperar(pag, 300);
}

async function probarTextos(pag, tamano) {
  await esperar(pag, 1200); // la que quedó debajo de un texto termina de salir
  await pag.evaluate(() => window.__portada.velocidad(20));
  const zonas = await pag.evaluate(() =>
    [...document.querySelectorAll('[data-hero-evitar]')].map((el) => {
      const r = el.getBoundingClientRect();
      let { left: izq, right: der } = r;
      // del título: el ancho del texto y el alto del renglón
      if (el.dataset.heroEvitar === 'texto') {
        const rango = document.createRange();
        rango.selectNodeContents(el);
        ({ left: izq, right: der } = rango.getBoundingClientRect());
      }
      return { nombre: el.textContent.trim().slice(0, 24), izq, der, arr: r.top, aba: r.bottom };
    }),
  );
  revisar(zonas.length >= 3, `${tamano}: faltan textos marcados (data-hero-evitar)`);
  let peor = Infinity;
  for (let i = 0; i < 50; i++) {
    await esperar(pag, 120);
    const cels = await pag.evaluate(() =>
      [...document.querySelectorAll('[data-capa="afuera"]')].map((a, i) => {
        const r = a.getBoundingClientRect();
        return { id: a.dataset.celula, x: r.left + r.width / 2, y: r.top + r.height / 2, radio: (a.offsetWidth / 2) * window.__portada.estados[i].escala };
      }),
    );
    for (const c of cels) {
      for (const z of zonas) {
        const dx = Math.max(z.izq - c.x, 0, c.x - z.der);
        const dy = Math.max(z.arr - c.y, 0, c.y - z.aba);
        const distancia = Math.hypot(dx, dy) - c.radio;
        peor = Math.min(peor, distancia);
        revisar(distancia > 0, `${tamano}: la célula ${c.id} toca «${z.nombre}»`);
      }
    }
  }
  await pag.evaluate(() => window.__portada.velocidad(1));
  return peor;
}

const { url, parar } = await levantar();
const nav = await chromium.launch();
try {
  // 1, 2, 3 y 7 a 1920 × 1080
  const pag = await nav.newPage({ viewport: { width: 1920, height: 1080 } });
  const errores = [];
  pag.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  pag.on('pageerror', (e) => errores.push(String(e)));
  await pag.goto(url + '/', { waitUntil: 'networkidle' });
  await pag.waitForFunction(() => window.__portada);
  await esperar(pag, 800);
  await probarAmpliacion(pag);
  console.log('1-2 · ampliación: listo');
  await probarHover(pag);
  console.log('3 · lupa con mouse y teclado: listo');

  // 4 · textos, en tres tamaños
  for (const [w, h] of [[1920, 1080], [1440, 900], [1024, 600]]) {
    await pag.setViewportSize({ width: w, height: h });
    await pag.goto(url + '/', { waitUntil: 'networkidle' });
    await pag.waitForFunction(() => window.__portada);
    await esperar(pag, 600);
    const peor = await probarTextos(pag, `${w}×${h}`);
    console.log(`4 · textos libres a ${w}×${h} (la célula más cerca quedó a ${peor.toFixed(1)} px)`);
  }

  // 6 · la lupa lleva a entrar
  await pag.setViewportSize({ width: 1440, height: 900 });
  await pag.goto(url + '/', { waitUntil: 'networkidle' });
  const v = await pag.locator('.hero-lente').boundingBox();
  await pag.mouse.click(v.x + v.width / 2, v.y + v.height / 2);
  await pag.waitForURL(/\/rol$/, { timeout: 15_000 }).catch(() => {});
  revisar(pag.url().endsWith('/rol'), `la lupa no lleva a /rol (quedó en ${pag.url()})`);
  console.log('6 · la lupa lleva a /rol: listo');
  revisar(errores.length === 0, `errores en la consola: ${errores.join(' | ')}`);

  // 5 · reducir movimiento
  const quieta = await nav.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await quieta.goto(url + '/', { waitUntil: 'networkidle' });
  const foto = () => quieta.evaluate(() => [...document.querySelectorAll('[data-capa], .hero-lente, [data-cientifico]')].map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top].map(Math.round).join(','); }).join(' '));
  const primera = await foto();
  const vq = await quieta.locator('.hero-lente').boundingBox();
  await quieta.mouse.move(vq.x + vq.width / 2, vq.y + vq.height / 2, { steps: 4 });
  await esperar(quieta, 2500);
  revisar(primera === (await foto()), 'con "reducir movimiento" algo se movió');
  console.log('5 · reducir movimiento: listo');
} finally {
  await nav.close();
  parar();
}

if (fallas.length) {
  const unicas = [...new Set(fallas)];
  console.error(`\n✗ ${unicas.length} problema(s):\n  · ` + unicas.slice(0, 40).join('\n  · '));
  process.exit(1);
}
console.log('\n✓ Portada: todo bien');
