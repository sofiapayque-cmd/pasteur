/*
  Pruebas de los cuadernos (src/lib/cuadernos.ts): en qué anda la pregunta
  de un chico, el diario de clase y los datos que escribe la maestra.
  Correr con: npm run test:cuadernos
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diarioDeClase, fechaEscrita, limpiarNota, minutosDeClase, minutosEscritos, pasoDePregunta, textoMinutos } from '../src/lib/cuadernos.ts';

test('la pregunta de un chico: qué le pasó, contado para él', () => {
  assert.equal(pasoDePregunta('nueva', false).paso, 'sin_ver');
  assert.equal(pasoDePregunta('enviada', false).paso, 'esperando');
  assert.equal(pasoDePregunta('conversada', false).paso, 'conversada');
  // Si llegó la respuesta, eso es lo que importa
  assert.equal(pasoDePregunta('enviada', true).paso, 'respondida');
  assert.equal(pasoDePregunta('nueva', true).paso, 'respondida');
});

test('cuánto duró una clase en vivo', () => {
  assert.equal(minutosDeClase('2026-11-16T13:00:00Z', '2026-11-16T13:45:20Z'), 45);
  assert.equal(minutosDeClase('2026-11-16T13:00:00Z', null), null); // todavía abierta
  assert.equal(minutosDeClase('2026-11-16T13:00:00Z', '2026-11-16T13:00:30Z'), null); // menos de un minuto
  assert.equal(minutosDeClase('2026-11-16T13:00:00Z', '2026-11-18T13:00:00Z'), 600); // se olvidó de cerrarla: tope
  assert.equal(textoMinutos(45), '45 min');
  assert.equal(textoMinutos(80), '1 h 20 min');
  assert.equal(textoMinutos(120), '2 h');
  assert.equal(textoMinutos(null), '');
});

test('el diario: clases en vivo y notas juntas, del más nuevo al más viejo', () => {
  const sesiones = [
    { id: 's1', actividad: 'a1', iniciada_en: '2026-11-10T13:00:00Z', cerrada_en: '2026-11-10T13:40:00Z', estado: 'cerrada' },
    { id: 's2', actividad: 'a3', iniciada_en: '2026-11-14T14:00:00Z', cerrada_en: '2026-11-14T15:00:00Z', estado: 'cerrada' },
  ];
  const notas = [
    { id: 'n1', fecha: '2026-11-10', actividad: 'a1', minutos: 50, texto: 'Hicimos las placas.', sesion_id: 's1' },
    { id: 'n2', fecha: '2026-11-12', actividad: 'a2', minutos: 30, texto: 'La hicimos sin la web.', sesion_id: null },
  ];
  const d = diarioDeClase(sesiones, notas);
  assert.deepEqual(d.map((e) => e.clave), ['s-s2', 'n-n2', 's-s1']);
  // La nota de una clase va con esa clase, y lo que escribió la maestra manda sobre lo calculado
  assert.equal(d[2].nota?.id, 'n1');
  assert.equal(d[2].minutos, 50);
  // Una clase sin nota: actividad y minutos de la clase en vivo
  assert.equal(d[0].nota, null);
  assert.equal(d[0].actividad, 'a3');
  assert.equal(d[0].minutos, 60);
  // La fecha es la de Montevideo (una clase a la 1 de la mañana UTC es del día anterior)
  assert.equal(diarioDeClase([{ id: 'x', actividad: null, iniciada_en: '2026-11-16T01:00:00Z', cerrada_en: null, estado: 'esperando' }], [])[0].fecha, '2026-11-15');
});

test('lo que escriben: limpio y con límites', () => {
  assert.equal(limpiarNota('  hola   mundo \n\n\n\n chau  '), 'hola mundo \n\n chau');
  assert.equal(limpiarNota('a'.repeat(900)).length, 500);
  assert.equal(limpiarNota(null), '');
  assert.equal(minutosEscritos('45'), 45);
  assert.equal(minutosEscritos('0'), null);
  assert.equal(minutosEscritos('900'), null);
  assert.equal(minutosEscritos('x'), null);
  assert.equal(fechaEscrita('2026-11-10', '2026-11-16'), '2026-11-10');
  assert.equal(fechaEscrita('2026-11-17', '2026-11-16'), null); // del futuro
  assert.equal(fechaEscrita('2020-01-01', '2026-11-16'), null); // muy vieja
  assert.equal(fechaEscrita('10/11/2026', '2026-11-16'), null);
});
