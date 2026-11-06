/*
  Pruebas de la redacción automática sin red (src/lib/ia/redaccion.ts):
  oraciones, elección de artículos, control de lo que devuelve el modelo y
  comprobación de cada cita contra el resumen guardado.
  Correr con: npm run test:ia
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citaContraResumen,
  dividirOraciones,
  elegirArticulos,
  oracionesDeUbicacion,
  revisarSalida,
  separarPreguntas,
  textoDeArticulos,
  ubicacionDe,
} from '../src/lib/ia/redaccion.ts';

const RESUMEN =
  'Cells divide to grow and to repair tissues. Before dividing, a cell copies its DNA (e.g. in the S phase). ' +
  'Skin cells are replaced every few weeks, as shown by Smith et al. in 2019. Checkpoints stop the cycle when DNA is damaged. ' +
  'Errors in these checkpoints can lead to cancer. Stem cells keep dividing throughout life and renew many tissues of the body.';

const registro = (extra) => ({
  proveedor: 'openalex',
  id_externo: 'W1',
  identificadores: { openalex: 'W1' },
  titulo: 'How cells divide',
  anio: 2021,
  tipo: 'articulo',
  revista: 'Cell Reviews',
  idioma: 'en',
  autores: [],
  temas: [],
  mesh: [],
  citas: 10,
  oa_estado: 'gold',
  resumen: RESUMEN,
  retractada: false,
  del_instituto: false,
  accesos: [],
  licencia: 'cc-by',
  crudo: {},
  ...extra,
});

test('divide un resumen en oraciones sin cortar abreviaturas', () => {
  const o = dividirOraciones(RESUMEN);
  assert.equal(o.length, 6);
  assert.equal(o[1], 'Before dividing, a cell copies its DNA (e.g. in the S phase).');
  assert.equal(o[2], 'Skin cells are replaced every few weeks, as shown by Smith et al. in 2019.');
  assert.deepEqual(dividirOraciones(''), []);
  assert.deepEqual(dividirOraciones(null), []);
  assert.equal(dividirOraciones('The value was 3.5 mm. Next sentence here.').length, 2);
});

test('elige artículos: une el mismo trabajo, prefiere revisiones, descarta sin resumen y retractados', () => {
  const a = registro({ id_externo: 'W1', identificadores: { doi: '10.1/a' } });
  const aEpmc = registro({ proveedor: 'europepmc', id_externo: 'MED:1', identificadores: { doi: '10.1/a' }, resumen: RESUMEN + ' Europe PMC adds this sentence.' });
  const revision = registro({ id_externo: 'W2', identificadores: { openalex: 'W2' }, titulo: 'A review', tipo: 'revision' });
  const sinResumen = registro({ id_externo: 'W3', identificadores: { openalex: 'W3' }, resumen: 'Too short.' });
  const retractado = registro({ id_externo: 'W4', identificadores: { openalex: 'W4' }, retractada: true });
  const elegidos = elegirArticulos([[a, sinResumen, retractado, revision], [aEpmc]]);
  assert.equal(elegidos.length, 2);
  assert.equal(elegidos[0].principal.titulo, 'A review', 'la revisión va primero');
  const unido = elegidos.find((c) => c.registros.length === 2);
  assert.ok(unido, 'el mismo DOI de las dos fuentes es un solo candidato');
  assert.equal(unido.principal.proveedor, 'openalex');
  assert.match(unido.resumen, /Europe PMC adds/, 'usa el resumen de Europe PMC, el que va a quedar guardado');
  const texto = textoDeArticulos(elegidos);
  assert.match(texto, /^\[A1\] "A review"/);
  assert.match(texto, /A2\.7 Europe PMC adds this sentence\./);
});

const candidatos = () => elegirArticulos([[registro({})]]);
const salida = (extra) => ({
  se_puede_responder: true,
  motivo: '',
  pregunta: '¿Por qué se dividen las células?',
  variantes: ['¿Para qué se dividen las células?', '¿Por qué se dividen las células?'],
  explicacion_cientifica: 'Las células se dividen para crecer y reparar tejidos; antes copian su ADN.',
  version_infantil: 'Tus células se dividen para que crezcas y para arreglar lo que se lastima.',
  citas: [{ articulo: 'A1', oraciones: [1], parafrasis: 'Las células se dividen para crecer y reparar tejidos.', respalda: 'crecer y arreglar' }],
  ...extra,
});

test('control: una salida buena pasa, con el texto de la cita sacado del resumen', () => {
  const r = revisarSalida(salida({}), candidatos());
  assert.equal(r.ok, true);
  assert.deepEqual(r.borrador.citas[0].frases, ['Cells divide to grow and to repair tissues.']);
  assert.deepEqual(r.borrador.variantes, ['¿Para qué se dividen las células?'], 'saca la variante igual a la pregunta');
});

test('control: una respuesta parcial pasa y guarda qué quedó afuera', () => {
  const r = revisarSalida(salida({ motivo: 'Los resúmenes no explican cómo apareció el núcleo.' }), candidatos());
  assert.equal(r.ok, true);
  assert.equal(r.borrador.faltante, 'Los resúmenes no explican cómo apareció el núcleo.');
  assert.equal(revisarSalida(salida({}), candidatos()).borrador.faltante, '');
});

test('control: rechaza o limpia lo que no sirve', () => {
  const largo = Array.from({ length: 95 }, () => 'palabra').join(' ');
  const r1 = revisarSalida(salida({ version_infantil: largo }), candidatos());
  assert.equal(r1.ok, false);
  assert.equal(r1.reintentar, true);
  assert.match(r1.motivo, /95 palabras/);

  const r2 = revisarSalida(salida({ citas: [{ articulo: 'A7', oraciones: [1], parafrasis: 'Algo que no existe en la lista.', respalda: '' }] }), candidatos());
  assert.equal(r2.ok, false, 'una cita a un artículo que no se le pasó no vale');

  const r3 = revisarSalida(salida({ citas: [{ articulo: 'A1', oraciones: [99, 0, -1], parafrasis: 'Oraciones que no existen.', respalda: '' }] }), candidatos());
  assert.equal(r3.ok, false, 'oraciones inventadas no valen');

  const r4 = revisarSalida(salida({ se_puede_responder: false, motivo: 'Los resúmenes no hablan de eso' }), candidatos());
  assert.equal(r4.ok, false);
  assert.equal(r4.reintentar, false);
  assert.equal(r4.motivo, 'Los resúmenes no hablan de eso');

  const r5 = revisarSalida(
    salida({
      citas: [
        { articulo: 'A1', oraciones: [1, 1, 2], parafrasis: 'Crecen y reparan tejidos.', respalda: '' },
        { articulo: 'A1', oraciones: [4], parafrasis: 'Los controles frenan el ciclo.', respalda: '' },
        { articulo: 'A9', oraciones: [1], parafrasis: 'No existe este artículo.', respalda: '' },
      ],
    }),
    candidatos(),
  );
  assert.equal(r5.ok, true);
  assert.equal(r5.borrador.citas.length, 1, 'dos citas del mismo artículo se juntan');
  assert.deepEqual(r5.borrador.citas[0].oraciones, [1, 2, 4]);
  assert.equal(r5.avisos.length, 1);
});

test('cita contra el resumen guardado: textual si la licencia deja, si no solo ubicación', () => {
  const frases = ['Checkpoints stop the cycle when DNA is damaged.'];
  const textual = citaContraResumen(frases, RESUMEN, 'textual', 'Los controles frenan el ciclo.');
  assert.deepEqual(textual, { pasaje: frases[0], pasaje_textual: true, ubicacion: 'Resumen, oración 4', parafrasis: 'Los controles frenan el ciclo.' });
  const sinCopiar = citaContraResumen(frases, RESUMEN, 'solo_ubicacion', 'Los controles frenan el ciclo.');
  assert.equal(sinCopiar.pasaje, '');
  assert.equal(sinCopiar.pasaje_textual, false);
  assert.equal(sinCopiar.ubicacion, 'Resumen, oración 4');
  const larga = ['Stem cells keep dividing throughout life and renew many tissues of the body.'];
  assert.equal(citaContraResumen(larga, RESUMEN, 'breve', 'x').pasaje_textual, true, '13 palabras entran en una cita breve');
  assert.equal(citaContraResumen(['Cells divide to grow and to repair tissues.', 'Errors in these checkpoints can lead to cancer.'], RESUMEN, 'textual', 'x').ubicacion, 'Resumen, oraciones 1 y 5');
});

test('cita contra el resumen guardado: si la oración no está tal cual, se descarta', () => {
  assert.equal(citaContraResumen(['Checkpoints always stop the cycle.'], RESUMEN, 'textual', 'x'), null);
  assert.equal(citaContraResumen(['Cells divide to grow and to repair tissues.'], 'Otro resumen distinto. Nada que ver.', 'textual', 'x'), null);
  assert.equal(citaContraResumen(['Cells divide to grow and to repair tissues.'], null, 'textual', 'x'), null);
  assert.notEqual(citaContraResumen(['Cells  divide to grow and to repair   tissues.'], RESUMEN, 'textual', 'x'), null, 'los espacios no importan');
});

test('ubicación: ida y vuelta', () => {
  assert.equal(ubicacionDe([3]), 'Resumen, oración 3');
  assert.equal(ubicacionDe([2, 3, 5]), 'Resumen, oraciones 2, 3 y 5');
  assert.deepEqual(oracionesDeUbicacion('Resumen, oraciones 2, 3 y 5'), [2, 3, 5]);
  assert.deepEqual(oracionesDeUbicacion('Resumen, oración 3'), [3]);
  assert.deepEqual(oracionesDeUbicacion('Resultados, figura 2'), []);
});

test('preguntas pegadas: una por renglón, sin viñetas ni repetidas, con tope', () => {
  const { preguntas, sobran } = separarPreguntas('- ¿Qué es una célula?\n1. ¿Qué es una célula?\n\n• ¿Por qué brillan las medusas?\nok\n¿Uno?\n¿Dos más?\n¿Tres más?\n¿Cuatro más?', 4);
  assert.deepEqual(preguntas, ['¿Qué es una célula?', '¿Por qué brillan las medusas?', '¿Uno?', '¿Dos más?']);
  assert.equal(sobran, 2);
});
