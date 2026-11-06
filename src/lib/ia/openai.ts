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
