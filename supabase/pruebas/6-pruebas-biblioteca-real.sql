-- =====================================================================
-- GENERADO con a-real.py desde 5-pruebas-biblioteca.sql: no editar a mano.
--
-- Para correr en un proyecto REAL de Supabase (solo el de desarrollo), sin
-- dejar rastro. Se manda como UNA sola consulta: Postgres la ejecuta como una
-- transacción, y la última sentencia lanza un error A PROPÓSITO con el
-- resultado adentro. El error deshace todo: usuarios de prueba, equipo,
-- fichas, publicaciones, el esquema "t5"… nada queda guardado.
-- =====================================================================
-- =====================================================================
-- Pruebas de las migraciones 13 (publicaciones) y 14 (licencias), en el
-- Postgres local. No depende de las otras pruebas: arma su propio equipo,
-- su maestra y su alumno. Cada prueba imprime OK o FALLA.
-- Para el proyecto real se genera 6-pruebas-biblioteca-real.sql con
-- a-real.py (misma lógica, en una transacción que se deshace).
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t5;
create table t5.resultado (n serial, prueba text, ok boolean);
create table t5.v (k text primary key, val text);
grant usage on schema t5 to anon, authenticated, service_role;
grant all on t5.resultado, t5.resultado_n_seq, t5.v to anon, authenticated, service_role;
create function t5.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t5.error(sql text) returns text language plpgsql as $$
begin execute sql; return ''; exception when others then return sqlerrm; end $$;
create function t5.filas(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || sql || ') x' into n; return n;
exception when others then return -1; end $$;
create function t5.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t5.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t5.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
grant execute on all functions in schema t5 to anon, authenticated, service_role;


-- =====================================================================
-- Equipo, maestra y alumno de estas pruebas
-- =====================================================================
set local role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values
  ('b-admin@pasteur.test', 'admin', 'Admin B'), ('b-redactora@pasteur.test', 'redactor', 'Redactora B'),
  ('b-val@pasteur.test', 'validador', 'Validadora B'), ('b-val2@pasteur.test', 'validador', 'Validadora B2');
reset role;
insert into auth.users (id, email) values ('b0000000-0000-0000-0000-000000000001', 'b-admin@pasteur.test'), ('b0000000-0000-0000-0000-000000000002', 'b-redactora@pasteur.test'),
  ('b0000000-0000-0000-0000-000000000003', 'b-val@pasteur.test'), ('b0000000-0000-0000-0000-000000000004', 'b-val2@pasteur.test');
insert into auth.users (id, email, raw_user_meta_data) values ('bbbbbbbb-5555-0000-0000-000000000001', 'b-maestra@escuela.uy', '{"nombre":"Maestra B"}');
insert into auth.users (id, email, raw_app_meta_data) values ('bbbbbbbb-5555-0000-0000-000000000002', 'b7rm-01@alumnos.invalid', '{"rol":"alumno"}');
select t5.ok('preparación: equipo de cuatro y una maestra', (select count(*) from equipo where id in ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004')) = 4
  and exists (select 1 from docentes where id = 'bbbbbbbb-5555-0000-0000-000000000001'));

-- =====================================================================
-- Catálogo y normalización
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('catálogo: PubMed, OpenAlex y Europe PMC (PubMed desde la migración 18)', t5.filas('select 1 from proveedores_cientificos') = 3);
select t5.ok('catálogo: cinco tipos de identificador', t5.filas('select 1 from tipos_identificador') = 5);
select t5.ok('licencias: diez en la política inicial', t5.filas('select 1 from licencias') = 10);
select t5.ok('licencias: las no comerciales piden paráfrasis hasta que confirme el Instituto', (select pasaje from licencias where codigo = 'cc-by-nc') = 'solo_ubicacion');
select t5.ok('redactora: no apaga un proveedor', t5.afecta($$update proveedores_cientificos set activo = false where id = 'openalex'$$) <= 0);
select t5.ok('redactora: no cambia la política de licencias', t5.afecta($$update licencias set pasaje = 'textual' where codigo = 'desconocida'$$) <= 0
  and (select pasaje from licencias where codigo = 'desconocida') = 'solo_ubicacion');
reset role;
select t5.ok('identificador: DOI con URL y mayúsculas', privado.normalizar_identificador('doi', 'https://doi.org/10.1371/JOURNAL.PNTD.0001234') = '10.1371/journal.pntd.0001234');
select t5.ok('identificador: DOI con "doi:"', privado.normalizar_identificador('doi', 'doi: 10.1000/XYZ') = '10.1000/xyz');
select t5.ok('identificador: PMID desde la URL de PubMed', privado.normalizar_identificador('pmid', 'https://pubmed.ncbi.nlm.nih.gov/31234567/') = '31234567');
select t5.ok('identificador: PMCID con o sin prefijo', privado.normalizar_identificador('pmcid', 'pmc6543210') = 'PMC6543210'
  and privado.normalizar_identificador('pmcid', '6543210') = 'PMC6543210');
select t5.ok('identificador: OpenAlex desde la URL', privado.normalizar_identificador('openalex', 'https://openalex.org/W2741809807') = 'W2741809807');
select t5.ok('identificador: Europe PMC', privado.normalizar_identificador('europepmc', 'ppr:PPR525786') = 'PPR:PPR525786');
select t5.ok('identificador: lo que no tiene forma se ignora', privado.normalizar_identificador('doi', 'hola') is null
  and privado.normalizar_identificador('pmid', 'abc') is null and privado.normalizar_identificador('isbn', '123') is null);
select t5.ok('licencia: "CC BY 4.0" es cc-by', privado.normalizar_licencia('CC BY 4.0') = 'cc-by');
select t5.ok('licencia: la URL de Creative Commons', privado.normalizar_licencia('https://creativecommons.org/licenses/by-nc-nd/4.0/') = 'cc-by-nc-nd');
select t5.ok('licencia: "cc by-nc" de Europe PMC', privado.normalizar_licencia('cc by-nc') = 'cc-by-nc');
select t5.ok('licencia: acceso abierto del editor', privado.normalizar_licencia('publisher-specific-oa') = 'editor-oa');
select t5.ok('licencia: CC0 por nombre o por URL', privado.normalizar_licencia('cc0') = 'cc0'
  and privado.normalizar_licencia('https://creativecommons.org/publicdomain/zero/1.0/') = 'cc0');
select t5.ok('licencia: lo que no se reconoce es desconocida', privado.normalizar_licencia('mit') = 'desconocida');

-- =====================================================================
-- Alta y duplicados (lo hace el servidor)
-- =====================================================================
set local role service_role;
insert into t5.v (k, val) select 'r1', (guardar_registro($j${"proveedor":"openalex","id_externo":"W100","identificadores":{"doi":"https://doi.org/10.1000/ABC.1","openalex":"https://openalex.org/W100"},"titulo":"Dengue virus envelope protein dynamics","anio":2020,"tipo":"articulo","revista":"PLoS Neglected Tropical Diseases","autores":[{"nombre":"Ana Pérez","apellido":"Pérez"},{"nombre":"Luis Gómez","apellido":"Gómez"}],"temas":["Dengue"],"citas":12,"oa_estado":"gold","resumen":"Reconstructed abstract about the dengue envelope protein.","del_instituto":true,"accesos":[{"tipo":"pagina","url":"https://journals.plos.org/plosntds/article?id=10.1000/abc.1","es_oa":true,"licencia":"cc-by"},{"tipo":"pdf","url":"javascript:alert(1)"}],"crudo":{"id":"https://openalex.org/W100"}}$j$::jsonb, null, 'b0000000-0000-0000-0000-000000000002'::uuid)::text)::text;
insert into t5.v (k, val) select 'p1', ((select val from t5.v where k = 'r1')::jsonb ->> 'publicacion_id')::text;
reset role;
select t5.ok('alta: crea una candidata nueva', ((select val from t5.v where k = 'r1')::jsonb ->> 'nueva')::boolean and ((select val from t5.v where k = 'r1')::jsonb ->> 'estado') = 'candidata');
select t5.ok('alta: queda quién la agregó y vence en 90 días', (select agregada_por = 'b0000000-0000-0000-0000-000000000002' and vence_en > now() + interval '89 days' from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('alta: identificadores normalizados', (select array_agg(tipo || '=' || valor order by tipo) from publicacion_identificadores where publicacion_id = (select val from t5.v where k = 'p1')::uuid) = array['doi=10.1000/abc.1', 'openalex=W100']);
select t5.ok('alta: guarda el enlace y descarta el que no es http', (select count(*) from publicacion_accesos where publicacion_id = (select val from t5.v where k = 'p1')::uuid) = 1);
select t5.ok('alta: registro crudo y procedencia', (select count(*) from publicacion_procedencias where publicacion_id = (select val from t5.v where k = 'p1')::uuid and registro_crudo_id is not null and 'titulo' = any (campos_aportados)) = 1);
select t5.ok('alta: marca que es del Instituto', (select del_instituto from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('alta: queda en el registro editorial', exists (select 1 from eventos_editoriales where accion = 'agregar_candidata' and entidad_id = (select val from t5.v where k = 'p1')::uuid));

set local role service_role;
insert into t5.v (k, val) select 'r2', (guardar_registro($j${"proveedor":"europepmc","id_externo":"MED:31234567","identificadores":{"doi":"10.1000/abc.1","pmid":"31234567","europepmc":"MED:31234567"},"titulo":"Dengue virus envelope protein dynamics.","anio":2020,"tipo":"articulo","revista":"PLoS Negl Trop Dis","autores":[{"nombre":"Pérez A","apellido":"Pérez"}],"mesh":["Dengue","Viral Envelope Proteins"],"resumen":"Full abstract from Europe PMC: the envelope protein of dengue virus changes shape.","crudo":{"id":"31234567","source":"MED"}}$j$::jsonb)::text)::text;
reset role;
select t5.ok('mismo DOI desde Europe PMC: es la misma publicación', ((select val from t5.v where k = 'r2')::jsonb ->> 'publicacion_id') = (select val from t5.v where k = 'p1') and not ((select val from t5.v where k = 'r2')::jsonb ->> 'nueva')::boolean);
select t5.ok('mismo DOI: suma el PMID y el id de Europe PMC', (select count(*) from publicacion_identificadores where publicacion_id = (select val from t5.v where k = 'p1')::uuid) = 4);
select t5.ok('mismo DOI: el resumen pasa a ser el de Europe PMC', (select resumen_origen = 'europepmc' and resumen_interno like 'Full abstract%' from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('mismo DOI: OpenAlex sigue mandando en revista y autores', (select revista = 'PLoS Neglected Tropical Diseases' and jsonb_array_length(autores) = 2 from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('mismo DOI: los MeSH vienen de Europe PMC', (select mesh = array['Dengue', 'Viral Envelope Proteins'] from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('mismo DOI: dos procedencias', (select count(distinct proveedor) from publicacion_procedencias where publicacion_id = (select val from t5.v where k = 'p1')::uuid) = 2);

set local role service_role;
select guardar_registro($j${"proveedor":"openalex","id_externo":"W100","identificadores":{"openalex":"W100"},"titulo":"Dengue virus envelope protein dynamics","citas":15,"crudo":{"id":"https://openalex.org/W100"}}$j$::jsonb);
reset role;
select t5.ok('el mismo registro otra vez: no duplica el crudo', (select count(*) from registros_crudos where proveedor = 'openalex' and id_externo = 'W100') = 1);
select t5.ok('el mismo registro otra vez: actualiza las citas y no borra lo demás', (select citas = 15 and revista <> '' and jsonb_array_length(autores) = 2 from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));

set local role service_role;
insert into t5.v (k, val) select 'r3', (guardar_registro($j${"proveedor":"europepmc","id_externo":"PPR:PPR123","identificadores":{"europepmc":"PPR:PPR123"},"titulo":"Dengue virus envelope protein dynamics","anio":2019,"tipo":"preprint","autores":[{"nombre":"Perez A","apellido":"Perez"}],"resumen":"Preprint abstract.","crudo":{"id":"PPR123"}}$j$::jsonb, null, 'b0000000-0000-0000-0000-000000000002'::uuid)::text)::text;
insert into t5.v (k, val) select 'p3', ((select val from t5.v where k = 'r3')::jsonb ->> 'publicacion_id')::text;
reset role;
select t5.ok('preprint con el mismo título: es otra publicación', ((select val from t5.v where k = 'r3')::jsonb ->> 'nueva')::boolean and (select val from t5.v where k = 'p3') <> (select val from t5.v where k = 'p1'));
select t5.ok('preprint con el mismo título: queda sugerido como posible duplicado', ((select val from t5.v where k = 'r3')::jsonb -> 'posibles_duplicados') ? (select val from t5.v where k = 'p1')
  and exists (select 1 from publicacion_relaciones where tipo = 'posible_duplicado' and estado = 'sugerida'
              and least(origen_id, destino_id) = least((select val from t5.v where k = 'p1')::uuid, (select val from t5.v where k = 'p3')::uuid) and greatest(origen_id, destino_id) = greatest((select val from t5.v where k = 'p1')::uuid, (select val from t5.v where k = 'p3')::uuid)));

set local role service_role;
insert into t5.v (k, val) select 'r5', (guardar_registro($j${"proveedor":"openalex","id_externo":"W500","identificadores":{"openalex":"W500"},"titulo":"Antarctic soil bacteria and antibiotic resistance","anio":2022,"tipo":"articulo","autores":[{"nombre":"Rosa Díaz","apellido":"Díaz"}],"crudo":{"id":"W500"}}$j$::jsonb, null, 'b0000000-0000-0000-0000-000000000003'::uuid)::text)::text;
insert into t5.v (k, val) select 'p5', ((select val from t5.v where k = 'r5')::jsonb ->> 'publicacion_id')::text;
insert into t5.v (k, val) select 'r4', (guardar_registro($j${"proveedor":"openalex","id_externo":"W300","identificadores":{"openalex":"W300","doi":"10.1000/abc.1","europepmc":"PPR:PPR123"},"titulo":"Dengue virus envelope protein dynamics","crudo":{"id":"W300"}}$j$::jsonb)::text)::text;
reset role;
select t5.ok('otro título: sin sugerencias de duplicado', jsonb_array_length((select val from t5.v where k = 'r5')::jsonb -> 'posibles_duplicados') = 0);
-- Va a la más antigua (y, si se crearon en el mismo instante, como pasa dentro de una transacción, a la de id menor)
select t5.ok('identificadores de dos publicaciones: no las fusiona sola', ((select val from t5.v where k = 'r4')::jsonb ->> 'publicacion_id') in ((select val from t5.v where k = 'p1'), (select val from t5.v where k = 'p3'))
  and ((select val from t5.v where k = 'r4')::jsonb -> 'posibles_duplicados') ? (case when ((select val from t5.v where k = 'r4')::jsonb ->> 'publicacion_id') = (select val from t5.v where k = 'p1') then (select val from t5.v where k = 'p3') else (select val from t5.v where k = 'p1') end)
  and ((select val from t5.v where k = 'r4')::jsonb ->> 'publicacion_id') = (select id::text from publicaciones where id in ((select val from t5.v where k = 'p1')::uuid, (select val from t5.v where k = 'p3')::uuid) order by creada_en, id limit 1));
select t5.ok('identificadores de dos publicaciones: cada uno sigue en la suya', (select publicacion_id from publicacion_identificadores where tipo = 'europepmc' and valor = 'PPR:PPR123') = (select val from t5.v where k = 'p3')::uuid
  and (select publicacion_id from publicacion_identificadores where tipo = 'doi' and valor = '10.1000/abc.1') = (select val from t5.v where k = 'p1')::uuid
  and (select publicacion_id from publicacion_identificadores where tipo = 'openalex' and valor = 'W300')::text = ((select val from t5.v where k = 'r4')::jsonb ->> 'publicacion_id'));
select t5.ok('identificadores de dos publicaciones: no aparece una tercera', (select count(*) from publicaciones where titulo_normalizado = 'dengue virus envelope protein dynamics') = 2);

set local role service_role;
select t5.ok('alta: sin identificadores válidos no entra', t5.error($$select guardar_registro('{"proveedor":"openalex","id_externo":"X1","identificadores":{"doi":"hola"},"titulo":"Algo"}'::jsonb)$$) like '%identificador%');
select t5.ok('alta: un proveedor desconocido no entra', t5.falla($$select guardar_registro('{"proveedor":"otro","id_externo":"X1","identificadores":{"doi":"10.1000/x"},"titulo":"Algo"}'::jsonb)$$));
select t5.ok('alta: quien agrega tiene que ser del equipo', t5.falla(format($$select guardar_registro('{"proveedor":"openalex","id_externo":"W9","identificadores":{"openalex":"W9"},"titulo":"Algo"}'::jsonb, null, %L)$$, 'bbbbbbbb-5555-0000-0000-000000000001')));
select t5.ok('ejecución: la consulta no puede llevar la clave', t5.falla($$insert into ejecuciones_busqueda (proveedor, consulta_enviada) values ('openalex', 'search=dengue&api_key=secreta')$$));
select t5.ok('ejecución: se guarda la consulta sin clave', t5.afecta($$insert into ejecuciones_busqueda (proveedor, consulta_enviada, estado) values ('openalex', 'search=dengue', 'ok')$$) = 1);
select t5.ok('servidor: no aprueba cambiando el estado', t5.falla(format($$update publicaciones set estado = 'aprobada' where id = %L$$, (select val from t5.v where k = 'p1'))));
select t5.ok('servidor: no escribe revisiones', t5.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada, revisor_id) values ('publicacion', %L, 'aprobar', repeat('a', 64), %L)$$, (select val from t5.v where k = 'p1'), 'b0000000-0000-0000-0000-000000000003')));
select t5.ok('servidor: no pone la huella', t5.falla(format($$update publicaciones set huella = repeat('a', 64) where id = %L$$, (select val from t5.v where k = 'p1'))));
reset role;

-- =====================================================================
-- Quién ve y quién toca
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('redactora: ve las publicaciones', t5.filas('select 1 from publicaciones where titulo_normalizado like ''dengue%''') = 2);
select t5.ok('redactora: no agrega publicaciones directo', t5.falla($$insert into publicaciones (titulo) values ('trampa')$$));
select t5.ok('redactora: no llama al alta del servidor', t5.falla($$select guardar_registro('{"proveedor":"openalex","id_externo":"W9","identificadores":{"openalex":"W9"},"titulo":"Algo"}'::jsonb)$$));
select t5.ok('redactora: no cambia los datos de una publicación', t5.falla(format($$update publicaciones set titulo = 'otro' where id = %L$$, (select val from t5.v where k = 'p1'))));
select t5.ok('redactora: no fija la licencia', t5.falla(format($$select registrar_licencia(%L, '[{"origen":"manual","texto":"cc-by"}]'::jsonb, %L)$$, (select val from t5.v where k = 'p1'), 'b0000000-0000-0000-0000-000000000002')));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'bbbbbbbb-5555-0000-0000-000000000001', false);
select t5.ok('maestra: no ve publicaciones', t5.filas('select 1 from publicaciones') = 0);
select t5.ok('maestra: no ve licencias', t5.filas('select 1 from licencias') = 0);
select t5.ok('maestra: no ve registros crudos', t5.filas('select 1 from registros_crudos') = 0);
select t5.ok('maestra: no ve pasajes a revisar', t5.filas('select 1 from pasajes_a_revisar') = 0);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'bbbbbbbb-5555-0000-0000-000000000002', false), set_config('request.jwt.claims', format('{"sub":"%s","app_metadata":{"rol":"alumno"}}', 'bbbbbbbb-5555-0000-0000-000000000002'), false);
select t5.ok('alumno: no ve publicaciones', t5.filas('select 1 from publicaciones') = 0);
reset role;
select set_config('request.jwt.claims', '', false);
set local role anon; select set_config('request.jwt.claim.sub', '', false);
select t5.ok('sin sesión: no lee publicaciones', t5.filas('select 1 from publicaciones') = -1);
select t5.ok('sin sesión: no lee licencias', t5.filas('select 1 from licencias') = -1);
reset role;

-- =====================================================================
-- Licencias
-- =====================================================================
set local role service_role;
select t5.ok('licencia: dos señales iguales', registrar_licencia((select val from t5.v where k = 'p1')::uuid, '[{"origen":"openalex","texto":"cc-by"},{"origen":"europepmc","texto":"CC BY"}]'::jsonb) = 'cc-by');
select t5.ok('licencia: si coinciden no hay que revisarla', (select not licencia_revisar from publicaciones where id = (select val from t5.v where k = 'p1')::uuid)
  and (select count(*) from verificaciones_licencia where publicacion_id = (select val from t5.v where k = 'p1')::uuid and resultado = 'coincide') = 2);
select t5.ok('licencia: si no coinciden gana la más restrictiva', registrar_licencia((select val from t5.v where k = 'p3')::uuid, '[{"origen":"openalex","texto":"cc-by"},{"origen":"europepmc","texto":"cc by-nc"}]'::jsonb) = 'cc-by-nc');
select t5.ok('licencia: y queda marcada para revisar', (select licencia_revisar from publicaciones where id = (select val from t5.v where k = 'p3')::uuid));
select t5.ok('licencia: sin señales es desconocida', registrar_licencia((select val from t5.v where k = 'p5')::uuid, '[]'::jsonb) = 'desconocida');
select t5.ok('licencia: un origen inventado no vale', t5.falla(format($$select registrar_licencia(%L, '[{"origen":"wikipedia","texto":"cc-by"}]'::jsonb)$$, (select val from t5.v where k = 'p5'))));
select t5.ok('licencia a mano: la fija una validadora', registrar_licencia((select val from t5.v where k = 'p3')::uuid, '[{"origen":"manual","texto":"cc-by"}]'::jsonb, 'b0000000-0000-0000-0000-000000000003'::uuid) = 'cc-by');
select t5.ok('licencia a mano: lo automático no la pisa', registrar_licencia((select val from t5.v where k = 'p3')::uuid, '[{"origen":"europepmc","texto":"cc by-nc"}]'::jsonb) = 'cc-by');
-- (en otra sentencia: una subconsulta en la misma ve la foto de antes del cambio)
select t5.ok('licencia a mano: si lo automático no coincide, avisa', (select licencia_codigo = 'cc-by' and licencia_revisar from publicaciones where id = (select val from t5.v where k = 'p3')::uuid));
reset role;
select t5.ok('verificaciones: no se editan (ni el dueño de la base)', t5.falla($$update verificaciones_licencia set resultado = 'coincide'$$));

-- =====================================================================
-- Revisión de publicaciones
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('redactora: manda una publicación a revisión', t5.afecta(format($$update publicaciones set estado = 'en_revision' where id = %L$$, (select val from t5.v where k = 'p1'))) = 1);
select t5.ok('redactora: no la aprueba ella', t5.falla(format($$update publicaciones set estado = 'aprobada' where id = %L$$, (select val from t5.v where k = 'p1'))));
reset role;
insert into t5.v (k, val) select 'hp1', (huella)::text from publicaciones where id = (select val from t5.v where k = 'p1')::uuid;
select t5.ok('en revisión: tiene huella y fecha de envío', (select val from t5.v where k = 'hp1') ~ '^[0-9a-f]{64}$' and (select enviada_en is not null from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
set local role service_role;
select t5.ok('servidor: no aprueba una que está en revisión', t5.falla(format($$update publicaciones set estado = 'aprobada' where id = %L$$, (select val from t5.v where k = 'p1'))));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('redactora: no revisa publicaciones', t5.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'aprobar', %L)$$, (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'hp1'))));
reset role;
set local role service_role;
select guardar_registro($j${"proveedor":"openalex","id_externo":"W100","identificadores":{"openalex":"W100"},"titulo":"Dengue virus envelope protein dynamics in human cells","crudo":{"id":"https://openalex.org/W100","v":2}}$j$::jsonb);
reset role;
insert into t5.v (k, val) select 'hp1b', (huella)::text from publicaciones where id = (select val from t5.v where k = 'p1')::uuid;
select t5.ok('en revisión: si llega un dato nuevo cambia la huella', (select val from t5.v where k = 'hp1b') <> (select val from t5.v where k = 'hp1')
  and exists (select 1 from eventos_editoriales where accion = 'actualizar_en_revision' and entidad_id = (select val from t5.v where k = 'p1')::uuid));
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
select t5.ok('validadora: con los datos viejos no aprueba', t5.error(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'aprobar', %L)$$, (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'hp1'))) like '%cambiaron%');
select t5.ok('validadora: rechazar sin comentario no vale', t5.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'rechazar', %L)$$, (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'hp1b'))));
select t5.ok('validadora: aprueba lo que está viendo', t5.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'aprobar', %L)$$, (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'hp1b'))) = 1);
select t5.ok('aprobada: no se aprueba dos veces', t5.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'aprobar', %L)$$, (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'hp1b'))));
reset role;
select t5.ok('aprobada: estado, fecha y ya no vence', (select estado = 'aprobada' and decidida_en is not null and vence_en is null from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('aprobada: la revisión guarda la licencia y no es autoaprobada', (select licencia_al_aprobar = 'cc-by' and not autoaprobada from revisiones
  where objeto = 'publicacion' and objeto_id = (select val from t5.v where k = 'p1')::uuid and decision = 'aprobar'));
set local role service_role;
select guardar_registro($j${"proveedor":"openalex","id_externo":"W100","identificadores":{"openalex":"W100"},"titulo":"Un título distinto","citas":20,"crudo":{"id":"https://openalex.org/W100","v":3}}$j$::jsonb);
reset role;
select t5.ok('aprobada: OpenAlex ya no le cambia el título, sí las citas', (select titulo = 'Dengue virus envelope protein dynamics in human cells' and citas = 20 from publicaciones where id = (select val from t5.v where k = 'p1')::uuid));
select t5.ok('aprobada: ni el dueño de la base le cambia el título', t5.falla(format($$update publicaciones set titulo = 'x' where id = %L$$, (select val from t5.v where k = 'p1'))));

-- Pedir cambios: vuelve a candidata; se reenvía y aprueba otra validadora
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
update publicaciones set estado = 'en_revision' where id = (select val from t5.v where k = 'p5')::uuid;
reset role;
insert into t5.v (k, val) select 'hp5', (huella)::text from publicaciones where id = (select val from t5.v where k = 'p5')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
insert into revisiones (objeto, objeto_id, decision, huella_revisada, comentario) values ('publicacion', (select val from t5.v where k = 'p5')::uuid, 'pedir_cambios', (select val from t5.v where k = 'hp5'), 'Revisar la licencia en la página de la revista');
reset role;
select t5.ok('pedir cambios: vuelve a candidata, sin huella', (select estado = 'candidata' and huella is null from publicaciones where id = (select val from t5.v where k = 'p5')::uuid));
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
update publicaciones set estado = 'en_revision' where id = (select val from t5.v where k = 'p5')::uuid;
reset role;
insert into t5.v (k, val) select 'hp5b', (huella)::text from publicaciones where id = (select val from t5.v where k = 'p5')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000004', false);
select t5.ok('otra validadora aprueba la que agregó una validadora', t5.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'aprobar', %L)$$, (select val from t5.v where k = 'p5'), (select val from t5.v where k = 'hp5b'))) = 1);
reset role;

-- =====================================================================
-- Citas en las fichas
-- =====================================================================
-- Ficha A: cita textual de p1 (aprobada, cc-by)
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into fichas (slug, formato) values ('b-dengue-envoltura', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'El virus del dengue tiene una envoltura que cambia de forma para entrar a las células.' from fichas where slug = 'b-dengue-envoltura';
reset role;
insert into t5.v (k, val) select 'fa', (id)::text from fichas where slug = 'b-dengue-envoltura';
insert into t5.v (k, val) select 'va', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'b-dengue-envoltura';
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('cita textual: con licencia cc-by se puede', t5.afecta(format($$insert into version_fuentes (version_id, publicacion_id, pasaje, pasaje_textual, ubicacion) values (%L, %L, 'The envelope protein of dengue virus changes shape.', true, 'Resumen')$$, (select val from t5.v where k = 'va'), (select val from t5.v where k = 'p1'))) = 1);
select t5.ok('cita textual: más de 60 palabras no', t5.error(format($$update version_fuentes set pasaje = repeat('word ', 61) where version_id = %L$$, (select val from t5.v where k = 'va'))) like '%60 palabras%');
select t5.ok('ficha que cita una publicación aprobada: se envía', t5.afecta(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val from t5.v where k = 'va'))) = 1);
reset role;
insert into t5.v (k, val) select 'hva', (huella)::text from ficha_versiones where id = (select val from t5.v where k = 'va')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', (select val from t5.v where k = 'va')::uuid, 'aprobar', (select val from t5.v where k = 'hva'));
reset role;
set local role service_role;
insert into fragmentos (ficha_id, version_id, tipo, texto) values ((select val from t5.v where k = 'fa')::uuid, (select val from t5.v where k = 'va')::uuid, 'dato', 'El virus del dengue tiene una envoltura que cambia de forma.');
reset role;
select t5.ok('ficha A: publicada e indexada', (select estado from fichas where id = (select val from t5.v where k = 'fa')::uuid) = 'publicada' and exists (select 1 from fragmentos where ficha_id = (select val from t5.v where k = 'fa')::uuid and activo));

-- Ficha D: cita p1 y además un libro
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into fuentes (tipo, cita) values ('libro', 'Libro de virología para docentes, 2024');
insert into fichas (slug, formato) values ('b-dengue-mosquito', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'El dengue lo contagia un mosquito y el virus tiene una envoltura.' from fichas where slug = 'b-dengue-mosquito';
reset role;
insert into t5.v (k, val) select 'fd', (id)::text from fichas where slug = 'b-dengue-mosquito';
insert into t5.v (k, val) select 'vd', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'b-dengue-mosquito';
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values ((select val from t5.v where k = 'vd')::uuid, (select val from t5.v where k = 'p1')::uuid, 'Introducción', 'La envoltura del virus cambia de forma.');
insert into version_fuentes (version_id, fuente_id, ubicacion) select (select val from t5.v where k = 'vd')::uuid, id, 'Capítulo 3' from fuentes where cita = 'Libro de virología para docentes, 2024';
update ficha_versiones set estado = 'en_revision' where id = (select val from t5.v where k = 'vd')::uuid;
reset role;
insert into t5.v (k, val) select 'hvd', (huella)::text from ficha_versiones where id = (select val from t5.v where k = 'vd')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', (select val from t5.v where k = 'vd')::uuid, 'aprobar', (select val from t5.v where k = 'hvd'));
reset role;

-- Ficha B: cita p5 (aprobada, licencia desconocida)
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into fichas (slug, formato) values ('b-suelo-antartico', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'En el suelo de la Antártida viven bacterias que resisten antibióticos.' from fichas where slug = 'b-suelo-antartico';
reset role;
insert into t5.v (k, val) select 'vb', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'b-suelo-antartico';
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('cita textual: con licencia desconocida no se copia', t5.error(format($$insert into version_fuentes (version_id, publicacion_id, pasaje, pasaje_textual, ubicacion) values (%L, %L, 'Soil bacteria resist antibiotics.', true, 'Resumen')$$, (select val from t5.v where k = 'vb'), (select val from t5.v where k = 'p5'))) like '%no permite copiar%');
select t5.ok('cita sin copiar: dónde está y una paráfrasis', t5.afecta(format($$insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values (%L, %L, 'Resultados, figura 2', 'Las bacterias del suelo antártico resisten varios antibióticos.')$$, (select val from t5.v where k = 'vb'), (select val from t5.v where k = 'p5'))) = 1);
select t5.ok('cita sin ubicación: no se envía', t5.error(format($$update version_fuentes set ubicacion = '' where version_id = %L$$, (select val from t5.v where k = 'vb'))) = ''
  and t5.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val from t5.v where k = 'vb'))) like '%dónde está%');
update version_fuentes set ubicacion = 'Resultados, figura 2' where version_id = (select val from t5.v where k = 'vb')::uuid;
reset role;
set local role service_role;
select registrar_licencia((select val from t5.v where k = 'p5')::uuid, '[{"origen":"manual","texto":"cc-by-nc"}]'::jsonb, 'b0000000-0000-0000-0000-000000000003'::uuid);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', false);
select t5.ok('admin: cambia la política (no comercial pasa a breve)', t5.afecta($$update licencias set pasaje = 'breve' where codigo = 'cc-by-nc'$$) = 1);
reset role;
select t5.ok('política: el cambio queda en el registro', exists (select 1 from eventos_editoriales where accion = 'editar_licencia' and despues ->> 'codigo' = 'cc-by-nc'));
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('cita breve: más de 25 palabras no', t5.error(format($$update version_fuentes set pasaje = repeat('word ', 26), pasaje_textual = true where version_id = %L$$, (select val from t5.v where k = 'vb'))) like '%25 palabras%');
select t5.ok('cita breve: hasta 25 palabras sí', t5.afecta(format($$update version_fuentes set pasaje = 'Soil bacteria from Antarctica resist several antibiotics.', pasaje_textual = true where version_id = %L$$, (select val from t5.v where k = 'vb'))) = 1);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', false);
update licencias set pasaje = 'solo_ubicacion' where codigo = 'cc-by-nc';
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('la licencia se endurece: la cita aparece para revisar', t5.filas(format($$select 1 from pasajes_a_revisar where version_id = %L$$, (select val from t5.v where k = 'vb'))) = 1);
select t5.ok('la licencia se endurece: así la ficha no se envía', t5.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val from t5.v where k = 'vb'))) like '%ya no permite%');
update version_fuentes set pasaje = '', pasaje_textual = false where version_id = (select val from t5.v where k = 'vb')::uuid;
select t5.ok('pasada a paráfrasis: se envía', t5.afecta(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val from t5.v where k = 'vb'))) = 1);
reset role;

-- Ficha C: cita p3, que todavía es candidata
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into fichas (slug, formato) values ('b-preprint', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'Un preprint es un artículo que todavía no revisaron otros científicos.' from fichas where slug = 'b-preprint';
reset role;
insert into t5.v (k, val) select 'vc', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'b-preprint';
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values ((select val from t5.v where k = 'vc')::uuid, (select val from t5.v where k = 'p3')::uuid, 'Resumen', 'Es una versión previa del artículo.');
select t5.ok('ficha que cita una publicación sin aprobar: no se envía', t5.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val from t5.v where k = 'vc'))) like '%no está aprobada%');
reset role;

-- =====================================================================
-- Retirar una publicación
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('redactora: no retira publicaciones', t5.falla(format($$update publicaciones set estado = 'retirada', motivo_retiro = 'no sirve más' where id = %L$$, (select val from t5.v where k = 'p1'))));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
select t5.ok('validadora: retirar exige motivo', t5.falla(format($$update publicaciones set estado = 'retirada' where id = %L$$, (select val from t5.v where k = 'p1'))));
select t5.ok('validadora: retira con motivo', t5.afecta(format($$update publicaciones set estado = 'retirada', motivo_retiro = 'Hay un artículo más nuevo que lo corrige' where id = %L$$, (select val from t5.v where k = 'p1'))) = 1);
reset role;
select t5.ok('retiro: la ficha que solo tenía esa fuente se retira', (select estado = 'retirada' and motivo_retiro like 'Se retiró la publicación que la respaldaba%' from fichas where id = (select val from t5.v where k = 'fa')::uuid));
select t5.ok('retiro: y sale del índice del asistente', not exists (select 1 from fragmentos where ficha_id = (select val from t5.v where k = 'fa')::uuid and activo));
select t5.ok('retiro: la ficha que tiene otra fuente sigue publicada, con aviso', (select estado from fichas where id = (select val from t5.v where k = 'fd')::uuid) = 'publicada'
  and exists (select 1 from eventos_editoriales where accion = 'fuente_retirada' and entidad_id = (select val from t5.v where k = 'fd')::uuid));
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', false);
select t5.ok('admin: también retira publicaciones', t5.afecta(format($$update publicaciones set estado = 'retirada', motivo_retiro = 'Se duplicó con otra fuente' where id = %L$$, (select val from t5.v where k = 'p5'))) = 1);
reset role;
select t5.ok('retiro: la ficha en revisión que la citaba vuelve a borrador', (select estado = 'borrador' and huella is null from ficha_versiones where id = (select val from t5.v where k = 'vb')::uuid));

-- =====================================================================
-- Retractaciones
-- =====================================================================
set local role service_role;
select guardar_registro($j${"proveedor":"europepmc","id_externo":"PPR:PPR123","identificadores":{"europepmc":"PPR:PPR123"},"titulo":"Dengue virus envelope protein dynamics","retractada":true,"crudo":{"id":"PPR123","retractada":true}}$j$::jsonb);
select t5.ok('una retractación no se deshace', t5.error(format($$update publicaciones set retractada = false where id = %L$$, (select val from t5.v where k = 'p3'))) like '%no se deshace%');
reset role;
select t5.ok('retractada: queda marcada y registrada', (select retractada from publicaciones where id = (select val from t5.v where k = 'p3')::uuid)
  and exists (select 1 from eventos_editoriales where accion = 'retractada' and entidad_id = (select val from t5.v where k = 'p3')::uuid));
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
update publicaciones set estado = 'en_revision' where id = (select val from t5.v where k = 'p3')::uuid;
reset role;
insert into t5.v (k, val) select 'hp3', (huella)::text from publicaciones where id = (select val from t5.v where k = 'p3')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
select t5.ok('retractada: no se aprueba', t5.error(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', %L, 'aprobar', %L)$$, (select val from t5.v where k = 'p3'), (select val from t5.v where k = 'hp3'))) like '%retractada%');
select t5.ok('validadora: la rechaza con comentario', t5.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada, comentario) values ('publicacion', %L, 'rechazar', %L, 'Fue retractada')$$, (select val from t5.v where k = 'p3'), (select val from t5.v where k = 'hp3'))) = 1);
reset role;
select t5.ok('rechazada: se borra su resumen interno', (select estado = 'rechazada' and resumen_interno is null from publicaciones where id = (select val from t5.v where k = 'p3')::uuid));

-- p6: la agrega una validadora, la aprueba ella misma, la cita una ficha y después se retracta
set local role service_role;
insert into t5.v (k, val) select 'p6', (guardar_registro($j${"proveedor":"openalex","id_externo":"W600","identificadores":{"openalex":"W600"},"titulo":"Mosquito saliva and dengue transmission","anio":2021,"tipo":"articulo","crudo":{"id":"W600"}}$j$::jsonb, null, 'b0000000-0000-0000-0000-000000000003'::uuid) ->> 'publicacion_id')::text;
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
update publicaciones set estado = 'en_revision' where id = (select val from t5.v where k = 'p6')::uuid;
reset role;
insert into t5.v (k, val) select 'hp6', (huella)::text from publicaciones where id = (select val from t5.v where k = 'p6')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('publicacion', (select val from t5.v where k = 'p6')::uuid, 'aprobar', (select val from t5.v where k = 'hp6'));
reset role;
select t5.ok('la validadora aprueba la que agregó ella: queda marcada', (select autoaprobada from revisiones where objeto = 'publicacion' and objeto_id = (select val from t5.v where k = 'p6')::uuid and decision = 'aprobar'));
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into fichas (slug, formato) values ('b-saliva', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'La saliva del mosquito ayuda al virus del dengue a entrar en el cuerpo.' from fichas where slug = 'b-saliva';
reset role;
insert into t5.v (k, val) select 'fe', (id)::text from fichas where slug = 'b-saliva';
insert into t5.v (k, val) select 've', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'b-saliva';
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values ((select val from t5.v where k = 've')::uuid, (select val from t5.v where k = 'p6')::uuid, 'Discusión', 'La saliva facilita la infección.');
update ficha_versiones set estado = 'en_revision' where id = (select val from t5.v where k = 've')::uuid;
reset role;
insert into t5.v (k, val) select 'hve', (huella)::text from ficha_versiones where id = (select val from t5.v where k = 've')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000004', false);
insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', (select val from t5.v where k = 've')::uuid, 'aprobar', (select val from t5.v where k = 'hve'));
reset role;
set local role service_role;
select guardar_registro($j${"proveedor":"openalex","id_externo":"W600","identificadores":{"openalex":"W600"},"titulo":"Mosquito saliva and dengue transmission","retractada":true,"crudo":{"id":"W600","is_retracted":true}}$j$::jsonb);
reset role;
select t5.ok('aprobada que se retracta: sale de la biblioteca', (select estado = 'retirada' and motivo_retiro = 'La publicación fue retractada' from publicaciones where id = (select val from t5.v where k = 'p6')::uuid));
select t5.ok('aprobada que se retracta: su ficha se retira en el mismo momento', (select estado from fichas where id = (select val from t5.v where k = 'fe')::uuid) = 'retirada');

-- =====================================================================
-- Duplicados, temas y búsquedas guardadas
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('relación: el equipo la descarta', t5.afecta(format($$update publicacion_relaciones set estado = 'descartada' where tipo = 'posible_duplicado' and least(origen_id, destino_id) = least(%L::uuid, %L::uuid) and greatest(origen_id, destino_id) = greatest(%L::uuid, %L::uuid)$$, (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'p3'), (select val from t5.v where k = 'p1'), (select val from t5.v where k = 'p3'))) = 1);
select t5.ok('relación: queda quién la resolvió', exists (select 1 from publicacion_relaciones where estado = 'descartada' and resuelta_por = 'b0000000-0000-0000-0000-000000000002' and resuelta_en is not null));
select t5.ok('relación: ya resuelta no cambia', t5.falla($$update publicacion_relaciones set estado = 'confirmada' where estado = 'descartada'$$));
select t5.ok('relación: el tipo no se cambia', t5.falla($$update publicacion_relaciones set tipo = 'preprint_de'$$));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', false);
insert into temas (slug, nombre) values ('b-virus', 'Virus');
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
select t5.ok('temas: el equipo le pone un tema a una publicación', t5.afecta(format($$insert into publicacion_temas (publicacion_id, tema_id) select %L, id from temas where slug = 'b-virus'$$, (select val from t5.v where k = 'p1'))) = 1);
select t5.ok('búsquedas: la redactora guarda una', t5.afecta($$insert into busquedas_guardadas (nombre, consulta) values ('Dengue B', '{"search": "dengue envelope"}')$$) = 1);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000003', false);
select t5.ok('búsquedas: otra persona no la edita', t5.afecta($$update busquedas_guardadas set activa = false where nombre = 'Dengue B'$$) <= 0);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', false);
select t5.ok('búsquedas: la admin sí', t5.afecta($$update busquedas_guardadas set activa = false where nombre = 'Dengue B'$$) = 1);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'bbbbbbbb-5555-0000-0000-000000000001', false);
select t5.ok('maestra: no ve temas de publicaciones ni búsquedas', t5.filas('select 1 from publicacion_temas') = 0 and t5.filas('select 1 from busquedas_guardadas') = 0);
reset role;

-- =====================================================================
-- Controles generales
-- =====================================================================
select t5.ok('RLS prendido en todas las tablas nuevas', not exists (
  select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity
    and c.relname in ('proveedores_cientificos', 'tipos_identificador', 'busquedas_guardadas', 'ejecuciones_busqueda',
                      'registros_crudos', 'publicaciones', 'publicacion_identificadores', 'publicacion_procedencias',
                      'publicacion_relaciones', 'publicacion_temas', 'publicacion_accesos', 'licencias', 'verificaciones_licencia')));
select t5.ok('alta y licencias: solo las llama el servidor',
  not has_function_privilege('authenticated', 'public.guardar_registro(jsonb, uuid, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.guardar_registro(jsonb, uuid, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.registrar_licencia(uuid, jsonb, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.registrar_licencia(uuid, jsonb, uuid)', 'execute')
  and has_function_privilege('service_role', 'public.guardar_registro(jsonb, uuid, uuid)', 'execute'));
select t5.ok('la API no publica funciones security definer que un usuario pueda llamar (con las nuevas)',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS'
    into total from t5.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\n' order by n)
    into detalle from t5.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\n%', total, detalle;
end $$;

