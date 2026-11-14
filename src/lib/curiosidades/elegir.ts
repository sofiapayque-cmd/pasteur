/*
  CURIOSIDADES · cómo se eligen (sin servidor, sin base: se prueba sola).

  Las curiosidades son fichas "dato" publicadas, cada una con su tema. La
  base cuenta, sin guardar quién, cuántas consultas tuvo cada tema por día
  (migración 22). Con eso:

  1. Tendencia: cada consulta suma 1, pero pierde la mitad de su peso cada
     VIDA_MEDIA días; las de más de DIAS días no cuentan. Es la misma cuenta
     que hace la base en tendencia_temas().
  2. Elección con variedad:
     · se elige entre los temas en tendencia (los EN_TENDENCIA de más
       puntaje que tienen curiosidades), al azar pero con más chance para
       los de más puntaje;
     · nunca el mismo tema dos veces seguidas (tampoco el último que vio el aula);
     · nunca una curiosidad que esa aula vio en los últimos NO_REPETIR_DIAS días;
     · si no alcanza, se completa con otras curiosidades publicadas, y recién
       al final con las que el aula ya vio (las más viejas primero).
*/

export const DIAS = 30;
export const VIDA_MEDIA = 7;
export const EN_TENDENCIA = 5;
export const NO_REPETIR_DIAS = 14;

export type Conteo = { temaId: string; dia: string; veces: number };
export type Tendencia = { temaId: string; puntaje: number };
export type Curiosidad = { id: string; temaId: string | null; actividad: string | null };
/** Lo que vio el aula: id de la curiosidad → días que pasaron desde que la vio. */
export type VistasAula = Map<string, number>;

const MS_DIA = 86_400_000;
const diaUTC = (iso: string) => Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / MS_DIA);

/** Puntaje por tema a partir de los conteos diarios (hoy: 'AAAA-MM-DD'). */
export function tendencia(conteos: Conteo[], hoy: string, dias = DIAS, vidaMedia = VIDA_MEDIA): Tendencia[] {
  const h = diaUTC(hoy);
  const suma = new Map<string, number>();
  for (const c of conteos) {
    const edad = h - diaUTC(c.dia);
    if (edad < 0 || edad >= dias || !(c.veces > 0)) continue;
    suma.set(c.temaId, (suma.get(c.temaId) ?? 0) + c.veces * Math.pow(0.5, edad / vidaMedia));
  }
  return [...suma].map(([temaId, puntaje]) => ({ temaId, puntaje })).sort((a, b) => b.puntaje - a.puntaje || a.temaId.localeCompare(b.temaId));
}

type Opciones = {
  /** Cuántas curiosidades devolver. */
  cuantas: number;
  /** Solo de esta actividad (o sin actividad). */
  actividad?: string | null;
  /** Lo que vio el aula (si hay aula). */
  vistas?: VistasAula;
  /** El tema de la última curiosidad que vio el aula, para no repetirlo. */
  ultimoTema?: string | null;
  /** Números al azar entre 0 y 1 (en las pruebas, una secuencia fija). */
  azar?: () => number;
};

/** Elige curiosidades siguiendo la tendencia, con variedad. Devuelve ids. */
export function elegir(tendencias: Tendencia[], curiosidades: Curiosidad[], o: Opciones): string[] {
  const azar = o.azar ?? Math.random;
  const vistas = o.vistas ?? new Map<string, number>();
  const disponibles = curiosidades.filter((c) => !o.actividad || !c.actividad || c.actividad === o.actividad);
  const recienVista = (c: Curiosidad) => (vistas.get(c.id) ?? Infinity) < NO_REPETIR_DIAS;
  const frescas = disponibles.filter((c) => !recienVista(c));

  const porTema = new Map<string, Curiosidad[]>();
  for (const c of frescas) if (c.temaId) porTema.set(c.temaId, [...(porTema.get(c.temaId) ?? []), c]);
  const enTendencia = tendencias.filter((t) => t.puntaje > 0 && porTema.has(t.temaId)).slice(0, EN_TENDENCIA);

  const elegidas: Curiosidad[] = [];
  const usadas = new Set<string>();
  let ultimo = o.ultimoTema ?? null;
  const tomar = (c: Curiosidad) => {
    elegidas.push(c);
    usadas.add(c.id);
    ultimo = c.temaId;
  };
  const alAzar = <T>(lista: T[]) => lista[Math.min(lista.length - 1, Math.floor(azar() * lista.length))];

  // 1. De los temas en tendencia, con más chance para los de más puntaje
  while (elegidas.length < o.cuantas) {
    const temas = enTendencia.filter((t) => t.temaId !== ultimo && (porTema.get(t.temaId) ?? []).some((c) => !usadas.has(c.id)));
    if (!temas.length) break;
    const total = temas.reduce((s, t) => s + t.puntaje, 0);
    let r = azar() * total;
    const tema = temas.find((t) => (r -= t.puntaje) < 0) ?? temas[temas.length - 1];
    tomar(alAzar((porTema.get(tema.temaId) ?? []).filter((c) => !usadas.has(c.id))));
  }

  // 2. Si no alcanza: otras publicadas que el aula no vio hace poco, sin repetir tema seguido si se puede
  while (elegidas.length < o.cuantas) {
    const resto = frescas.filter((c) => !usadas.has(c.id));
    if (!resto.length) break;
    const otroTema = resto.filter((c) => !c.temaId || c.temaId !== ultimo);
    tomar(alAzar(otroTema.length ? otroTema : resto));
  }

  // 3. Último recurso: las que el aula ya vio, de la más vieja a la más nueva
  if (elegidas.length < o.cuantas) {
    const vistasOrden = disponibles.filter((c) => !usadas.has(c.id) && recienVista(c)).sort((a, b) => (vistas.get(b.id) ?? 0) - (vistas.get(a.id) ?? 0));
    for (const c of vistasOrden.slice(0, o.cuantas - elegidas.length)) tomar(c);
  }
  return elegidas.map((c) => c.id);
}
