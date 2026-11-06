/*
  Pruebas de cómo se ordena lo que escribe un chico al entrar
  (src/lib/aulas/ingreso.ts). Correr con: npm run test:ingreso
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerIngreso, normalizarClave, normalizarCodigo, normalizarNumero } from '../src/lib/aulas/ingreso.ts';

test('código del aula: mayúsculas y sin espacios ni guiones', () => {
  assert.equal(normalizarCodigo(' k7rm '), 'K7RM');
  assert.equal(normalizarCodigo('k7-rm'), 'K7RM');
  assert.equal(normalizarCodigo('K7RM-07'), 'K7RM', 'si pegan el usuario entero, toma el código');
});

test('número: de 1 a 60, con o sin cero adelante', () => {
  assert.equal(normalizarNumero('7'), 7);
  assert.equal(normalizarNumero('07'), 7);
  assert.equal(normalizarNumero(' 25 '), 25);
  assert.equal(normalizarNumero('0'), null);
  assert.equal(normalizarNumero('61'), null);
  assert.equal(normalizarNumero('123'), null);
  assert.equal(normalizarNumero(''), null);
});

test('clave: perdona mayúsculas, espacios, tildes y el guion antes del número', () => {
  assert.equal(normalizarClave('Sapo-Luna-42'), 'sapo-luna-42');
  assert.equal(normalizarClave('sapo luna 42'), 'sapo-luna-42');
  assert.equal(normalizarClave('  sapo_luna_42 '), 'sapo-luna-42');
  assert.equal(normalizarClave('ratón-colibrí-17'), 'raton-colibri-17');
  assert.equal(normalizarClave('sapo-luna42'), 'sapo-luna-42');
  assert.equal(normalizarClave('sapo--luna--42'), 'sapo-luna-42');
});

test('ingreso completo: arma el usuario o dice qué está mal escrito', () => {
  assert.deepEqual(leerIngreso('k7rm', '7', 'Sapo Luna 42'), { usuario: 'K7RM-07', clave: 'sapo-luna-42' });
  assert.deepEqual(leerIngreso('K7R', '7', 'sapo-luna-42'), { error: 'codigo' });
  assert.deepEqual(leerIngreso('K1RM', '7', 'sapo-luna-42'), { error: 'codigo' }, 'el 1 no se usa en los códigos');
  assert.deepEqual(leerIngreso('K7RM', '', 'sapo-luna-42'), { error: 'numero' });
  assert.deepEqual(leerIngreso('K7RM', '7', 'sapoluna42'), { error: 'clave' });
  assert.deepEqual(leerIngreso('K7RM', '7', 'sapo-luna-05'), { error: 'clave' }, 'los números de clave van de 10 a 99');
});
