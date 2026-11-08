-- =====================================================================
-- Pruebas de las migraciones 18 (PubMed en la biblioteca) y 19 (prueba de
-- calidad del asistente), en el Postgres local. Arma su propio equipo y su
-- maestra. Cada prueba imprime OK o FALLA.
-- Para el proyecto real se genera 14-pruebas-pubmed-real.sql con a-real.py.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t13;
create table t13.resultado (n serial, prueba text, ok boolean);
create table t13.v (k text primary key, val text);
grant usage on schema t13 to anon, authenticated, service_role;
grant all on t13.resultado, t13.resultado_n_seq, t13.v to anon, authenticated, service_role;
create function t13.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t13.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t13.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t13.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
grant execute on all functions in schema t13 to anon, authenticated, service_role;

\set PRED '''e1300000-0000-0000-0000-000000000001'''
\set PVAL '''e1300000-0000-0000-0000-000000000002'''
\set PMAE '''e1377777-0000-0000-0000-000000000001'''

-- =====================================================================
-- Preparación: una redactora, una validadora y una maestra
-- =====================================================================
set role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values
  ('p-redactora@pasteur.test', 'redactor', 'Redactora P'), ('p-val@pasteur.test', 'validador', 'Validadora P');
reset role;
insert into auth.users (id, email) values (:PRED, 'p-redactora@pasteur.test'), (:PVAL, 'p-val@pasteur.test');
insert into auth.users (id, email, raw_user_meta_data) values (:PMAE, 'p-maestra@escuela.uy', '{"nombre":"Maestra P"}');
select t13.ok('preparación: equipo y maestra', (select count(*) from equipo where id in (:PRED, :PVAL)) = 2 and exists (select 1 from docentes where id = :PMAE));

-- =====================================================================
-- Migración 18 · PubMed
-- =====================================================================
select t13.ok('catálogo: PubMed está y activo', exists (select 1 from proveedores_cientificos where id = 'pubmed' and activo and url_base like 'https://eutils.ncbi.nlm.nih.gov/%'));

set role service_role;
insert into t13.v (k, val) select 'r1', guardar_registro($j${"proveedor":"pubmed","id_externo":"39990001","identificadores":{"pmid":"39990001","doi":"10.7000/CSL.PUBMED.1","pmcid":"PMC9990001"},"titulo":"CSL test record: nuclear transport in model cells.","anio":2019,"tipo":"revision","revista":"Cold Spring Harb Perspect Biol","autores":[{"nombre":"Ana Paz","apellido":"Paz"}],"mesh":["Cell Nucleus","DNA"],"resumen":"Background: The nucleus stores DNA. Results: Pores control traffic.","crudo":{"pmid":"39990001"}}$j$::jsonb, null, :PRED::uuid)::text;
reset role;
insert into t13.v (k, val) select 'p1', (select val from t13.v where k = 'r1')::jsonb ->> 'publicacion_id';
select t13.ok('alta desde PubMed: publicación nueva con el resumen de PubMed', (select resumen_origen = 'pubmed' and resumen_interno like 'Background: The nucleus%' and tipo = 'revision' from publicaciones where id = (select val from t13.v where k = 'p1')::uuid));
select t13.ok('alta desde PubMed: guarda PMID, DOI y PMC', (select array_agg(tipo || '=' || valor order by tipo) from publicacion_identificadores where publicacion_id = (select val from t13.v where k = 'p1')::uuid)
  = array['doi=10.7000/csl.pubmed.1', 'pmcid=PMC9990001', 'pmid=39990001']);
select t13.ok('alta desde PubMed: los MeSH de PubMed', (select mesh = array['Cell Nucleus', 'DNA'] from publicaciones where id = (select val from t13.v where k = 'p1')::uuid));
select t13.ok('alta desde PubMed: queda la procedencia', exists (select 1 from registros_crudos where proveedor = 'pubmed' and id_externo = '39990001'));

set role service_role;
select guardar_registro($j${"proveedor":"openalex","id_externo":"W99990001","identificadores":{"openalex":"W99990001","doi":"10.7000/csl.pubmed.1"},"titulo":"CSL Test Record: Nuclear Transport in Model Cells","anio":2019,"tipo":"revision","revista":"Cold Spring Harbor Perspectives in Biology","autores":[{"nombre":"Ana M. Paz","apellido":"Paz"},{"nombre":"Luis Gómez","apellido":"Gómez"}],"citas":40,"resumen":"Reconstructed OpenAlex abstract.","crudo":{"id":"W99990001"}}$j$::jsonb);
reset role;
select t13.ok('mismo DOI desde OpenAlex: es la misma publicación', (select count(distinct publicacion_id) from publicacion_identificadores where (tipo, valor) in (('doi', '10.7000/csl.pubmed.1'), ('openalex', 'W99990001'))) = 1);
select t13.ok('OpenAlex no pisa el resumen de PubMed', (select resumen_origen = 'pubmed' and resumen_interno like 'Background:%' from publicaciones where id = (select val from t13.v where k = 'p1')::uuid));
select t13.ok('OpenAlex sigue mandando en título, revista y autores', (select titulo = 'CSL Test Record: Nuclear Transport in Model Cells' and revista = 'Cold Spring Harbor Perspectives in Biology' and jsonb_array_length(autores) = 2 and citas = 40
  from publicaciones where id = (select val from t13.v where k = 'p1')::uuid));

set role service_role;
select guardar_registro($j${"proveedor":"europepmc","id_externo":"MED:39990001","identificadores":{"europepmc":"MED:39990001","pmid":"39990001"},"titulo":"CSL test record: nuclear transport in model cells.","mesh":["Cell Nucleus"],"resumen":"Europe PMC abstract.","crudo":{"id":"39990001","source":"MED"}}$j$::jsonb);
reset role;
select t13.ok('Europe PMC también manda en el resumen (vale el último de los dos)', (select resumen_origen = 'europepmc' from publicaciones where id = (select val from t13.v where k = 'p1')::uuid));
set role service_role;
select guardar_registro($j${"proveedor":"pubmed","id_externo":"39990001","identificadores":{"pmid":"39990001"},"titulo":"CSL test record: nuclear transport in model cells.","mesh":["Cell Nucleus","DNA"],"resumen":"Background: The nucleus stores DNA. Results: Pores control traffic.","crudo":{"pmid":"39990001"}}$j$::jsonb);
reset role;
select t13.ok('PubMed al final: queda su resumen (el orden con que guarda el servidor)', (select resumen_origen = 'pubmed' and resumen_interno like 'Background:%' and mesh = array['Cell Nucleus', 'DNA']
  from publicaciones where id = (select val from t13.v where k = 'p1')::uuid));
select t13.ok('las tres fuentes en una sola publicación', (select count(distinct proveedor) from registros_crudos where id_externo in ('39990001', 'W99990001', 'MED:39990001')) = 3
  and (select count(*) from publicaciones where titulo_normalizado = (select titulo_normalizado from publicaciones where id = (select val from t13.v where k = 'p1')::uuid)) = 1);

-- Una publicación que ya estaba con el resumen de OpenAlex: PubMed lo reemplaza
set role service_role;
insert into t13.v (k, val) select 'r2', guardar_registro($j${"proveedor":"openalex","id_externo":"W99990002","identificadores":{"openalex":"W99990002","pmid":"39990002"},"titulo":"CSL test record: how bacteria store their DNA","anio":2020,"tipo":"articulo","resumen":"OpenAlex text.","crudo":{"id":"W99990002"}}$j$::jsonb)::text;
select guardar_registro($j${"proveedor":"pubmed","id_externo":"39990002","identificadores":{"pmid":"39990002"},"titulo":"CSL test record: how bacteria store their DNA.","resumen":"Bacteria keep their DNA in the nucleoid.","crudo":{"pmid":"39990002"}}$j$::jsonb);
reset role;
select t13.ok('resumen de OpenAlex: PubMed lo reemplaza', (select resumen_origen = 'pubmed' and resumen_interno = 'Bacteria keep their DNA in the nucleoid.'
  from publicaciones where id = ((select val from t13.v where k = 'r2')::jsonb ->> 'publicacion_id')::uuid));

select t13.ok('resumen: solo de fuentes conocidas', t13.falla($$update publicaciones set resumen_origen = 'wikipedia' where id = (select val from t13.v where k = 'p1')::uuid$$));
select t13.ok('alta: un PMID mal escrito no entra', t13.falla($$select guardar_registro('{"proveedor":"pubmed","id_externo":"abc","identificadores":{"pmid":"abc"},"titulo":"Algo"}'::jsonb)$$));
set role service_role;
select t13.ok('licencia: una señal de PubMed se acepta', t13.falla($$select registrar_licencia((select val from t13.v where k = 'p1')::uuid, '[{"origen":"pubmed","texto":"cc-by"}]'::jsonb)$$) = false);
select t13.ok('bitácora: una búsqueda en PubMed se anota', t13.afecta($$insert into ejecuciones_busqueda (proveedor, consulta_enviada, estado) values ('pubmed', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=nucleus&tool=ciencia-sin-limites', 'ok')$$) = 1);
select t13.ok('bitácora: nunca con la clave de NCBI', t13.falla($$insert into ejecuciones_busqueda (proveedor, consulta_enviada, estado) values ('pubmed', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?term=x&api_key=123', 'ok')$$));
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :PRED, false);
select t13.ok('redactora: no puede guardar registros directo', t13.falla($$select guardar_registro('{"proveedor":"pubmed","id_externo":"39990003","identificadores":{"pmid":"39990003"},"titulo":"Algo"}'::jsonb)$$));
select t13.ok('redactora: ve el resumen de PubMed en la biblioteca', (select resumen_origen from publicaciones where id = (select val from t13.v where k = 'p1')::uuid) = 'pubmed');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :PMAE, false);
select t13.ok('maestra: no ve la biblioteca', (select count(*) from publicaciones) = 0);
reset role;

-- =====================================================================
-- Migración 19 · Prueba de calidad del asistente
-- =====================================================================
set role service_role;
insert into pruebas_asistente (corrida, orden, pedida_por, grupo, consulta, ancla, resultado, parecidas, similitud, eleccion, correcta, encontrada)
values ('e1300000-aaaa-0000-0000-000000000001', 0, :PRED, 'trampa', '¿Las bacterias tienen núcleo?', '¿Las bacterias tienen núcleo?', 'parecidas', '{}', 0.81, 0, true, null),
       ('e1300000-aaaa-0000-0000-000000000001', 1, :PRED, 'otro_tema', '¿Por qué el cielo es azul?', null, 'nada', '{}', null, null, true, null);
select t13.ok('prueba: un grupo que no existe no entra', t13.falla($$insert into pruebas_asistente (corrida, grupo, consulta, resultado, correcta) values (gen_random_uuid(), 'otro', 'x', 'nada', true)$$));
select t13.ok('prueba: un resultado que no existe no entra', t13.falla($$insert into pruebas_asistente (corrida, grupo, consulta, resultado, correcta) values (gen_random_uuid(), 'trampa', 'x', 'quizas', true)$$));
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :PRED, false);
select t13.ok('equipo: ve las pruebas', (select count(*) from pruebas_asistente where corrida = 'e1300000-aaaa-0000-0000-000000000001') = 2);
select t13.ok('equipo: no carga resultados a mano', t13.falla($$insert into pruebas_asistente (corrida, grupo, consulta, resultado, correcta) values (gen_random_uuid(), 'trampa', 'x', 'nada', true)$$));
select t13.ok('equipo: no cambia resultados', t13.afecta($$update pruebas_asistente set correcta = false$$) <= 0);
select t13.ok('equipo: no borra resultados', t13.afecta($$delete from pruebas_asistente$$) <= 0);
reset role;
select t13.ok('prueba: los resultados siguen intactos', (select count(*) from pruebas_asistente where corrida = 'e1300000-aaaa-0000-0000-000000000001' and correcta) = 2);
set role authenticated; select set_config('request.jwt.claim.sub', :PMAE, false);
select t13.ok('maestra: no ve las pruebas', (select count(*) from pruebas_asistente) = 0);
reset role;
set role anon;
select t13.ok('visitante: nada', t13.falla($$select count(*) from pruebas_asistente$$));
reset role;
select t13.ok('prueba: sin datos de maestras ni de chicos', not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pruebas_asistente'
  and (column_name like '%docente%' or column_name like '%aula%' or column_name like '%alumno%')));

select t13.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

\o
\pset footer off
select case when ok then 'OK   ' else 'FALLA' end as " ", prueba from t13.resultado order by n;
select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS' as "pubmed y prueba del asistente" from t13.resultado;
