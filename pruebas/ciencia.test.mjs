/*
  Pruebas de la traducción de OpenAlex y Europe PMC (src/lib/ciencia/normalizar.ts).
  Sin red: registros de ejemplo con la forma que devuelven las dos APIs.
  Correr con: npm run test:ciencia
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claveDe, deEuropePmc, deOpenAlex, limpiarTexto, normalizarDoi, reconstruirResumen } from '../src/lib/ciencia/normalizar.ts';

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
