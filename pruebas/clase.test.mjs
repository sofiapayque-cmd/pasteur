/*
  Pruebas de la clase en vivo sin red (src/lib/aulas/clase.ts y el
  formulario de actividad de src/lib/aulas/tareas.ts).
  Correr con: npm run test:clase
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarProgreso, aplicarSesion, desbloqueosDeClase, esPaso, esReciente, fusionar, PASOS, salaDesde, ultimoCambio } from '../src/lib/aulas/clase.ts';
import { leerFormularioActividad } from '../src/lib/aulas/tareas.ts';

const T0 = '2026-11-07T13:00:00.000Z';
const T1 = '2026-11-07T13:01:00.000Z';
const T2 = '2026-11-07T13:02:00.000Z';

const base = () => ({
  sesion: { id: 'S', asignacion_id: 'A', aula_id: 'U', estado: 'esperando', pausada: false, desbloqueos: {}, iniciada_en: T0, cerrada_en: null },
  asignacion: { id: 'A', actividad: 'a1', opciones: { ambientes: ['antartida'] }, desbloqueos: { antibioticos: false }, estado: 'activa' },
  aula: { id: 'U', nombre: '5.º B', codigo: 'Q3V5' },
  alumnos: [
    { id: 'n3', numero: 3, apodo: null, color: null, activo: true },
    { id: 'n1', numero: 1, apodo: 'Pulpo Sabio', color: '#123456', activo: true },
    { id: 'n2', numero: 2, apodo: 'Gato', color: null, activo: false },
    { id: 'n4', numero: 4, apodo: 'Sin entrar', color: null, activo: true },
  ],
  progresos: [
    { alumno_id: 'n3', etapa: 'explorar', datos: { muestras: [] }, etapa_desde: T0, actualizado_en: T0, completada_en: null },
    { alumno_id: 'n1', etapa: 'paisaje', datos: null, etapa_desde: T0, actualizado_en: T0, completada_en: null },
    { alumno_id: 'n2', etapa: 'paisaje', datos: {}, etapa_desde: T0, actualizado_en: T0, completada_en: null },
  ],
});

test('habilitado: lo de la actividad más lo que la maestra habilitó en vivo', () => {
  assert.deepEqual(desbloqueosDeClase({ antibioticos: false, otro: true }, { antibioticos: true }), { antibioticos: true, otro: true });
  assert.deepEqual(desbloqueosDeClase({ antibioticos: false }, { antibioticos: false }), { antibioticos: false });
  assert.deepEqual(desbloqueosDeClase(null, null), {});
});

test('la sala de las pantallas: solo los que entraron y están activos, por número, con apodo y color', () => {
  const sala = salaDesde(base());
  assert.equal(sala.codigo, 'Q3V5');
  assert.equal(sala.actividad, 'a1');
  assert.deepEqual(sala.opciones, { ambientes: ['antartida'] });
  assert.deepEqual(sala.desbloqueos, { antibioticos: false });
  assert.deepEqual(sala.alumnos.map((a) => [a.id, a.apodo, a.etapa]), [
    ['n1', 'Pulpo Sabio', 'paisaje'],
    ['n3', 'N.º 3', 'explorar'],
  ]);
  assert.equal(sala.alumnos[0].color, '#123456');
  assert.match(sala.alumnos[1].color, /^#[0-9A-F]{6}$/i);
  assert.deepEqual(sala.alumnos[0].datos, {});
  assert.equal(sala.alumnos[0].desde, Date.parse(T0));
});

test('cambios de la sesión: solo los de esta clase', () => {
  const i = base();
  const r = aplicarSesion(i, { id: 'S', estado: 'en-curso', pausada: true });
  assert.equal(r.sesion.estado, 'en-curso');
  assert.equal(r.sesion.pausada, true);
  assert.deepEqual(r.sesion.desbloqueos, {}, 'si no viene, se queda lo que había');
  assert.equal(aplicarSesion(i, { id: 'OTRA', estado: 'cerrada' }), i);
  assert.equal(aplicarSesion(i, null), i);
  const habilitado = aplicarSesion(r, { id: 'S', desbloqueos: { antibioticos: true } });
  assert.equal(salaDesde(habilitado).desbloqueos.antibioticos, true);
});

test('avances: uno nuevo se suma, uno viejo no pisa al nuevo, otra actividad no entra', () => {
  let i = base();
  i = aplicarProgreso(i, { alumno_id: 'n4', asignacion_id: 'A', etapa: 'paisaje', datos: {}, etapa_desde: T1, actualizado_en: T1, completada_en: null });
  assert.equal(salaDesde(i).alumnos.length, 3, 'el que entró aparece');
  i = aplicarProgreso(i, { alumno_id: 'n1', asignacion_id: 'A', etapa: 'mesa', actualizado_en: T2 });
  assert.equal(i.progresos.find((p) => p.alumno_id === 'n1').etapa, 'mesa');
  const viejo = aplicarProgreso(i, { alumno_id: 'n1', asignacion_id: 'A', etapa: 'paisaje', actualizado_en: T1 });
  assert.equal(viejo, i, 'llegó tarde: no cambia nada');
  assert.equal(aplicarProgreso(i, { alumno_id: 'n1', asignacion_id: 'OTRA', etapa: 'x', actualizado_en: T2 }), i);
  assert.equal(aplicarProgreso(i, { etapa: 'x' }), i);
  const terminado = aplicarProgreso(i, { alumno_id: 'n3', asignacion_id: 'A', etapa: 'conclusiones', completada_en: T2, actualizado_en: T2 });
  assert.equal(salaDesde(terminado).alumnos.find((a) => a.id === 'n3').terminada, true);
  assert.equal(ultimoCambio(terminado), T2);
});

test('consulta de respaldo: se junta con lo que ya había', () => {
  const i = base();
  const r = fusionar(i, {
    sesion: { ...i.sesion, estado: 'puesta' },
    alumnos: [...i.alumnos, { id: 'n5', numero: 5, apodo: 'Nuevo', color: null, activo: true }],
    progresos: [{ alumno_id: 'n5', etapa: 'paisaje', datos: {}, etapa_desde: T1, actualizado_en: T1, completada_en: null }],
  });
  assert.equal(r.sesion.estado, 'puesta');
  assert.equal(r.progresos.length, 4, 'los que no vinieron se quedan');
  assert.ok(salaDesde(r).alumnos.some((a) => a.apodo === 'Nuevo'));
});

test('pasos de la maestra y clases de otro día', () => {
  assert.ok(esPaso('empezar') && esPaso('cerrar') && !esPaso('borrar') && !esPaso('toString'));
  assert.deepEqual(PASOS.empezar.desde, ['esperando']);
  assert.ok(PASOS.cerrar.desde.includes('puesta'));
  const ahora = Date.parse('2026-11-07T15:00:00Z');
  assert.equal(esReciente('2026-11-07T13:00:00Z', ahora), true);
  assert.equal(esReciente('2026-11-06T13:00:00Z', ahora), false);
});

test('formulario de actividad: se limpia contra lo que existe', () => {
  const f = new FormData();
  f.set('actividad', 'a1');
  f.append('op:ambientes', 'antartida-suelo');
  f.append('op:ambientes', 'inventado');
  f.set('des:antibioticos', 'despues');
  const r = leerFormularioActividad(f);
  assert.equal(r.ok, true);
  assert.deepEqual(r.opciones.ambientes, ['antartida-suelo']);
  assert.equal(r.desbloqueos.antibioticos, false);
  const sinNada = new FormData();
  sinNada.set('actividad', 'a1');
  assert.equal(leerFormularioActividad(sinNada).ok, false);
  const otra = new FormData();
  otra.set('actividad', 'a9');
  assert.deepEqual(leerFormularioActividad(otra), { ok: false, mensaje: 'Elegí una actividad.' });
});
