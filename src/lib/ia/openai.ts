import 'server-only';

/*
  Llamada a OpenAI (solo servidor) con la Responses API y salida en JSON
  con esquema estricto: el modelo tiene que devolver exactamente los campos
  que pedimos, y después el código igual los vuelve a revisar.

  · La clave es OPENAI_API_KEY (variable del servidor, sin NEXT_PUBLIC_).
  · store: false → OpenAI no guarda la conversación para mostrarla después.
  · Lo que se manda son preguntas del equipo y resúmenes de artículos: nada
    de chicos ni de maestras.
  · Modelos: OPENAI_MODELO_REDACCION (por defecto gpt-6.1-sol) para redactar
    y OPENAI_MODELO_RAPIDO (por defecto gpt-6-luna) para armar búsquedas y
    proponer preguntas. Se pueden cambiar en Vercel sin tocar el código.
*/
export const MODELO_REDACCION = process.env.OPENAI_MODELO_REDACCION || 'gpt-6.1-sol';
export const MODELO_RAPIDO = process.env.OPENAI_MODELO_RAPIDO || 'gpt-6-luna';
export const iaConfigurada = () => Boolean(process.env.OPENAI_API_KEY);

type Esquema = Record<string, unknown>;
export type Pedido = {
  modelo: string;
  instrucciones: string;
  entrada: string;
  nombre: string;
  esquema: Esquema;
  maxTokens?: number;
  segundos?: number;
};
export type Uso = { entrada: number; salida: number };
export type RespuestaIA<T> = { ok: true; datos: T; uso: Uso; modelo: string } | { ok: false; error: string };

type Contenido = { type?: string; text?: string; refusal?: string };
type Salida = { type?: string; content?: Contenido[] };
type Cuerpo = {
  status?: string;
  model?: string;
  output?: Salida[];
  output_text?: string;
  incomplete_details?: { reason?: string };
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string; code?: string };
};

export async function pedirJson<T>(p: Pedido): Promise<RespuestaIA<T>> {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return { ok: false, error: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  let r: Response;
  try {
    r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout((p.segundos ?? 90) * 1000),
      body: JSON.stringify({
        model: p.modelo,
        instructions: p.instrucciones,
        input: p.entrada,
        store: false,
        max_output_tokens: p.maxTokens ?? 6000,
        text: { format: { type: 'json_schema', name: p.nombre, strict: true, schema: p.esquema } },
      }),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === 'TimeoutError' ? 'OpenAI tardó demasiado' : 'sin conexión con OpenAI' };
  }
  let cuerpo: Cuerpo;
  try {
    cuerpo = (await r.json()) as Cuerpo;
  } catch {
    return { ok: false, error: `OpenAI respondió algo que no se entiende (HTTP ${r.status})` };
  }
  if (!r.ok) {
    // El mensaje de OpenAI puede traer detalles de la cuenta: al registro, no a la pantalla
    console.error('[ia] OpenAI', r.status, cuerpo.error?.code ?? '', cuerpo.error?.message?.slice(0, 200) ?? '');
    if (r.status === 401) return { ok: false, error: 'La clave de OpenAI no es válida.' };
    if (r.status === 429) return { ok: false, error: 'OpenAI está ocupado o se terminó el saldo de la cuenta. Probá en un rato.' };
    return { ok: false, error: `OpenAI dio un error (HTTP ${r.status}).` };
  }
  if (cuerpo.status && cuerpo.status !== 'completed') {
    return { ok: false, error: cuerpo.incomplete_details?.reason === 'max_output_tokens' ? 'la respuesta salió demasiado larga' : 'OpenAI no terminó la respuesta' };
  }
  const partes = (cuerpo.output ?? []).flatMap((o) => (o.type === 'message' ? (o.content ?? []) : []));
  if (partes.some((c) => c.type === 'refusal')) return { ok: false, error: 'el modelo no quiso responder esa pregunta' };
  const texto = partes.find((c) => c.type === 'output_text')?.text ?? cuerpo.output_text;
  if (!texto) return { ok: false, error: 'OpenAI no devolvió texto' };
  try {
    return {
      ok: true,
      datos: JSON.parse(texto) as T,
      modelo: cuerpo.model ?? p.modelo,
      uso: { entrada: cuerpo.usage?.input_tokens ?? 0, salida: cuerpo.usage?.output_tokens ?? 0 },
    };
  } catch {
    return { ok: false, error: 'OpenAI devolvió un JSON roto' };
  }
}

// ---------------------------------------------------------------------
// Embeddings y moderación (asistente para la clase)
// ---------------------------------------------------------------------
export const MODELO_EMBEDDINGS = process.env.OPENAI_MODELO_EMBEDDINGS || 'text-embedding-3-small'; // 1536 números, como la columna
const MODELO_MODERACION = 'omni-moderation-latest'; // gratis

async function postOpenAI(ruta: string, cuerpo: unknown, segundos = 20): Promise<unknown | null> {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return null;
  try {
    const r = await fetch(`https://api.openai.com/v1/${ruta}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(segundos * 1000),
      body: JSON.stringify(cuerpo),
    });
    if (!r.ok) {
      console.error(`[ia] OpenAI ${ruta}:`, r.status);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error(`[ia] OpenAI ${ruta}:`, e instanceof Error ? e.name : 'error');
    return null;
  }
}

/** Un vector de 1536 números por texto (mismo orden), o null si OpenAI no contestó. */
export async function embeber(textos: string[]): Promise<number[][] | null> {
  if (!textos.length) return [];
  const r = (await postOpenAI('embeddings', { model: MODELO_EMBEDDINGS, input: textos.map((t) => t.slice(0, 4000)) })) as {
    data?: { index: number; embedding: number[] }[];
  } | null;
  const datos = r?.data;
  if (!Array.isArray(datos) || datos.length !== textos.length) return null;
  const ordenados = [...datos].sort((a, b) => a.index - b.index).map((d) => d.embedding);
  return ordenados.every((v) => Array.isArray(v) && v.length === 1536) ? ordenados : null;
}

/** ¿El texto toca algo delicado (lastimarse, abuso, violencia…)? null si no se pudo saber. */
export async function moderar(texto: string): Promise<{ marcada: boolean } | null> {
  const r = (await postOpenAI('moderations', { model: MODELO_MODERACION, input: texto }, 10)) as { results?: { flagged?: boolean }[] } | null;
  const primero = r?.results?.[0];
  return primero ? { marcada: Boolean(primero.flagged) } : null;
}
