/*
  PANTALLA 02 · ¿CÓMO QUERÉS EXPLORAR? · datos de la escena

  Como en la portada, todo se mide en unidades de diseño y en pantalla cada
  unidad vale var(--u) (ver rol.css). Hay dos escenas:
  - horizontal: 1920 × 1080 (compu y Ceibal);
  - vertical: 1080 × 1920 (celular parado).
  Las dos placas quedan lado a lado en las dos, así Moli salta igual.

  Las células están en otra capa que CUBRE toda la pantalla (siempre
  1920 × 1080), así no quedan franjas vacías en ningún tamaño.
*/
import type { Celula } from '../hero/escena';

export type Rol = 'maestra' | 'alumno';

/* Rutas que ya existen (no se crean rutas nuevas). */
export const DESTINO: Record<Rol, string> = {
  maestra: '/maestra',
  alumno: '/clase',
};

/* Diámetro de cada placa, en unidades. */
export const PLACA_D = 453;

/*
  Células de esta pantalla (capa que cubre, 1920 × 1080). Las mismas de la
  portada (FloatingCells), en otras posiciones. Arrancan acá; después
  viajan (etapa 3).
*/
export const CELULAS_ROL: Celula[] = [
  { id: 'a', x: 240, y: 252, d: 156, giro: -12 },
  { id: 'b', x: 456, y: 984, d: 115, giro: 20 },
  { id: 'c', x: 1656, y: 204, d: 134, giro: 24 },
  { id: 'd', x: 1692, y: 672, d: 180, giro: 9 },
  { id: 'e', x: 1524, y: 984, d: 77, giro: -8 },
  { id: 'f', x: 252, y: 672, d: 70, giro: 30 },
  { id: 'g', x: 960, y: 1008, d: 53, giro: -20 },
  { id: 'h', x: 1368, y: 396, d: 48, giro: 14 },
  { id: 'k', x: 492, y: 360, d: 41, giro: -30 },
  { id: 'i', x: 864, y: 840, d: 84, giro: -18 },
  { id: 'j', x: 1070, y: 624, d: 62, giro: 16 },
];

/*
  MOLI (modelo: public/models/moli.glb, preparado desde moli.blend con
  docs/moli/preparar_moli_web.py).

  - ESCALA: cuántas unidades de la escena vale una unidad de Blender
    (Moli mide 3,06 de ancho → unas 217 unidades, la mitad de la placa).
  - ASIENTO: el punto de Moli que se apoya en el borde de la placa cuando
    está sentada: la base del oxígeno, 0,31 sobre el piso del modelo.
  - INCLINACION: Moli se inclina 7° hacia la pantalla, como la cámara del
    render de Blender, que la mira apenas desde arriba.
*/
export const MOLI = {
  modelo: '/models/moli.glb',
  escala: 71,
  asiento: 0.31,
  inclinacion: 7,
} as const;

/*
  Imagen de respaldo (render del mismo archivo, con Cycles): se ve mientras
  carga el 3D y queda si el navegador no tiene WebGL.
  Es un cuadrado de 6,4 unidades de Blender; el asiento cae en (50 %, 62,3 %).
*/
export const RESPALDO = {
  src: '/illustrations/rol/moli-sentada.webp',
  lado: 6.4 * 71,
  asientoX: 0.5,
  asientoY: 0.6226,
} as const;
