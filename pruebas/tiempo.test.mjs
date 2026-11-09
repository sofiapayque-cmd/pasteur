/*
  Pruebas del timer de la clase en vivo (src/lib/aulas/tiempo.ts): los
  cálculos que hace cada pantalla con lo que guarda la base.
  Correr con: npm run test:tiempo
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIN_TIEMPO,
  accionesPosibles,
  calcularDesfase,
  estadoEfectivo,
  formatearReloj,
  guardaronAlFinal,
  msRestantes,
  tiempoDeFila,
} from '../src/lib/aulas/tiempo.ts';

const T0 = Date.parse('2026-11-09T14:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

test('sin columnas de tiempo (base sin la migración 21): sin tiempo, cierre flexible', () => {
  assert.deepEqual(tiempoDeFila({}), SIN_TIEMPO);
  assert.deepEqual(tiempoDeFila(null), SIN_TIEMPO);
  assert.equal(tiempoDeFila({ tiempo_estado: 'raro' }).estado, 'sin');
});

test('corriendo: cuenta hacia atrás con la hora del servidor', () => {
  const t = tiempoDeFila({ tiempo_estado: 'corriendo', tiempo_duracion: 600, tiempo_fin: iso(T0 + 600_000) });
  assert.equal(msRestantes(t, T0), 600_000);
  assert.equal(msRestantes(t, T0 + 59_500), 540_500);
  assert.equal(formatearReloj(msRestantes(t, T0 + 59_500)), '9:01');
});

test('cuando pasa el fin, está terminado aunque la base todavía diga corriendo', () => {
  const t = tiempoDeFila({ tiempo_estado: 'corriendo', tiempo_duracion: 600, tiempo_fin: iso(T0) });
  assert.equal(estadoEfectivo(t, T0 - 1), 'corriendo');
  assert.equal(estadoEfectivo(t, T0), 'terminado');
  assert.equal(msRestantes(t, T0 + 5000), 0);
});

test('listo y en pausa: muestran lo que falta, quieto', () => {
  const pausado = tiempoDeFila({ tiempo_estado: 'pausado', tiempo_duracion: 900, tiempo_restante: 305 });
  assert.equal(msRestantes(pausado, T0), 305_000);
  assert.equal(msRestantes(pausado, T0 + 60_000), 305_000);
  assert.equal(formatearReloj(msRestantes(pausado, T0)), '5:05');
});

test('el reloj redondea para arriba y muestra horas si hace falta', () => {
  assert.equal(formatearReloj(0), '0:00');
  assert.equal(formatearReloj(1), '0:01');
  assert.equal(formatearReloj(59_001), '1:00');
  assert.equal(formatearReloj(3_725_000), '1:02:05');
  assert.equal(formatearReloj(-5), '0:00');
});

test('desfase: una Ceibal con el reloj 2 minutos atrasado ve el mismo tiempo que la maestra', () => {
  // La pregunta salió a las 10:00:00.000 (reloj de la Ceibal) y la respuesta llegó 200 ms después;
  // el servidor dijo 10:02:00.100 → la Ceibal va 2 minutos atrasada
  const enviado = Date.parse('2026-11-09T10:00:00.000Z');
  const desfase = calcularDesfase('2026-11-09T10:02:00.100Z', enviado, enviado + 200);
  assert.equal(desfase, 120_000);
  const t = tiempoDeFila({ tiempo_estado: 'corriendo', tiempo_duracion: 600, tiempo_fin: '2026-11-09T10:12:00.000Z' });
  const relojCeibal = Date.parse('2026-11-09T10:01:00.000Z');
  assert.equal(formatearReloj(msRestantes(t, relojCeibal + desfase)), '9:00');
  assert.equal(calcularDesfase('no es fecha', 0, 10), 0);
});

test('lo que puede hacer la maestra en cada momento (igual que la base)', () => {
  assert.deepEqual(accionesPosibles(SIN_TIEMPO, T0), ['poner', 'definitivo']);
  assert.deepEqual(accionesPosibles(tiempoDeFila({ tiempo_estado: 'listo', tiempo_duracion: 600, tiempo_restante: 600 }), T0), ['iniciar', 'quitar', 'extender']);
  const corriendo = tiempoDeFila({ tiempo_estado: 'corriendo', tiempo_duracion: 600, tiempo_fin: iso(T0 + 1000) });
  assert.deepEqual(accionesPosibles(corriendo, T0), ['pausar', 'extender', 'finalizar']);
  assert.deepEqual(accionesPosibles(corriendo, T0 + 2000), ['extender', 'definitivo'], 'terminó solo: extender o cerrar definitivo');
  assert.deepEqual(accionesPosibles(tiempoDeFila({ tiempo_estado: 'pausado', tiempo_duracion: 600, tiempo_restante: 30 }), T0), ['seguir', 'extender', 'finalizar']);
  assert.deepEqual(accionesPosibles(tiempoDeFila({ tiempo_estado: 'terminado', tiempo_duracion: 600, tiempo_terminado_en: iso(T0), cierre: 'definitivo' }), T0), []);
  assert.deepEqual(accionesPosibles(tiempoDeFila({ tiempo_estado: 'corriendo', tiempo_duracion: 14400, tiempo_fin: iso(T0 + 1000) }), T0), ['pausar', 'finalizar'], 'no pasa de 4 horas');
});

test('cuántos guardaron después del final (con 3 segundos de margen)', () => {
  const fin = iso(T0);
  assert.equal(guardaronAlFinal(fin, [iso(T0 + 500), iso(T0 - 2000), iso(T0 - 60_000), null]), 2);
  assert.equal(guardaronAlFinal(null, [iso(T0)]), 0);
});
