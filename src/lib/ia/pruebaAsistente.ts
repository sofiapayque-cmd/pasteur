import { normalizarPregunta, type Decision } from './asistente';

/*
  PRUEBA DE CALIDAD DEL ASISTENTE · el set de preguntas y cómo se corrige
  (sin red: se prueba con npm run test:asistente).

  Cada grupo tiene una pregunta de referencia (ancla), formas de preguntarlo
  como lo haría un chico (con faltas, sin tildes, en voseo, muy cortas) y
  "trampas": preguntas del mismo tema que necesitan OTRA respuesta.

  Cómo se corrige un caso:
  · Si el ancla tiene una respuesta aprobada, esa es la esperada: tiene que
    aparecer directa o entre las parecidas, y nunca otra como "la misma".
  · Si no la tiene (todavía no se aprobó, o es una trampa), ninguna
    respuesta puede mostrarse como "la misma".
  Las trampas son anclas propias: si un día se aprueba esa respuesta, pasan
  solas a ser un caso a encontrar.
*/
export type Grupo = 'variante' | 'trampa' | 'otro_tema';
export type Caso = { consulta: string; grupo: Grupo; ancla: string | null };

/** Las preguntas de A3 que la prueba necesita aprobadas (las dos primeras ya lo están desde el 6/11). */
export const SET: { ancla: string; pedir: boolean; variantes: string[]; trampas: string[] }[] = [
  {
    ancla: '¿Por qué las células tienen núcleo?',
    pedir: false,
    variantes: ['porque las celulas tienen nucleo', 'para q sirve el nucleo de la celula', '¿Qué hace el núcleo?', 'el nucleo de la celula para que esta', '¿Para qué tiene núcleo una célula?', 'nucleo celula funcion'],
    trampas: ['¿De qué está hecho el núcleo de un átomo?', '¿Qué pasa si una célula no tiene núcleo?', '¿Los glóbulos rojos tienen núcleo?'],
  },
  {
    ancla: '¿Cómo funciona un microscopio de fluorescencia?',
    pedir: false,
    variantes: ['como funciona el microscopio de fluorecencia', 'microscopio fluorescente como anda', '¿Cómo hace el microscopio de fluorescencia para ver cosas tan chiquitas?', 'como se usa la luz en un microscopio de fluorescencia'],
    trampas: ['¿Quién inventó el microscopio?', '¿Cómo funciona un microscopio electrónico?', '¿Por qué brillan las luciérnagas?'],
  },
  {
    ancla: '¿Qué es una célula?',
    pedir: true,
    variantes: ['que es una celula', 'q son las celulas', 'celula que es', '¿Qué son las células de nuestro cuerpo?'],
    trampas: ['¿Qué es un tejido?', '¿Cuántas células tiene el cuerpo humano?'],
  },
  {
    ancla: '¿Las bacterias tienen núcleo?',
    pedir: true,
    variantes: ['las bacterias tienen nucleo?', 'una bacteria tiene nucleo o no', '¿Las bacterias tienen el ADN adentro de un núcleo?'],
    trampas: ['¿Los virus tienen núcleo?'],
  },
  {
    ancla: '¿Qué es el ADN?',
    pedir: true,
    variantes: ['que es el adn', 'q es el ADN', 'adn que es', '¿Qué es eso del ADN que tienen las células?'],
    trampas: ['¿Qué es el ARN?', '¿Quién descubrió el ADN?'],
  },
  {
    ancla: '¿Cómo se dividen las células?',
    pedir: true,
    variantes: ['como se dividen las celulas', '¿Cómo hace una célula para hacer otra?', 'q pasa cuando una celula se divide', 'division celular como es'],
    trampas: ['¿Por qué se mueren las células?', '¿Cómo se reproducen los virus?'],
  },
  {
    ancla: '¿Por qué hay que teñir las muestras para verlas en el microscopio?',
    pedir: true,
    variantes: ['para que se tiñen las muestras del microscopio', 'porq le ponen colorante a las celulas para verlas', '¿Por qué pintan las células para mirarlas en el microscopio?'],
    trampas: ['¿Por qué se tiñe el pelo?', '¿Por qué las hojas son verdes?'],
  },
  {
    ancla: '¿Qué es la fluorescencia?',
    pedir: true,
    variantes: ['que es la fluorecencia', '¿Por qué algunas cosas brillan con luz ultravioleta?', 'fluorescencia que es'],
    trampas: ['¿Por qué brilla la luna?'],
  },
  {
    ancla: '¿Cuánto aumenta un microscopio?',
    pedir: true,
    variantes: ['cuanto agranda un microscopio', '¿Cuántas veces más grande se ve con el microscopio?', 'aumento del microscopio cuanto es'],
    trampas: ['¿Cuánto mide una célula?', '¿Cuánto cuesta un microscopio?'],
  },
  {
    ancla: '¿Todas las células son iguales?',
    pedir: true,
    variantes: ['todas las celulas son iguales?', '¿Hay distintos tipos de células?', 'las celulas son todas iguales o no'],
    trampas: ['¿Todas las bacterias son malas?'],
  },
];

export const OTROS_TEMAS = [
  '¿Por qué el cielo es azul?',
  '¿Cuántos planetas hay?',
  '¿Qué comen los pingüinos?',
  '¿Cómo se hace el pan?',
  '¿Por qué llueve?',
  'hola',
  '¿Quién ganó el partido?',
  '¿Cuál es la capital de Francia?',
];

/** Todos los casos, sin repetir (una trampa que también es ancla de otro grupo se cuenta una vez). */
export function casos(set = SET, otros = OTROS_TEMAS): Caso[] {
  const vistos = new Set<string>();
  const salida: Caso[] = [];
  const sumar = (c: Caso) => {
    const k = normalizarPregunta(c.consulta);
    if (!k || vistos.has(k)) return;
    vistos.add(k);
    salida.push(c);
  };
  for (const g of set) {
    sumar({ consulta: g.ancla, grupo: 'variante', ancla: g.ancla });
    for (const v of g.variantes) sumar({ consulta: v, grupo: 'variante', ancla: g.ancla });
  }
  for (const g of set) for (const t of g.trampas) sumar({ consulta: t, grupo: 'trampa', ancla: t });
  for (const o of otros) sumar({ consulta: o, grupo: 'otro_tema', ancla: null });
  return salida;
}

/** Una respuesta publicada, con todo lo que la identifica. */
export type Publicada = { fichaId: string; pregunta: string; variantes: string[]; pedida: string };

/** ¿Qué respuesta aprobada corresponde a esta ancla? Por la pregunta, sus variantes o lo que se le pidió a la IA. */
export function fichaDeAncla(ancla: string | null, publicadas: Publicada[]): string | null {
  if (!ancla) return null;
  const k = normalizarPregunta(ancla);
  const p = publicadas.find((x) => [x.pregunta, x.pedida, ...x.variantes].some((t) => t && normalizarPregunta(t) === k));
  return p?.fichaId ?? null;
}

/** Saca "Pregunta pedida: …" de la nota interna que deja la IA. */
export const pedidaDeNota = (nota: string | null) => (nota ?? '').match(/^Pregunta pedida: (.+)$/m)?.[1]?.trim() ?? '';

export type Evaluacion = { correcta: boolean; encontrada: boolean | null; mostradaId: string | null; parecidas: string[] };

export function evaluar(esperadaId: string | null, d: Decision): Evaluacion {
  const mostradaId = d.tipo === 'respuesta' ? d.fichaId : null;
  const parecidas = d.tipo === 'parecidas' ? d.fichas.map((f) => f.fichaId) : [];
  return {
    correcta: mostradaId === null || mostradaId === esperadaId,
    encontrada: esperadaId ? mostradaId === esperadaId || parecidas.includes(esperadaId) : null,
    mostradaId,
    parecidas,
  };
}

export type Resumen = { casos: number; equivocadas: number; conRespuesta: number; encontradas: number; directas: number; sinRespuesta: number; errores: number };

export function resumir(filas: { correcta: boolean; encontrada: boolean | null; resultado: string; mostrada_id: string | null; esperada_id: string | null }[]): Resumen {
  const con = filas.filter((f) => f.encontrada !== null);
  return {
    casos: filas.length,
    equivocadas: filas.filter((f) => !f.correcta).length,
    conRespuesta: con.length,
    encontradas: con.filter((f) => f.encontrada).length,
    directas: con.filter((f) => f.resultado === 'respuesta' && f.mostrada_id === f.esperada_id).length,
    sinRespuesta: filas.length - con.length,
    errores: filas.filter((f) => f.resultado === 'error').length,
  };
}

/**
 * Anclas que conviene pedirle a la IA: las que no tienen ninguna ficha
 * (ni aprobada ni en camino). `existentes`: todas las fichas que no fueron
 * retiradas ni rechazadas, así no se piden dos veces.
 */
export const faltantes = (existentes: Publicada[], set = SET) => set.filter((g) => g.pedir && !fichaDeAncla(g.ancla, existentes)).map((g) => g.ancla);
