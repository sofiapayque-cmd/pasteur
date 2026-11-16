/*
  Pruebas de cómo se eligen las curiosidades (src/lib/curiosidades/elegir.ts):
  la tendencia por tema y las reglas de variedad, con 60 días de consultas
  simuladas. Correr con: npm run test:curiosidades
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIAS, NO_REPETIR_DIAS, elegir, tendencia } from '../src/lib/curiosidades/elegir.ts';

const dia = (base, n) => new Date(Date.parse(`${base}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** Números "al azar" que se repiten igual en cada corrida. */
function semilla(s = 7) {
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// 4 temas de A1, con 3 curiosidades cada uno, y 2 de A3
const TEMAS = ['frio', 'antibioticos', 'vaca', 'pinguinos'];
const CURIOSIDADES = [
  ...TEMAS.flatMap((t) => [1, 2, 3].map((i) => ({ id: `${t}-${i}`, temaId: t, actividad: 'a1' }))),
  { id: 'celula-1', temaId: 'celulas', actividad: 'a3' },
  { id: 'celula-2', temaId: 'celulas', actividad: 'a3' },
];

test('tendencia: cada consulta pierde la mitad de su peso por semana y lo de más de 30 días no cuenta', () => {
  const hoy = '2026-11-14';
  const t = tendencia(
    [
      { temaId: 'a', dia: hoy, veces: 4 },
      { temaId: 'b', dia: dia(hoy, -7), veces: 8 },
      { temaId: 'c', dia: dia(hoy, -DIAS), veces: 1000 },
      { temaId: 'd', dia: dia(hoy, 1), veces: 5 },
    ],
    hoy,
  );
  assert.equal(t.find((x) => x.temaId === 'a').puntaje, 4);
  assert.ok(Math.abs(t.find((x) => x.temaId === 'b').puntaje - 4) < 1e-9, '8 consultas de hace una semana valen como 4 de hoy');
  assert.equal(t.find((x) => x.temaId === 'c'), undefined, 'lo de hace 30 días o más no cuenta');
  assert.equal(t.find((x) => x.temaId === 'd'), undefined, 'un día futuro (reloj mal) no cuenta');
});

test('elegir: nunca el mismo tema dos veces seguidas, tampoco el último que vio el aula', () => {
  const tend = [
    { temaId: 'frio', puntaje: 100 },
    { temaId: 'antibioticos', puntaje: 1 },
  ];
  for (let s = 1; s <= 50; s++) {
    const ids = elegir(tend, CURIOSIDADES, { cuantas: 4, actividad: 'a1', ultimoTema: 'frio', azar: semilla(s) });
    const temas = ids.map((id) => id.split('-')[0]);
    assert.notEqual(temas[0], 'frio', 'no empieza por el último tema que vio el aula');
    for (let i = 1; i < temas.length; i++) assert.notEqual(temas[i], temas[i - 1], `seguidas: ${temas.join(', ')}`);
    assert.equal(new Set(ids).size, ids.length, 'no repite curiosidades');
  }
});

test('elegir: solo la actividad pedida', () => {
  const ids = elegir([{ temaId: 'celulas', puntaje: 50 }], CURIOSIDADES, { cuantas: 3, actividad: 'a1', azar: semilla(3) });
  assert.ok(ids.every((id) => !id.startsWith('celula')));
  assert.equal(ids.length, 3, 'completa con otras curiosidades de A1');
});

test('elegir: nunca una curiosidad que el aula vio en los últimos 14 días, salvo que no quede otra', () => {
  const vistas = new Map(CURIOSIDADES.filter((c) => c.actividad === 'a1' && c.id !== 'vaca-3').map((c) => [c.id, 3]));
  const ids = elegir([{ temaId: 'frio', puntaje: 9 }], CURIOSIDADES, { cuantas: 1, actividad: 'a1', vistas, azar: semilla(1) });
  assert.deepEqual(ids, ['vaca-3'], 'la única que no vio');
  const vistas2 = new Map([...vistas, ['vaca-3', 1]]);
  vistas2.set('frio-2', NO_REPETIR_DIAS - 1);
  vistas2.set('frio-3', NO_REPETIR_DIAS);
  const ids2 = elegir([{ temaId: 'frio', puntaje: 9 }], CURIOSIDADES, { cuantas: 2, actividad: 'a1', vistas: vistas2, azar: semilla(1) });
  assert.equal(ids2[0], 'frio-3', 'la que vio hace 14 días ya se puede mostrar');
  assert.equal(ids2[1], 'frio-2', 'si no queda otra, la que vio hace más tiempo');
});

test('elegir: sin consultas, igual muestra curiosidades publicadas', () => {
  const ids = elegir([], CURIOSIDADES, { cuantas: 2, azar: semilla(5) });
  assert.equal(ids.length, 2);
  assert.equal(elegir([], [], { cuantas: 3 }).length, 0, 'sin curiosidades no inventa nada');
});

test('60 días simulados: cuando sube un tema, en pocos días aparecen más curiosidades de ese tema, sin repetirle una a la misma aula en 14 días', () => {
  // 10 curiosidades por tema: con menos, la regla de no repetir en 14 días pone el techo
  // (es lo que el panel del equipo muestra como "temas en tendencia con pocas curiosidades")
  const CURIOSIDADES = TEMAS.flatMap((t) => Array.from({ length: 10 }, (_, i) => ({ id: `${t}-${i + 1}`, temaId: t, actividad: 'a1' })));
  const base = '2026-09-01';
  const conteos = [];
  const azar = semilla(42);
  const vistas = new Map(); // id → día en que el aula la vio
  let ultimoTema = null;
  const porDia = [];
  for (let d = 0; d < 60; d++) {
    const hoy = dia(base, d);
    // Consultas de fondo: un poco de todo. Desde el día 30, "antibióticos" se dispara.
    for (const t of TEMAS) conteos.push({ temaId: t, dia: hoy, veces: 2 + Math.floor(azar() * 3) });
    if (d >= 30) conteos.push({ temaId: 'antibioticos', dia: hoy, veces: 25 });
    const tend = tendencia(conteos, hoy);
    const vistasHoy = new Map([...vistas].map(([id, d0]) => [id, d - d0]));
    const ids = elegir(tend, CURIOSIDADES, { cuantas: 1, actividad: 'a1', vistas: vistasHoy, ultimoTema, azar });
    assert.equal(ids.length, 1);
    const id = ids[0];
    if (vistas.has(id)) assert.ok(d - vistas.get(id) >= NO_REPETIR_DIAS || CURIOSIDADES.filter((c) => c.actividad === 'a1').every((c) => vistas.has(c.id) && d - vistas.get(c.id) < NO_REPETIR_DIAS), `repitió ${id} a los ${d - vistas.get(id)} días`);
    vistas.set(id, d);
    ultimoTema = id.split('-')[0];
    porDia.push(ultimoTema);
  }
  const antes = porDia.slice(10, 30).filter((t) => t === 'antibioticos').length;
  const despues = porDia.slice(33, 53).filter((t) => t === 'antibioticos').length;
  assert.ok(despues > antes, `antibióticos antes ${antes}/20 días, después ${despues}/20`);
  assert.ok(despues >= 8, `después de subir, antibióticos sale casi un día sí y uno no (salió ${despues}/20)`);
  for (let i = 1; i < porDia.length; i++) assert.notEqual(porDia[i], porDia[i - 1], 'nunca el mismo tema dos días seguidos');
});

// ---------------------------------------------------------------------
// Curiosidades automáticas (migración 23)
// ---------------------------------------------------------------------
import { agruparPreguntas, oracionesElegidas, paraSabiasQue, sirveSola, temaNombrado, MIN_VECES_GRUPO } from '../src/lib/curiosidades/automaticas.ts';

test('automáticas: el texto sale tal cual de la respuesta aprobada, solo con la primera letra en minúscula', () => {
  const oraciones = [
    'Las bacterias del suelo ayudan a que las plantas crezcan.',
    'Eso pasa porque desarman las hojas muertas.',
    '¿Te imaginás cuántas hay?',
    'En un puñado de tierra puede haber más bacterias que personas en todo el planeta.',
    'ADN es la sigla de ácido desoxirribonucleico, la molécula de la herencia.',
  ];
  // La IA solo da números: los inválidos, repetidos o que no sirven solos se descartan
  assert.deepEqual(oracionesElegidas(oraciones, [2, 3, 1, 1, 99, 'x']), [{ oracion: 1, texto: 'las bacterias del suelo ayudan a que las plantas crezcan.' }]);
  // Como mucho 2, y la sigla queda en mayúscula
  assert.deepEqual(
    oracionesElegidas(oraciones, [4, 5, 1]).map((x) => x.texto),
    ['en un puñado de tierra puede haber más bacterias que personas en todo el planeta.', 'ADN es la sigla de ácido desoxirribonucleico, la molécula de la herencia.'],
  );
  assert.deepEqual(oracionesElegidas(oraciones, null), []);
  // Cada texto elegido está, letra por letra, en la respuesta (salvo la primera letra)
  for (const e of oracionesElegidas(oraciones, [1, 4, 5])) {
    const original = oraciones[e.oracion - 1];
    assert.equal(e.texto.slice(1), original.slice(1));
    assert.equal(e.texto[0].toLowerCase(), original[0].toLowerCase());
  }
});

test('automáticas: qué oraciones sirven solas', () => {
  assert.equal(sirveSola('Las mitocondrias le dan energía a la célula para que funcione.'), true);
  assert.equal(sirveSola('Así las bacterias se defienden de los antibióticos que las atacan.'), false);
  assert.equal(sirveSola('También hay bacterias que viven en lugares muy fríos.'), false);
  assert.equal(sirveSola('¿Sabés cuántas células tiene tu cuerpo, más o menos?'), false);
  assert.equal(sirveSola('Imaginá una ciudad chiquita adentro de cada célula.'), false);
  assert.equal(sirveSola('Corto.'), false);
  assert.equal(sirveSola('No todas las bacterias son malas: muchas nos ayudan a digerir.'), true);
  // Las que remiten a otra oración, en cualquier lugar, o empiezan contestando
  assert.equal(sirveSola('Dentro de ella se forma una parte que produce esa luz verde.'), false);
  assert.equal(sirveSola('Si te hacés una herida, también participan en su reparación.'), false);
  assert.equal(sirveSola('Las luciérnagas, por ejemplo, producen su luz de esta manera.'), false);
  assert.equal(sirveSola('Sí, las células pueden moverse de un lugar a otro.'), false);
  // "está" (verbo) no es "esta"
  assert.equal(sirveSola('El ADN de la célula está guardado sobre todo en el núcleo.'), true);
  assert.equal(paraSabiasQue('Uruguay tiene una base científica en la Antártida.'), 'Uruguay tiene una base científica en la Antártida.');
  assert.equal(paraSabiasQue('El núcleo guarda el ADN.'), 'el núcleo guarda el ADN.');
});

test('automáticas: las preguntas sin tema parecidas se agrupan en un tema nuevo', () => {
  const v = (x, y) => [x, y, 0];
  const preguntas = [
    { id: '1', texto: '¿Los peces tienen bacterias?', actividad: 'a1', veces: 2, vector: v(1, 0) },
    { id: '2', texto: '¿Hay bacterias en el mar?', actividad: 'a1', veces: 1, vector: v(0.95, 0.1) },
    { id: '3', texto: '¿Qué comen los tiburones?', actividad: null, veces: 1, vector: v(0, 1) },
    { id: '4', texto: '¿Cómo brillan las medusas?', actividad: 'a3', veces: 1, vector: v(-1, 0) },
  ];
  const grupos = agruparPreguntas(preguntas);
  assert.equal(grupos.length, 1);
  assert.deepEqual(grupos[0].preguntas.map((p) => p.id), ['1', '2']);
  assert.equal(grupos[0].veces, 3);
  assert.equal(grupos[0].actividad, 'a1');
  // Una sola pregunta hecha muchas veces también arma tema
  assert.equal(agruparPreguntas([{ id: '9', texto: 'x', actividad: null, veces: MIN_VECES_GRUPO * 2, vector: v(1, 1) }]).length, 1);
  // Pocas veces: no
  assert.equal(agruparPreguntas([{ id: '9', texto: 'x', actividad: null, veces: 2, vector: v(1, 1) }]).length, 0);
});

test('automáticas: el nombre del tema nuevo se limpia o se descarta', () => {
  assert.deepEqual(temaNombrado({ es_ciencia: true, nombre: '¿bacterias del mar?', descripcion: ' Qué bacterias viven en el mar. ' }), {
    nombre: 'Bacterias del mar',
    descripcion: 'Qué bacterias viven en el mar.',
  });
  assert.equal(temaNombrado({ es_ciencia: false, nombre: 'Saludos', descripcion: '' }), null);
  assert.equal(temaNombrado({ es_ciencia: true, nombre: 'Un nombre que es demasiado largo para ser un tema de verdad', descripcion: '' }), null);
  assert.equal(temaNombrado(null), null);
});
