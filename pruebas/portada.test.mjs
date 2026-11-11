/*
  Portada ilustrada: las cuentas de la lupa (movimiento.ts) y el viaje de las
  células por la pantalla (deriva.ts).
  npm run test:portada

  Lo más importante:
  - que la copia ampliada quede exactamente donde la vería una lupa real,
    para cualquier posición de la célula y de la lupa, y con cualquier aumento;
  - que las células recorran toda la pantalla, pasen seguido por la lupa y
    nunca tapen los textos.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELULAS, CELULA_ALTO, ESCENA, LENTE, PUNTA, RADIO_VIDRIO, enLaLente } from '../src/components/hero/escena.ts';
import {
  LUPA_ACTIVA,
  LUPA_REPOSO,
  MARGEN_TEXTOS,
  centroOptico,
  nuevoEstadoCelula,
  salirDeZonas,
  transformAdentro,
  transformAfuera,
} from '../src/components/hero/movimiento.ts';
import { DERIVA, avanzar, nuevoRumbo, radioDe, velocidadDe } from '../src/components/hero/deriva.ts';

const rad = (g) => (g * Math.PI) / 180;
const rotar = (v, g) => ({ x: v.x * Math.cos(rad(g)) - v.y * Math.sin(rad(g)), y: v.x * Math.sin(rad(g)) + v.y * Math.cos(rad(g)) });

/* Lee "translate(X%, Y%) rotate(Rdeg) scale(S)" */
function leer(t) {
  const m = t.match(/translate\((-?[\d.]+)%, (-?[\d.]+)%\) rotate\((-?[\d.]+)deg\) scale\((-?[\d.]+)\)/);
  assert.ok(m, t);
  return { x: +m[1], y: +m[2], giro: +m[3], escala: +m[4] };
}

/*
  Dónde termina en pantalla la copia ampliada (centro y ancho), siguiendo las
  mismas capas que arma el CSS: la copia dentro de la capa ampliada (que gira
  al revés que la lupa), dentro del vidrio, dentro de la lupa (que gira y
  crece desde la punta del mango).
*/
function enPantalla(c, transform, giroLupa, escalaLupa) {
  const t = leer(transform);
  const reposo = enLaLente(c); // donde la ubicó el CSS (aumento 1,7)
  const ancho = c.d * LENTE.aumento;
  const local = { x: reposo.x + (t.x / 100) * ancho, y: reposo.y + (t.y / 100) * ancho * CELULA_ALTO };
  const enCapa = rotar({ x: local.x - RADIO_VIDRIO, y: local.y - RADIO_VIDRIO }, -giroLupa);
  const enEscena = { x: LENTE.x + enCapa.x, y: LENTE.y + enCapa.y };
  const desdePunta = rotar({ x: enEscena.x - PUNTA.x, y: enEscena.y - PUNTA.y }, giroLupa);
  return {
    x: PUNTA.x + escalaLupa * desdePunta.x,
    y: PUNTA.y + escalaLupa * desdePunta.y,
    ancho: ancho * t.escala * escalaLupa,
  };
}

function azarCon(semilla) {
  let s = semilla;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

test('en reposo la lupa está donde la dejó la composición aprobada, con aumento 1,7', () => {
  const ls = centroOptico(LUPA_REPOSO.giro, LUPA_REPOSO.escala);
  assert.ok(Math.abs(ls.x - LENTE.x) < 1e-9 && Math.abs(ls.y - LENTE.y) < 1e-9);
  assert.equal(LUPA_REPOSO.aumento, 1.7);
});

test('con el mouse encima: sube entre 40 y 60, casi en vertical, crece entre 8 y 12 % y agranda más', () => {
  const ls = centroOptico(LUPA_ACTIVA.giro, LUPA_ACTIVA.escala);
  const sube = LENTE.y - ls.y;
  assert.ok(sube >= 40 && sube <= 60, `sube ${sube}`);
  assert.ok(Math.abs(ls.x - LENTE.x) < 5, `se corre ${ls.x - LENTE.x}`);
  assert.ok(LUPA_ACTIVA.escala >= 1.08 && LUPA_ACTIVA.escala <= 1.12);
  assert.ok(LUPA_ACTIVA.aumento >= LUPA_REPOSO.aumento * 1.25, `aumento ${LUPA_ACTIVA.aumento}`);
});

test('la punta del mango queda en el piso, detrás del grupo', () => {
  assert.ok(PUNTA.y > 900 && PUNTA.y < 960);
});

test('la copia ampliada queda donde la vería una lupa real (posiciones y aumentos al azar)', () => {
  const r = azarCon(7);
  for (let vuelta = 0; vuelta < 500; vuelta++) {
    const c = CELULAS[vuelta % CELULAS.length];
    const giroLupa = (r() - 0.5) * 8;
    const escalaLupa = 1 + r() * 0.15;
    const aumento = 1.5 + r() * 1.2;
    const e = { dx: (r() - 0.5) * 600, dy: (r() - 0.5) * 400, giro: (r() - 0.5) * 40, escala: 0.97 + r() * 0.06 };
    const ls = centroOptico(giroLupa, escalaLupa);
    const t = transformAdentro(c, e, { ...ls, escala: escalaLupa, aumento });
    const real = { x: c.x + e.dx, y: c.y + e.dy };
    const esperado = { x: ls.x + aumento * (real.x - ls.x), y: ls.y + aumento * (real.y - ls.y), ancho: aumento * c.d * e.escala };
    const obtenido = enPantalla(c, t.transform, giroLupa, escalaLupa);
    assert.ok(Math.hypot(obtenido.x - esperado.x, obtenido.y - esperado.y) < 0.1, `${c.id}: ${JSON.stringify({ obtenido, esperado })}`);
    assert.ok(Math.abs(obtenido.ancho - esperado.ancho) < 0.05, `${c.id}: ancho ${obtenido.ancho} en vez de ${esperado.ancho}`);
    // gira igual que la de afuera
    assert.equal(leer(transformAfuera(c, e)).giro, leer(t.transform).giro);
    // se ve solo si toca el vidrio
    const toca = Math.hypot(esperado.x - ls.x, esperado.y - ls.y) - esperado.ancho / 2 < RADIO_VIDRIO * escalaLupa;
    assert.equal(t.visible, toca, c.id);
  }
});

test('una célula que cruza la lupa se ve ampliada solo mientras pasa por el vidrio (en reposo y con el mouse)', () => {
  const c = CELULAS.find((x) => x.id === 'h');
  for (const pose of [LUPA_REPOSO, LUPA_ACTIVA]) {
    const ls = centroOptico(pose.giro, pose.escala);
    const vistas = [];
    for (let x = ls.x - 400; x <= ls.x + 400; x += 10) {
      const e = { dx: x - c.x, dy: ls.y - c.y, giro: 0, escala: 1 };
      vistas.push(transformAdentro(c, e, { ...ls, escala: pose.escala, aumento: pose.aumento }).visible);
    }
    const entra = vistas.indexOf(true);
    const sale = vistas.lastIndexOf(true);
    assert.ok(entra > 0 && sale < vistas.length - 1, 'empieza y termina afuera');
    assert.ok(vistas.slice(entra, sale + 1).every(Boolean), 'adentro se ve todo el tiempo');
  }
});

test('la célula de afuera se mueve en % de su tamaño: en su lugar, no se corre', () => {
  for (const c of CELULAS) {
    const t = leer(transformAfuera(c, { dx: 0, dy: 0, giro: 0, escala: 1 }));
    assert.equal(t.x, 0);
    assert.equal(t.y, 0);
    assert.equal(t.giro, c.giro);
  }
});

/* Textos a 1920 × 1080, en unidades: título, subtítulo y "Pedí acceso". */
const TEXTOS = [
  { izq: 463, der: 1457, arr: 136, aba: 235 },
  { izq: 735, der: 1185, arr: 265, aba: 311 },
  { izq: 1440, der: 1872, arr: 36, aba: 76 },
];

function distanciaATexto(x, y, z) {
  const dx = Math.max(z.izq - x, 0, x - z.der);
  const dy = Math.max(z.arr - y, 0, y - z.aba);
  return Math.hypot(dx, dy);
}

/* 12 minutos de viaje, 30 cuadros por segundo, a veces con el mouse sobre la lupa. */
function simular(minutos = 12) {
  const mundo = { zonas: TEXTOS, lente: { x: LENTE.x, y: LENTE.y }, azar: azarCon(42) };
  const estados = CELULAS.map(nuevoEstadoCelula);
  const rumbos = CELULAS.map((c) => nuevoRumbo(c, mundo));
  const cuadros = minutos * 60 * 30;
  const dt = 1 / 30;
  const recorrido = CELULAS.map(() => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, vecesEnLaLupa: 0 }));
  let conAlgunaEnLaLupa = 0;
  // ¿se ve alguna por el vidrio (no solo un borde)? cuánto dura lo más largo sin ninguna, y con el mouse encima
  let vacio = 0;
  let peorVacio = 0;
  let cuadrosMouse = 0;
  let mouseConAlguna = 0;
  let peorTexto = Infinity;
  let peorVelocidad = 0;
  let afuera = 0;
  for (let f = 0; f < cuadros; f++) {
    const activa = Math.floor(f / 900) % 3 === 2; // un tercio del tiempo, con el mouse
    const pose = activa ? LUPA_ACTIVA : LUPA_REPOSO;
    const ls = centroOptico(pose.giro, pose.escala);
    mundo.lente = ls;
    mundo.activa = activa;
    mundo.vista = (RADIO_VIDRIO * pose.escala) / pose.aumento;
    avanzar(CELULAS, estados, rumbos, dt, f * dt, mundo);
    let alguna = false;
    let seVe = false;
    CELULAS.forEach((c, i) => {
      const x = c.x + estados[i].dx;
      const y = c.y + estados[i].dy;
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `${c.id} se perdió`);
      const r = recorrido[i];
      r.minX = Math.min(r.minX, x);
      r.maxX = Math.max(r.maxX, x);
      r.minY = Math.min(r.minY, y);
      r.maxY = Math.max(r.maxY, y);
      const visible = transformAdentro(c, estados[i], { ...ls, escala: pose.escala, aumento: pose.aumento }).visible;
      if (visible) {
        alguna = true;
        r.vecesEnLaLupa++;
      }
      // el centro de la copia ampliada adentro del vidrio: se ve de verdad
      if (Math.hypot(x - ls.x, y - ls.y) < mundo.vista) seVe = true;
      for (const z of TEXTOS) peorTexto = Math.min(peorTexto, distanciaATexto(x, y, z) - radioDe(c));
      peorVelocidad = Math.max(peorVelocidad, Math.hypot(rumbos[i].vx, rumbos[i].vy) / velocidadDe(c));
      const min = radioDe(c) * (1 - DERIVA.asomar) - 0.01;
      if (x < min || y < min || x > ESCENA.ancho - min || y > ESCENA.alto - min) afuera++;
    });
    if (alguna) conAlgunaEnLaLupa++;
    vacio = seVe ? 0 : vacio + dt;
    peorVacio = Math.max(peorVacio, vacio);
    if (activa && f % 900 > 90) {
      // con el mouse encima (después de los primeros 3 segundos)
      cuadrosMouse++;
      if (seVe) mouseConAlguna++;
    }
  }
  return {
    recorrido,
    conAlgunaEnLaLupa: conAlgunaEnLaLupa / cuadros,
    peorVacio,
    mouseConAlguna: mouseConAlguna / cuadrosMouse,
    peorTexto,
    peorVelocidad,
    afuera,
  };
}

const SIM = simular();

test('las células recorren toda la pantalla, no solo su lugar', () => {
  SIM.recorrido.forEach((r, i) => {
    const id = CELULAS[i].id;
    assert.ok(r.maxX - r.minX > 900, `${id} recorre ${Math.round(r.maxX - r.minX)} de ancho`);
    assert.ok(r.maxY - r.minY > 450, `${id} recorre ${Math.round(r.maxY - r.minY)} de alto`);
  });
});

test('casi siempre hay alguna célula pasando por la lupa, y todas pasan alguna vez', () => {
  assert.ok(SIM.conAlgunaEnLaLupa > 0.7, `con alguna en la lupa: ${(SIM.conAlgunaEnLaLupa * 100).toFixed(0)} % del tiempo`);
  SIM.recorrido.forEach((r, i) => assert.ok(r.vecesEnLaLupa > 0, `${CELULAS[i].id} nunca pasó por la lupa`));
});

test('el vidrio no queda vacío mucho rato, y con el mouse encima casi nunca', () => {
  assert.ok(SIM.peorVacio < 30, `estuvo ${SIM.peorVacio.toFixed(0)} s sin ninguna célula en el vidrio`);
  assert.ok(SIM.mouseConAlguna > 0.75, `con el mouse encima, se ve alguna el ${(SIM.mouseConAlguna * 100).toFixed(0)} % del tiempo`);
});

test('si el vidrio está vacío, va la célula que llega primero, y sigue de largo', () => {
  const mundo = { zonas: [], lente: { x: LENTE.x, y: LENTE.y }, azar: azarCon(7), activa: true };
  // dos células lejos de la lupa: una grande (rápida) y una chica (lenta) un poco más cerca
  const celulas = [
    { id: 'grande', x: LENTE.x + 500, y: LENTE.y, d: 150, giro: 0 },
    { id: 'chica', x: LENTE.x - 420, y: LENTE.y, d: 36, giro: 0 },
  ];
  const estados = celulas.map(nuevoEstadoCelula);
  const rumbos = celulas.map((c) => nuevoRumbo(c, mundo));
  rumbos.forEach((r) => (r.tramos = 1)); // que ninguna tenga la lupa como próximo destino propio
  for (let f = 0; f < 30; f++) avanzar(celulas, estados, rumbos, 1 / 30, f / 30, mundo);
  assert.equal(rumbos[0].llamada, true, 'la grande (llega antes) va hacia la lupa');
  assert.ok(Math.hypot(rumbos[0].destinoX - LENTE.x, rumbos[0].destinoY - LENTE.y) <= DERIVA.radioLupa + 0.01);
  // llega, pasa por debajo del vidrio y elige otro destino
  let paso = false;
  for (let f = 30; f < 30 * 60 && rumbos[0].llamada; f++) {
    avanzar(celulas, estados, rumbos, 1 / 30, f / 30, mundo);
    const x = celulas[0].x + estados[0].dx;
    const y = celulas[0].y + estados[0].dy;
    if (Math.hypot(x - LENTE.x, y - LENTE.y) < DERIVA.vistaLupa) paso = true;
  }
  assert.equal(rumbos[0].llamada, false, 'eligió otro destino');
  assert.ok(paso, 'pasó por la lupa');
});

test('ninguna célula tapa un texto en 12 minutos', () => {
  assert.ok(SIM.peorTexto > 0, `una célula quedó a ${SIM.peorTexto.toFixed(1)} de un texto`);
});

test('van lento y no salen de la pantalla', () => {
  assert.ok(SIM.peorVelocidad <= 1.6 + 1e-9, `velocidad ${SIM.peorVelocidad.toFixed(2)} veces la suya`);
  assert.equal(SIM.afuera, 0);
  assert.ok(velocidadDe({ d: 150 }) > velocidadDe({ d: 36 }), 'las grandes (más cerca) van más rápido');
});

test('una célula que arranca debajo de un texto sale de a poco, sin saltar', () => {
  const c = { id: 'q', x: 1560, y: 110, d: 104, giro: 0 };
  const mundo = { zonas: [{ izq: 1020, der: 1830, arr: 45, aba: 120 }], lente: { x: LENTE.x, y: LENTE.y }, azar: azarCon(3) };
  const estados = [nuevoEstadoCelula()];
  const rumbos = [nuevoRumbo(c, mundo)];
  let anterior = { x: c.x, y: c.y };
  let peorSalto = 0;
  for (let f = 0; f < 90; f++) {
    avanzar([c], estados, rumbos, 1 / 30, f / 30, mundo);
    const ahora = { x: c.x + estados[0].dx, y: c.y + estados[0].dy };
    peorSalto = Math.max(peorSalto, Math.hypot(ahora.x - anterior.x, ahora.y - anterior.y));
    anterior = ahora;
  }
  const lejos = distanciaATexto(anterior.x, anterior.y, mundo.zonas[0]) - radioDe(c);
  assert.ok(lejos >= MARGEN_TEXTOS - 0.5, `quedó a ${lejos.toFixed(1)}`);
  assert.ok(peorSalto < 8, `saltó ${peorSalto.toFixed(1)} en un cuadro`);
});

test('quieta ("reducir movimiento"): la que quedó debajo de un texto se corre lo justo', () => {
  const c = { id: 'q', x: 1560, y: 140, d: 104, giro: 0 };
  const pildora = { izq: 1020, der: 1830, arr: 45, aba: 120 };
  const { ox, oy } = salirDeZonas(c, [pildora]);
  assert.ok(Math.hypot(ox, oy) > 0 && Math.hypot(ox, oy) < 100, `se corre ${ox}, ${oy}`);
  assert.ok(distanciaATexto(c.x + ox, c.y + oy, pildora) - (c.d / 2) * 1.025 >= MARGEN_TEXTOS - 0.5);
  assert.deepEqual(salirDeZonas(CELULAS[0], []), { ox: 0, oy: 0 });
});
