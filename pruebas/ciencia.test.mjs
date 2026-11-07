/*
  Pruebas de la traducción de PubMed, OpenAlex y Europe PMC (src/lib/ciencia/normalizar.ts).
  Sin red: registros de ejemplo con la forma que devuelven las tres APIs.
  Correr con: npm run test:ciencia
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agrupar, articulosPubMed, claveDe, deEuropePmc, deOpenAlex, dePubMed, limpiarTexto, normalizarDoi, reconstruirResumen } from '../src/lib/ciencia/normalizar.ts';

const OPENALEX = {
  id: 'https://openalex.org/W2741809807',
  doi: 'https://doi.org/10.1371/JOURNAL.PNTD.0005512',
  title: 'Saliva of <i>Aedes aegypti</i> &amp; dengue transmission',
  display_name: 'Saliva of Aedes aegypti & dengue transmission',
  publication_year: 2017,
  type: 'article',
  language: 'en',
  ids: { openalex: 'https://openalex.org/W2741809807', doi: 'https://doi.org/10.1371/journal.pntd.0005512', pmid: 'https://pubmed.ncbi.nlm.nih.gov/28426671', pmcid: 'https://www.ncbi.nlm.nih.gov/pmc/articles/5413155' },
  primary_location: { is_oa: true, landing_page_url: 'https://doi.org/10.1371/journal.pntd.0005512', pdf_url: null, source: { display_name: 'PLoS Neglected Tropical Diseases' }, license: 'cc-by', version: 'publishedVersion' },
  best_oa_location: { is_oa: true, landing_page_url: 'https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0005512', pdf_url: 'https://journals.plos.org/plosntds/article/file?type=printable', license: 'cc-by', version: 'publishedVersion' },
  open_access: { is_oa: true, oa_status: 'gold', oa_url: 'https://journals.plos.org/x' },
  authorships: [
    { author: { display_name: 'María José Pérez', orcid: 'https://orcid.org/0000-0002-1825-0097' }, institutions: [{ id: 'https://openalex.org/I4210156231', display_name: 'Institut Pasteur de Montevideo' }] },
    { author: { display_name: 'John Smith', orcid: null }, institutions: [] },
  ],
  cited_by_count: 41,
  is_retracted: false,
  abstract_inverted_index: { Mosquito: [0], saliva: [1, 5], modulates: [2], the: [3], host: [4] },
  topics: [{ display_name: 'Mosquito-borne diseases and control' }],
};

const EUROPEPMC = {
  id: '28426671',
  source: 'MED',
  pmid: '28426671',
  pmcid: 'PMC5413155',
  doi: '10.1371/journal.pntd.0005512',
  title: 'Saliva of <i>Aedes aegypti</i> and dengue transmission.',
  authorString: 'Pérez MJ, Smith J.',
  authorList: {
    author: [
      { fullName: 'Pérez MJ', firstName: 'María José', lastName: 'Pérez', authorId: { type: 'ORCID', value: '0000-0002-1825-0097' }, authorAffiliationDetailsList: { authorAffiliation: [{ affiliation: 'Institut Pasteur de Montevideo, Uruguay.' }] } },
      { fullName: 'Smith J', firstName: 'John', lastName: 'Smith' },
    ],
  },
  journalInfo: { journal: { title: 'PLoS neglected tropical diseases' } },
  pubYear: '2017',
  abstractText: '<h4>Background</h4>Mosquito saliva modulates the host response.',
  isOpenAccess: 'Y',
  license: 'cc by',
  pubTypeList: { pubType: ['research-article', 'Journal Article'] },
  meshHeadingList: { meshHeading: [{ descriptorName: 'Aedes' }, { descriptorName: 'Dengue' }] },
  fullTextUrlList: { fullTextUrl: [{ availability: 'Open access', documentStyle: 'pdf', site: 'Europe_PMC', url: 'https://europepmc.org/articles/PMC5413155?pdf=render' }, { availability: 'Subscription required', documentStyle: 'doi', url: 'javascript:alert(1)' }] },
  citedByCount: 39,
  language: 'eng',
};

test('limpia HTML y entidades', () => {
  assert.equal(limpiarTexto('<i>Aedes</i> &amp; virus &#233;l &#x41;'), 'Aedes & virus él A');
  assert.equal(limpiarTexto('  dos\n\tlíneas  '), 'dos líneas');
  assert.equal(limpiarTexto(null), '');
});

test('rearma el resumen de OpenAlex (índice invertido)', () => {
  assert.equal(reconstruirResumen(OPENALEX.abstract_inverted_index), 'Mosquito saliva modulates the host saliva');
  assert.equal(reconstruirResumen(null), null);
  assert.equal(reconstruirResumen({}), null);
});

test('normaliza DOIs y descarta lo que no lo es', () => {
  assert.equal(normalizarDoi('https://doi.org/10.1371/JOURNAL.PNTD.0005512'), '10.1371/journal.pntd.0005512');
  assert.equal(normalizarDoi('doi: 10.1000/ABC'), '10.1000/abc');
  assert.equal(normalizarDoi('hola'), '');
});

test('OpenAlex → registro común', () => {
  const r = deOpenAlex(OPENALEX);
  assert.ok(r);
  assert.equal(r.proveedor, 'openalex');
  assert.equal(r.id_externo, 'W2741809807');
  assert.deepEqual(r.identificadores, { openalex: 'W2741809807', doi: '10.1371/journal.pntd.0005512', pmid: '28426671', pmcid: 'PMC5413155' });
  assert.equal(r.titulo, 'Saliva of Aedes aegypti & dengue transmission');
  assert.equal(r.tipo, 'articulo');
  assert.equal(r.revista, 'PLoS Neglected Tropical Diseases');
  assert.equal(r.autores[0].apellido, 'Pérez');
  assert.equal(r.autores[0].orcid, '0000-0002-1825-0097');
  assert.equal(r.del_instituto, true);
  assert.equal(r.licencia, 'cc-by');
  assert.equal(r.oa_estado, 'gold');
  assert.equal(r.resumen, 'Mosquito saliva modulates the host saliva');
  assert.ok(r.accesos.some((a) => a.tipo === 'pdf' && a.es_oa));
  assert.equal(r.retractada, false);
  assert.equal('abstract_inverted_index' in r.crudo, false, 'el crudo no guarda el resumen dos veces');
});

test('OpenAlex: preprint, retractado y sin datos', () => {
  assert.equal(deOpenAlex({ ...OPENALEX, type: 'preprint' }).tipo, 'preprint');
  assert.equal(deOpenAlex({ ...OPENALEX, type: 'book-chapter' }).tipo, 'otro');
  assert.equal(deOpenAlex({ ...OPENALEX, is_retracted: true }).retractada, true);
  assert.equal(deOpenAlex({ ...OPENALEX, authorships: [] }).del_instituto, false);
  assert.equal(deOpenAlex({ id: 'x', title: 'Sin id válido' }), null);
  assert.equal(deOpenAlex({ id: 'https://openalex.org/W1', title: '' }), null);
  assert.equal(deOpenAlex(null), null);
  assert.equal(deOpenAlex({ ...OPENALEX, publication_year: 3000 }).anio, null);
});

test('Europe PMC → registro común', () => {
  const r = deEuropePmc(EUROPEPMC);
  assert.ok(r);
  assert.equal(r.id_externo, 'MED:28426671');
  assert.deepEqual(r.identificadores, { europepmc: 'MED:28426671', doi: '10.1371/journal.pntd.0005512', pmid: '28426671', pmcid: 'PMC5413155' });
  assert.equal(r.titulo, 'Saliva of Aedes aegypti and dengue transmission.');
  assert.equal(r.anio, 2017);
  assert.equal(r.tipo, 'articulo');
  assert.equal(r.resumen, 'Background Mosquito saliva modulates the host response.');
  assert.deepEqual(r.mesh, ['Aedes', 'Dengue']);
  assert.equal(r.licencia, 'cc by');
  assert.equal(r.del_instituto, true);
  assert.equal(r.autores[0].apellido, 'Pérez');
  assert.equal(r.accesos.length, 1, 'descarta el enlace que no es http');
  assert.equal(r.accesos[0].es_oa, true);
});

test('Europe PMC: preprint, revisión, retractado', () => {
  assert.equal(deEuropePmc({ ...EUROPEPMC, source: 'PPR', id: 'PPR123' }).tipo, 'preprint');
  assert.equal(deEuropePmc({ ...EUROPEPMC, pubTypeList: { pubType: ['Review'] } }).tipo, 'revision');
  assert.equal(deEuropePmc({ ...EUROPEPMC, pubTypeList: { pubType: ['Retracted Publication', 'Journal Article'] } }).retractada, true);
  assert.equal(deEuropePmc({ ...EUROPEPMC, source: 'med?' }), null);
  assert.equal(deEuropePmc({ ...EUROPEPMC, authorList: { author: [{ fullName: 'X', authorAffiliationDetailsList: { authorAffiliation: [{ affiliation: 'Institut Pasteur, Paris' }] } }] } }).del_instituto, false);
});

test('el mismo trabajo en las dos fuentes tiene la misma clave (DOI)', () => {
  assert.equal(claveDe(deOpenAlex(OPENALEX)), claveDe(deEuropePmc(EUROPEPMC)));
  assert.notEqual(claveDe(deOpenAlex({ ...OPENALEX, doi: null, ids: {} })), claveDe(deEuropePmc({ ...EUROPEPMC, doi: null })));
});

// ---------------------------------------------------------------------
// PubMed (efetch, retmode=xml): forma real del PubmedArticleSet
// ---------------------------------------------------------------------
const PUBMED_XML = `<?xml version="1.0" ?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2025//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd">
<PubmedArticleSet>
<PubmedArticle><MedlineCitation Status="MEDLINE" Owner="NLM"><PMID Version="1">31234567</PMID>
<Article PubModel="Print-Electronic"><Journal><ISSN IssnType="Electronic">1943-0264</ISSN><JournalIssue CitedMedium="Internet"><Volume>11</Volume><Issue>5</Issue><PubDate><Year>2019</Year><Month>May</Month></PubDate></JournalIssue><Title>Cold Spring Harbor perspectives in biology</Title><ISOAbbreviation>Cold Spring Harb Perspect Biol</ISOAbbreviation></Journal>
<ArticleTitle>Transport between the cell <i>nucleus</i> and the cytoplasm.</ArticleTitle>
<ELocationID EIdType="pii" ValidYN="Y">a034567</ELocationID><ELocationID EIdType="doi" ValidYN="Y">10.1101/CSHPERSPECT.A034567</ELocationID>
<Abstract><AbstractText Label="BACKGROUND" NlmCategory="BACKGROUND">The nucleus stores DNA &amp; is surrounded by a double membrane.</AbstractText><AbstractText Label="RESULTS" NlmCategory="RESULTS">Pores control what goes in and out (&lt;10 nm).</AbstractText><CopyrightInformation>© 2019 CSHL Press.</CopyrightInformation></Abstract>
<AuthorList CompleteYN="Y"><Author ValidYN="Y"><LastName>Paz</LastName><ForeName>Ana María</ForeName><Initials>AM</Initials><Identifier Source="ORCID">https://orcid.org/0000-0002-1825-0097</Identifier><AffiliationInfo><Affiliation>Institut Pasteur de Montevideo, Montevideo, Uruguay.</Affiliation></AffiliationInfo></Author><Author ValidYN="Y"><CollectiveName>Nuclear Pore Consortium</CollectiveName></Author></AuthorList>
<Language>eng</Language>
<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType><PublicationType UI="D016454">Review</PublicationType></PublicationTypeList>
</Article>
<MeshHeadingList><MeshHeading><DescriptorName UI="D002467" MajorTopicYN="N">Cell Nucleus</DescriptorName><QualifierName UI="Q000378" MajorTopicYN="Y">metabolism</QualifierName></MeshHeading><MeshHeading><DescriptorName UI="D004247" MajorTopicYN="N">DNA</DescriptorName></MeshHeading></MeshHeadingList>
<KeywordList Owner="NOTNLM"><Keyword MajorTopicYN="N">nuclear pore</Keyword></KeywordList>
</MedlineCitation>
<PubmedData><ArticleIdList><ArticleId IdType="pubmed">31234567</ArticleId><ArticleId IdType="pmc">PMC6496331</ArticleId><ArticleId IdType="doi">10.1101/cshperspect.a034567</ArticleId></ArticleIdList>
<ReferenceList><Reference><Citation>Otro trabajo.</Citation><ArticleIdList><ArticleId IdType="doi">10.9999/otro</ArticleId><ArticleId IdType="pmc">PMC1</ArticleId></ArticleIdList></Reference></ReferenceList></PubmedData>
</PubmedArticle>
<PubmedArticle><MedlineCitation Status="MEDLINE" Owner="NLM"><PMID Version="1">20000002</PMID>
<Article PubModel="Print"><Journal><JournalIssue><PubDate><MedlineDate>2010 Jan-Feb</MedlineDate></PubDate></JournalIssue><Title>Fake results</Title></Journal>
<ArticleTitle>A study that was retracted.</ArticleTitle>
<Abstract><AbstractText>Unstructured abstract.</AbstractText></Abstract>
<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType></PublicationTypeList></Article>
<CommentsCorrectionsList><CommentsCorrections RefType="RetractionIn"><RefSource>Fake results. 2012</RefSource><PMID Version="1">22222222</PMID></CommentsCorrections></CommentsCorrectionsList>
</MedlineCitation><PubmedData><ArticleIdList><ArticleId IdType="pubmed">20000002</ArticleId></ArticleIdList></PubmedData></PubmedArticle>
<PubmedBookArticle><BookDocument><PMID Version="1">20301295</PMID><ArticleTitle>Un libro</ArticleTitle></BookDocument></PubmedBookArticle>
</PubmedArticleSet>`;

test('PubMed → registro común (resumen con partes, DOI del artículo, PMC, ORCID, Instituto, MeSH)', () => {
  const arts = articulosPubMed(PUBMED_XML);
  assert.equal(arts.length, 2, 'los libros se ignoran');
  const r = dePubMed(arts[0]);
  assert.equal(r.proveedor, 'pubmed');
  assert.equal(r.id_externo, '31234567');
  assert.deepEqual(r.identificadores, { pmid: '31234567', doi: '10.1101/cshperspect.a034567', pmcid: 'PMC6496331' });
  assert.equal(r.titulo, 'Transport between the cell nucleus and the cytoplasm.');
  assert.equal(r.resumen, 'Background: The nucleus stores DNA & is surrounded by a double membrane. Results: Pores control what goes in and out (<10 nm).');
  assert.equal(r.anio, 2019);
  assert.equal(r.tipo, 'revision');
  assert.equal(r.revista, 'Cold Spring Harbor perspectives in biology');
  assert.equal(r.idioma, 'eng');
  assert.deepEqual(r.autores, [
    { nombre: 'Ana María Paz', apellido: 'Paz', orcid: '0000-0002-1825-0097' },
    { nombre: 'Nuclear Pore Consortium', apellido: 'Consortium' },
  ]);
  assert.equal(r.del_instituto, true);
  assert.deepEqual(r.mesh, ['Cell Nucleus', 'DNA']);
  assert.deepEqual(r.temas, ['nuclear pore']);
  assert.equal(r.retractada, false);
  assert.equal(r.licencia, '', 'PubMed no informa licencias');
  assert.deepEqual(r.accesos.map((a) => a.url), ['https://pubmed.ncbi.nlm.nih.gov/31234567/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6496331/']);
});

test('PubMed: retractado, año de MedlineDate, sin DOI; y la lista de referencias no se mezcla', () => {
  const r = dePubMed(articulosPubMed(PUBMED_XML)[1]);
  assert.equal(r.retractada, true);
  assert.equal(r.anio, 2010);
  assert.equal(r.tipo, 'articulo');
  assert.deepEqual(r.identificadores, { pmid: '20000002' });
  assert.equal(r.resumen, 'Unstructured abstract.');
  assert.equal(dePubMed('<MedlineCitation><PMID>abc</PMID></MedlineCitation>'), null);
  // Un DOI mal escrito en el artículo no tapa el de la lista de ids de PubMed
  const malDoi = articulosPubMed(PUBMED_XML)[0].replace('10.1101/CSHPERSPECT.A034567', '10.1101/a b');
  assert.equal(dePubMed(malDoi).identificadores.doi, '10.1101/cshperspect.a034567');
  assert.equal(dePubMed(''), null);
  const sinRefs = dePubMed(articulosPubMed(PUBMED_XML)[0]);
  assert.ok(!JSON.stringify(sinRefs).includes('10.9999/otro'));
});

test('el mismo trabajo en las tres fuentes se junta aunque una no traiga DOI', () => {
  const pubmed = dePubMed(articulosPubMed(PUBMED_XML)[0]);
  const openalex = { ...deOpenAlex(OPENALEX), identificadores: { openalex: 'W1', doi: '10.1101/cshperspect.a034567' } };
  const epmc = { ...deEuropePmc(EUROPEPMC), identificadores: { europepmc: 'MED:31234567', pmid: '31234567' } };
  const otro = deEuropePmc({ ...EUROPEPMC, id: '999', pmid: '999', doi: '10.5555/otro' });
  const grupos = agrupar([openalex, otro, epmc, pubmed].map((registro) => ({ registro })));
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos[0].map((x) => x.registro.proveedor), ['openalex', 'europepmc', 'pubmed']);
  assert.equal(claveDe(pubmed), 'doi:10.1101/cshperspect.a034567');
});
