/*
  Prueba de punta a punta del acceso SIN SESIÓN (etapa 1, pedido de Sofia del 8/11).
  Con el sistema real de aulas prendido, alguien sin cuenta:
    · ve las fichas de los laboratorios, pero no puede hacer ninguna actividad;
    · no recibe la actividad ni pidiendo la página "por dentro" (formato RSC de Next.js);
    · los enlaces viejos del prototipo y las áreas privadas lo llevan al ingreso que corresponde.

  npm run test:acceso-e2e
  · Levanta la web sola (next dev) con el sistema real prendido y una base
    inexistente: sin cookies no hace falta ninguna base, y así se prueba que
    el control está en el servidor y no depende de datos.
  · O usa E2E_URL si ya hay una corriendo (por ejemplo, la versión de prueba de Vercel).
  · Necesita Playwright con Chromium (ver pruebas/actividades.e2e.mjs).
  Las personas con sesión (alumno, maestra, equipo) se prueban en la versión de
  prueba con cuentas de prueba: ver la lista de revisión de la etapa 1.
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
const ACTIVIDADES = [
  { id: 'a1', nombre: 'Genómica Microbiana' },
  { id: 'a2', nombre: 'Simulaciones Biomoleculares' },
  { id: 'a3', nombre: 'Bioimagenología' },
  { id: 'a4', nombre: 'Evolución de Virus' },
];

async function levantar() {
  if (process.env.E2E_URL) return { url: process.env.E2E_URL.replace(/\/$/, ''), parar: () => {} };
  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'https://base-de-prueba-inexistente.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_prueba_sin_base',
    NEXT_PUBLIC_AULAS_REALES: '1',
    NEXT_PUBLIC_ASISTENTE: '1',
  };
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

const resultados = [];
function anotar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok, detalle });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? `\n        ${detalle}` : ''}`);
}

/** Abre la página como un visitante (sin cookies) y devuelve a dónde terminó y qué se ve. */
async function visitar(navegador, url, ruta, [ancho, alto] = [1366, 768]) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message.slice(0, 160)));
  const r = await p.goto(url + ruta, { waitUntil: 'networkidle', timeout: 180_000 });
  await p.waitForTimeout(800);
  const vista = await p.evaluate(() => ({
    ruta: location.pathname,
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    actividad: Boolean(document.querySelector('main.actividad')),
    preguntasPasteur: Boolean(document.querySelector('.preguntas-pasteur__boton')),
    textos: [...document.querySelectorAll('a, button')].map((b) => b.textContent.trim()),
    desborde: document.documentElement.scrollWidth - window.innerWidth,
  }));
  await ctx.close();
  return { estado: r?.status() ?? 0, errores, ...vista };
}

const { url, parar } = await levantar();
const navegador = await chromium.launch();
try {
  // 1 · Fichas públicas
  for (const ruta of ['/', '/rol', '/explorar']) {
    const v = await visitar(navegador, url, ruta);
    anotar(`${ruta} abre sin sesión`, v.estado === 200 && v.ruta === ruta && !v.errores.length, v.errores.join(' | '));
  }
  const lista = await visitar(navegador, url, '/explorar');
  anotar(
    '/explorar sin sesión ofrece "Ver de qué se trata" y no "Entrar"',
    lista.textos.filter((t) => t === 'Ver de qué se trata').length === 3 && !lista.textos.includes('Entrar'),
    lista.textos.join(' · ').slice(0, 200),
  );

  // 2 · Cada actividad: ficha sí, actividad no (en compu y en Ceibal)
  for (const a of ACTIVIDADES) {
    for (const tam of [[1366, 768], [1024, 600]]) {
      const v = await visitar(navegador, url, `/explorar/${a.id}`, tam);
      const ok =
        v.estado === 200 &&
        v.h1 === a.nombre &&
        !v.actividad &&
        !v.preguntasPasteur &&
        v.textos.includes('Entrar con mi tarjeta') &&
        v.textos.includes('Soy docente') &&
        v.desborde <= 2 &&
        !v.errores.length;
      anotar(`/explorar/${a.id} (${tam.join('×')}) muestra la ficha y no la actividad`, ok, ok ? '' : JSON.stringify({ ...v, textos: undefined }));
    }
  }

  // 3 · Pedido "por dentro" (formato RSC de Next.js), sin cookies: no trae la actividad
  // (Comprobado el 8/11: con las actividades abiertas, este mismo pedido nombra
  //  "src/pantallas/nino/Solo.jsx"; cerradas, trae la ficha y no la nombra.)
  for (const a of ACTIVIDADES) {
    const r = await fetch(`${url}/explorar/${a.id}`, { headers: { RSC: '1' } });
    const cuerpo = await r.text();
    const esRsc = (r.headers.get('content-type') ?? '').includes('text/x-component');
    const trae = /pantallas\/nino\/Solo|MarcoActividad|actividades\/a[1-4]\/index/.test(cuerpo);
    const ficha = cuerpo.includes('Entrar con mi tarjeta');
    anotar(
      `/explorar/${a.id} pedida por dentro trae la ficha y no la actividad`,
      r.ok && esRsc && ficha && !trae,
      `rsc=${esRsc} ficha=${ficha} actividad=${trae} (${cuerpo.length} bytes)`,
    );
  }

  // 4 · Una actividad que no existe
  const r404 = await fetch(`${url}/explorar/zz`);
  anotar('/explorar/zz da "no encontrada"', r404.status === 404, `estado ${r404.status}`);

  // 5 · Enlaces viejos y áreas privadas: a qué ingreso llevan
  const destinos = [
    ['/clase/actividad', '/clase'],
    ['/clase/apodo', '/clase'],
    ['/clase/espera', '/clase'],
    ['/maestra', '/maestra/entrar'],
    ['/maestra/a1/preparar', '/maestra/entrar'],
    ['/maestra/a1/sala', '/maestra/entrar'],
    ['/maestra/a2/tablero', '/maestra/entrar'],
    ['/maestra/a3/puesta', '/maestra/entrar'],
    ['/maestra/aulas', '/maestra/entrar'],
    ['/maestra/preguntar', '/maestra/entrar'],
    ['/lab', '/clase'],
    ['/equipo', '/equipo/entrar'],
    ['/equipo/fichas', '/equipo/entrar'],
    ['/equipo/asistente', '/equipo/entrar'],
  ];
  for (const [desde, hacia] of destinos) {
    const v = await visitar(navegador, url, desde);
    anotar(`${desde} lleva a ${hacia}`, v.ruta === hacia && !v.actividad, `terminó en ${v.ruta}`);
  }
} finally {
  await navegador.close();
  parar();
}
const fallas = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallas} OK · ${fallas} FALLAS (${resultados.length} comprobaciones)`);
process.exit(fallas ? 1 : 0);
