import 'server-only';
import { articulosPubMed, deEuropePmc, deOpenAlex, dePubMed, normalizarDoi, PASTEUR_OPENALEX, type Proveedor, type Registro } from './normalizar';

/*
  Consultas a PubMed, OpenAlex y Europe PMC (solo servidor).
  Contrato común: buscar, obtener por id y obtener por DOI. Ninguno trae
  texto completo, a propósito.

  · PubMed (NCBI E-utilities) es la fuente principal: la que usan las
    investigadoras del Instituto. Sin clave admite 3 pedidos por segundo
    (10 con NCBI_API_KEY, variable del servidor): todos los pedidos a NCBI
    de este servidor pasan por una fila que los espacia. Se identifica con
    tool=ciencia-sin-limites; NCBI_EMAIL es opcional (contacto para NCBI).

  · OpenAlex funciona sin clave; con OPENALEX_API_KEY (variable del servidor,
    sin NEXT_PUBLIC_) tiene más presupuesto. La clave nunca se guarda en la
    bitácora: consultaEnviada va sin ella (y la base rechaza "api_key").
  · Europe PMC no usa clave.
  Cada pedido tiene 10 segundos como máximo y nunca rompe la pantalla: si una
  fuente falla, se muestra lo de la otra.
*/
export type Consulta = { texto: string; desde?: number; hasta?: number; soloAbierto?: boolean; soloInstituto?: boolean; soloRevisiones?: boolean; max: number };
export type Respuesta = { proveedor: Proveedor; registros: Registro[]; total: number; consultaEnviada: string; costoUsd: number | null; error?: string };

const AGENTE = 'LaCienciaSinLimites/0.2 (proyecto educativo con el Institut Pasteur de Montevideo)';
const NCBI = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
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

async function pedirTexto(url: string): Promise<{ texto: string; error?: string; estado?: number }> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE }, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return { texto: '', error: `HTTP ${r.status}`, estado: r.status };
    return { texto: await r.text() };
  } catch (e) {
    return { texto: '', error: e instanceof Error && e.name === 'TimeoutError' ? 'tardó demasiado' : 'sin conexión' };
  }
}

const limpiarConsulta = (t: string) => t.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
const conClave = (url: string) => {
  const clave = process.env.OPENALEX_API_KEY;
  return clave ? `${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(clave)}` : url;
};

// ---------------------------------------------------------------------
// PubMed (NCBI E-utilities)
// ---------------------------------------------------------------------
let proximoTurnoNcbi = 0;
/** Espera su turno: nunca más de 3 pedidos por segundo a NCBI (10 con clave). */
async function turnoNcbi() {
  const intervalo = process.env.NCBI_API_KEY ? 110 : 360;
  const ahora = Date.now();
  const mio = Math.max(ahora, proximoTurnoNcbi);
  proximoTurnoNcbi = mio + intervalo;
  if (mio > ahora) await new Promise((r) => setTimeout(r, mio - ahora));
}
/** La dirección sin la clave (es la que se anota en la bitácora) y la que se pide de verdad. */
function urlNcbi(utilidad: 'esearch' | 'efetch', params: Record<string, string>) {
  const p = new URLSearchParams({ db: 'pubmed', ...params, tool: 'ciencia-sin-limites' });
  if (process.env.NCBI_EMAIL) p.set('email', process.env.NCBI_EMAIL);
  const sinClave = `${NCBI}/${utilidad}.fcgi?${p}`;
  const clave = process.env.NCBI_API_KEY;
  return { sinClave, real: clave ? `${sinClave}&api_key=${encodeURIComponent(clave)}` : sinClave };
}
async function pedirNcbi(url: string) {
  await turnoNcbi();
  let r = await pedirTexto(url);
  if (r.estado === 429) {
    // Se pasó del límite (otro pedido al mismo tiempo): una sola vez más, un segundo después
    await new Promise((ok) => setTimeout(ok, 1100));
    await turnoNcbi();
    r = await pedirTexto(url);
  }
  return r;
}

async function traerPubMed(pmids: string[]): Promise<{ registros: Registro[]; error?: string }> {
  const ids = pmids.filter((x) => /^[1-9]\d{0,9}$/.test(x)).slice(0, 50);
  if (!ids.length) return { registros: [] };
  const { real } = urlNcbi('efetch', { id: ids.join(','), retmode: 'xml', rettype: 'abstract' });
  const { texto, error } = await pedirNcbi(real);
  if (error) return { registros: [], error };
  const porId = new Map(articulosPubMed(texto).map(dePubMed).filter((r): r is Registro => r !== null).map((r) => [r.id_externo, r]));
  // En el mismo orden que la búsqueda (el de relevancia)
  return { registros: ids.map((id) => porId.get(id)).filter((r): r is Registro => Boolean(r)) };
}

export async function buscarPubMed(c: Consulta): Promise<Respuesta> {
  const partes = [`(${limpiarConsulta(c.texto)})`];
  if (c.desde || c.hasta) partes.push(`(${c.desde ?? 1800}:${c.hasta ?? 3000}[dp])`);
  if (c.soloAbierto) partes.push('free full text[sb]');
  if (c.soloInstituto) partes.push('"Pasteur de Montevideo"[ad]');
  if (c.soloRevisiones) partes.push('review[pt]');
  const { sinClave, real } = urlNcbi('esearch', { term: partes.join(' AND '), retmax: String(Math.min(Math.max(c.max, 1), 50)), retmode: 'json', sort: 'relevance' });
  const base = { proveedor: 'pubmed' as const, consultaEnviada: sinClave, costoUsd: null };
  const busqueda = await pedirNcbi(real);
  if (busqueda.error) return { ...base, registros: [], total: 0, error: busqueda.error };
  let o: { esearchresult?: { count?: string; idlist?: string[]; ERROR?: string } } = {};
  try {
    o = JSON.parse(busqueda.texto);
  } catch {
    return { ...base, registros: [], total: 0, error: 'respuesta rara' };
  }
  const total = Number(o.esearchresult?.count ?? 0) || 0;
  const { registros, error } = await traerPubMed(o.esearchresult?.idlist ?? []);
  return { ...base, registros, total, error };
}

export async function obtenerPubMed(pmid: string): Promise<Registro | null> {
  if (!/^[1-9]\d{0,9}$/.test(pmid)) return null;
  return (await traerPubMed([pmid])).registros[0] ?? null;
}

export async function pubMedPorDoi(doi: string): Promise<Registro | null> {
  const d = normalizarDoi(doi);
  if (!d) return null;
  const { real } = urlNcbi('esearch', { term: `"${d.replace(/"/g, '')}"[doi]`, retmax: '3', retmode: 'json' });
  const { texto, error } = await pedirNcbi(real);
  if (error) return null;
  try {
    const ids: string[] = JSON.parse(texto)?.esearchresult?.idlist ?? [];
    const { registros } = await traerPubMed(ids);
    return registros.find((r) => r.identificadores.doi === d) ?? null;
  } catch {
    return null;
  }
}

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
  if (c.soloRevisiones) filtros.push('type:review');
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
  if (c.soloRevisiones) partes.push('PUB_TYPE:"review"');
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

export const obtener = (p: Proveedor, id: string) => (p === 'pubmed' ? obtenerPubMed(id) : p === 'openalex' ? obtenerOpenAlex(id) : obtenerEuropePmc(id));

/** El mismo trabajo en las otras dos fuentes, por DOI (para completar datos, resumen y licencia). */
export async function enLasOtras(p: Proveedor, doi: string): Promise<Registro[]> {
  const buscar = { pubmed: pubMedPorDoi, openalex: openAlexPorDoi, europepmc: europePmcPorDoi };
  const otras = (Object.keys(buscar) as Proveedor[]).filter((x) => x !== p);
  return (await Promise.all(otras.map((x) => buscar[x](doi)))).filter((r): r is Registro => r !== null);
}

/**
 * Orden para guardar el mismo trabajo de varias fuentes: OpenAlex primero
 * (manda en título, año, autores…), después Europe PMC y PubMed al final, así
 * el resumen guardado es el de PubMed cuando está (migración 18).
 */
export const ORDEN_GUARDADO: Record<Proveedor, number> = { openalex: 0, europepmc: 1, pubmed: 2 };
