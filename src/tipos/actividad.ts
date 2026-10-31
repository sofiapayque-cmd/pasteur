/*
  Tipos de las actividades científicas.
  Describen el contrato que ya cumple cada `src/actividades/aN/etapas.js`
  (ver también actividades/info.js y docs/GUIA-ACTIVIDADES.md).
*/

export type IdActividad = 'a1' | 'a2' | 'a3' | 'a4';

export const IDS_ACTIVIDAD: readonly IdActividad[] = ['a1', 'a2', 'a3', 'a4'];

export function esIdActividad(valor: unknown): valor is IdActividad {
  return typeof valor === 'string' && (IDS_ACTIVIDAD as readonly string[]).includes(valor);
}

/** Una etapa del recorrido del niño (la maestra las ve en el tablero). */
export interface Etapa {
  id: string;
  nombre: string;
}

/** Lo que la maestra elige al preparar la clase (ej. ambientes de A1). */
export interface OpcionDef {
  clave: string;
  etiqueta: string;
  items: Array<{ id: string; nombre: string; detalle?: string; color?: string }>;
}

/** Una etapa que la maestra puede habilitar en vivo (ej. antibióticos en A1). */
export interface DesbloqueoDef {
  clave: string;
  etiqueta: string;
  etapa: string;
  accion: string;
  recomendado: string;
  explicacion: string;
}

export interface GuiaDocente {
  titulo: string;
  objetivos: string[];
}

/** Lo que exporta cada `aN/etapas.js`. */
export interface InfoActividad {
  ETAPAS: Etapa[];
  PREGUNTAS?: unknown[];
  OPCIONES?: OpcionDef[];
  DESBLOQUEOS?: DesbloqueoDef[];
  GUIA?: GuiaDocente;
  simularDatos?: (indiceEtapa: number, sala: import('./sala').Sala) => DatosActividad;
  resumen?: (datos: DatosActividad) => string;
}

/** Datos libres que cada actividad guarda del avance del niño. */
export type DatosActividad = Record<string, unknown>;

/** Ficha de la actividad en el panel y en "Explorar" (data/contenido.js). */
export interface FichaActividad {
  id: IdActividad;
  numero: string;
  nombre: string;
  bajada: string;
  color: string;
  fondo: string;
  placa: string;
  disponible: boolean;
  pausa?: string;
}
