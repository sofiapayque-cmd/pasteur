import { ESTRUCTURAS, estructura, resultado, forma, fmtPh, PRESETS_T, PRESETS_PH, CAMBIOS, PREDICCIONES } from './ciencia';

export const ETAPAS = [
  { id: 'estructura', nombre: 'Molécula' },
  { id: 'explorar', nombre: 'Explorar' },
  { id: 'hipotesis', nombre: 'Hipótesis' },
  { id: 'condiciones', nombre: 'Condiciones' },
  { id: 'simulacion', nombre: 'Simulación' },
  { id: 'comparar', nombre: 'Comparar' },
  { id: 'conclusion', nombre: 'Informe' },
];

export const GUIA = {
  titulo: 'Simular lo que no se ve',
  objetivos: [
    'Descubrir que los científicos usan computadoras para estudiar moléculas demasiado chicas para verlas.',
    'Formular una hipótesis antes de experimentar y aceptar que puede no cumplirse.',
    'Observar que el calor y la acidez cambian la forma de las proteínas, como la de los virus del dengue y el zika.',
  ],
};

export const OPCIONES = [
  {
    clave: 'estructuras',
    etiqueta: 'Moléculas que puede elegir la clase',
    items: ESTRUCTURAS.map((e) => ({ id: e.id, nombre: e.nombre, detalle: e.detalle, color: e.color })),
  },
];

export const PREGUNTAS = [
  '¿Qué le pasó a la proteína con mucho calor? ¿En qué se parece a cocinar un huevo?',
  '¿Por qué la proteína del dengue cambia de forma con la acidez? ¿Para qué le sirve al virus?',
  '¿Se cumplió tu hipótesis? ¿Qué aprendimos cuando no se cumplió?',
];

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

export function simularDatos(indice, sala) {
  const habilitadas = sala?.opciones?.estructuras?.length ? sala.opciones.estructuras : ESTRUCTURAS.map((e) => e.id);
  if (indice < 1) return {};
  const est = azar(habilitadas);
  const datos = { estructura: est, vistas: indice >= 2 ? estructura(est).partes.map((p) => p.id) : [] };
  if (indice < 3) return datos;
  datos.hipotesis = { cambio: azar(CAMBIOS).id, prediccion: azar(PREDICCIONES).id };
  if (indice < 4) return datos;
  const t = datos.hipotesis.cambio === 'calor' ? azar(PRESETS_T).v : 37;
  const ph = datos.hipotesis.cambio === 'acido' ? azar(PRESETS_PH).v : 7.4;
  const r = resultado(est, t, ph);
  datos.corridas = [{ t, ph, r }];
  datos.ronda = 1;
  datos.cumplida = forma(r) === datos.hipotesis.prediccion;
  return datos;
}

export function resumen(datos) {
  if (!datos?.estructura) return 'Eligiendo molécula';
  const nombre = estructura(datos.estructura).corto;
  const c = datos.corridas?.[0];
  if (!c) return datos.hipotesis ? `${nombre} · hipótesis lista` : `${nombre} · explorando`;
  const extra = datos.corridas.length > 1 ? ' · 2 corridas' : '';
  return `${nombre} · ${c.t} °C · pH ${fmtPh(c.ph)} · hipótesis ${datos.cumplida ? 'cumplida' : 'no cumplida'}${extra}`;
}
