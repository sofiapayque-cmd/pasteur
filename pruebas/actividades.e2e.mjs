/*
  Pruebas de punta a punta de las actividades (A1, A2 y A3), en modo individual.

  Abre CADA etapa de cada actividad, con datos de un chico simulado (los
  mismos que usa el tablero de prueba), en dos tamaños: compu (1366×768) y
  Ceibal (1024×600). En cada una revisa que:
    · no haya errores en la página ni en la consola;
    · tenga un título visible;
    · no se desborde hacia los costados;
    · haya algo para tocar (un botón habilitado).

  npm run test:actividades            (las tres)
  E2E_SOLO=a2 npm run test:actividades  (una sola)
  · Levanta la web sola (next dev) en un puerto libre, o usa E2E_URL si ya
    hay una corriendo (por ejemplo E2E_URL=http://localhost:3000).
  · Necesita Playwright con Chromium. No es dependencia del proyecto para no
    sumarle peso al build de Vercel: si falta, `npm i -g playwright` y
    `npx playwright install chromium`.
*/
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { INFO_ACTIVIDADES } from '../src/actividades/info.js';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Falta Playwright: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

// E2E_SOLO=a2 prueba una sola actividad
const ACTIVIDADES = process.env.E2E_SOLO ? process.env.E2E_SOLO.split(',') : ['a1', 'a2', 'a3'];
const TAMANOS = [
  [1366, 768],
  [1024, 600],
];
const PUERTO = Number(process.env.E2E_PUERTO || 3171);

async function levantar() {
  if (process.env.E2E_URL) return { url: process.env.E2E_URL.replace(/\/$/, ''), parar: () => {} };
  // Sin variables de Supabase: la web queda en modo prototipo (lo que se prueba acá)
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('NEXT_PUBLIC_')) delete env[k];
  const proceso = spawn('npx', ['next', 'dev', '-p', String(PUERTO)], { env, stdio: 'ignore', detached: true });
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

function etapasDe(act) {
  const info = INFO_ACTIVIDADES[act];
  return info.ETAPAS.map((e, i) => ({ etapa: e.id, datos: info.simularDatos ? info.simularDatos(i, {}) : {} }));
}

async function revisar(navegador, url, act, semilla, [ancho, alto]) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto } });
  await ctx.addInitScript(([k, v]) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  }, [`csl-solo-${act}`, JSON.stringify(semilla)]);
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(`error: ${e.message.slice(0, 160)}`));
  p.on('console', (m) => {
    if (m.type() === 'error') errores.push(`consola: ${m.text().slice(0, 160)}`);
  });
  await p.goto(`${url}/explorar/${act}`, { waitUntil: 'networkidle', timeout: 180_000 });
  await p.waitForTimeout(1500);
  const estado = await p.evaluate(() => {
    const h = [...document.querySelectorAll('h1, h2')].find((el) => el.offsetParent !== null && el.textContent.trim());
    const botones = [...document.querySelectorAll('button, [role=button], a[href]')].filter((b) => !b.disabled && b.offsetParent !== null);
    return {
      titulo: h ? h.textContent.trim().slice(0, 60) : '',
      desborde: document.documentElement.scrollWidth - window.innerWidth,
      botones: botones.length,
    };
  });
  await ctx.close();
  const problemas = [...errores];
  if (!estado.titulo) problemas.push('sin título visible');
  if (estado.desborde > 2) problemas.push(`se desborda ${estado.desborde}px a los costados`);
  if (!estado.botones) problemas.push('no hay nada para tocar');
  return { titulo: estado.titulo, problemas };
}

const { url, parar } = await levantar();
const navegador = await chromium.launch();
let fallas = 0;
let total = 0;
try {
  for (const act of ACTIVIDADES) {
    for (const semilla of etapasDe(act)) {
      for (const tam of TAMANOS) {
        total++;
        const r = await revisar(navegador, url, act, semilla, tam);
        const marca = r.problemas.length ? 'FALLA' : 'OK   ';
        if (r.problemas.length) fallas++;
        console.log(`${marca} ${act} ${semilla.etapa.padEnd(13)} ${tam.join('×').padEnd(9)} ${r.titulo}${r.problemas.length ? '\n        ' + r.problemas.join('\n        ') : ''}`);
      }
    }
  }
} finally {
  await navegador.close();
  parar();
}
console.log(`\n${total - fallas} OK · ${fallas} FALLAS (${total} pantallas)`);
process.exit(fallas ? 1 : 0);
