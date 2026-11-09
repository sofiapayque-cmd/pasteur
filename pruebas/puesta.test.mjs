/*
  Pruebas de la puesta en común (src/lib/aulas/puesta.ts): los datos de la
  clase, el resumen automático y las conclusiones para proyectar.
  Correr con: npm run test:puesta
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenParaProyectar, resumenPuesta } from '../src/lib/aulas/puesta.ts';

const placa = (id, ambiente, temp, colonias, contaminada = false) => ({ id, muestra: 'm1', ambiente, temp, colonias, contaminada, tipos: 2 });
const prueba = (ambiente, resultados, masResistido) => ({ placa: 'p1', ambiente, prediccion: 'A', discos: [], resultados, masResistido });

const A1 = [
  {
    id: 'u1',
    datos: {
      muestras: [{ id: 'm1', ambiente: 'antartida-suelo', semilla: 1 }],
      cultivos: [placa('p1', 'antartida-suelo', 'frio', 30), placa('p2', 'antartida-suelo', 'tibio', 10)],
      comparaciones: [{ a: 'p1', b: 'p2', mas: 'a', obs: ['colores', 'tamanos'] }],
      antibioticos: [
        prueba('antartida-suelo', [{ id: 'A', halo: 'grande', resistentes: 0 }, { id: 'B', halo: 'nada', resistentes: 4 }, { id: 'C', halo: 'chico', resistentes: 1 }], 'B'),
      ],
    },
  },
  {
    id: 'u2',
    datos: {
      muestras: [{ id: 'm1', ambiente: 'antartida-pinguino', semilla: 2 }],
      cultivos: [placa('p1', 'antartida-pinguino', 'tibio', 50), placa('p2', 'antartida-pinguino', 'frio', 0, true)],
      comparaciones: [{ a: 'p1', b: 'p2', mas: 'a', obs: [] }],
    },
  },
  { id: 'u3', datos: null },
];

test('A1: datos de la clase sumados, sin contar las placas contaminadas en los promedios', () => {
  const r = resumenPuesta('a1', A1);
  assert.equal(r.participantes, 3);
  const dato = (e) => r.datos.find((d) => d.etiqueta === e)?.valor;
  assert.equal(dato('Placas sembradas'), '4');
  assert.equal(dato('Placas contaminadas'), '1');
  assert.equal(dato('Pruebas con antibióticos'), '1');
  const tabla = r.comparaciones[0];
  const fila = (n) => tabla.filas.find((f) => f.nombre.toLowerCase().includes(n)).valores;
  assert.deepEqual(tabla.columnas, ['Frío', 'Tibio']);
  assert.deepEqual(fila('suelo'), ['30 (1 placa)', '10 (1 placa)']);
  // la placa contaminada del pingüino (frío) no cuenta
  assert.deepEqual(fila('pingüino'), ['—', '50 (1 placa)']);
});

test('A1: el resumen automático sale solo de los números', () => {
  const r = resumenPuesta('a1', A1);
  assert.equal(r.automatico.length, 3);
  assert.match(r.automatico[0], /pingüino.*50 por placa/i);
  assert.match(r.automatico[1], /^Con el Antibiótico B resistieron más bacterias: 4 colonias resistieron y 1 placa quedó sin halo\.$/);
  assert.match(r.automatico[2], /^1 placa se contaminó/);
});

test('A1: conclusiones como en el cuaderno, sin apodo ni número de alumno', () => {
  const r = resumenPuesta('a1', A1);
  const textos = r.conclusiones.map((c) => c.texto);
  assert.deepEqual(textos, [
    'Creció más en suelo antártico (frío). Vi colores distintos, colonias más grandes en una.',
    'En la placa de suelo antártico, con el Antibiótico B resistieron más bacterias.',
  ]);
  // una comparación sin observaciones no se convierte en conclusión
  assert.equal(new Set(r.conclusiones.map((c) => c.id)).size, r.conclusiones.length);
  for (const t of textos) assert.doesNotMatch(t, /u1|u2|apodo/i);
});

test('A1: una clase sin datos no inventa frases', () => {
  const r = resumenPuesta('a1', [{ id: 'x', datos: {} }]);
  assert.deepEqual(r.automatico, []);
  assert.deepEqual(r.conclusiones, []);
  assert.deepEqual(r.comparaciones, []);
});

test('A1: si dos antibióticos empatan, no se elige ninguno', () => {
  const r = resumenPuesta('a1', [
    { id: 'u', datos: { antibioticos: [prueba('antartida-suelo', [{ id: 'A', halo: 'chico', resistentes: 2 }, { id: 'B', halo: 'chico', resistentes: 2 }], 'A')] } },
  ]);
  assert.ok(!r.automatico.some((t) => t.includes('resistieron más')));
});

const A2 = [
  {
    id: 'u1',
    datos: {
      estructura: 'dengue',
      hipotesis: { cambio: 'calor', prediccion: 'desarma' },
      corridas: [{ t: 80, ph: 7.4, r: 'desarmada' }],
      cumplida: true,
      marcadas: ['desarma'],
    },
  },
  {
    id: 'u2',
    datos: {
      estructura: 'lisozima',
      hipotesis: { cambio: 'acido', prediccion: 'cambia' },
      corridas: [{ t: 37, ph: 5, r: 'estable' }, { t: 90, ph: 7.4, r: 'desarmada' }],
      cumplida: false,
      marcadas: ['desarma'],
    },
  },
  { id: 'u3', datos: { estructura: 'zika', corridas: [] } },
];

test('A2: hipótesis, corridas y tabla por condición', () => {
  const r = resumenPuesta('a2', A2);
  const dato = (e) => r.datos.find((d) => d.etiqueta === e)?.valor;
  assert.equal(dato('Corridas de la simulación'), '3');
  assert.equal(dato('Hipótesis puestas a prueba'), '2');
  assert.equal(dato('Hipótesis que se cumplieron'), '1');
  assert.equal(dato('Moléculas estudiadas'), '2');
  // ordenadas por molécula, temperatura y pH (de neutro a ácido)
  assert.deepEqual(
    r.comparaciones[0].filas.map((f) => f.nombre),
    ['Dengue · 80 °C · pH 7,4', 'Lisozima · 37 °C · pH 5', 'Lisozima · 90 °C · pH 7,4'],
  );
  assert.deepEqual(r.automatico, ['1 de 2 hipótesis se cumplieron.', 'De 3 corridas: en 2 la molécula se desnaturalizó, en 0 cambió de forma y en 1 siguió igual.']);
});

test('A2: conclusiones con la molécula, la hipótesis y lo que vieron', () => {
  const textos = resumenPuesta('a2', A2).conclusiones.map((c) => c.texto);
  assert.ok(textos[0].startsWith('Dengue. Hipótesis: si la calentamos mucho, la proteína se desnaturaliza'), textos[0]);
  assert.ok(textos[0].endsWith('Se cumplió.'));
  assert.ok(textos.some((t) => t.endsWith('No se cumplió.')));
  assert.ok(textos.some((t) => /a 90 °C y pH 7,4: se desnaturalizó/i.test(t)), textos.join(' | '));
});

test('A3: sin conclusiones escritas, pero con los datos de la clase', () => {
  const r = resumenPuesta('a3', [
    { id: 'u1', datos: { muestra: 'celulas', nFotos: 4, logros: [{ m: 'celulas', mi: 'x', n: 1 }], errores: { borrosa: 2 } } },
    { id: 'u2', datos: { muestra: 'celulas', nFotos: 1, logros: [] } },
    { id: 'u3', datos: { muestra: 'no-existe', nFotos: 9 } },
  ]);
  assert.deepEqual(r.conclusiones, []);
  assert.ok(r.sinConclusiones);
  assert.equal(r.datos.find((d) => d.etiqueta === 'Fotos sacadas').valor, '5');
  assert.deepEqual(r.comparaciones[0].filas[0].valores, ['2', '5', '1']);
  assert.deepEqual(r.automatico, ['La clase sacó 5 fotos y logró 1 misión.', '2 fotos salieron borrosas.']);
  // sin misiones logradas no dice "0 misiones"
  assert.deepEqual(resumenPuesta('a3', [{ id: 'u', datos: { muestra: 'celulas', nFotos: 2 } }]).automatico, ['La clase sacó 2 fotos.']);
});

test('Proyectar: solo las elegidas, en un orden que no sigue la lista de alumnos', () => {
  const c = [
    { id: '0-a', texto: 'Primera del primer alumno' },
    { id: '1-a', texto: 'Del segundo' },
    { id: '2-a', texto: 'Del tercero' },
    { id: '3-a', texto: 'Del cuarto' },
  ];
  const elegidas = new Set(['0-a', '2-a', '3-a']);
  const orden = ordenParaProyectar(c, elegidas);
  assert.equal(orden.length, 3);
  assert.ok(!orden.some((x) => x.id === '1-a'));
  assert.deepEqual(ordenParaProyectar(c, elegidas), orden, 'siempre el mismo orden para la misma selección');
  assert.deepEqual(ordenParaProyectar([...c].reverse(), elegidas), orden, 'no depende del orden de la lista');
});

test('Una actividad sin puesta propia no se rompe', () => {
  const r = resumenPuesta('a9', [{ id: 'u', datos: {} }]);
  assert.equal(r.participantes, 1);
  assert.ok(r.sinConclusiones);
});
