/*
  A1 · placas (bloque 7): la firma de cada ambiente y que las placas que los
  chicos ya guardaron sigan teniendo las colonias en el mismo lugar.
  npm run test:placas
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colonias, resultadoPlaca, coloresColonias } from '../src/actividades/a1/laboratorio.js';
import { FIRMA, MORFOTIPOS, firma, formaColonia, arrugas, tamanoColonia, tono } from '../src/actividades/a1/colonias.js';
import { AMBIENTES } from '../src/actividades/a1/datos.js';

// Posiciones calculadas con la versión anterior (commit 0b93ca8), antes de cambiar el dibujo
const ANTES = [{"c":{"ambiente":"campo-suelo","temp":"templado","semilla":8465},"pos":[[287.021,274.86,2],[122.277,279.193,1],[261.978,304.151,1],[219.858,118.234,2],[159.797,291.942,1],[307.213,193.775,2],[170.197,254.234,2],[248.709,205.817,1],[84.511,215.025,1],[172.762,192.358,1],[194.786,150.316,1],[294.293,177.399,2],[301.488,104.107,2],[303.044,160.94,1],[162.939,214.398,1],[132.401,98.981,1],[245.956,101.19,1],[117.627,253.523,2]]},{"c":{"ambiente":"antartida-suelo","temp":"frio","semilla":40,"contaminada":true},"pos":[[263.399,197.435,1],[157.426,166.838,1],[294.098,227.366,1],[260.121,145.518,1],[200.955,233.796,1],[288.777,100.698,2],[320.178,238.726,1],[148.101,254.378,1],[245.708,198.156,2],[242.49,162.558,1],[145.447,154.086,2],[282.012,267.238,1],[259.014,308.516,1],[148.223,128.419,2],[79.337,219.446,1],[171.666,208.099,1],[278.779,104.876,1],[298.848,262.279,1],[286.894,271.925,1],[281.316,190.353,2],[96.628,224.32,2],[89.789,237.292,2],[281.191,204.459,2],[315.714,229.169,2],[238.906,189.078,2]]},{"c":{"ambiente":"campo-vaca","temp":"tibio","semilla":1},"pos":[[96.106,219.93,2],[325.471,148.04,1],[156.742,96.776,1],[277.444,114.637,2],[249.837,190.123,1],[250.001,215.734,1],[157.268,261.97,2],[218.293,115.331,2],[151.953,88.317,2],[87.692,211.427,1],[288.551,113.163,1],[211.163,304.024,1],[266.871,154.51,1],[89.975,133.121,2],[207.062,110.357,1],[170.182,178.718,2],[109.568,84.704,2],[152.509,200.814,1]]}];

test('las colonias de una placa guardada quedan en el mismo lugar que antes', () => {
  for (const { c, pos } of ANTES) {
    const ahora = colonias(c).map((k) => [+k.x.toFixed(3), +k.y.toFixed(3), k.aparece]);
    assert.deepEqual(ahora, pos, `${c.ambiente} ${c.temp} ${c.semilla}`);
  }
});

test('cada ambiente tiene su firma: 3 tipos de colonia que existen', () => {
  for (const a of AMBIENTES) {
    assert.equal(FIRMA[a.id]?.length, 3, a.id);
    for (const id of FIRMA[a.id]) assert.ok(MORFOTIPOS[id], `${a.id}: ${id}`);
  }
});

test('el tipo más común de cada ambiente es distinto en suelo antártico, pingüino y campo', () => {
  const primeros = ['antartida-suelo', 'antartida-pinguino', 'campo-suelo'].map((a) => FIRMA[a][0]);
  assert.equal(new Set(primeros).size, 3);
});

test('cada colonia usa un tipo de la firma de su ambiente, y la cuenta no cambió', () => {
  for (const a of AMBIENTES) {
    for (const temp of ['frio', 'templado', 'tibio']) {
      const placa = { ambiente: a.id, temp, semilla: 77 };
      const lista = colonias(placa);
      const { colonias: n, tipos } = resultadoPlaca(placa);
      assert.equal(lista.length, n);
      for (const k of lista) {
        assert.ok(FIRMA[a.id].slice(0, tipos).includes(k.forma), `${a.id} ${temp}: ${k.forma}`);
        assert.equal(k.color, MORFOTIPOS[k.forma].color);
      }
    }
  }
});

test('la misma placa se dibuja igual siempre (mesa, cuaderno y puesta en común)', () => {
  const placa = { ambiente: 'campo-suelo', temp: 'templado', semilla: 123, contaminada: true };
  assert.deepEqual(colonias(placa), colonias(placa));
  assert.equal(formaColonia('irregular', 12, 5), formaColonia('irregular', 12, 5));
  assert.equal(arrugas(12, 5), arrugas(12, 5));
});

test('las colonias crecen más a la temperatura que les gusta', () => {
  const m = MORFOTIPOS.crema;
  assert.ok(tamanoColonia(m, 0.5, 1) > tamanoColonia(m, 0.5, 0.22));
  assert.ok(tamanoColonia(m, 0.5, 0.22) > 0);
  // Y en promedio las placas a la temperatura preferida tienen colonias más grandes
  const prom = (temp) => { const l = colonias({ ambiente: 'antartida-suelo', temp, semilla: 9 }); return l.reduce((s, k) => s + k.tam, 0) / l.length; };
  assert.ok(prom('frio') > prom('tibio'));
});

test('las formas son contornos cerrados y válidos', () => {
  for (const borde of ['entero', 'ondulado', 'lobulado', 'irregular']) {
    const d = formaColonia(borde, 10, 3);
    assert.match(d, /^M[-\d.]+ [-\d.]+(Q[-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+)+Z$/, borde);
    assert.ok(!d.includes('NaN'), borde);
  }
});

test('colores: el césped de antibióticos usa la firma; tono aclara y oscurece', () => {
  assert.deepEqual(coloresColonias('antartida-suelo'), firma('antartida-suelo').map((m) => m.color));
  assert.equal(tono('#808080', 1), '#FFFFFF');
  assert.equal(tono('#808080', 0), '#808080');
  assert.notEqual(tono('#808080', -0.5), '#808080');
});
