/*
  Pruebas del asistente para la clase sin red (src/lib/ia/asistente.ts).
  Correr con: npm run test:asistente
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { candidatas, decidir, entradaControl, leerEleccion, limpiarPregunta, normalizarPregunta } from '../src/lib/ia/asistente.ts';
import { casos, evaluar, faltantes, fichaDeAncla, pedidaDeNota, resumir, SET } from '../src/lib/ia/pruebaAsistente.ts';

test('limpia la pregunta: sin mails, links ni teléfonos; deja los números de ciencia', () => {
  assert.equal(limpiarPregunta('  ¿Por qué   brillan\nlas medusas? '), '¿Por qué brillan las medusas?');
  assert.equal(limpiarPregunta('Escribile a juan@escuela.uy si sabe'), 'Escribile a […] si sabe');
  assert.equal(limpiarPregunta('Lo vi en https://ejemplo.com/video'), 'Lo vi en […]');
  assert.equal(limpiarPregunta('Llamá al 099 123 456'), 'Llamá al […]');
  assert.equal(limpiarPregunta('¿Hay 1 000 000 de bacterias en la mano?'), '¿Hay 1 000 000 de bacterias en la mano?');
  assert.equal(limpiarPregunta('¿El cuerpo está a 37 grados?'), '¿El cuerpo está a 37 grados?');
  assert.equal(limpiarPregunta('a'.repeat(400)).length, 300);
});

test('normaliza para reconocer la misma pregunta escrita distinto', () => {
  assert.equal(normalizarPregunta('¿Por qué brillan las medusas?'), normalizarPregunta('por que BRILLAN las medusas'));
  assert.equal(normalizarPregunta('¿Qué es el ADN?'), 'que es el adn');
});

const f = (ficha_id, similitud, tipo = 'pregunta') => ({ ficha_id, similitud, tipo, texto: '' });

test('candidatas: la mejor coincidencia de cada ficha, desde el piso, de la más parecida a la menos', () => {
  const c = candidatas([f('A', 0.6), f('A', 0.88, 'variante'), f('B', 0.8), f('C', 0.4), f('D', Number.NaN)], 0.5, 4);
  assert.deepEqual(c, [
    { fichaId: 'A', similitud: 0.88 },
    { fichaId: 'B', similitud: 0.8 },
  ]);
  assert.equal(candidatas([f('A', 0.9), f('B', 0.8), f('C', 0.7), f('D', 0.6), f('E', 0.55)], 0.5, 4).length, 4);
  assert.deepEqual(candidatas([], 0.5, 4), []);
});

const cs = [
  { fichaId: 'A', similitud: 0.9 },
  { fichaId: 'B', similitud: 0.75 },
  { fichaId: 'C', similitud: 0.55 },
];

test('decide: se muestra como "la misma" SOLO la que eligió el control', () => {
  assert.deepEqual(decidir(cs, 1, 0.68), { tipo: 'respuesta', fichaId: 'A', similitud: 0.9 });
  // El control puede elegir una menos parecida (por ejemplo, la pregunta escrita con faltas)
  assert.deepEqual(decidir(cs, 3, 0.68), { tipo: 'respuesta', fichaId: 'C', similitud: 0.55 });
});

test('decide: si el control dice ninguna o no responde, nunca "la misma": se ofrecen las parecidas', () => {
  for (const eleccion of [0, null, 7, -1, 1.5]) {
    const d = decidir(cs, eleccion, 0.68);
    assert.equal(d.tipo, 'parecidas', `eleccion ${eleccion}`);
    assert.deepEqual(d.fichas.map((x) => x.fichaId), ['A', 'B']);
  }
  assert.deepEqual(decidir([{ fichaId: 'C', similitud: 0.55 }], 0, 0.68), { tipo: 'nada' });
  assert.deepEqual(decidir([], 1, 0.68), { tipo: 'nada' });
});

test('control: lo que se le manda y cómo se lee lo que devuelve', () => {
  const e = entradaControl('porq las celulas tienen nucleo', [{ pregunta: '¿Por qué las células tienen núcleo?', texto: 'El núcleo  guarda\n el ADN.' }]);
  assert.match(e, /Pregunta de la clase: porq las celulas tienen nucleo/);
  assert.match(e, /1\. Pregunta que responde: ¿Por qué las células tienen núcleo\?\n   Texto: El núcleo guarda el ADN\./);
  assert.equal(leerEleccion({ eleccion: 2 }, 3), 2);
  assert.equal(leerEleccion({ eleccion: 0 }, 3), 0);
  assert.equal(leerEleccion({ eleccion: 4 }, 3), null);
  assert.equal(leerEleccion({ eleccion: '1' }, 3), null);
  assert.equal(leerEleccion(null, 3), null);
});

// ---------------------------------------------------------------------
// Prueba de calidad (src/lib/ia/pruebaAsistente.ts)
// ---------------------------------------------------------------------
test('prueba: el set tiene variantes, trampas y otros temas, sin repetir', () => {
  const c = casos();
  const n = (g) => c.filter((x) => x.grupo === g).length;
  assert.ok(n('variante') >= 40, `variantes: ${n('variante')}`);
  assert.ok(n('trampa') >= 15, `trampas: ${n('trampa')}`);
  assert.ok(n('otro_tema') >= 6);
  assert.equal(new Set(c.map((x) => normalizarPregunta(x.consulta))).size, c.length);
  // Una trampa que es ancla de otro grupo no se repite
  const sinRepetir = casos([{ ancla: '¿A?', pedir: true, variantes: [], trampas: ['¿B?'] }, { ancla: '¿B?', pedir: true, variantes: [], trampas: [] }], []);
  assert.deepEqual(sinRepetir.map((x) => [x.consulta, x.grupo]), [['¿A?', 'variante'], ['¿B?', 'variante']]);
  assert.equal(SET.filter((g) => g.pedir).length, 8);
});

test('prueba: cada ancla encuentra su respuesta por la pregunta, una variante o lo pedido a la IA', () => {
  const pub = [
    { fichaId: 'N', pregunta: '¿Por qué las células tienen núcleo?', variantes: [], pedida: '' },
    { fichaId: 'B', pregunta: '¿Por qué las bacterias no tienen núcleo?', variantes: [], pedida: '¿Las bacterias tienen núcleo?' },
    { fichaId: 'D', pregunta: 'ADN', variantes: ['¿Qué es el ADN?'], pedida: '' },
  ];
  assert.equal(fichaDeAncla('por que las celulas tienen nucleo', pub), 'N');
  assert.equal(fichaDeAncla('¿Las bacterias tienen núcleo?', pub), 'B');
  assert.equal(fichaDeAncla('¿Qué es el ADN?', pub), 'D');
  assert.equal(fichaDeAncla('¿Qué es el ARN?', pub), null);
  assert.equal(fichaDeAncla(null, pub), null);
  assert.equal(pedidaDeNota('Redactada con IA.\nPregunta pedida: ¿Qué es el ADN?\nBúsquedas: dna'), '¿Qué es el ADN?');
  assert.equal(pedidaDeNota(null), '');
  assert.ok(!faltantes(pub).includes('¿Las bacterias tienen núcleo?'));
  assert.ok(faltantes(pub).includes('¿Qué es una célula?'));
  assert.ok(!faltantes(pub).includes('¿Por qué las células tienen núcleo?'), 'las que no son para pedir no aparecen');
});

test('prueba: cómo se corrige cada caso', () => {
  const r = (fichaId) => ({ tipo: 'respuesta', fichaId, similitud: 0.9 });
  const p = (...ids) => ({ tipo: 'parecidas', fichas: ids.map((fichaId) => ({ fichaId, similitud: 0.7 })) });
  assert.deepEqual(evaluar('A', r('A')), { correcta: true, encontrada: true, mostradaId: 'A', parecidas: [] });
  assert.deepEqual(evaluar('A', p('B', 'A')), { correcta: true, encontrada: true, mostradaId: null, parecidas: ['B', 'A'] });
  assert.deepEqual(evaluar('A', r('B')), { correcta: false, encontrada: false, mostradaId: 'B', parecidas: [] });
  assert.deepEqual(evaluar('A', { tipo: 'nada' }), { correcta: true, encontrada: false, mostradaId: null, parecidas: [] });
  // Trampa u otro tema: nunca "la misma"
  assert.equal(evaluar(null, r('A')).correcta, false);
  assert.deepEqual(evaluar(null, p('A')), { correcta: true, encontrada: null, mostradaId: null, parecidas: ['A'] });
  const res = resumir([
    { correcta: true, encontrada: true, resultado: 'respuesta', mostrada_id: 'A', esperada_id: 'A' },
    { correcta: true, encontrada: true, resultado: 'parecidas', mostrada_id: null, esperada_id: 'A' },
    { correcta: true, encontrada: false, resultado: 'nada', mostrada_id: null, esperada_id: 'A' },
    { correcta: false, encontrada: null, resultado: 'respuesta', mostrada_id: 'A', esperada_id: null },
    { correcta: true, encontrada: null, resultado: 'error', mostrada_id: null, esperada_id: null },
  ]);
  assert.deepEqual(res, { casos: 5, equivocadas: 1, conRespuesta: 3, encontradas: 2, directas: 1, sinRespuesta: 2, errores: 1 });
});
