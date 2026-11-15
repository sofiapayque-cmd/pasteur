/*
  PANTALLA DE ROLES · prueba en el navegador (Playwright)

  Uso: con la página corriendo (npm run dev o npm start),
    E2E_URL=http://localhost:3000 NODE_PATH=$(npm root -g) npm run test:rol-navegador

  Revisa:
  1. que cargue sin errores, con Moli sentada en el borde de «Soy maestra»
     (la imagen de respaldo y, si hay WebGL, el 3D);
  2. que las células viajen y no tapen el título;
  3. «Soy maestra»: Moli saluda y después navega al acceso docente, una sola vez;
  4. «Soy alumno»: Moli salta y aterriza en «Soy alumno», y después navega a /clase;
  5. el teclado: Volver → Soy maestra → Soy alumno;
  6. "reducir movimiento": todo quieto y navega al instante.
*/
import { createRequire } from 'node:module';

// Playwright no es dependencia del proyecto: se usa el instalado en la compu (NODE_PATH), como en portada.e2e.mjs
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Falta Playwright: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

const BASE = process.env.E2E_URL ?? 'http://localhost:3000';
const NAV = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let fallas = 0;
const revisar = (ok, mensaje) => {
  if (!ok) {
    fallas++;
    console.log('  ✗', mensaje);
  }
};

const navegador = await chromium.launch({ args: NAV });

async function abrir(opciones = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, ...opciones });
  const pag = await ctx.newPage();
  const errores = [];
  pag.on('pageerror', (e) => errores.push(String(e)));
  pag.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await pag.goto(`${BASE}/rol`, { waitUntil: 'networkidle' });
  return { ctx, pag, errores };
}

/* dónde está el borde de arriba de una placa y dónde se apoya Moli (imagen de respaldo) */
const medidas = () => {
  const placa = (rol) => document.querySelector(`[data-placa="${rol}"]`).getBoundingClientRect();
  const r = document.querySelector('.rol-moli__respaldo').getBoundingClientRect();
  const m = placa('maestra');
  return { asiento: { x: r.left + r.width * 0.5, y: r.top + r.height * 0.6226 }, apice: { x: m.left + m.width / 2, y: m.top } };
};

// 1-2 · carga, Moli sentada, células
{
  const { ctx, pag, errores } = await abrir();
  const m = await pag.evaluate(medidas);
  revisar(Math.hypot(m.asiento.x - m.apice.x, m.asiento.y - m.apice.y) < 2, 'Moli no está sentada en el borde de «Soy maestra»');
  const con3d = await pag.waitForSelector('[data-moli="3d"]', { timeout: 20000 }).then(() => true, () => false);
  console.log(con3d ? '1 · Moli 3D lista' : '1 · sin 3D: queda la imagen de Moli');
  const antes = await pag.evaluate(() => [...document.querySelectorAll('[data-capa="afuera"]')].map((e) => e.getBoundingClientRect().x));
  await pag.waitForTimeout(2500);
  const despues = await pag.evaluate(() => [...document.querySelectorAll('[data-capa="afuera"]')].map((e) => e.getBoundingClientRect().x));
  revisar(antes.some((x, i) => Math.abs(x - despues[i]) > 3), 'las células no se mueven');
  const tapan = await pag.evaluate(() => {
    const t = document.querySelector('[data-rol-evitar]');
    const rango = document.createRange();
    rango.selectNodeContents(t);
    const r = rango.getBoundingClientRect();
    return [...document.querySelectorAll('[data-capa="afuera"]')].filter((e) => {
      const c = e.getBoundingClientRect();
      const cx = c.x + c.width / 2;
      const cy = c.y + c.height / 2;
      const radio = c.width * 0.42;
      const qx = Math.max(r.left, Math.min(cx, r.right));
      const qy = Math.max(r.top, Math.min(cy, r.bottom));
      return Math.hypot(cx - qx, cy - qy) < radio;
    }).length;
  });
  revisar(tapan === 0, `${tapan} células tapan el título`);
  revisar(errores.length === 0, `errores en la consola: ${errores.join(' | ').slice(0, 300)}`);
  console.log('2 · células: listo');
  await ctx.close();
}

// 3-4 · elegir (un segundo clic no navega otra vez)
for (const [rol, destino] of [['maestra', '/maestra'], ['alumno', '/clase']]) {
  const { ctx, pag } = await abrir();
  await pag.waitForSelector('[data-moli="3d"]', { timeout: 20000 }).catch(() => {});
  await pag.waitForTimeout(500);
  const navegaciones = [];
  pag.on('framenavigated', (f) => f === pag.mainFrame() && navegaciones.push(new URL(f.url()).pathname));
  const t0 = Date.now();
  await pag.click(`[data-placa="${rol}"]`);
  await pag.waitForTimeout(120);
  await pag.click(`[data-placa="${rol === 'maestra' ? 'alumno' : 'maestra'}"]`, { force: true }).catch(() => {});
  if (rol === 'alumno') {
    // a mitad de camino Moli todavía está en la escena; al final, la sombra pasó a «Soy alumno»
    await pag.waitForFunction(() => document.querySelector('[data-placa="alumno"]')?.hasAttribute('data-con-moli'), null, { timeout: 4000 }).catch(() => revisar(false, 'Moli no aterrizó en «Soy alumno»'));
  }
  await pag.waitForURL((u) => !u.pathname.startsWith('/rol'), { timeout: 8000 }).catch(() => revisar(false, `«Soy ${rol}» no navegó`));
  const ms = Date.now() - t0;
  const fin = new URL(pag.url()).pathname;
  revisar(fin.startsWith(destino), `«Soy ${rol}» llevó a ${fin} (se esperaba ${destino})`);
  await pag.waitForTimeout(500);
  revisar(navegaciones.filter((n) => !n.startsWith('/rol')).length <= 2, `«Soy ${rol}» navegó más de una vez: ${navegaciones.join(', ')}`);
  console.log(`${rol === 'maestra' ? 3 : 4} · «Soy ${rol}» → ${fin} a los ${ms} ms`);
  await ctx.close();
}

// 5 · teclado
{
  const { ctx, pag } = await abrir();
  const orden = [];
  for (let i = 0; i < 3; i++) {
    await pag.keyboard.press('Tab');
    orden.push(
      await pag.evaluate(() => {
        const el = document.activeElement;
        return (el?.querySelector('.rol-placa__titulo') ?? el)?.textContent?.trim();
      }),
    );
  }
  revisar(orden.join(' → ') === 'Volver → Soy maestra → Soy alumno', `orden con Tab: ${orden.join(' → ')}`);
  console.log('5 · teclado:', orden.join(' → '));
  await ctx.close();
}

// 6 · reducir movimiento
{
  const { ctx, pag } = await abrir({ reducedMotion: 'reduce' });
  await pag.waitForTimeout(800);
  const pos = () => pag.evaluate(() => [...document.querySelectorAll('[data-capa="afuera"]')].map((e) => e.style.transform).join('|'));
  const a = await pos();
  await pag.waitForTimeout(1200);
  revisar(a === (await pos()), 'con "reducir movimiento" las células se mueven');
  const t0 = Date.now();
  await pag.click('[data-placa="alumno"]');
  await pag.waitForURL((u) => !u.pathname.startsWith('/rol'), { timeout: 5000 });
  const ms = Date.now() - t0;
  revisar(ms < 1500, `con "reducir movimiento" tardó ${ms} ms en navegar`);
  console.log(`6 · reducir movimiento: navega a los ${ms} ms`);
  await ctx.close();
}

await navegador.close();
console.log(fallas ? `\n✗ ${fallas} problema(s)` : '\n✓ Pantalla de roles: todo bien');
process.exit(fallas ? 1 : 0);
