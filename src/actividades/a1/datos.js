// Datos de A1 · Genómica Microbiana

/*
  A1 tiene dos paisajes y, en cada uno, dos lugares donde investigar:
  el suelo y un animal. Así queda un 2×2 fácil de comparar.
  - curiosidades: lugares de la escena que no son para tomar muestras,
    pero que cuentan un dato breve si el niño los toca.
*/
export const PAISAJES = [
  {
    id: 'antartida',
    nombre: 'Antártida',
    detalle: 'Hielo, roca y mucho frío',
    pregunta: '¿Puede haber vida en un lugar tan frío?',
    cielo: '#DCE6F5',
    curiosidades: [
      {
        id: 'mar',
        nombre: 'El mar',
        x: 18, y: 54,
        dato: 'En el mar antártico viven algas microscópicas: son la comida del krill, y el krill es la comida de los pingüinos.',
      },
      {
        id: 'base',
        nombre: 'La base',
        x: 88, y: 50,
        // VALIDAR: Uruguay tiene una base científica en la Antártida (Base Científica Antártica Artigas).
        dato: 'En la Antártida hay bases donde los científicos viven y trabajan. Uruguay tiene una.',
      },
    ],
  },
  {
    id: 'campo',
    nombre: 'Campo uruguayo',
    detalle: 'Pasto natural, sol y animales',
    pregunta: '¿Qué vive escondido en el campo?',
    cielo: '#E8F0D8',
    curiosidades: [
      {
        id: 'arbol',
        nombre: 'El árbol',
        x: 81, y: 36,
        dato: 'Entre las raíces de las plantas viven muchísimas bacterias. Algunas las ayudan a crecer.',
      },
      {
        id: 'pasto',
        nombre: 'El pasto',
        x: 46, y: 64,
        dato: 'El campo natural tiene muchas plantas distintas mezcladas, no un solo tipo de pasto.',
      },
    ],
  },
];

export const paisajePorId = (id) => PAISAJES.find((p) => p.id === id);

/*
  Cada ambiente es un lugar para tomar una muestra.
  - punto: dónde está en la escena (en % del ancho y alto)
  - instrumento: con qué se toma la muestra
  - microbios: colores de la vista microscópica (representación, no especies reales)
  - codigo: lo que dice la etiqueta del tubo
*/
export const AMBIENTES = [
  {
    id: 'antartida-suelo', paisaje: 'antartida', tipo: 'suelo',
    nombre: 'Suelo antártico', detalle: 'Antártida', color: '#7D8FAE', codigo: 'ANT·SUELO',
    punto: { x: 23, y: 81 }, instrumento: 'espatula',
    consigna: 'Raspá un poco de tierra helada con la espátula.',
    microbios: ['#93AEEB', '#8ED5C3', '#F4A6BD'],
  },
  {
    id: 'antartida-pinguino', paisaje: 'antartida', tipo: 'animal',
    nombre: 'Pingüino', detalle: 'Antártida', color: '#3E4A63', codigo: 'ANT·PINGÜINO',
    punto: { x: 64, y: 79 }, instrumento: 'hisopo',
    consigna: 'Para no molestarlo, tomamos la muestra de su caca con un hisopo.',
    microbios: ['#F4A6BD', '#93AEEB', '#EF6F5E'],
  },
  {
    id: 'campo-suelo', paisaje: 'campo', tipo: 'suelo',
    nombre: 'Campo natural', detalle: 'Campo uruguayo', color: '#8A6A4A', codigo: 'CAMPO·SUELO',
    punto: { x: 21, y: 84 }, instrumento: 'espatula',
    consigna: 'Sacá un poquito de tierra de entre el pasto con la espátula.',
    microbios: ['#F2B13B', '#8ED5C3', '#EF6F5E'],
  },
  {
    id: 'campo-vaca', paisaje: 'campo', tipo: 'animal',
    nombre: 'Vaca', detalle: 'Campo uruguayo', color: '#C9A26B', codigo: 'CAMPO·VACA',
    punto: { x: 55, y: 77 }, instrumento: 'hisopo',
    consigna: 'Sin molestar a la vaca, tomamos la muestra de su bosta con un hisopo.',
    microbios: ['#F2B13B', '#F4A6BD', '#7272EE'],
  },
];

export const ambientePorId = (id) => AMBIENTES.find((a) => a.id === id);

/* Instrumentos de la bandeja de muestreo */
export const INSTRUMENTOS = [
  { id: 'espatula', nombre: 'Espátula', detalle: 'Para raspar y juntar tierra' },
  { id: 'hisopo', nombre: 'Hisopo', detalle: 'Un palito con algodón en la punta' },
  { id: 'mano', nombre: 'Tu mano', detalle: 'Sin nada' },
];
