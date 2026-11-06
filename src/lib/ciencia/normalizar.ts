/*
  Traducción de los registros de OpenAlex y Europe PMC a un formato común
  (el que recibe public.guardar_registro, migración 13).

  Sin red y sin dependencias: se puede probar con node --test.
  Nunca se trae texto completo: solo metadatos, resumen y enlaces.
  Los textos de las fuentes no vienen limpios (pueden traer HTML/JATS):
  se limpian acá y, además, la base los recorta y saca caracteres de control.
*/

export type Proveedor = 'openalex' | 'europepmc';

export type Registro = {
  proveedor: Proveedor;
  id_externo: string;
  identificadores: Partial<Record<'doi' | 'pmid' | 'pmcid' | 'openalex' | 'europepmc', string>>;
  titulo: string;
  anio: number | null;
  tipo: 'articulo' | 'revision' | 'preprint' | 'otro';
  revista: string;
  idioma: string;
  autores: { nombre: string; apellido?: string; orcid?: string }[];
  temas: string[];
  mesh: string[];
  citas: number | null;
  oa_estado: string;
  resumen: string | null;
  retractada: boolean;
  del_instituto: boolean;
  accesos: { tipo: 'pagina' | 'pdf' | 'xml'; url: string; version?: string; es_oa?: boolean; licencia?: string }[];
  /** Señal de licencia tal como la da la fuente ("cc-by", "cc by-nc"…); la base la normaliza. */
  licencia: string;
  crudo: Record<string, unknown>;
};

/** OpenAlex id del Institut Pasteur de Montevideo (verificado el 5/11/2026). */
export const PASTEUR_OPENALEX = 'I4210156231';

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Saca etiquetas HTML/JATS y decodifica entidades: "<i>Aedes</i> &amp; virus" → "Aedes & virus". */
export function limpiarTexto(t: unknown): string {
  return str(t)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return ENTIDADES[e.toLowerCase()] ?? m;
    })
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** OpenAlex guarda el resumen como índice invertido {palabra: [posiciones]}: se rearma. */
export function reconstruirResumen(indice: unknown): string | null {
  const entradas = Object.entries(obj(indice));
  if (entradas.length === 0) return null;
  const palabras: string[] = [];
  for (const [palabra, posiciones] of entradas) {
    for (const p of arr(posiciones)) if (typeof p === 'number' && p >= 0 && p < 20000) palabras[p] = palabra;
  }
  const texto = limpiarTexto(palabras.filter(Boolean).join(' '));
  return texto || null;
}

/** "https://doi.org/10.1/ABC" → "10.1/abc" (la base vuelve a normalizar y validar). */
export function normalizarDoi(doi: unknown): string {
  const d = str(doi).trim().toLowerCase().replace(/^(https?:\/\/)?(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '');
  return /^10\.\d{4,9}\/\S+$/.test(d) ? d : '';
}

const ultimaPalabra = (nombre: string) => nombre.trim().split(/\s+/).pop() ?? '';
const hasta = (t: string, n: number) => (t.length > n ? t.slice(0, n) : t);

// ---------------------------------------------------------------------
// OpenAlex (https://api.openalex.org/works)
// ---------------------------------------------------------------------
const TIPO_OPENALEX: Record<string, Registro['tipo']> = { article: 'articulo', review: 'revision', preprint: 'preprint' };

export function deOpenAlex(w: unknown): Registro | null {
  const o = obj(w);
  const idUrl = str(o.id);
  const idOpenAlex = idUrl.match(/W\d+$/)?.[0];
  const titulo = limpiarTexto(o.title ?? o.display_name);
  if (!idOpenAlex || !titulo) return null;
  const ids = obj(o.ids);
  const primaria = obj(o.primary_location);
  const mejorOa = obj(o.best_oa_location);
  const oa = obj(o.open_access);
  const fuente = obj(primaria.source);

  const pmid = str(ids.pmid).match(/(\d+)\/?$/)?.[1];
  const pmcid = str(ids.pmcid).match(/(?:PMC)?(\d+)\/?$/i)?.[1];
  const doi = normalizarDoi(o.doi ?? ids.doi);

  const autoriasCrudas = arr(o.authorships);
  const autores = autoriasCrudas.slice(0, 50).map((a) => {
    const autor = obj(obj(a).author);
    const nombre = limpiarTexto(autor.display_name ?? obj(a).raw_author_name);
    const orcid = str(autor.orcid).match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)?.[0];
    return { nombre, apellido: ultimaPalabra(nombre), ...(orcid ? { orcid } : {}) };
  }).filter((a) => a.nombre);
  const delInstituto = autoriasCrudas.some((a) =>
    arr(obj(a).institutions).some((i) => str(obj(i).id).endsWith(PASTEUR_OPENALEX)),
  );

  const accesos: Registro['accesos'] = [];
  const agregarAcceso = (loc: Json, esOa: boolean) => {
    const licencia = str(loc.license);
    const version = str(loc.version);
    if (str(loc.landing_page_url)) accesos.push({ tipo: 'pagina', url: str(loc.landing_page_url), version, es_oa: esOa, licencia });
    if (str(loc.pdf_url)) accesos.push({ tipo: 'pdf', url: str(loc.pdf_url), version, es_oa: esOa, licencia });
  };
  if (Object.keys(mejorOa).length) agregarAcceso(mejorOa, true);
  if (Object.keys(primaria).length) agregarAcceso(primaria, primaria.is_oa === true);

  const anio = Number(o.publication_year);
  return {
    proveedor: 'openalex',
    id_externo: idOpenAlex,
    identificadores: {
      openalex: idOpenAlex,
      ...(doi ? { doi } : {}),
      ...(pmid ? { pmid } : {}),
      ...(pmcid ? { pmcid: `PMC${pmcid}` } : {}),
    },
    titulo: hasta(titulo, 1000),
    anio: Number.isInteger(anio) && anio >= 1800 && anio <= 2100 ? anio : null,
    tipo: TIPO_OPENALEX[str(o.type)] ?? 'otro',
    revista: hasta(limpiarTexto(fuente.display_name), 300),
    idioma: hasta(str(o.language), 10),
    autores,
    temas: arr(o.topics).slice(0, 10).map((t) => limpiarTexto(obj(t).display_name)).filter(Boolean),
    mesh: [],
    citas: typeof o.cited_by_count === 'number' ? o.cited_by_count : null,
    oa_estado: hasta(str(oa.oa_status), 20),
    resumen: reconstruirResumen(o.abstract_inverted_index),
    retractada: o.is_retracted === true,
    del_instituto: delInstituto,
    accesos: accesos.filter((a) => /^https?:\/\//.test(a.url)).slice(0, 10),
    licencia: str(mejorOa.license) || str(primaria.license),
    crudo: {
      id: o.id,
      doi: o.doi,
      ids: o.ids,
      type: o.type,
      publication_year: o.publication_year,
      is_retracted: o.is_retracted,
      open_access: o.open_access,
      primary_location: o.primary_location,
      best_oa_location: o.best_oa_location,
    },
  };
}

// ---------------------------------------------------------------------
// Europe PMC (https://www.ebi.ac.uk/europepmc/webservices/rest/search, resultType=core)
// ---------------------------------------------------------------------
export function deEuropePmc(r: unknown): Registro | null {
  const o = obj(r);
  const fuente = str(o.source).toUpperCase();
  const id = str(o.id);
  const titulo = limpiarTexto(o.title);
  if (!/^[A-Z]{3}$/.test(fuente) || !id || !titulo) return null;
  const idEpmc = `${fuente}:${id}`;
  const doi = normalizarDoi(o.doi);
  const pmid = /^\d+$/.test(str(o.pmid)) ? str(o.pmid) : '';
  const pmcid = str(o.pmcid).match(/^PMC\d+$/i)?.[0]?.toUpperCase() ?? '';

  const tiposPub = arr(obj(o.pubTypeList).pubType).map((t) => str(t).toLowerCase());
  const tipo: Registro['tipo'] =
    fuente === 'PPR' || tiposPub.includes('preprint') ? 'preprint' : tiposPub.some((t) => t.includes('review')) ? 'revision' : tiposPub.length ? 'articulo' : 'otro';
  const retractada = tiposPub.some((t) => t.includes('retracted publication'));

  const autoresCrudos = arr(obj(o.authorList).author);
  const autores = autoresCrudos.slice(0, 50).map((a) => {
    const x = obj(a);
    const nombre = limpiarTexto(x.fullName ?? [x.firstName, x.lastName].filter(Boolean).join(' '));
    const apellido = ultimaPalabra(limpiarTexto(x.lastName) || nombre);
    const idAutor = obj(x.authorId);
    const orcid = str(idAutor.type).toUpperCase() === 'ORCID' ? str(idAutor.value).match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)?.[0] : undefined;
    return { nombre, apellido, ...(orcid ? { orcid } : {}) };
  }).filter((a) => a.nombre);
  const afiliaciones = autoresCrudos
    .flatMap((a) => arr(obj(obj(a).authorAffiliationDetailsList).authorAffiliation).map((af) => str(obj(af).affiliation)))
    .join(' | ')
    .toLowerCase();
  const delInstituto = /pasteur\s+(de\s+)?montevideo/.test(afiliaciones.normalize('NFD').replace(/[̀-ͯ]/g, ''));

  const revista = obj(obj(o.journalInfo).journal);
  const accesos: Registro['accesos'] = arr(obj(o.fullTextUrlList).fullTextUrl)
    .map((u) => {
      const x = obj(u);
      const url = str(x.url);
      const estilo = str(x.documentStyle).toLowerCase();
      const abierto = /open|free/i.test(str(x.availability));
      return { tipo: (estilo === 'pdf' ? 'pdf' : 'pagina') as 'pdf' | 'pagina', url, es_oa: abierto };
    })
    .filter((a) => /^https?:\/\//.test(a.url))
    .slice(0, 10);

  const anio = Number(o.pubYear);
  return {
    proveedor: 'europepmc',
    id_externo: idEpmc,
    identificadores: {
      europepmc: idEpmc,
      ...(doi ? { doi } : {}),
      ...(pmid ? { pmid } : {}),
      ...(pmcid ? { pmcid } : {}),
    },
    titulo: hasta(titulo, 1000),
    anio: Number.isInteger(anio) && anio >= 1800 && anio <= 2100 ? anio : null,
    tipo,
    revista: hasta(limpiarTexto(revista.title), 300),
    idioma: hasta(str(o.language), 10),
    autores,
    temas: arr(obj(o.keywordList).keyword).slice(0, 10).map(limpiarTexto).filter(Boolean),
    mesh: arr(obj(o.meshHeadingList).meshHeading).slice(0, 60).map((m) => limpiarTexto(obj(m).descriptorName)).filter(Boolean),
    citas: typeof o.citedByCount === 'number' ? o.citedByCount : null,
    oa_estado: str(o.isOpenAccess) === 'Y' ? 'abierto' : '',
    resumen: limpiarTexto(o.abstractText) || null,
    retractada,
    del_instituto: delInstituto,
    accesos,
    licencia: str(o.license),
    crudo: {
      id: o.id,
      source: o.source,
      pmid: o.pmid,
      pmcid: o.pmcid,
      doi: o.doi,
      pubYear: o.pubYear,
      pubTypeList: o.pubTypeList,
      isOpenAccess: o.isOpenAccess,
      license: o.license,
    },
  };
}

/** Clave para juntar en pantalla el mismo trabajo que llega de las dos fuentes. */
export const claveDe = (r: Registro) => (r.identificadores.doi ? `doi:${r.identificadores.doi}` : `${r.proveedor}:${r.id_externo}`);
