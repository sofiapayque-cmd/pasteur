/*
  Tipo de lo que devuelve useProgreso(actividadId) (src/sala/progreso.js):
  lo único que una actividad necesita para guardar el avance del niño.
*/
import type { DatosActividad } from './actividad';
import type { AlumnoEnSala, Sala } from './sala';

export interface Progreso {
  /** Id de la etapa actual (ver ETAPAS en aN/etapas.js). */
  etapa: string;
  datos: DatosActividad;
  /** Cambia de etapa (null = la misma) y opcionalmente guarda datos. */
  ir: (etapa: string | null, datos?: DatosActividad) => void;
  guardar: (datos: DatosActividad) => void;
  reiniciar: () => void;
  /** true si el niño está en una sala con su maestra. */
  enClase: boolean;
  alumno: AlumnoEnSala | null;
  opciones: Sala['opciones'];
  /** Si la maestra habilitó algo (en modo individual, siempre true). */
  desbloqueado: (clave: string) => boolean;
  pausada: boolean;
  sala: Sala;
}
