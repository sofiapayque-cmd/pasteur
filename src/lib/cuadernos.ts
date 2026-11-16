/*
  CUADERNOS · la parte sin red ni base (se prueba con npm run test:cuadernos).
  Pedido de Sofia (16/11): el cuaderno de cada chico (sus investigaciones,
  sus notas y sus preguntas), el de la maestra (qué actividad hicieron, por
  cuánto, qué preguntaron) y que la respuesta le llegue a quien preguntó.
*/

export const MAX_NOTA_ALUMNO = 500;
export const MAX_NOTA_MAESTRA = 3000;

export type EstadoNota = 'nueva' | 'enviada' | 'conversada';
export type Paso = 'sin_ver' | 'esperando' | 'respondida' | 'conversada';

/**
 * En qué anda una pregunta de un chico, contado para él:
 * todavía no la vio la maestra, se la mandó al Pasteur y espera, ya tiene
 * respuesta, o la charlaron en clase.
 */
export function pasoDePregunta(estado: EstadoNota, tieneRespuesta: boolean): { paso: Paso; texto: string } {
  if (tieneRespuesta) return { paso: 'respondida', texto: '¡Te respondió el Pasteur!' };
  if (estado === 'conversada') return { paso: 'conversada', texto: 'Tu maestra la charló en clase' };
  if (estado === 'enviada') return { paso: 'esperando', texto: 'Tu maestra se la mandó al Pasteur. Cuando una investigadora la responda, aparece acá.' };
  return { paso: 'sin_ver', texto: 'Tu maestra la va a leer' };
}

/** Minutos entre el comienzo y el cierre de una clase en vivo (null si no cerró o no tiene sentido). */
export function minutosDeClase(iniciada: string, cerrada: string | null): number | null {
  if (!cerrada) return null;
  const ms = Date.parse(cerrada) - Date.parse(iniciada);
  if (!Number.isFinite(ms) || ms < 60_000) return null;
  return Math.min(600, Math.round(ms / 60_000));
}

/** "1 h 20 min", "45 min". */
export function textoMinutos(m: number | null | undefined): string {
  if (!m) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`;
}

/** La fecha de Montevideo de un momento (AAAA-MM-DD). */
export function diaUY(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' });
}

export type SesionDiario = { id: string; actividad: string | null; iniciada_en: string; cerrada_en: string | null; estado: string };
export type NotaDiario = { id: string; fecha: string; actividad: string | null; minutos: number | null; texto: string; sesion_id: string | null };
export type EntradaDiario = {
  clave: string;
  fecha: string;
  actividad: string | null;
  minutos: number | null;
  /** La clase en vivo de ese día, si la hubo. */
  sesion: SesionDiario | null;
  /** Lo que anotó la maestra (si anotó). */
  nota: NotaDiario | null;
};

/**
 * El diario de la clase: las clases en vivo (con su actividad y cuánto
 * duraron) y lo que anotó la maestra, juntos y del más nuevo al más viejo.
 * Una nota que dice de qué clase es va con esa clase; las demás van solas.
 */
export function diarioDeClase(sesiones: SesionDiario[], notas: NotaDiario[]): EntradaDiario[] {
  const usadas = new Set<string>();
  const entradas: EntradaDiario[] = sesiones.map((s) => {
    const nota = notas.find((n) => n.sesion_id === s.id) ?? null;
    if (nota) usadas.add(nota.id);
    return {
      clave: `s-${s.id}`,
      fecha: nota?.fecha ?? diaUY(s.iniciada_en),
      actividad: nota?.actividad ?? s.actividad,
      minutos: nota?.minutos ?? minutosDeClase(s.iniciada_en, s.cerrada_en),
      sesion: s,
      nota,
    };
  });
  for (const n of notas) {
    if (usadas.has(n.id)) continue;
    entradas.push({ clave: `n-${n.id}`, fecha: n.fecha, actividad: n.actividad, minutos: n.minutos, sesion: null, nota: n });
  }
  return entradas.sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.sesion?.iniciada_en ?? '').localeCompare(a.sesion?.iniciada_en ?? '') || a.clave.localeCompare(b.clave));
}

/** El texto de una nota, limpio: sin espacios de más y sin pasarse del largo. */
export function limpiarNota(texto: unknown, max = MAX_NOTA_ALUMNO): string {
  return String(texto ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/** Minutos que escribió la maestra (1 a 600), o null. */
export function minutosEscritos(v: unknown): number | null {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')));
  return Number.isFinite(n) && n >= 1 && n <= 600 ? n : null;
}

/** Una fecha AAAA-MM-DD válida (no del futuro ni de hace más de dos años), o null. */
export function fechaEscrita(v: unknown, hoy = diaUY(new Date().toISOString())): string | null {
  const s = String(v ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T12:00:00Z`))) return null;
  const dias = (Date.parse(`${hoy}T12:00:00Z`) - Date.parse(`${s}T12:00:00Z`)) / 86_400_000;
  return dias >= 0 && dias <= 730 ? s : null;
}
