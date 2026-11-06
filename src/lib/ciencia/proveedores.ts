import 'server-only';
import { deEuropePmc, deOpenAlex, normalizarDoi, PASTEUR_OPENALEX, type Proveedor, type Registro } from './normalizar';

/*
  Consultas a OpenAlex y Europe PMC (solo servidor).
  Contrato común: buscar, obtener por id y obtener por DOI. Ninguno trae
  texto completo, a propósito.

  · OpenAlex funciona sin clave; con OPENALEX_API_KEY (variable del servidor,
    sin NEXT_PUBLIC_) tiene más presupuesto. La clave nunca se guarda en la
    bitácora: consultaEnviada va sin ella (y la base rechaza "api_key").
  · Europe PMC no usa clave.
  Cada pedido tiene 10 segundos como máximo y nunca rompe la pantalla: si una
  fuente falla, se muestra lo de la otra.
*/
export type Consulta = { texto: string; desde?: number; hasta?: number; soloAbierto?: boolean; soloInstituto?: boolean; max: number };
export type Respuesta = { proveedor: Proveedor; registros: Registro[]; total: number; consultaEnviada: string; costoUsd: number | null; error?: string };

const AGENTE = 'LaCienciaSinLimites/0.2 (proyecto educativo con el Institut Pasteur de Montevideo)';
const OPENALEX = 'https://api.openalex.org';
const EUROPEPMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const CAMPOS_OPENALEX =
  'id,doi,title,display_name,publication_year,type,language,primary_location,best_oa_location,open_access,authorships,cited_by_count,ids,is_retracted,abstract_inverted_index,topics';

async function pedirJson(url: string): Promise<{ json: unknown; error?: string }> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return { json: null, error: `HTTP ${r.status}` };
    return { json: await r.json() };
  } catch (e) {
    return { json: null, error: e instanceof Error && e.name === 'TimeoutError' ? 'tardó demasiado' : 'sin conexión' };
  }
}

const limpiarConsulta = (t: string) => t.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
const conClave = (url: string) => {
  const clave = process.env.OPENALEX_API_KEY;
  return clave ? `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(clave)}` : url;
};

// ---------------------------------------------------------------------
// OpenAlex
// ---------------------------------------------------------------------
export async function buscarOpenAlex(c: Consulta): Promise<Respuesta> {
  const filtros: string[] = [];
  if (c.desde && c.hasta) filtros.push(`publication_year:${c.desde}-${c.hasta}`);
  else if (c.desde) filtros.push(`publication_year:>${c.desde - 1}`);
  else if (c.hasta) filtros.push(`publication_year:<${c.hasta + 1}`);
  if (c.soloAbierto) filtros.push('open_access.is_oa:true');
  if (c.soloInstituto) filtros.push(`authorships.institutions.lineage:${PASTEUR_OPENALEX}`);
  const params = new URLSearchParams({ search: limpiarConsulta(c.texto), per_page: String(Math.min(Math.max(c.max, 1), 50)), select: CAMPOS_OPENALEX });
  if (filtros.length) params.set('filter', filtros.join(','));
  const consultaEnviada = `${OPENALEX}/works?${params}`;
  const { json, error } = await pedirJson(conClave(consultaEnviada));
  const o = (json ?? {}) as { results?: unknown[]; meta?: { count?: number; cost_usd?: number } };
  const registros = (o.results ?? []).map(deOpenAlex).filter((r): r is Registro => r !== null);
  return {
    proveedor: 'openalex',
    registros,
    total: typeof o.meta?.count === 'number' ? o.meta.count : registros.length,
    consultaEnviada,
    costoUsd: typeof o.meta?.cost_usd === 'number' ? o.meta.cost_usd : null,
    error,
  };
}

export async function obtenerOpenAlex(idExterno: string): Promise<Registro | null> {
  if (!/^W\d{1,12}$/.test(idExterno)) return null;
  const { json } = await pedirJson(conClave(`${OPENALEX}/works/${idExterno}?select=${CAMPOS_OPENALEX}`));
  return json ? deOpenAlex(json) : null;
}

export async function openAlexPorDoi(doi: string): Promise<Registro | null> {
  const d = normalizarDoi(doi);
  if (!d) return null;
  const { json } = await pedirJson(conClave(`${OPENALEX}/works/doi:${encodeURI(d).replace(/[?#]/g, encodeURIComponent)}?select=${CAMPOS_OPENALEX}`));
  return json ? deOpenAlex(json) : null;
}

// ---------------------------------------------------------------------
// Europe PMC
// ---------------------------------------------------------------------
async function consultarEuropePmc(query: string, max: number) {
  const params = new URLSearchParams({ query, format: 'json', resultType: 'core', pageSize: String(Math.min(Math.max(max, 1), 50)) });
  const consultaEnviada = `${EUROPEPMC}/search?${params}`;
  const { json, error } = await pedirJson(consultaEnviada);
  const o = (json ?? {}) as { hitCount?: number; resultList?: { result?: unknown[] } };
  const registros = (o.resultList?.result ?? []).map(deEuropePmc).filter((r): r is Registro => r !== null);
  return { registros, total: typeof o.hitCount === 'number' ? o.hitCount : registros.length, consultaEnviada, error };
}

export async function buscarEuropePmc(c: Consulta): Promise<Respuesta> {
  const partes = [`(${limpiarConsulta(c.texto)})`];
  if (c.desde || c.hasta) partes.push(`PUB_YEAR:[${c.desde ?? 1800} TO ${c.hasta ?? 2100}]`);
  if (c.soloAbierto) partes.push('OPEN_ACCESS:y');
  if (c.soloInstituto) partes.push('AFF:"Pasteur de Montevideo"');
  const r = await consultarEuropePmc(partes.join(' AND '), c.max);
  return { proveedor: 'europepmc', costoUsd: null, ...r };
}

export async function obtenerEuropePmc(idExterno: string): Promise<Registro | null> {
  const m = idExterno.match(/^([A-Z]{3}):([A-Za-z0-9._-]{1,40})$/);
  if (!m) return null;
  const { registros } = await consultarEuropePmc(`EXT_ID:"${m[2]}" AND SRC:${m[1]}`, 1);
  return registros.find((r) => r.id_externo === idExterno) ?? null;
}

export async function europePmcPorDoi(doi: string): Promise<Registro | null> {
  const d = normalizarDoi(doi);
  if (!d) return null;
  const { registros } = await consultarEuropePmc(`DOI:"${d.replace(/"/g, '')}"`, 3);
  return registros.find((r) => r.identificadores.doi === d) ?? null;
}

export const obtener = (p: Proveedor, id: string) => (p === 'openalex' ? obtenerOpenAlex(id) : obtenerEuropePmc(id));
export const porDoiEnLaOtra = (p: Proveedor, doi: string) => (p === 'openalex' ? europePmcPorDoi(doi) : openAlexPorDoi(doi));
