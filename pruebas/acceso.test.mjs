/*
  Pruebas de la tabla de permisos (src/lib/acceso/permisos.ts): quién entra a qué.
  Pedido de Sofia (8/11): las actividades dejan de ser públicas.
  Correr con: npm run test:acceso
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, INGRESO, TIPOS_PERSONA, puedeEntrar } from '../src/lib/acceso/permisos.ts';

// La tabla del plan ("Quién entra a qué"), escrita a mano para compararla con el código
const ESPERADO = {
  fichas: { visitante: true, alumno: true, docente: true, equipo: true },
  actividad: { visitante: false, alumno: true, docente: true, equipo: true },
  tarea: { visitante: false, alumno: true, docente: false, equipo: false },
  docente: { visitante: false, alumno: false, docente: true, equipo: false },
  equipo: { visitante: false, alumno: false, docente: false, equipo: true },
};

test('la tabla completa coincide con el plan (5 áreas × 4 tipos de persona)', () => {
  for (const area of AREAS) {
    for (const tipo of TIPOS_PERSONA) {
      assert.equal(puedeEntrar(tipo, area), ESPERADO[area][tipo], `${tipo} en ${area}`);
    }
  }
});

test('un visitante solo ve las fichas', () => {
  assert.deepEqual(
    AREAS.filter((a) => puedeEntrar('visitante', a)),
    ['fichas'],
  );
});

test('cada área privada tiene una sola puerta de entrada conocida', () => {
  assert.deepEqual(INGRESO, { actividad: '/explorar', tarea: '/clase', docente: '/maestra/entrar', equipo: '/equipo/entrar' });
});

test('algo que no está en la tabla nunca da permiso', () => {
  assert.equal(puedeEntrar('visitante', 'otra'), false);
  assert.equal(puedeEntrar('desconocido', 'actividad'), false);
  assert.equal(puedeEntrar(undefined, 'docente'), false);
});
