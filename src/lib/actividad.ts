/*
  Tipos de las actividades científicas.
  Describen el contrato que ya cumple cada `src/actividades/aN/etapas.js`
  (ver también actividades/info.js y docs/GUIA-ACTIVIDADES.md).
*/

export type IdActividad = 'a1' | 'a2' | 'a3';

export const IDS_ACTIVIDAD: readonly IdActividad[] = ['a1', 'a2', 'a3'];

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

export interface GuiaDocente {
  titulo: string;
  objetivos: string[];
}

/** Lo que exporta cada `aN/etapas.js`. */
export interface InfoActividad {
  ETAPAS: Etapa[];
  PREGUNTAS?: unknown[];
  OPCIONES?: OpcionDef[];
  GUIA?: GuiaDocente;
  simularDatos?: (indiceEtapa: number, sala: Sala) => DatosActividad;
  resumen?: (datos: DatosActividad) => string;
}

/** Datos libres que cada actividad guarda del avance del niño. */
export type DatosActividad = Record<string, unknown>;

/** Ficha de la actividad en el panel y en "Explorar" (lib/contenido.js). */
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

/* Tipos de la sala de clase de prueba (src/sala/sala.js, guardada en el navegador). */

export type EstadoSala = 'esperando' | 'en-curso' | 'puesta' | 'cerrada';

/** Un niño dentro de la sala. Nunca guarda el nombre real: solo un apodo elegido. */
export interface AlumnoEnSala {
  id: string;
  apodo: string;
  color: string;
  etapa: string;
  datos: DatosActividad;
  /** Desde cuándo está en la etapa actual (ms, Date.now()). */
  desde: number;
}

export interface Sala {
  /** Código de 4 caracteres sin letras confundibles (ej. "K7RM"). */
  codigo: string | null;
  actividad: IdActividad | null;
  estado: EstadoSala;
  pausada: boolean;
  /** Lo que eligió la maestra al preparar (ej. { ambientes: ['antartida-suelo', …] }). */
  opciones: Record<string, string[]>;
  alumnos: AlumnoEnSala[];
}
