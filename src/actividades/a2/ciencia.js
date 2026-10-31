/*
  A2 · Simulaciones Biomoleculares — contenido científico (sin componentes visuales).

  Es un modelo SIMPLIFICADO para chicos: cada esfera representa un grupito de
  aminoácidos (no un átomo real) y las reglas de abajo resumen ciencia general:
  - Con más temperatura, las moléculas se mueven (vibran) más.
  - Con demasiado calor (o un pH extremo) las proteínas pierden su forma: se
    desnaturalizan, como la clara de un huevo cuando se cocina.
  - La proteína E del dengue (y la del zika) cambia de forma con el pH ácido del
    endosoma: así el virus se fusiona con la célula y entra.
  Todo lo marcado con VALIDAR hay que revisarlo con el laboratorio.
*/

// Colores de las partes (colores vida de la marca: solo formas, nunca texto)
const C = {
  rosa: '#F4A6BD', // tinción
  ambar: '#F2B13B', // cultivo
  azul: '#93AEEB', // plasma
  coral: '#EF6F5E', // coral
  menta: '#8ED5C3', // cilio
  lila: '#A9A9F4', // filamento aclarado
};

const PARTES_E = [
  // VALIDAR: nombres simplificados de los dominios de la proteína E.
  { id: 'd1', nombre: 'El centro', tecnico: 'Dominio I', color: C.rosa, detalle: 'Une a las otras partes. Es como el cuerpo de la proteína.' },
  { id: 'd2', nombre: 'El brazo largo', tecnico: 'Dominio II', color: C.ambar, detalle: 'Es la parte más larga. En la punta tiene un gancho.' },
  // VALIDAR: "lazo de fusión" en la punta del dominio II; en el virus maduro queda tapado por la otra copia.
  { id: 'lazo', nombre: 'El gancho', tecnico: 'Lazo de fusión', color: C.coral, detalle: 'Se engancha a la célula para que el virus entre. Mientras tanto, queda escondido.' },
  // VALIDAR: se cree que el dominio III participa en la unión a la célula (receptores).
  { id: 'd3', nombre: 'La parte que se pega a la célula', tecnico: 'Dominio III', color: C.azul, detalle: 'Los científicos creen que ayuda al virus a pegarse a la célula.' },
];

export const ESTRUCTURAS = [
  {
    id: 'dengue',
    nombre: 'Proteína E del dengue',
    corto: 'Dengue',
    detalle: 'Forma la envoltura del virus del dengue. Va de a pares.',
    color: C.ambar,
    pares: true,
    // VALIDAR: temperatura a la que el MODELO muestra que se desarma (valor ilustrativo).
    tDesarma: 55,
    cambiaConAcido: true,
    partes: PARTES_E,
  },
  {
    id: 'zika',
    nombre: 'Proteína E del zika',
    corto: 'Zika',
    // VALIDAR: la proteína E del zika es muy parecida a la del dengue (mismos tres dominios, forma pares).
    detalle: 'Prima de la del dengue: muy parecida, con las mismas partes.',
    color: C.coral,
    pares: true,
    // VALIDAR: se reportó que la partícula del zika aguanta más calor que la del dengue; valor ilustrativo.
    tDesarma: 58,
    cambiaConAcido: true,
    partes: PARTES_E,
  },
  {
    id: 'lisozima',
    nombre: 'Lisozima',
    corto: 'Lisozima',
    detalle: 'Proteína de control: está en las lágrimas y en la clara de huevo.',
    color: C.menta,
    control: true,
    pares: false,
    // VALIDAR: la lisozima de clara de huevo se desnaturaliza cerca de 70–75 °C (valor ilustrativo).
    tDesarma: 75,
    cambiaConAcido: false,
    partes: [
      { id: 'alfa', nombre: 'La mitad de resortes', tecnico: 'Dominio alfa', color: C.menta, detalle: 'Acá la cadena se enrolla como resortes: se llaman hélices.' },
      { id: 'beta', nombre: 'La mitad de acordeón', tecnico: 'Dominio beta', color: C.lila, detalle: 'Acá la cadena se pliega como un acordeón: se llaman hojas.' },
      { id: 'surco', nombre: 'El surco que corta', tecnico: 'Sitio activo', color: C.ambar, detalle: 'Ahí corta la pared de algunas bacterias. ¡Por eso nos defiende!' },
    ],
  },
];

export const estructura = (id) => ESTRUCTURAS.find((e) => e.id === id) || ESTRUCTURAS[0];

// Condiciones "como en el cuerpo": el punto de partida de toda simulación
export const INICIAL = { t: 37, ph: 7.4 };

export const ZONAS_T = [
  { hasta: 12, nombre: 'Heladera' },
  { hasta: 30, nombre: 'Ambiente' },
  { hasta: 39, nombre: 'Cuerpo' },
  { hasta: 44, nombre: 'Fiebre' },
  { hasta: 70, nombre: 'Muy caliente' },
  { hasta: 92, nombre: 'Cocinando' },
  { hasta: 101, nombre: 'Hirviendo' },
];
export const zonaT = (t) => (ZONAS_T.find((z) => t < z.hasta) || ZONAS_T[ZONAS_T.length - 1]).nombre;

export const zonaPh = (ph) =>
  ph < 3 ? 'Muy ácido' : ph < 6.6 ? 'Ácido' : ph <= 7.8 ? 'Neutro' : ph < 11 ? 'Básico' : 'Muy básico';

export const PRESETS_T = [
  { v: 4, nombre: 'Heladera' },
  { v: 37, nombre: 'Cuerpo' },
  { v: 41, nombre: 'Fiebre' },
  { v: 60, nombre: 'Muy caliente' },
  { v: 100, nombre: 'Hervir' },
];
export const PRESETS_PH = [
  { v: 2, nombre: 'Limón' },
  // VALIDAR: pH aproximado del endosoma donde la proteína E cambia de forma (≈ 5,5–6).
  { v: 5.5, nombre: 'Endosoma' },
  { v: 7.4, nombre: 'Sangre' },
  { v: 10, nombre: 'Jabón' },
];

export const fmtPh = (ph) => String(Math.round(ph * 10) / 10).replace('.', ',');

/*
  Qué le pasa a la proteína en el modelo:
  - 'desarmada': pierde su forma (calor excesivo o pH extremo)
  - 'cambia':    la proteína E se reacomoda con pH ácido (las dos copias se separan y se paran)
  - 'agitada':   vibra mucho más por el calor, pero no pierde su forma
  - 'fria':      casi no se mueve
  - 'estable':   se mueve un poquito, mantiene su forma
*/
export function resultado(idEstructura, t, ph) {
  const e = estructura(idEstructura);
  if (t >= e.tDesarma) return 'desarmada';
  // VALIDAR: en el modelo, pH muy extremo también desarma (ciencia general: desnaturalización por pH).
  if (ph <= 2.5 || ph >= 11.5) return 'desarmada';
  // VALIDAR: umbral ilustrativo del cambio de forma de la proteína E (pH ácido ≈ 6 o menos).
  if (e.cambiaConAcido && ph <= 6.2) return 'cambia';
  if (t >= 43) return 'agitada';
  if (t <= 12) return 'fria';
  return 'estable';
}

export const forma = (r) => (r === 'desarmada' ? 'desarma' : r === 'cambia' ? 'cambia' : 'igual');

export const PREDICCIONES = [
  { id: 'desarma', texto: 'se desnaturaliza (se desarma)' },
  { id: 'cambia', texto: 'cambia de forma' },
  { id: 'igual', texto: 'sigue igual' },
];
export const CAMBIOS = [
  { id: 'calor', texto: 'la calentamos mucho' },
  { id: 'acido', texto: 'la ponemos en ácido' },
];

export const textoHipotesis = (h) => {
  if (!h) return '';
  const c = CAMBIOS.find((x) => x.id === h.cambio);
  const p = PREDICCIONES.find((x) => x.id === h.prediccion);
  return `Si ${c ? c.texto : '…'}, la proteína ${p ? p.texto : '…'}.`;
};

export const NOMBRE_RESULTADO = {
  desarmada: 'Se desnaturalizó',
  cambia: 'Cambió de forma',
  agitada: 'Vibró mucho, pero siguió igual',
  fria: 'Casi quieta, siguió igual',
  estable: 'Siguió igual',
};

// Lo que el niño puede marcar al comparar, y qué es verdad en cada resultado
export const CAMBIOS_VISIBLES = [
  { id: 'mueve', texto: 'Se mueve más' },
  { id: 'quieta', texto: 'Se mueve menos' },
  { id: 'forma', texto: 'Cambió de forma' },
  { id: 'separa', texto: 'Las dos copias se separaron' },
  { id: 'desarma', texto: 'Se desnaturalizó (se desarmó)' },
  { id: 'nada', texto: 'No cambió nada' },
];

/*
  requeridos: lo que se ve sí o sí y hay que marcar.
  permitidos: también es cierto (si lo marca, está bien; si no, no pasa nada).
*/
export function cambiosVerdaderos(r, t, conPares) {
  const req = new Set();
  const ok = new Set();
  if (r === 'desarmada') {
    req.add('desarma');
    ['forma', 'mueve', 'separa'].forEach((x) => ok.add(x));
  } else if (r === 'cambia') {
    req.add('forma');
    if (conPares) req.add('separa');
    if (t >= 43) ok.add('mueve');
    if (t <= 20) ok.add('quieta');
  } else if (r === 'agitada') req.add('mueve');
  else if (r === 'fria') req.add('quieta');
  else {
    req.add('nada');
    if (t < 30) ok.add('quieta');
    if (t >= 40) ok.add('mueve');
  }
  req.forEach((x) => ok.add(x));
  return { req, ok };
}

export const esControl = (c) => c && Math.abs(c.t - INICIAL.t) <= 2 && Math.abs(c.ph - INICIAL.ph) <= 0.4;
export const iguales = (a, b) => a && b && Math.abs(a.t - b.t) <= 2 && Math.abs(a.ph - b.ph) <= 0.4;
