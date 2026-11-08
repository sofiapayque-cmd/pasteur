/*
  Pruebas de la clase en vivo sin red (src/lib/aulas/clase.ts), del
  formulario de actividad (src/lib/aulas/tareas.ts) y del cuaderno de
  investigación (src/actividades/cuaderno.js).
  Correr con: npm run test:clase
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarProgreso, aplicarSesion, desbloqueosDeClase, esPaso, esReciente, fusionar, PASOS, salaDeTarea, salaDesde, ultimoCambio } from '../src/lib/aulas/clase.ts';
import { cuadernoDe, cuadernoVacio, SECCIONES } from '../src/actividades/cuaderno.js';
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

// ---------------------------------------------------------------------
// Cuaderno de investigación
// ---------------------------------------------------------------------
test('cuaderno A1: muestras, placas, comparación y antibióticos, como frases', () => {
  const c = cuadernoDe('a1', {
    muestras: [{ id: 'm1', ambiente: 'antartida-suelo' }, { id: 'm2', ambiente: 'campo-vaca' }],
    cultivos: [
      { id: 'p1', muestra: 'm1', ambiente: 'antartida-suelo', temp: 'frio', colonias: 4, tipos: 2, contaminada: false },
      { id: 'p2', muestra: 'm2', ambiente: 'campo-vaca', temp: 'tibio', colonias: 1, tipos: 1, contaminada: false },
      { id: 'p3', muestra: 'm2', ambiente: 'campo-vaca', temp: 'tibio', contaminada: true },
    ],
    comparaciones: [{ a: 'p1', b: 'p2', mas: 'a', obs: ['colores', 'formas'] }],
    antibioticos: [{ placa: 'p1', ambiente: 'antartida-suelo', prediccion: 'halos', resultados: [{ id: 'A', halo: 'grande', resistentes: 0 }, { id: 'B', halo: 'nada', resistentes: 1 }], masResistido: 'B' }],
  });
  assert.match(c.hipotesis[0], /alrededor de algunos discos no van a crecer/);
  assert.match(c.decisiones[0], /Tomó 2 muestras: Suelo antártico y /);
  assert.ok(c.variables.some((v) => /Temperatura de incubación: frío y tibio/.test(v)));
  assert.ok(c.resultados.some((r) => /4 colonias de 2 tipos/.test(r)));
  assert.ok(c.resultados.some((r) => /1 colonia de 1 tipo\./.test(r)), 'singular');
  assert.ok(c.resultados.some((r) => /se contaminó/.test(r)));
  assert.ok(c.resultados.some((r) => /Antibiótico B: sin halo, 1 resistente[;.]/.test(r)));
  assert.match(c.conclusiones[0], /Creció más en suelo antártico \(frío\)\. Vio colores distintos y formas distintas\./);
  assert.ok(c.conclusiones.some((x) => /Antibiótico B resistieron más/.test(x)));
});

test('cuaderno A2 y A3', () => {
  const a2 = cuadernoDe('a2', { estructura: 'dengue', vistas: [], hipotesis: { cambio: 'acido', prediccion: 'cambia' }, corridas: [{ t: 37, ph: 5.5, r: 'cambia' }], cumplida: true, marcadas: ['forma'] });
  assert.equal(a2.hipotesis[0], 'Si la ponemos en ácido, la proteína cambia de forma.');
  assert.match(a2.variables[0], /37 °C y pH 5,5/);
  assert.match(a2.resultados[0], /cambió de forma/);
  assert.equal(a2.conclusiones[0], 'Su hipótesis se cumplió.');
  const a3 = cuadernoDe('a3', { muestra: 'celulas', mision: 'mitosis', fotos: [{ a: 40, l: 'b' }, { a: 10, l: 'w' }], nFotos: 2, errores: { borrosa: 1 }, logros: [{ m: 'celulas', mi: 'mitosis', n: 1 }] });
  assert.match(a3.hipotesis[0], /^Misión: /);
  assert.match(a3.variables[0], /10x y 40x/);
  assert.ok(a3.variables[1].includes('azul (adn)'));
  assert.ok(a3.resultados.includes('Fotos para repetir: 1 borrosa.'));
  assert.match(a3.conclusiones[0], /^Encontró: célula en mitosis/);
});

test('cuaderno: sin datos, datos raros o actividad desconocida → vacío, nunca rompe', () => {
  for (const [act, datos] of [['a1', {}], ['a2', null], ['a3', { muestra: 'no-existe', fotos: 'x', errores: 5 }], ['a9', { algo: 1 }], ['a1', { cultivos: [{ id: 'p', temp: 'raro' }] }]]) {
    const c = cuadernoDe(act, datos);
    assert.deepEqual(Object.keys(c).sort(), SECCIONES.map((s) => s.id).sort());
  }
  assert.ok(cuadernoVacio(cuadernoDe('a1', {})));
});

test('la sala de una tarea: puesta en común para mirar, con los que hicieron algo', () => {
  const sala = salaDeTarea(
    { id: 'U', nombre: '5.º B', codigo: 'Q3V5' },
    { id: 'A', actividad: 'a2', opciones: {}, desbloqueos: {}, estado: 'activa' },
    [{ id: 'n1', numero: 1, apodo: 'Pulpo', color: null, activo: true }, { id: 'n2', numero: 2, apodo: null, color: null, activo: true }],
    [{ alumno_id: 'n1', etapa: 'conclusion', datos: { estructura: 'dengue' }, actualizado_en: T1, completada_en: T1 }],
  );
  assert.equal(sala.estado, 'puesta');
  assert.deepEqual(sala.alumnos.map((a) => a.apodo), ['Pulpo']);
  assert.equal(sala.alumnos[0].terminada, true);
});

// ---------------------------------------------------------------------
// Pedir acceso (src/lib/aulas/acceso.ts)
// ---------------------------------------------------------------------
import { leerSolicitud } from '../src/lib/aulas/acceso.ts';

const formulario = (extra = {}) => {
  const f = new FormData();
  const base = { nombre: '  Ana   Pérez ', email: 'Ana.Perez@Escuela.edu.uy', escuela: 'Escuela 123', departamento: 'Montevideo', cargo: 'maestra', mensaje: 'Hola,\nqueremos usarla.', ...extra };
  for (const [k, v] of Object.entries(base)) if (v !== undefined) f.set(k, v);
  return f;
};

test('pedir acceso: limpia y valida', () => {
  const f = formulario();
  f.append('grados', '6');
  f.append('grados', '5');
  f.append('grados', '9');
  const r = leerSolicitud(f);
  assert.equal(r.ok, true);
  assert.deepEqual(r.solicitud, { nombre: 'Ana Pérez', email: 'ana.perez@escuela.edu.uy', escuela: 'Escuela 123', departamento: 'Montevideo', cargo: 'maestra', grados: '5, 6', mensaje: 'Hola,\nqueremos usarla.' });
  assert.equal(leerSolicitud(formulario({ email: 'sin-arroba' })).campo, 'email');
  assert.equal(leerSolicitud(formulario({ email: 'k7rm-01@alumnos.invalid' })).campo, 'email');
  assert.equal(leerSolicitud(formulario({ departamento: 'Narnia' })).campo, 'departamento');
  assert.equal(leerSolicitud(formulario({ cargo: 'admin' })).campo, 'cargo');
  assert.equal(leerSolicitud(formulario({ nombre: ' ' })).campo, 'nombre');
  assert.deepEqual(leerSolicitud(formulario({ sitio: 'http://spam' })), { ok: false, mensaje: 'trampa' });
  assert.equal(leerSolicitud(formulario({ mensaje: 'x'.repeat(5000) })).solicitud.mensaje.length, 1000);
});
