/*
  TIMER DE LA CLASE EN VIVO · la parte sin red (se prueba con npm run test:tiempo).
  Pedido de Sofia (8/11): la maestra puede ponerle una duración a la clase
  (opcional) e iniciar, pausar, extender y finalizar el tiempo.

  El tiempo lo lleva la base (migración 21): guarda a qué hora termina si
  está corriendo, o cuántos segundos faltan si está listo o en pausa, siempre
  con la hora de la base. Cada pantalla solo calcula cuánto falta, corrigiendo
  la diferencia entre su reloj y el del servidor (el "desfase"): así una
  Ceibal con la hora mal ve lo mismo que la compu de la maestra.
*/
export type EstadoTiempo = 'sin' | 'listo' | 'corriendo' | 'pausado' | 'terminado';
export type Cierre = 'flexible' | 'definitivo';
export type Tiempo = {
  estado: EstadoTiempo;
  /** segundos planeados (con las extensiones) */
  duracion: number | null;
  /** corriendo: a qué hora termina (ISO) */
  fin: string | null;
  /** listo o pausado: cuántos segundos faltan */
  restante: number | null;
  terminadoEn: string | null;
  cierre: Cierre;
};
/** Las columnas de la tabla sesiones (pueden faltar si la base todavía no tiene la migración 21). */
export type FilaTiempo = {
  tiempo_estado?: string | null;
  tiempo_duracion?: number | null;
  tiempo_fin?: string | null;
  tiempo_restante?: number | null;
  tiempo_terminado_en?: string | null;
  cierre?: string | null;
};

export const SIN_TIEMPO: Tiempo = { estado: 'sin', duracion: null, fin: null, restante: null, terminadoEn: null, cierre: 'flexible' };
const ESTADOS: readonly EstadoTiempo[] = ['sin', 'listo', 'corriendo', 'pausado', 'terminado'];

export const ACCIONES_TIEMPO = ['poner', 'quitar', 'iniciar', 'pausar', 'seguir', 'extender', 'finalizar', 'definitivo'] as const;
export type AccionTiempo = (typeof ACCIONES_TIEMPO)[number];
export const esAccionTiempo = (a: unknown): a is AccionTiempo => typeof a === 'string' && (ACCIONES_TIEMPO as readonly string[]).includes(a);

/** Duraciones que se ofrecen al poner tiempo (minutos) y lo que suma "extender". */
export const DURACIONES_MIN = [10, 15, 20, 30, 45, 60] as const;
export const EXTENSION_SEG = 5 * 60;

export function tiempoDeFila(f: FilaTiempo | null | undefined): Tiempo {
  if (!f || !ESTADOS.includes(f.tiempo_estado as EstadoTiempo)) return { ...SIN_TIEMPO, cierre: f?.cierre === 'definitivo' ? 'definitivo' : 'flexible' };
  return {
    estado: f.tiempo_estado as EstadoTiempo,
    duracion: f.tiempo_duracion ?? null,
    fin: f.tiempo_fin ?? null,
    restante: f.tiempo_restante ?? null,
    terminadoEn: f.tiempo_terminado_en ?? null,
    cierre: f.cierre === 'definitivo' ? 'definitivo' : 'flexible',
  };
}

/** La hora del servidor según esta pantalla: su reloj más el desfase. */
export const ahoraServidor = (desfaseMs: number, relojMs = Date.now()) => relojMs + desfaseMs;

/**
 * Desfase entre el reloj del servidor y el de esta pantalla. Se toma la
 * mitad del viaje de ida y vuelta, como hacen los relojes de red.
 */
export function calcularDesfase(servidorIso: string, enviadoMs: number, recibidoMs: number): number {
  const servidor = Date.parse(servidorIso);
  if (!Number.isFinite(servidor) || recibidoMs < enviadoMs) return 0;
  return Math.round(servidor - (enviadoMs + recibidoMs) / 2);
}

/** El estado de verdad: un tiempo "corriendo" cuyo fin ya pasó está terminado. */
export function estadoEfectivo(t: Tiempo, ahoraMs: number): EstadoTiempo {
  if (t.estado === 'corriendo' && t.fin && Date.parse(t.fin) <= ahoraMs) return 'terminado';
  return t.estado;
}

/** Milisegundos que faltan (0 si no hay tiempo o ya terminó). */
export function msRestantes(t: Tiempo, ahoraMs: number): number {
  switch (estadoEfectivo(t, ahoraMs)) {
    case 'listo':
    case 'pausado':
      return Math.max(0, (t.restante ?? 0) * 1000);
    case 'corriendo':
      return Math.max(0, Date.parse(t.fin!) - ahoraMs);
    default:
      return 0;
  }
}

/** "12:05", o "1:02:05" si pasa de una hora. Redondea para arriba: 0:00 recién cuando terminó. */
export function formatearReloj(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Qué puede hacer la maestra en cada momento (los mismos controles que hace la base). */
export function accionesPosibles(t: Tiempo, ahoraMs: number): AccionTiempo[] {
  const estado = estadoEfectivo(t, ahoraMs);
  if (t.cierre === 'definitivo') return [];
  const extender = (t.duracion ?? 0) + EXTENSION_SEG <= 14400 ? (['extender'] as const) : [];
  switch (estado) {
    case 'sin':
      return ['poner', 'definitivo'];
    case 'listo':
      return ['iniciar', 'quitar', ...extender];
    case 'corriendo':
      return ['pausar', ...extender, 'finalizar'];
    case 'pausado':
      return ['seguir', ...extender, 'finalizar'];
    case 'terminado':
      return [...extender, 'definitivo'];
  }
}

/**
 * ¿Cuántos chicos guardaron después del final? Sirve para que la maestra
 * vea que el avance de todos quedó guardado (cada compu guarda al terminar).
 */
export function guardaronAlFinal(terminadoEn: string | null, actualizaciones: (string | null | undefined)[]): number {
  const fin = terminadoEn ? Date.parse(terminadoEn) : NaN;
  if (!Number.isFinite(fin)) return 0;
  // 3 segundos de margen: la Ceibal guarda apenas ve el final, que puede llegarle un poco antes
  return actualizaciones.filter((a) => a && Date.parse(a) >= fin - 3000).length;
}
