import { MUESTRAS, MUESTRA, buscarMision } from './contenido';

export const ETAPAS = [
  { id: 'muestra', nombre: 'Muestra' },
  { id: 'mision', nombre: 'Misión' },
  { id: 'preparar', nombre: 'Preparar' },
  { id: 'microscopio', nombre: 'Microscopio' },
  { id: 'identificar', nombre: 'Identificar' },
  { id: 'galeria', nombre: 'Álbum' },
];

export const GUIA = {
  titulo: 'Un microscopio de fluorescencia',
  objetivos: [
    'Usar un microscopio: mover la muestra, cambiar el aumento, enfocar y elegir la profundidad.',
    'Descubrir que con tintes de colores se ven partes de la célula que a simple vista son invisibles.',
    'Registrar lo observado con fotos y sus datos, como en un laboratorio de imágenes.',
  ],
};

export const OPCIONES = [
  {
    clave: 'muestras',
    etiqueta: 'Muestras que ve la clase',
    items: MUESTRAS.map((m) => ({ id: m.id, nombre: m.nombre, detalle: m.detalle, color: m.color })),
  },
];

export const PREGUNTAS = [
  '¿Por qué hace falta teñir las células para ver sus partes?',
  '¿Qué ganaste y qué perdiste al subir el aumento?',
  '¿Por qué se apagaba la fluorescencia si te quedabas mucho tiempo en el mismo lugar?',
];

// Datos de prueba para el tablero de la maestra
export function simularDatos(indice, sala) {
  const disponibles = sala?.opciones?.muestras?.length ? sala.opciones.muestras : MUESTRAS.map((m) => m.id);
  const muestra = disponibles[Math.floor(Math.random() * disponibles.length)];
  if (indice < 1) return {};
  const misiones = MUESTRA[muestra].misiones;
  const mision = misiones[Math.floor(Math.random() * misiones.length)].id;
  if (indice < 3) return { muestra, mision };
  const nFotos = indice === 3 ? 1 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 5);
  const borrosas = Math.floor(Math.random() * 3);
  const datos = {
    muestra,
    mision,
    preparado: [muestra],
    nFotos,
    errores: { borrosa: borrosas, apagada: Math.random() < 0.4 ? 1 : 0, identificar: indice >= 4 ? Math.floor(Math.random() * 2) : 0 },
    fotos: [],
  };
  if (indice >= 5) datos.logros = [{ m: muestra, mi: mision, n: 1 + Math.floor(Math.random() * 3) }];
  return datos;
}

export function resumen(datos) {
  if (!datos?.muestra) return 'Eligiendo muestra';
  const logros = datos.logros?.length || 0;
  const fotos = datos.nFotos || 0;
  const borrosas = datos.errores?.borrosa || 0;
  const partes = [];
  if (logros) partes.push(`${logros} ${logros === 1 ? 'misión' : 'misiones'}`);
  partes.push(`${fotos} ${fotos === 1 ? 'foto' : 'fotos'}`);
  if (borrosas) partes.push(`${borrosas} ${borrosas === 1 ? 'borrosa' : 'borrosas'}`);
  if (!logros) {
    const m = buscarMision(datos.muestra, datos.mision);
    if (m) partes.push(`busca: ${m.nombre.toLowerCase()}`);
  }
  return partes.join(' · ');
}
