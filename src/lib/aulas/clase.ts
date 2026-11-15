import { primeraEtapa } from './tareas';
import type { FilaTiempo } from './tiempo';

/*
  CLASE EN VIVO · la parte sin red (se prueba con npm run test:clase).

  Una clase en vivo es una fila de `sesiones` (migración 1) unida a una
  actividad del aula (`asignaciones`). Cada chico que entra tiene su fila de
  `progreso`, igual que en las tareas: así lo que hace en clase queda
  guardado y puede seguir después.

  Las pantallas de la maestra (sala de espera, tablero, puesta en común)
  trabajan con la misma "sala" que el prototipo (src/sala/sala.js). Acá se
  arma esa sala a partir de lo que devuelve la base, y se le aplican los
  cambios que llegan en tiempo real (o al preguntar cada tanto, si el tiempo
  real no anda en esa red).
*/
export type EstadoClase = 'esperando' | 'en-curso' | 'puesta' | 'cerrada';

export type SesionFila = {
  id: string;
  asignacion_id: string;
  aula_id: string;
  estado: EstadoClase;
  pausada: boolean;
  desbloqueos: Record<string, boolean> | null;
  iniciada_en: string;
  cerrada_en: string | null;
} & FilaTiempo; // + el timer (migración 21; puede faltar si la base todavía no la tiene)
export type AsignacionClase = { id: string; actividad: string; opciones: Record<string, string[]> | null; desbloqueos: Record<string, boolean> | null; estado: string };
export type AlumnoClase = { id: string; numero: number; apodo: string | null; color: string | null; activo: boolean };
export type ProgresoClase = {
  alumno_id: string;
  etapa: string;
  datos: Record<string, unknown> | null;
  etapa_desde: string;
  actualizado_en: string;
  completada_en: string | null;
};
export type Instantanea = {
  sesion: SesionFila;
  asignacion: AsignacionClase;
  aula: { id: string; nombre: string; codigo: string };
  alumnos: AlumnoClase[];
  progresos: ProgresoClase[];
};

/** La forma de la sala que usan las pantallas del prototipo (src/sala/sala.js). */
export type SalaReal = {
  codigo: string;
  actividad: string;
  estado: EstadoClase;
  pausada: boolean;
  opciones: Record<string, string[]>;
  desbloqueos: Record<string, boolean>;
  alumnos: { id: string; apodo: string; color: string; etapa: string; datos: Record<string, unknown>; desde: number; numero: number; terminada: boolean }[];
};

export const COLORES = ['#EF6F5E', '#F4A6BD', '#F2B13B', '#8ED5C3', '#93AEEB', '#A9A9F4'];
export const nombreDeAlumno = (a: Pick<AlumnoClase, 'apodo' | 'numero'>) => a.apodo || `N.º ${a.numero}`;
export const colorDeAlumno = (a: Pick<AlumnoClase, 'color' | 'numero'>) => a.color || COLORES[(a.numero - 1) % COLORES.length];

/**
 * Lo habilitado en la clase: lo de la actividad (true = desde el principio,
 * false = lo habilita la maestra) más lo que la maestra habilitó en vivo.
 */
export function desbloqueosDeClase(deActividad: Record<string, boolean> | null, enVivo: Record<string, boolean> | null): Record<string, boolean> {
  const salida: Record<string, boolean> = { ...(deActividad ?? {}) };
  for (const [k, v] of Object.entries(enVivo ?? {})) if (v === true) salida[k] = true;
  return salida;
}

export function salaDesde(i: Instantanea): SalaReal {
  const porAlumno = new Map(i.progresos.map((p) => [p.alumno_id, p]));
  const alumnos = i.alumnos
    .filter((a) => a.activo && porAlumno.has(a.id))
    .sort((a, b) => a.numero - b.numero)
    .map((a) => {
      const p = porAlumno.get(a.id)!;
      return {
        id: a.id,
        numero: a.numero,
        apodo: nombreDeAlumno(a),
        color: colorDeAlumno(a),
        etapa: p.etapa || primeraEtapa(i.asignacion.actividad),
        datos: p.datos ?? {},
        desde: Date.parse(p.etapa_desde) || Date.now(),
        terminada: Boolean(p.completada_en),
      };
    });
  return {
    codigo: i.aula.codigo,
    actividad: i.asignacion.actividad,
    estado: i.sesion.estado,
    pausada: i.sesion.pausada,
    opciones: i.asignacion.opciones ?? {},
    desbloqueos: desbloqueosDeClase(i.asignacion.desbloqueos, i.sesion.desbloqueos),
    alumnos,
  };
}

/** Cambio de la sesión (tiempo real o consulta). Solo la de esta clase. */
export function aplicarSesion(i: Instantanea, fila: Partial<SesionFila> | null | undefined): Instantanea {
  if (!fila || fila.id !== i.sesion.id) return i;
  return { ...i, sesion: { ...i.sesion, ...fila, desbloqueos: fila.desbloqueos ?? i.sesion.desbloqueos } };
}

/**
 * Avance de un chico (tiempo real o consulta). Solo de esta actividad, y
 * nunca uno viejo encima de uno más nuevo (pueden llegar desordenados).
 */
export function aplicarProgreso(i: Instantanea, fila: (Partial<ProgresoClase> & { asignacion_id?: string }) | null | undefined): Instantanea {
  if (!fila?.alumno_id || (fila.asignacion_id && fila.asignacion_id !== i.asignacion.id)) return i;
  const actual = i.progresos.find((p) => p.alumno_id === fila.alumno_id);
  if (actual && fila.actualizado_en && Date.parse(fila.actualizado_en) < Date.parse(actual.actualizado_en)) return i;
  const nueva: ProgresoClase = {
    alumno_id: fila.alumno_id,
    etapa: fila.etapa ?? actual?.etapa ?? primeraEtapa(i.asignacion.actividad),
    datos: fila.datos ?? actual?.datos ?? {},
    etapa_desde: fila.etapa_desde ?? actual?.etapa_desde ?? new Date().toISOString(),
    actualizado_en: fila.actualizado_en ?? new Date().toISOString(),
    completada_en: fila.completada_en === undefined ? (actual?.completada_en ?? null) : fila.completada_en,
  };
  return { ...i, progresos: actual ? i.progresos.map((p) => (p.alumno_id === fila.alumno_id ? nueva : p)) : [...i.progresos, nueva] };
}

/** Junta una consulta nueva (puede traer solo lo que cambió) con lo que ya se tenía. */
export function fusionar(i: Instantanea, nueva: Partial<Instantanea> & { sesion: SesionFila }): Instantanea {
  let r = aplicarSesion(i, nueva.sesion);
  if (nueva.alumnos) r = { ...r, alumnos: nueva.alumnos };
  if (nueva.asignacion && nueva.asignacion.id === r.asignacion.id) r = { ...r, asignacion: nueva.asignacion };
  for (const p of nueva.progresos ?? []) r = aplicarProgreso(r, p);
  return r;
}

/** El último cambio que se conoce (para pedir solo lo nuevo). */
export const ultimoCambio = (i: Instantanea) => i.progresos.reduce((m, p) => (p.actualizado_en > m ? p.actualizado_en : m), '');

/** Qué pasos puede dar la maestra desde cada estado. */
export const PASOS = {
  empezar: { desde: ['esperando'], a: 'en-curso' },
  puesta: { desde: ['en-curso'], a: 'puesta' },
  volver: { desde: ['puesta'], a: 'en-curso' },
  cerrar: { desde: ['esperando', 'en-curso', 'puesta'], a: 'cerrada' },
} as const satisfies Record<string, { desde: EstadoClase[]; a: EstadoClase }>;
export type Paso = keyof typeof PASOS;
export const esPaso = (p: unknown): p is Paso => typeof p === 'string' && Object.hasOwn(PASOS, p);

/** Una clase que quedó abierta de otro día ya no lleva directo a los chicos. */
export const HORAS_RECIENTE = 4;
export const esReciente = (iniciadaEn: string, ahora = Date.now()) => ahora - Date.parse(iniciadaEn) < HORAS_RECIENTE * 3600 * 1000;

/**
 * La sala de una TAREA (sin clase abierta), para mirar lo que encontró la
 * clase con la misma pantalla de la puesta en común.
 */
export function salaDeTarea(
  aula: Instantanea['aula'],
  asignacion: AsignacionClase,
  alumnos: AlumnoClase[],
  progresos: (Omit<ProgresoClase, 'etapa_desde'> & { etapa_desde?: string })[],
): SalaReal {
  const sesion: SesionFila = { id: 'tarea', asignacion_id: asignacion.id, aula_id: aula.id, estado: 'puesta', pausada: false, desbloqueos: {}, iniciada_en: '', cerrada_en: null };
  return salaDesde({ sesion, asignacion, aula, alumnos, progresos: progresos.map((p) => ({ ...p, etapa_desde: p.etapa_desde ?? p.actualizado_en })) });
}
