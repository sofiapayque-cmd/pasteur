/*
  Pruebas del asistente para la clase sin red (src/lib/ia/asistente.ts).
  Correr con: npm run test:asistente
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidir, limpiarPregunta, normalizarPregunta } from '../src/lib/ia/asistente.ts';

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

test('decide: la misma pregunta → la respuesta aprobada', () => {
  assert.deepEqual(decidir([f('A', 0.91), f('B', 0.7)], 0.84, 0.68), { tipo: 'respuesta', fichaId: 'A', similitud: 0.91 });
});

test('decide: la mejor coincidencia de cada ficha (pregunta o variante)', () => {
  const d = decidir([f('A', 0.6), f('A', 0.88, 'variante'), f('B', 0.8)], 0.84, 0.68);
  assert.equal(d.tipo, 'respuesta');
  assert.equal(d.fichaId, 'A');
});

test('decide: parecidas (hasta 3, de la más parecida a la menos)', () => {
  const d = decidir([f('A', 0.7), f('B', 0.8), f('C', 0.75), f('D', 0.69), f('E', 0.5)], 0.84, 0.68);
  assert.equal(d.tipo, 'parecidas');
  assert.deepEqual(d.fichas.map((x) => x.fichaId), ['B', 'C', 'A']);
});

test('decide: nada si no hay parecidas, o si la lista viene vacía o rara', () => {
  assert.deepEqual(decidir([f('A', 0.3)], 0.84, 0.68), { tipo: 'nada' });
  assert.deepEqual(decidir([], 0.84, 0.68), { tipo: 'nada' });
  assert.deepEqual(decidir([f('A', Number.NaN)], 0.84, 0.68), { tipo: 'nada' });
});
