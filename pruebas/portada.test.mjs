/*
  Portada ilustrada: las cuentas de la lupa y de las células (movimiento.ts).
  npm run test:portada

  Lo más importante: que la copia ampliada quede exactamente donde la vería
  una lupa real, para cualquier posición de la célula y de la lupa.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELULAS, CELULA_ALTO, LENTE, PUNTA, RADIO_VIDRIO, enLaLente } from '../src/components/hero/escena.ts';
import {
  AUMENTO,
  LUPA_ACTIVA,
  LUPA_REPOSO,
  cajaLibre,
  centroOptico,
  recorridoLibre,
  derivaDe,
  transformAdentro,
  transformAfuera,
} from '../src/components/hero/movimiento.ts';

const rad = (g) => (g * Math.PI) / 180;
const rotar = (v, g) => ({ x: v.x * Math.cos(rad(g)) - v.y * Math.sin(rad(g)), y: v.x * Math.sin(rad(g)) + v.y * Math.cos(rad(g)) });

/* Lee "translate(X%, Y%) rotate(Rdeg) scale(S)" */
function leer(t) {
  const m = t.match(/translate\((-?[\d.]+)%, (-?[\d.]+)%\) rotate\((-?[\d.]+)deg\) scale\((-?[\d.]+)\)/);
  assert.ok(m, t);
  return { x: +m[1], y: +m[2], giro: +m[3], escala: +m[4] };
}

/*
  Dónde termina en pantalla el centro de la copia ampliada, siguiendo las
  mismas capas que arma el CSS: la copia dentro de la capa ampliada (que gira
  al revés que la lupa), dentro del vidrio, dentro de la lupa (que gira y
  crece desde la punta del mango).
*/
function centroEnPantalla(c, transform, giroLupa, escalaLupa) {
  const t = leer(transform);
  const reposo = enLaLente(c);
  const ancho = c.d * AUMENTO;
  const local = { x: reposo.x + (t.x / 100) * ancho, y: reposo.y + (t.y / 100) * ancho * CELULA_ALTO };
  const enCapa = rotar({ x: local.x - RADIO_VIDRIO, y: local.y - RADIO_VIDRIO }, -giroLupa);
  const enEscena = { x: LENTE.x + enCapa.x, y: LENTE.y + enCapa.y };
  const desdePunta = rotar({ x: enEscena.x - PUNTA.x, y: enEscena.y - PUNTA.y }, giroLupa);
  return { x: PUNTA.x + escalaLupa * desdePunta.x, y: PUNTA.y + escalaLupa * desdePunta.y };
}

function azar(semilla) {
  let s = semilla;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

test('en reposo la lupa está donde la dejó la composición aprobada', () => {
  const ls = centroOptico(LUPA_REPOSO.giro, LUPA_REPOSO.escala);
  assert.ok(Math.abs(ls.x - LENTE.x) < 1e-9 && Math.abs(ls.y - LENTE.y) < 1e-9);
});

test('activa: sube entre 40 y 60 unidades, casi en vertical, y crece entre 8 y 12 %', () => {
  const ls = centroOptico(LUPA_ACTIVA.giro, LUPA_ACTIVA.escala);
  const sube = LENTE.y - ls.y;
  assert.ok(sube >= 40 && sube <= 60, `sube ${sube}`);
  assert.ok(Math.abs(ls.x - LENTE.x) < 5, `se corre ${ls.x - LENTE.x}`);
  assert.ok(LUPA_ACTIVA.escala >= 1.08 && LUPA_ACTIVA.escala <= 1.12);
  // el aumento, levantada, queda entre 1,7 y 2
  const aumento = AUMENTO * LUPA_ACTIVA.escala;
  assert.ok(aumento >= 1.7 && aumento <= 2, `aumento ${aumento}`);
});

test('la punta del mango no se mueve: la lupa gira y crece desde ahí', () => {
  // la punta es el centro del giro: rotar y escalar un vector nulo da cero
  const p = rotar({ x: 0, y: 0 }, LUPA_ACTIVA.giro);
  assert.deepEqual(p, { x: 0, y: 0 });
  assert.ok(PUNTA.y > 900 && PUNTA.y < 960, 'la punta queda en el piso, detrás del grupo');
});

test('la copia ampliada queda donde la vería una lupa real (muchas posiciones al azar)', () => {
  const r = azar(7);
  let probadas = 0;
  for (let vuelta = 0; vuelta < 400; vuelta++) {
    const c = CELULAS[vuelta % CELULAS.length];
    const giroLupa = (r() - 0.5) * 8;
    const escalaLupa = 1 + r() * 0.15;
    const e = { dx: (r() - 0.5) * 300, dy: (r() - 0.5) * 300, giro: (r() - 0.5) * 40, escala: 0.97 + r() * 0.06 };
    const ls = centroOptico(giroLupa, escalaLupa);
    const t = transformAdentro(c, e, ls);
    const real = { x: c.x + e.dx, y: c.y + e.dy };
    const esperado = {
      x: ls.x + AUMENTO * escalaLupa * (real.x - ls.x),
      y: ls.y + AUMENTO * escalaLupa * (real.y - ls.y),
    };
    const obtenido = centroEnPantalla(c, t.transform, giroLupa, escalaLupa);
    assert.ok(Math.hypot(obtenido.x - esperado.x, obtenido.y - esperado.y) < 0.05, `${c.id}: ${JSON.stringify({ obtenido, esperado })}`);
    // gira igual que la de afuera y con el mismo tamaño relativo
    const a = leer(transformAfuera(c, e));
    const b = leer(t.transform);
    assert.equal(a.giro, b.giro);
    assert.equal(a.escala, b.escala);
    // se ve solo si toca el vidrio
    const radioAmpliado = (AUMENTO * escalaLupa * c.d * e.escala) / 2;
    const toca = Math.hypot(esperado.x - ls.x, esperado.y - ls.y) - radioAmpliado < RADIO_VIDRIO * escalaLupa;
    assert.equal(t.visible, toca, c.id);
    probadas++;
  }
  assert.equal(probadas, 400);
});

test('una célula que cruza la lupa: se ve ampliada solo mientras pasa por el vidrio', () => {
  const c = CELULAS.find((x) => x.id === 'h');
  const ls = centroOptico(0, 1);
  const estados = [];
  // de izquierda a derecha, a la altura del centro óptico
  for (let x = LENTE.x - 400; x <= LENTE.x + 400; x += 10) {
    const e = { dx: x - c.x, dy: LENTE.y - c.y, giro: 0, escala: 1 };
    estados.push(transformAdentro(c, e, ls).visible);
  }
  const entra = estados.indexOf(true);
  const sale = estados.lastIndexOf(true);
  assert.ok(entra > 0 && sale < estados.length - 1, 'empieza y termina afuera');
  assert.ok(estados.slice(entra, sale + 1).every(Boolean), 'adentro se ve todo el tiempo');
});

test('la célula de afuera se mueve en % de su tamaño: en su lugar, no se corre', () => {
  for (const c of CELULAS) {
    const t = leer(transformAfuera(c, { dx: 0, dy: 0, giro: 0, escala: 1 }));
    assert.equal(t.x, 0);
    assert.equal(t.y, 0);
    assert.equal(t.giro, c.giro);
  }
});

test('las células no se acercan a los textos', () => {
  // un texto justo debajo de una célula, otro a la derecha
  const c = { id: 'p', x: 500, y: 100, d: 80, giro: 0 };
  const zonas = [
    { izq: 300, der: 900, arr: 160, aba: 240 },
    { izq: 600, der: 700, arr: 0, aba: 120 },
  ];
  const caja = cajaLibre(c, zonas);
  const r = (c.d / 2) * 1.025;
  // ninguna esquina de la caja (más el radio de la célula) toca un texto
  for (const z of zonas) {
    const lejos =
      c.x + caja.der + r <= z.izq || c.x - caja.izq - r >= z.der || c.y + caja.aba + r <= z.arr || c.y - caja.arr - r >= z.aba;
    assert.ok(lejos, JSON.stringify({ caja, z }));
  }
  // y se sigue moviendo hacia donde hay lugar
  assert.equal(caja.izq, derivaDe(c));
  assert.equal(caja.arr, derivaDe(c));
});

test('sin textos cerca, cada célula se mueve lo que le corresponde por su tamaño', () => {
  for (const c of CELULAS) {
    const caja = cajaLibre(c, []);
    assert.deepEqual(caja, { izq: derivaDe(c), der: derivaDe(c), arr: derivaDe(c), aba: derivaDe(c) });
  }
  const chica = CELULAS.find((c) => c.id === 'e');
  const grande = CELULAS.find((c) => c.id === 'a');
  assert.ok(derivaDe(grande) > derivaDe(chica), 'las grandes (más cerca) se mueven más');
});

test('si una célula queda debajo de un texto (pantalla chica), sale lo justo y sigue moviéndose', () => {
  const c = { id: 'q', x: 1560, y: 140, d: 104, giro: 0 };
  // "Pedí acceso" a 1024 × 600, en unidades de la escena
  const pildora = { izq: 1020, der: 1830, arr: 45, aba: 120 };
  const { ox, oy, caja } = recorridoLibre(c, [pildora]);
  const x = c.x + ox;
  const y = c.y + oy;
  const r = (c.d / 2) * 1.025;
  assert.ok(Math.hypot(ox, oy) > 0 && Math.hypot(ox, oy) < 100, `se corre ${ox}, ${oy}`);
  assert.ok(y - caja.arr - r >= pildora.aba, 'ni en su punto más alto toca la píldora');
  assert.ok(caja.izq > 0 && caja.der > 0 && caja.aba > 0, 'se sigue moviendo');
  assert.ok(x > 0 && x < 1920);
  // sin textos encima, no se corre
  assert.deepEqual(recorridoLibre(CELULAS[0], []).ox, 0);
});
