-- =====================================================================
-- Pruebas de la migración 15 (respuestas redactadas con IA), en el
-- Postgres local. Arma su propio equipo, su maestra y sus artículos.
-- Cada prueba imprime OK o FALLA.
-- Para el proyecto real se genera 8-pruebas-respuestas-ia-real.sql con
-- a-real.py (misma lógica, en una transacción que se deshace).
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t7;
create table t7.resultado (n serial, prueba text, ok boolean);
create table t7.v (k text primary key, val text);
grant usage on schema t7 to anon, authenticated, service_role;
grant all on t7.resultado, t7.resultado_n_seq, t7.v to anon, authenticated, service_role;
create function t7.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t7.error(sql text) returns text language plpgsql as $$
begin execute sql; return ''; exception when others then return sqlerrm; end $$;
create function t7.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t7.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t7.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
grant execute on all functions in schema t7 to anon, authenticated, service_role;

\set CADM  '''c7000000-0000-0000-0000-000000000001'''
\set CRED  '''c7000000-0000-0000-0000-000000000002'''
\set CVAL  '''c7000000-0000-0000-0000-000000000003'''
\set CVAL2 '''c7000000-0000-0000-0000-000000000004'''
\set CMAE  '''c7777777-0000-0000-0000-000000000001'''

-- =====================================================================
-- Equipo, maestra y artículos de estas pruebas
-- =====================================================================
set role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values
  ('c-admin@pasteur.test', 'admin', 'Admin C'), ('c-redactora@pasteur.test', 'redactor', 'Redactora C'),
  ('c-val@pasteur.test', 'validador', 'Validadora C'), ('c-val2@pasteur.test', 'validador', 'Validadora C2');
reset role;
insert into auth.users (id, email) values (:CADM, 'c-admin@pasteur.test'), (:CRED, 'c-redactora@pasteur.test'),
  (:CVAL, 'c-val@pasteur.test'), (:CVAL2, 'c-val2@pasteur.test');
insert into auth.users (id, email, raw_user_meta_data) values (:CMAE, 'c-maestra@escuela.uy', '{"nombre":"Maestra C"}');

set role service_role;
select (guardar_registro($j${"proveedor":"openalex","id_externo":"W7001","identificadores":{"openalex":"W7001","doi":"10.7000/cel.1"},"titulo":"How cells divide: a review","anio":2021,"tipo":"revision","revista":"Cell Reviews","autores":[{"nombre":"Ana Ruiz","apellido":"Ruiz"}],"resumen":"Cells divide to grow and to repair tissues. Before dividing, a cell copies its DNA.","crudo":{"id":"W7001"}}$j$::jsonb, null, :CRED::uuid) ->> 'publicacion_id') as q1 \gset
select (guardar_registro($j${"proveedor":"openalex","id_externo":"W7002","identificadores":{"openalex":"W7002"},"titulo":"Mitosis in human skin","anio":2019,"tipo":"articulo","autores":[{"nombre":"Luis Sosa","apellido":"Sosa"}],"resumen":"Skin cells divide often. Old skin cells are replaced every few weeks.","crudo":{"id":"W7002"}}$j$::jsonb, null, :CRED::uuid) ->> 'publicacion_id') as q2 \gset
select (guardar_registro($j${"proveedor":"openalex","id_externo":"W7003","identificadores":{"openalex":"W7003"},"titulo":"Cell cycle checkpoints","anio":2020,"tipo":"articulo","autores":[{"nombre":"Rosa Paz","apellido":"Paz"}],"resumen":"Checkpoints stop the cell cycle when DNA is damaged.","crudo":{"id":"W7003"}}$j$::jsonb, null, :CRED::uuid) ->> 'publicacion_id') as q3 \gset
select (guardar_registro($j${"proveedor":"openalex","id_externo":"W7004","identificadores":{"openalex":"W7004"},"titulo":"Stem cells in the gut","anio":2022,"tipo":"articulo","autores":[{"nombre":"Eva Lima","apellido":"Lima"}],"resumen":"Stem cells in the gut make new cells every day.","crudo":{"id":"W7004"}}$j$::jsonb, null, :CRED::uuid) ->> 'publicacion_id') as q4 \gset
select registrar_licencia(:'q1'::uuid, '[{"origen":"openalex","texto":"cc-by"}]'::jsonb, :CRED::uuid);
reset role;
select t7.ok('preparación: equipo de cuatro y cuatro artículos candidatos', (select count(*) from equipo where id in (:CADM, :CRED, :CVAL, :CVAL2)) = 4
  and (select count(*) from publicaciones where id in (:'q1'::uuid, :'q2'::uuid, :'q3'::uuid, :'q4'::uuid) and estado = 'candidata') = 4);

-- La redactora (o el servidor por ella) manda a revisión los artículos 1, 2 y 4; el 3 queda candidato
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
update publicaciones set estado = 'en_revision' where id in (:'q1'::uuid, :'q2'::uuid, :'q4'::uuid);
reset role;

-- =====================================================================
-- La marca de IA
-- =====================================================================
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into fichas (slug, formato, actividad) values ('c-por-que-se-dividen', 'pregunta', 'a3');
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil, asistida_por_ia, nota_interna)
  select id, '¿Por qué se dividen las células?',
         'Las células se dividen para que el cuerpo crezca y para reparar tejidos. Antes de dividirse copian su ADN.',
         'Tus células se dividen para que crezcas y para arreglar lo que se lastima. Antes, cada una copia su ADN, como quien fotocopia un manual.',
         true, 'Redactada con IA (prueba)'
    from fichas where slug = 'c-por-que-se-dividen';
reset role;
select v.id as va from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'c-por-que-se-dividen' \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
select t7.ok('marca IA: la autora no la saca', t7.error(format($$update ficha_versiones set asistida_por_ia = false where id = %L$$, :'va')) like '%queda marcada%');
select t7.ok('marca IA: sí puede corregir el texto', t7.afecta(format($$update ficha_versiones set version_infantil = version_infantil || ' ¡Pasa todo el tiempo!' where id = %L$$, :'va')) = 1);
reset role;
select t7.ok('marca IA: ni el dueño de la base la saca', t7.error(format($$update ficha_versiones set asistida_por_ia = false where id = %L$$, :'va')) like '%queda marcada%');

-- =====================================================================
-- A revisión con artículos que también esperan revisión
-- =====================================================================
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into version_fuentes (version_id, publicacion_id, pasaje, pasaje_textual, ubicacion, parafrasis, orden)
  values (:'va'::uuid, :'q1'::uuid, 'Cells divide to grow and to repair tissues.', true, 'Resumen, oración 1', 'Las células se dividen para crecer y reparar tejidos.', 1);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis, orden)
  values (:'va'::uuid, :'q2'::uuid, 'Resumen, oración 2', 'Las células viejas de la piel se reemplazan cada pocas semanas.', 2);
select t7.ok('a revisión: con artículos esperando revisión se puede', t7.afecta(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, :'va')) = 1);
reset role;

set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into fichas (slug, formato, actividad) values ('c-controles', 'pregunta', 'a3');
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil, asistida_por_ia)
  select id, '¿La célula se da cuenta si algo sale mal?', 'Los puntos de control frenan el ciclo celular cuando el ADN está dañado.',
         'Sí: la célula tiene controles que frenan todo si su ADN se rompe.', true
    from fichas where slug = 'c-controles';
reset role;
select v.id as vc from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'c-controles' \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values (:'vc'::uuid, :'q3'::uuid, 'Resumen, oración 1', 'Los controles frenan el ciclo si el ADN está dañado.');
select t7.ok('a revisión: con un artículo todavía candidato no se puede', t7.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, :'vc')) like '%no está aprobada%');
reset role;

select huella as hva from ficha_versiones where id = :'va'::uuid \gset
select huella as hq1 from publicaciones where id = :'q1'::uuid \gset
select huella as hq2 from publicaciones where id = :'q2'::uuid \gset

-- =====================================================================
-- Aprobar
-- =====================================================================
set role authenticated; select set_config('request.jwt.claim.sub', :CVAL, false);
select t7.ok('validadora: aprobar solo la ficha no alcanza (faltan sus artículos)', t7.error(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, :'va', :'hva')) like '%todavía no están aprobados%');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
select t7.ok('redactora: no aprueba todo junto', t7.error(format($$select aprobar_con_articulos(%L, %L, %L::jsonb)$$, :'va', :'hva', jsonb_build_object(:'q1', :'hq1', :'q2', :'hq2')::text)) like '%solo una validadora%');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :CADM, false);
select t7.ok('admin: no aprueba todo junto', t7.falla(format($$select aprobar_con_articulos(%L, %L, %L::jsonb)$$, :'va', :'hva', jsonb_build_object(:'q1', :'hq1', :'q2', :'hq2')::text)));
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :CMAE, false);
select t7.ok('maestra: no aprueba todo junto', t7.falla(format($$select aprobar_con_articulos(%L, %L, %L::jsonb)$$, :'va', :'hva', jsonb_build_object(:'q1', :'hq1', :'q2', :'hq2')::text)));
reset role;

set role authenticated; select set_config('request.jwt.claim.sub', :CVAL, false);
select t7.ok('validadora: con la huella de un artículo equivocada no aprueba nada', t7.error(format($$select aprobar_con_articulos(%L, %L, %L::jsonb)$$, :'va', :'hva', jsonb_build_object(:'q1', :'hq2', :'q2', :'hq2')::text)) like '%artículo cambió%');
select t7.ok('validadora: si falta un artículo no aprueba nada', t7.error(format($$select aprobar_con_articulos(%L, %L, %L::jsonb)$$, :'va', :'hva', jsonb_build_object(:'q1', :'hq1')::text)) like '%artículo cambió%');
select t7.ok('validadora: un formato raro de artículos no vale', t7.falla(format($$select aprobar_con_articulos(%L, %L, '[1,2]'::jsonb)$$, :'va', :'hva')));
select t7.ok('validadora: con la huella vieja de la ficha no aprueba', t7.error(format($$select aprobar_con_articulos(%L, %L, %L::jsonb)$$, :'va', repeat('0', 64), jsonb_build_object(:'q1', :'hq1', :'q2', :'hq2')::text)) like '%cambió desde que lo abriste%');
reset role;
select t7.ok('si falla, no queda nada aprobado (tampoco los artículos)', (select count(*) from publicaciones where id in (:'q1'::uuid, :'q2'::uuid) and estado = 'en_revision') = 2
  and (select estado from ficha_versiones where id = :'va'::uuid) = 'en_revision'
  and not exists (select 1 from revisiones where objeto_id in (:'va'::uuid, :'q1'::uuid, :'q2'::uuid)));

set role authenticated; select set_config('request.jwt.claim.sub', :CVAL, false);
select t7.ok('validadora: aprueba ficha y artículos juntos', t7.error(format($$select aprobar_con_articulos(%L, %L, %L::jsonb, 'Muy clara')$$, :'va', :'hva', jsonb_build_object(:'q1', :'hq1', :'q2', :'hq2')::text)) = '');
reset role;
select t7.ok('aprobada: la ficha está publicada y con sello', (select estado from fichas where slug = 'c-por-que-se-dividen') = 'publicada'
  and exists (select 1 from fichas_validadas where version_id = :'va'::uuid and aprobada_por = :CVAL and not autoaprobada));
select t7.ok('aprobada: los dos artículos también', (select count(*) from publicaciones where id in (:'q1'::uuid, :'q2'::uuid) and estado = 'aprobada') = 2);
select t7.ok('aprobada: tres revisiones a nombre de la validadora', (select count(*) from revisiones where revisor_id = :CVAL and decision = 'aprobar'
  and objeto_id in (:'va'::uuid, :'q1'::uuid, :'q2'::uuid)) = 3);
select t7.ok('aprobada: los artículos dicen que se aprobaron con la ficha', (select count(*) from revisiones where objeto = 'publicacion' and objeto_id in (:'q1'::uuid, :'q2'::uuid)
  and comentario like 'Aprobado junto con la ficha%' and licencia_al_aprobar is not distinct from (select licencia_codigo from publicaciones where id = objeto_id)) = 2);
select t7.ok('aprobada: el comentario de la validadora queda en la ficha', (select comentario from revisiones where objeto = 'ficha_version' and objeto_id = :'va'::uuid) = 'Muy clara');
select t7.ok('aprobada: sigue marcada como redactada con IA', (select asistida_por_ia from ficha_versiones where id = :'va'::uuid));
select t7.ok('aprobada: queda en el registro editorial', (select count(*) from eventos_editoriales where accion = 'revisar' and entidad_id in (:'va'::uuid, :'q1'::uuid, :'q2'::uuid)) = 3);

-- Si todos los artículos ya estaban aprobados, aprueba solo la ficha
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into fichas (slug, formato, actividad) values ('c-piel', 'pregunta', 'a3');
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil, asistida_por_ia)
  select id, '¿Se cambia la piel?', 'Las células viejas de la piel se reemplazan cada pocas semanas.', 'Sí: tu piel se renueva sola cada pocas semanas.', true
    from fichas where slug = 'c-piel';
reset role;
select v.id as vp from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'c-piel' \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values (:'vp'::uuid, :'q2'::uuid, 'Resumen, oración 2', 'La piel se renueva cada pocas semanas.');
update ficha_versiones set estado = 'en_revision' where id = :'vp'::uuid;
reset role;
select huella as hvp from ficha_versiones where id = :'vp'::uuid \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CVAL2, false);
select t7.ok('con los artículos ya aprobados: aprueba solo la ficha', t7.error(format($$select aprobar_con_articulos(%L, %L)$$, :'vp', :'hvp')) = '');
reset role;
select t7.ok('con los artículos ya aprobados: queda publicada', (select estado from ficha_versiones where id = :'vp'::uuid) = 'publicada');

-- =====================================================================
-- Pedir cambios y rechazar no necesitan aprobar artículos
-- =====================================================================
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into fichas (slug, formato, actividad) values ('c-intestino', 'pregunta', 'a3');
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil, asistida_por_ia)
  select id, '¿La panza hace células nuevas?', 'Las células madre del intestino producen células nuevas todos los días.', 'Sí: en tu panza hay células que fabrican células nuevas todos los días.', true
    from fichas where slug = 'c-intestino';
reset role;
select v.id as vi from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'c-intestino' \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values (:'vi'::uuid, :'q4'::uuid, 'Resumen, oración 1', 'Las células madre del intestino hacen células nuevas cada día.');
update ficha_versiones set estado = 'en_revision' where id = :'vi'::uuid;
reset role;
select huella as hvi from ficha_versiones where id = :'vi'::uuid \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CVAL, false);
select t7.ok('pedir cambios: con un artículo esperando revisión, se puede', t7.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada, comentario) values ('ficha_version', %L, 'pedir_cambios', %L, 'Decí que son células madre')$$, :'vi', :'hvi')) = 1);
reset role;
select t7.ok('pedir cambios: la ficha vuelve a borrador', (select estado from ficha_versiones where id = :'vi'::uuid) = 'borrador');
select t7.ok('pedir cambios: el artículo sigue esperando revisión', (select estado from publicaciones where id = :'q4'::uuid) = 'en_revision');

-- Si un artículo vuelve a candidato mientras la ficha espera: no se aprueba
set role authenticated; select set_config('request.jwt.claim.sub', :CRED, false);
update ficha_versiones set estado = 'en_revision' where id = :'vi'::uuid;
update publicaciones set estado = 'candidata' where id = :'q4'::uuid;
reset role;
select huella as hvi2 from ficha_versiones where id = :'vi'::uuid \gset
set role authenticated; select set_config('request.jwt.claim.sub', :CVAL, false);
select t7.ok('artículo que volvió a candidato: la ficha no se aprueba', t7.error(format($$select aprobar_con_articulos(%L, %L)$$, :'vi', :'hvi2')) like '%todavía no están aprobados%');
select t7.ok('artículo que volvió a candidato: la ficha sigue esperando', (select estado from ficha_versiones where id = :'vi'::uuid) = 'en_revision');
select t7.ok('artículo que volvió a candidato: corregir el texto avisa qué pasa', t7.error(format($$update ficha_versiones set version_infantil = 'Sí: en tu panza hay células madre.' where id = %L$$, :'vi')) like '%no está aprobada%');
select t7.ok('rechazar: se puede igual', t7.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada, comentario) values ('ficha_version', %L, 'rechazar', %L, 'El artículo no sirve')$$, :'vi', :'hvi2')) = 1);
reset role;
select t7.ok('rechazar: la ficha queda rechazada', (select estado from ficha_versiones where id = :'vi'::uuid) = 'rechazada');

-- =====================================================================
-- Controles generales
-- =====================================================================
select t7.ok('aprobar todo junto: corre con la sesión de quien llama (no es security definer)',
  not (select prosecdef from pg_proc where proname = 'aprobar_con_articulos' and pronamespace = 'public'::regnamespace));
select t7.ok('aprobar todo junto: la llama el equipo, no los visitantes',
  has_function_privilege('authenticated', 'public.aprobar_con_articulos(uuid, text, jsonb, text)', 'execute')
  and not has_function_privilege('anon', 'public.aprobar_con_articulos(uuid, text, jsonb, text)', 'execute'));
select t7.ok('las funciones nuevas de los triggers no se llaman por la API',
  not has_function_privilege('authenticated', 'privado.versiones_marca_ia()', 'execute')
  and not has_function_privilege('authenticated', 'privado.revision_exige_articulos()', 'execute'));
select t7.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

\o
\pset footer off
select case when ok then 'OK   ' else 'FALLA' end as " ", prueba from t7.resultado order by n;
select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS' as "respuestas con IA" from t7.resultado;
