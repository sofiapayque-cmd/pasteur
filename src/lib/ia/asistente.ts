/*
  ASISTENTE PARA LA CLASE · la parte sin red (se prueba con npm run test:asistente).
  · limpiarPregunta: lo que se guarda y se manda (sin mails, links ni teléfonos).
  · normalizarPregunta: para reconocer la misma pregunta escrita distinto.
  · candidatas: las respuestas aprobadas más parecidas (por significado).
  · Doble control: un modelo chico lee la pregunta de la clase y el TEXTO de
    cada candidata, y elige la que la responde de verdad (o ninguna).
  · decidir: con eso, qué se muestra. Una respuesta se muestra como "la
    misma" SOLO si el control la eligió; si duda, falla o no elige ninguna,
    se ofrecen como parecidas y la maestra elige.
  Los umbrales se pueden ajustar en Vercel sin tocar el código.
*/
export const PISO_CANDIDATA = Number(process.env.ASISTENTE_PISO ?? 0.5); // desde acá se la muestra al control
export const UMBRAL_PARECIDA = Number(process.env.ASISTENTE_PARECIDA ?? 0.68); // vale la pena ofrecerla
export const MAX_CANDIDATAS = 4;

export function limpiarPregunta(texto: string): string {
  return texto
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\S+@\S+\.\S+/g, '[…]')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[…]')
    // teléfonos: celulares de Uruguay (099 123 456) o 8 dígitos o más seguidos; no toca números como "1 000 000"
    .replace(/\b0?9\d[\s-]?\d{3}[\s-]?\d{3}\b/g, '[…]')
    .replace(/\+?\d{8,}/g, '[…]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export function normalizarPregunta(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export type Encontrado = { ficha_id: string; similitud: number; texto: string; tipo: string };
export type Candidata = { fichaId: string; similitud: number };
export type Decision =
  | { tipo: 'respuesta'; fichaId: string; similitud: number }
  | { tipo: 'parecidas'; fichas: Candidata[] }
  | { tipo: 'nada' };

/** La mejor coincidencia de cada ficha (pregunta o variante), de la más parecida a la menos. */
export function candidatas(encontrados: Encontrado[], piso = PISO_CANDIDATA, max = MAX_CANDIDATAS): Candidata[] {
  const mejor = new Map<string, number>();
  for (const e of encontrados) {
    if (typeof e.similitud !== 'number' || Number.isNaN(e.similitud)) continue;
    mejor.set(e.ficha_id, Math.max(mejor.get(e.ficha_id) ?? -1, e.similitud));
  }
  return [...mejor.entries()]
    .map(([fichaId, similitud]) => ({ fichaId, similitud }))
    .filter((c) => c.similitud >= piso)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, max);
}

/**
 * eleccion: lo que dijo el control (1 = la primera candidata, 2 = la segunda…;
 * 0 = ninguna; null = el control no respondió).
 */
export function decidir(cands: Candidata[], eleccion: number | null, parecida = UMBRAL_PARECIDA): Decision {
  if (eleccion !== null && Number.isInteger(eleccion) && eleccion >= 1 && eleccion <= cands.length) {
    return { tipo: 'respuesta', ...cands[eleccion - 1] };
  }
  const parecidas = cands.filter((c) => c.similitud >= parecida).slice(0, 3);
  return parecidas.length ? { tipo: 'parecidas', fichas: parecidas } : { tipo: 'nada' };
}

// ---------------------------------------------------------------------
// Doble control (modelo rápido)
// ---------------------------------------------------------------------
export const INSTRUCCIONES_CONTROL = `Sos el control de calidad de un asistente de ciencia para escuelas (chicos de 10 a 12 años).
Una maestra escribió la pregunta que hizo su clase. Te damos respuestas ya aprobadas por una investigadora, numeradas.
Elegí el número de la respuesta que contesta DE VERDAD esa pregunta, o 0 si ninguna la contesta.

Reglas:
- La pregunta puede tener faltas de ortografía, no tener tildes, estar en voseo o dicha como la diría un chico: eso no importa.
- Elegí una respuesta solo si su texto contesta lo que se pregunta. No alcanza con que sea del mismo tema o use las mismas palabras.
- Elegí 0 si la pregunta es sobre otra cosa u otro ser vivo (por ejemplo: bacterias en vez de células con núcleo; el núcleo de un átomo en vez del núcleo de la célula; luciérnagas que brillan en vez de fluorescencia), si pide algo más específico que lo que dice la respuesta, si pregunta lo contrario o si pide un dato que la respuesta no da.
- Si dos respuestas sirven, elegí la que contesta más directo.
- Ante la duda, 0.`;

export const ESQUEMA_CONTROL = {
  type: 'object',
  additionalProperties: false,
  required: ['eleccion', 'motivo'],
  properties: {
    eleccion: { type: 'integer', description: 'Número de la respuesta que contesta la pregunta, o 0 si ninguna.' },
    motivo: { type: 'string', description: 'Una oración: por qué.' },
  },
};

export function entradaControl(pregunta: string, respuestas: { pregunta: string; texto: string }[]): string {
  return [
    `Pregunta de la clase: ${pregunta}`,
    '',
    'Respuestas aprobadas:',
    ...respuestas.map((r, i) => `${i + 1}. Pregunta que responde: ${r.pregunta}\n   Texto: ${r.texto.replace(/\s+/g, ' ').slice(0, 900)}`),
  ].join('\n');
}

/** Lo que devolvió el control, revisado: un número válido, o null si no sirve. */
export function leerEleccion(datos: unknown, cuantas: number): number | null {
  const e = (datos as { eleccion?: unknown } | null)?.eleccion;
  return typeof e === 'number' && Number.isInteger(e) && e >= 0 && e <= cuantas ? e : null;
}
