/*
  ASISTENTE PARA LA CLASE · la parte sin red (se prueba con npm run test:asistente).
  · limpiarPregunta: lo que se guarda y se manda (sin mails, links ni teléfonos).
  · normalizarPregunta: para reconocer la misma pregunta escrita distinto.
  · decidir: con las preguntas aprobadas más parecidas, qué se muestra.
*/
export const UMBRAL_RESPUESTA = Number(process.env.ASISTENTE_UMBRAL ?? 0.84); // misma pregunta
export const UMBRAL_PARECIDA = Number(process.env.ASISTENTE_PARECIDA ?? 0.68); // vale la pena ofrecerla

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
export type Decision =
  | { tipo: 'respuesta'; fichaId: string; similitud: number }
  | { tipo: 'parecidas'; fichas: { fichaId: string; similitud: number }[] }
  | { tipo: 'nada' };

export function decidir(encontrados: Encontrado[], umbral = UMBRAL_RESPUESTA, parecida = UMBRAL_PARECIDA): Decision {
  // La mejor coincidencia de cada ficha (pregunta o variante)
  const mejor = new Map<string, number>();
  for (const e of encontrados) {
    if (typeof e.similitud !== 'number' || Number.isNaN(e.similitud)) continue;
    mejor.set(e.ficha_id, Math.max(mejor.get(e.ficha_id) ?? -1, e.similitud));
  }
  const orden = [...mejor.entries()].map(([fichaId, similitud]) => ({ fichaId, similitud })).sort((a, b) => b.similitud - a.similitud);
  if (orden[0] && orden[0].similitud >= umbral) return { tipo: 'respuesta', ...orden[0] };
  const parecidas = orden.filter((o) => o.similitud >= parecida).slice(0, 3);
  return parecidas.length ? { tipo: 'parecidas', fichas: parecidas } : { tipo: 'nada' };
}
