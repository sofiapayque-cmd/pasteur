/*
  TAREAS (asignaciones): lo que se puede saber de una actividad sin la base.
  Sirve en el servidor (validar lo que manda la maestra o el alumno) y en el
  navegador (dibujar opciones y etapas). Sale de actividades/aN/etapas.js.
*/
import { ACTIVIDADES } from '@/data/contenido';
import { INFO_ACTIVIDADES } from '@/actividades/info';

export type IdActividad = 'a1' | 'a2' | 'a3' | 'a4';
type Etapa = { id: string; nombre: string };
type Opcion = { clave: string; etiqueta: string; items: { id: string; nombre: string; detalle?: string }[] };
type Desbloqueo = { clave: string; etiqueta: string; explicacion?: string };
type Info = { ETAPAS?: Etapa[]; OPCIONES?: Opcion[]; DESBLOQUEOS?: Desbloqueo[] };
type Actividad = { id: IdActividad; numero: string; nombre: string; bajada: string; disponible: boolean; placa: string; fondo: string };

const info = (act: string): Info => (INFO_ACTIVIDADES as Record<string, Info>)[act] ?? {};

export const ACTIVIDADES_DISPONIBLES = (ACTIVIDADES as Actividad[]).filter((a) => a.disponible);
export const actividad = (act: string) => (ACTIVIDADES as Actividad[]).find((a) => a.id === act) ?? null;
export const esActividadDisponible = (act: unknown): act is IdActividad =>
  typeof act === 'string' && ACTIVIDADES_DISPONIBLES.some((a) => a.id === act);

export const etapasDe = (act: string): Etapa[] => info(act).ETAPAS ?? [];
export const opcionesDe = (act: string): Opcion[] => info(act).OPCIONES ?? [];
export const desbloqueosDe = (act: string): Desbloqueo[] => info(act).DESBLOQUEOS ?? [];
export const primeraEtapa = (act: string) => etapasDe(act)[0]?.id ?? 'inicio';
export const esEtapa = (act: string, etapa: unknown) => typeof etapa === 'string' && etapasDe(act).some((e) => e.id === etapa);
export const esUltimaEtapa = (act: string, etapa: string) => etapasDe(act).at(-1)?.id === etapa;

/** "Etapa 3 de 6 · Microscopio" */
export function dondeVa(act: string, etapa: string | null | undefined): { indice: number; total: number; nombre: string } {
  const lista = etapasDe(act);
  const i = lista.findIndex((e) => e.id === etapa);
  return { indice: i < 0 ? 0 : i + 1, total: lista.length, nombre: i < 0 ? 'Sin empezar' : lista[i].nombre };
}

/** Deja solo claves e ítems que existen en la actividad (lo que manda el formulario no se cree). */
export function limpiarOpciones(act: string, pedidas: Record<string, string[]>): Record<string, string[]> {
  const limpias: Record<string, string[]> = {};
  for (const o of opcionesDe(act)) {
    const validos = new Set(o.items.map((i) => i.id));
    limpias[o.clave] = [...new Set((pedidas[o.clave] ?? []).filter((id) => validos.has(id)))];
  }
  return limpias;
}

/** true = disponible desde el principio; false = la maestra lo habilita después. */
export function limpiarDesbloqueos(act: string, pedidos: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(desbloqueosDe(act).map((d) => [d.clave, pedidos[d.clave] !== false]));
}

/**
 * Lee el formulario "elegir actividad y opciones" (mandar una tarea o abrir
 * una clase en vivo) y lo limpia contra lo que existe en la actividad.
 */
export function leerFormularioActividad(
  datos: FormData,
): { ok: true; actividad: IdActividad; opciones: Record<string, string[]>; desbloqueos: Record<string, boolean> } | { ok: false; mensaje: string } {
  const act = String(datos.get('actividad') ?? '').trim();
  if (!esActividadDisponible(act)) return { ok: false, mensaje: 'Elegí una actividad.' };
  const pedidas = Object.fromEntries(opcionesDe(act).map((o) => [o.clave, datos.getAll(`op:${o.clave}`).map(String)]));
  const opciones = limpiarOpciones(act, pedidas);
  const vacia = opcionesDe(act).find((o) => opciones[o.clave].length === 0);
  if (vacia) return { ok: false, mensaje: `Elegí al menos una opción en "${vacia.etiqueta}".` };
  const desbloqueos = limpiarDesbloqueos(
    act,
    Object.fromEntries(desbloqueosDe(act).map((d) => [d.clave, String(datos.get(`des:${d.clave}`) ?? '').trim() !== 'despues'])),
  );
  return { ok: true, actividad: act, opciones, desbloqueos };
}
