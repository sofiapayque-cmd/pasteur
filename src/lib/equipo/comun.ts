/*
  Textos y utilidades del panel del equipo que usan tanto el servidor como el
  navegador (por eso no van en src/datos, que es solo servidor).
*/
export type Rol = 'redactor' | 'validador' | 'admin';
export type Formato = 'pregunta' | 'dato';

export const NOMBRE_ROL: Record<Rol, string> = { redactor: 'Redactora', validador: 'Validadora', admin: 'Admin' };

export const NOMBRE_ESTADO: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  publicada: 'Publicada',
  reemplazada: 'Reemplazada',
  rechazada: 'Rechazada',
  retirada: 'Retirada',
  candidata: 'Candidata',
  aprobada: 'Aprobada',
  activa: 'Activa',
  suspendida: 'Suspendida',
};

export const ACTIVIDADES: Record<string, string> = {
  a1: 'A1 · Genómica microbiana',
  a2: 'A2 · Simulaciones biomoleculares',
  a3: 'A3 · Bioimagenología',
  a4: 'A4 · Evolución de virus',
};
/** Las que se pueden elegir hoy. A4 se retiró el 9/11: queda arriba solo para nombrar lo que ya estaba guardado. */
export const ACTIVIDADES_A_ELEGIR = Object.entries(ACTIVIDADES).filter(([id]) => id !== 'a4');

/** Máximo de palabras de la versión para chicos (migración 9). Son máximos, no mínimos. */
export const LIMITE_PALABRAS: Record<Formato, number> = { pregunta: 90, dato: 60 };

/** Qué permite cada política de licencias con el pasaje (migración 14). */
export const POLITICA_PASAJE: Record<string, string> = {
  textual: 'Se puede copiar el pasaje (hasta 60 palabras, con atribución).',
  breve: 'Se puede copiar una cita breve (hasta 25 palabras, con atribución).',
  solo_ubicacion: 'No se copia: poné dónde está y una paráfrasis con tus palabras.',
};

export const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

const FECHA = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Montevideo' });
const FECHA_HORA = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Montevideo',
});
export const fecha = (iso: string | null | undefined) => (iso ? FECHA.format(new Date(iso)) : '');
export const fechaHora = (iso: string | null | undefined) => (iso ? FECHA_HORA.format(new Date(iso)) : '');

/** "hoy", "ayer", "hace 3 días" (para el tablero). */
export function haceCuanto(iso: string | null | undefined, ahora = Date.now()): string {
  if (!iso) return '';
  const dias = Math.floor((ahora - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return fecha(iso);
}

/** Nombre corto para la dirección: "¿Qué es una célula?" → "que-es-una-celula" */
export function slugDe(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}
