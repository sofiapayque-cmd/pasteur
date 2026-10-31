/*
  Datos de cada actividad (sin componentes visuales, para que cargue rápido).
  Cada carpeta aN/ tiene un etapas.js con:
  - ETAPAS:      [{ id, nombre }] en orden (las ve la maestra en el tablero)
  - PREGUNTAS:   preguntas para la puesta en común
  - OPCIONES:    (opcional) lo que la maestra elige al preparar la clase
  - DESBLOQUEOS: (opcional) etapas que la maestra habilita en vivo
  - GUIA:        (opcional) resumen de la guía docente
  - simularDatos(indiceEtapa, sala): (opcional) datos de alumnos de prueba
  - resumen(datos): (opcional) una línea con lo que hizo cada niño, para la puesta en común
*/
import * as a1 from './a1/etapas';
import * as a2 from './a2/etapas';
import * as a3 from './a3/etapas';
import * as a4 from './a4/etapas';

export const INFO_ACTIVIDADES = { a1, a2, a3, a4 };
