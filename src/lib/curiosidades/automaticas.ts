/*
  CURIOSIDADES AUTOMÁTICAS · la parte sin red (se prueba con npm run test:curiosidades).
  Pedido de Sofia (15/11): "los chicos hacen las preguntas, se genera una
  base de datos, automáticamente se analiza cada día de qué tema se pregunta
  más y ahí poner una curiosidad de ese tema", sin nada que aprobar.

  Para que no haga falta aprobar nada, el texto de una curiosidad automática
  es UNA ORACIÓN TAL CUAL de la versión para chicos de una respuesta que ya
  aprobó la validadora. La IA solo elige números de oración (como con las
  citas): el texto lo pone el código, sacándolo de la respuesta aprobada.
  Lo único que se cambia es la primera letra a minúscula, para que siga
  después de "¿Sabías que…".

  Las preguntas que no se parecen a ningún tema se agrupan por parecido: si
  varias se parecen entre sí, se arma un tema nuevo.
*/

/** Hasta cuántas curiosidades se sacan de una respuesta. */
const MAX_POR_RESPUESTA = 2;
/** Parecido mínimo entre dos preguntas para ir al mismo tema nuevo. */
const UMBRAL_GRUPO = 0.6;
/** Un tema nuevo necesita al menos estas preguntas distintas… */
const MIN_PREGUNTAS_GRUPO = 2;
/** …y que entre todas se hayan hecho al menos estas veces. */
export const MIN_VECES_GRUPO = 3;
/** Parecido mínimo para que el tema nuevo quede como subtema del más cercano. */
export const UMBRAL_PADRE = 0.35;

export const INSTRUCCIONES_ELEGIR_ORACIONES = `Elegís datos curiosos para chicos de 10 a 12 años de escuelas de Uruguay.
Te doy una respuesta que ya aprobó una investigadora del Institut Pasteur de Montevideo, dividida en oraciones numeradas.
Elegí hasta 2 oraciones que, leídas SOLAS después de "¿Sabías que…", sean un dato sorprendente o interesante y se entiendan sin la pregunta ni el resto del texto: tienen que nombrar de qué hablan ("las células usan fibras para moverse" sirve; "usan fibras para avanzar" no, porque no dice quién).
No sirven: las que dependen de otra oración ("eso", "esto", "también", "por eso", "así", "además"), las preguntas, las que invitan a hacer algo ("Imaginá", "Mirá", "Pensá"), las que solo repiten la pregunta o son muy obvias.
Si ninguna sirve, devolvé una lista vacía. No escribas texto: devolvé solo los números de las oraciones.`;

export const ESQUEMA_ELEGIR_ORACIONES = {
  type: 'object',
  additionalProperties: false,
  required: ['oraciones'],
  properties: { oraciones: { type: 'array', items: { type: 'integer' } } },
} as const;

export const INSTRUCCIONES_NOMBRAR_TEMA = `Agrupás preguntas que hicieron chicos de 10 a 12 años a un asistente de ciencia del Institut Pasteur de Montevideo.
Te doy varias preguntas parecidas. Poné un nombre de tema que las agrupe (de 2 a 5 palabras, en castellano, sin signos de pregunta, como el título de un capítulo: por ejemplo "Bacterias del suelo", "Cómo entra un virus") y una descripción de una oración.
es_ciencia es false si las preguntas no son de ciencia (por ejemplo, saludos, chistes o preguntas personales).`;

export const ESQUEMA_NOMBRAR_TEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['es_ciencia', 'nombre', 'descripcion'],
  properties: {
    es_ciencia: { type: 'boolean' },
    nombre: { type: 'string' },
    descripcion: { type: 'string' },
  },
} as const;

/** Las oraciones numeradas, para pedirle a la IA que elija. */
export function oracionesNumeradas(oraciones: string[]): string {
  return oraciones.map((o, i) => `O${i + 1}. ${o}`).join('\n');
}

// Comienzos que dependen de otra oración o invitan a hacer algo (\b no sirve con tildes: se mira lo que sigue)
const NO_EMPIEZA = /^(eso|esto|esta|este|estos|estas|ese|esa|esos|esas|también|tambien|además|ademas|por eso|así|asi|pero|y|o|entonces|imaginá|imagina|mirá|mira|pensá|piensa|fijate|fíjate|probá|prueba|claro)(?=[\s,.;:!]|$)/i;

// Palabras que remiten a otra oración, en cualquier lugar ("dentro de ella", "esa luz", "de esta manera", "también")
const REMITE = /(?<!\p{L})(es[aeo]s?|est[aeo]s?|aquel\p{L}*|ella|ellas|ellos|ello|también|tambien|por ejemplo|lo mismo)(?!\p{L})/iu;
// Empieza contestando ("Sí, …", "No, …")
const CONTESTA = /^(sí|si|no)\s*[,:]/i;

/** Si una oración sirve sola después de "¿Sabías que…" (la IA ya eligió; esto es la red). */
export function sirveSola(oracion: string): boolean {
  const o = oracion.trim().replace(/^[¡"“'(]+/, '');
  if (o.length < 30 || o.length > 250) return false;
  if (/[?¿]/.test(o)) return false;
  if (!/[.!]$/.test(o)) return false;
  if (NO_EMPIEZA.test(o) || CONTESTA.test(o) || REMITE.test(o)) return false;
  return true;
}

/**
 * La oración lista para seguir después de "¿Sabías que": solo baja la
 * primera letra si es una palabra común ("Las bacterias" → "las bacterias";
 * "ADN" o "Uruguay" quedan igual: sigla o nombre propio).
 */
export function paraSabiasQue(oracion: string): string {
  const o = oracion.trim().replace(/^¡/, '');
  const primera = o.split(/[\s,;:]/)[0] ?? '';
  const sigla = primera.length > 1 && primera === primera.toUpperCase();
  const propio = PROPIOS.has(primera.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
  if (sigla || propio || !/^[A-ZÁÉÍÓÚÑ]/.test(primera)) return o;
  return o.charAt(0).toLowerCase() + o.slice(1);
}
const PROPIOS = new Set(['uruguay', 'montevideo', 'antartida', 'pasteur', 'louis', 'america', 'europa', 'africa', 'asia', 'tierra', 'marte', 'sol', 'luna']);

/**
 * Las oraciones que eligió la IA, comprobadas: números válidos, sin
 * repetir, que sirvan solas; como mucho MAX_POR_RESPUESTA. El texto sale de
 * la respuesta aprobada, nunca de la IA.
 */
export function oracionesElegidas(oraciones: string[], numeros: unknown): { oracion: number; texto: string }[] {
  const lista = Array.isArray(numeros) ? numeros : [];
  const salida: { oracion: number; texto: string }[] = [];
  for (const n of lista) {
    const i = Number(n);
    if (!Number.isInteger(i) || i < 1 || i > oraciones.length || salida.some((x) => x.oracion === i)) continue;
    const o = oraciones[i - 1];
    if (!sirveSola(o)) continue;
    salida.push({ oracion: i, texto: paraSabiasQue(o) });
    if (salida.length >= MAX_POR_RESPUESTA) break;
  }
  return salida;
}

export function coseno(a: number[], b: number[]): number {
  let p = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    p += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? p / Math.sqrt(na * nb) : 0;
}

export type PreguntaSinTema = { id: string; texto: string; actividad: string | null; veces: number; vector: number[] };
export type Grupo = { preguntas: PreguntaSinTema[]; veces: number; actividad: string | null; centro: number[] };

/**
 * Agrupa las preguntas sin tema por parecido. Empieza por la más hecha y le
 * suma las que se le parecen; se queda con los grupos que tienen al menos
 * MIN_PREGUNTAS_GRUPO preguntas distintas y MIN_VECES_GRUPO veces en total
 * (o una sola pregunta hecha muchas veces). Los más hechos primero.
 */
export function agruparPreguntas(preguntas: PreguntaSinTema[], umbral = UMBRAL_GRUPO): Grupo[] {
  const orden = [...preguntas].filter((p) => p.vector?.length).sort((a, b) => b.veces - a.veces || a.id.localeCompare(b.id));
  const usadas = new Set<string>();
  const grupos: Grupo[] = [];
  for (const semilla of orden) {
    if (usadas.has(semilla.id)) continue;
    const miembros = orden.filter((p) => !usadas.has(p.id) && (p.id === semilla.id || coseno(semilla.vector, p.vector) >= umbral));
    const veces = miembros.reduce((s, p) => s + p.veces, 0);
    const alcanza = (miembros.length >= MIN_PREGUNTAS_GRUPO && veces >= MIN_VECES_GRUPO) || semilla.veces >= MIN_VECES_GRUPO * 2;
    if (!alcanza) continue;
    for (const p of miembros) usadas.add(p.id);
    grupos.push({ preguntas: miembros, veces, actividad: masComun(miembros.map((p) => p.actividad)), centro: promedio(miembros.map((p) => p.vector)) });
  }
  return grupos.sort((a, b) => b.veces - a.veces);
}

function masComun(valores: (string | null)[]): string | null {
  const cuenta = new Map<string, number>();
  for (const v of valores) if (v) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return [...cuenta].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function promedio(vectores: number[][]): number[] {
  const n = vectores[0]?.length ?? 0;
  const salida = new Array<number>(n).fill(0);
  for (const v of vectores) for (let i = 0; i < n; i++) salida[i] += v[i] / vectores.length;
  return salida;
}

/** Nombre y descripción del tema nuevo, limpios (o null si no sirven). */
export function temaNombrado(r: unknown): { nombre: string; descripcion: string } | null {
  const x = r as { es_ciencia?: unknown; nombre?: unknown; descripcion?: unknown } | null;
  if (!x || x.es_ciencia !== true) return null;
  const nombre = String(x.nombre ?? '').replace(/[¿?¡!"“”]/g, '').replace(/\s+/g, ' ').trim();
  const descripcion = String(x.descripcion ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const palabras = nombre.split(' ').filter(Boolean).length;
  if (nombre.length < 3 || nombre.length > 60 || palabras > 7) return null;
  return { nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1), descripcion };
}
