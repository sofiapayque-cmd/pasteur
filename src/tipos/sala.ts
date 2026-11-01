/*
  Tipos de la sala de clase (hoy en localStorage: src/sala/sala.js).
  Son los mismos que va a usar la versión con Supabase.
*/
import type { DatosActividad, IdActividad } from './actividad';

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
  /** Etapas habilitadas en vivo (ej. { antibioticos: true }). */
  desbloqueos: Record<string, boolean>;
  alumnos: AlumnoEnSala[];
}
