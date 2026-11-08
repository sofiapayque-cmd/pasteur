-- =====================================================================
-- Pruebas de la migración 17 (asistente para la clase), en el Postgres
-- local. Arma su propio equipo, una ficha publicada con su índice, dos
-- maestras y un alumno. Cada prueba imprime OK o FALLA.
-- Para el proyecto real se genera 12-pruebas-asistente-real.sql con a-real.py.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t11;
create table t11.resultado (n serial, prueba text, ok boolean);
create table t11.v (k text primary key, val text);
grant usage on schema t11 to anon, authenticated, service_role;
grant all on t11.resultado, t11.resultado_n_seq, t11.v to anon, authenticated, service_role;
create function t11.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t11.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t11.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t11.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
-- Vector de 1536 con un 1 en la posición k (o una mezcla de dos posiciones)
create function t11.vec(k int, k2 int default null, peso2 float default 0) returns extensions.vector language sql as $$
  select ('[' || string_agg(case when i = k then '1' when i = k2 then peso2::text else '0' end, ',' order by i) || ']')::extensions.vector
    from generate_series(1, 1536) i $$;
grant execute on all functions in schema t11 to anon, authenticated, service_role;

\set DRED '''d1100000-0000-0000-0000-000000000001'''
\set DVAL '''d1100000-0000-0000-0000-000000000002'''
\set MAE1 '''d1177777-0000-0000-0000-000000000001'''
\set MAE2 '''d1177777-0000-0000-0000-000000000002'''

-- =====================================================================
-- Preparación: equipo, maestras, un artículo y una ficha publicada
-- =====================================================================
set role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values
  ('d-redactora@pasteur.test', 'redactor', 'Redactora D'), ('d-val@pasteur.test', 'validador', 'Validadora D');
reset role;
insert into auth.users (id, email) values (:DRED, 'd-redactora@pasteur.test'), (:DVAL, 'd-val@pasteur.test');
insert into auth.users (id, email, raw_user_meta_data) values (:MAE1, 'd-maestra1@escuela.uy', '{"nombre":"Maestra 1"}'),
  (:MAE2, 'd-maestra2@escuela.uy', '{"nombre":"Maestra 2"}');

set role service_role;
select (guardar_registro($j${"proveedor":"openalex","id_externo":"W1101","identificadores":{"openalex":"W1101"},"titulo":"The nucleus","anio":2020,"tipo":"revision","autores":[{"nombre":"Ana Paz","apellido":"Paz"}],"resumen":"The nucleus stores DNA. It is surrounded by a membrane.","crudo":{"id":"W1101"}}$j$::jsonb, null, :DRED::uuid) ->> 'publicacion_id') as pub \gset
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :DRED, false);
update publicaciones set estado = 'en_revision' where id = :'pub'::uuid;
insert into fichas (slug, formato, actividad) values ('d-nucleo', 'pregunta', 'a3');
insert into ficha_versiones (ficha_id, pregunta, variantes, explicacion_cientifica, version_infantil, asistida_por_ia)
  select id, '¿Por qué las células tienen núcleo?', array['¿Para qué sirve el núcleo?'],
         'El núcleo guarda el ADN y está rodeado por una membrana.', 'El núcleo es como una caja fuerte donde la célula guarda su ADN.', true
    from fichas where slug = 'd-nucleo';
reset role;
select v.id as ver from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'd-nucleo' \gset
select f.id as fic from fichas f where f.slug = 'd-nucleo' \gset
set role authenticated; select set_config('request.jwt.claim.sub', :DRED, false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values (:'ver'::uuid, :'pub'::uuid, 'Resumen, oración 1', 'El núcleo guarda el ADN.');
update ficha_versiones set estado = 'en_revision' where id = :'ver'::uuid;
reset role;
select huella as hver from ficha_versiones where id = :'ver'::uuid \gset
select huella as hpub from publicaciones where id = :'pub'::uuid \gset
set role authenticated; select set_config('request.jwt.claim.sub', :DVAL, false);
select aprobar_con_articulos(:'ver'::uuid, :'hver', jsonb_build_object(:'pub', :'hpub'));
reset role;
select t11.ok('preparación: ficha publicada', (select estado from fichas where id = :'fic'::uuid) = 'publicada');

-- El servidor la indexa: pregunta en la posición 1, variante en la 2, versión para chicos en la 3
set role service_role;
insert into fragmentos (ficha_id, version_id, tipo, texto, embedding) values
  (:'fic'::uuid, :'ver'::uuid, 'pregunta', '¿Por qué las células tienen núcleo?', t11.vec(1)),
  (:'fic'::uuid, :'ver'::uuid, 'variante', '¿Para qué sirve el núcleo?', t11.vec(2)),
  (:'fic'::uuid, :'ver'::uuid, 'infantil', 'El núcleo es como una caja fuerte…', t11.vec(3));
reset role;

-- =====================================================================
-- Quién puede usar lo nuevo
-- =====================================================================
select t11.ok('buscar: solo el servidor', has_function_privilege('service_role', 'public.buscar_fragmentos(extensions.vector, int)', 'execute')
  and not has_function_privilege('authenticated', 'public.buscar_fragmentos(extensions.vector, int)', 'execute')
  and not has_function_privilege('anon', 'public.buscar_fragmentos(extensions.vector, int)', 'execute'));
select t11.ok('cupos: solo el servidor', has_function_privilege('service_role', 'public.usar_cupo_asistente(uuid, int)', 'execute')
  and not has_function_privilege('authenticated', 'public.usar_cupo_asistente(uuid, int)', 'execute')
  and not has_function_privilege('anon', 'public.usar_cupo_asistente(uuid, int)', 'execute'));
select t11.ok('anotar: solo el servidor', has_function_privilege('service_role', 'public.anotar_pregunta_sin_respuesta(text, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.anotar_pregunta_sin_respuesta(text, text, text)', 'execute'));
select t11.ok('ninguna es security definer', not exists (select 1 from pg_proc where proname in ('buscar_fragmentos', 'usar_cupo_asistente', 'anotar_pregunta_sin_respuesta') and prosecdef));

-- =====================================================================
-- Buscar
-- =====================================================================
set role service_role;
insert into t11.v select 'b1', row_to_json(b)::text from public.buscar_fragmentos(t11.vec(1), 5) b limit 1;
reset role;
select t11.ok('buscar: la misma pregunta da similitud 1', (select (val::json ->> 'similitud')::float > 0.999 and val::json ->> 'tipo' = 'pregunta' from t11.v where k = 'b1'));
set role service_role;
insert into t11.v select 'b2', row_to_json(b)::text from public.buscar_fragmentos(t11.vec(2, 1, 0.2), 5) b limit 1;
select t11.ok('buscar: una parecida a la variante, primero la variante', (select val::json ->> 'tipo' = 'variante' from t11.v where k = 'b2'));
select t11.ok('buscar: no devuelve la versión para chicos (solo preguntas y variantes)', not exists (select 1 from public.buscar_fragmentos(t11.vec(3), 20) where tipo = 'infantil'));
select t11.ok('buscar: una pregunta de otro tema da similitud baja', (select max(similitud) < 0.1 from public.buscar_fragmentos(t11.vec(500), 5)));
select t11.ok('buscar: el límite se respeta', (select count(*) from public.buscar_fragmentos(t11.vec(1), 1)) = 1);
reset role;
update fragmentos set activo = false where tipo = 'variante' and ficha_id = :'fic'::uuid;
set role service_role;
select t11.ok('buscar: un fragmento apagado no aparece', not exists (select 1 from public.buscar_fragmentos(t11.vec(2), 20) where tipo = 'variante'));
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :MAE1, false);
select t11.ok('maestra: no puede buscar directo', t11.falla($$select * from public.buscar_fragmentos(t11.vec(1), 5)$$));
reset role;

-- =====================================================================
-- Cupos
-- =====================================================================
set role service_role;
insert into t11.v select 'c' || g, coalesce(public.usar_cupo_asistente(:MAE1::uuid, 3), false)::text from generate_series(1, 3) g;
select t11.ok('cupo: hasta el límite, sí', (select count(*) from t11.v where k like 'c%' and val = 'true') = 3);
select t11.ok('cupo: pasado el límite, no', not coalesce(public.usar_cupo_asistente(:MAE1::uuid, 3), false));
select t11.ok('cupo: la otra maestra tiene el suyo', coalesce(public.usar_cupo_asistente(:MAE2::uuid, 3), false));
reset role;
select t11.ok('cupo: no se pasa del límite aunque insista', (select usados from cupos_asistente where docente_id = :MAE1::uuid and dia = current_date) = 3);
update cupos_asistente set dia = current_date - 1 where docente_id = :MAE1::uuid;
set role service_role;
select t11.ok('cupo: al otro día vuelve a tener', coalesce(public.usar_cupo_asistente(:MAE1::uuid, 3), false));
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :MAE1, false);
select t11.ok('maestra: no ve los cupos', t11.falla($$select count(*) from public.cupos_asistente$$));
select t11.ok('maestra: no se suma cupo', t11.falla($$update public.cupos_asistente set usados = 0$$));
reset role;

-- =====================================================================
-- Preguntas sin respuesta
-- =====================================================================
set role service_role;
select public.anotar_pregunta_sin_respuesta('¿Por qué brillan las medusas?', 'por que brillan las medusas', 'a3');
select public.anotar_pregunta_sin_respuesta('¿por que brillan las medusas', 'por que brillan las medusas', 'a1');
select public.anotar_pregunta_sin_respuesta('¿Qué come una bacteria?', 'que come una bacteria', null);
select public.anotar_pregunta_sin_respuesta('¿Cuánto vive un virus?', 'cuanto vive un virus', 'zz');
reset role;
select t11.ok('anotar: la misma pregunta suma veces', (select veces from preguntas_sin_respuesta where normalizada = 'por que brillan las medusas') = 2);
select t11.ok('anotar: se queda con el primer texto y la primera actividad', (select texto = '¿Por qué brillan las medusas?' and actividad = 'a3' from preguntas_sin_respuesta where normalizada = 'por que brillan las medusas'));
select t11.ok('anotar: una actividad que no existe queda vacía', (select actividad is null from preguntas_sin_respuesta where normalizada = 'cuanto vive un virus'));
select t11.ok('anotar: no guarda maestra, aula ni hora', not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'preguntas_sin_respuesta'
  and (column_name like '%docente%' or column_name like '%aula%' or column_name like '%alumno%' or data_type like 'timestamp%')));

-- El equipo la ve y la marca; las maestras y los alumnos no
set role authenticated; select set_config('request.jwt.claim.sub', :DRED, false);
select t11.ok('equipo: ve la lista', (select count(*) from public.preguntas_sin_respuesta) = 3);
select t11.ok('equipo: puede descartar', t11.afecta($$update public.preguntas_sin_respuesta set estado = 'descartada' where normalizada = 'cuanto vive un virus'$$) = 1);
select t11.ok('equipo: no cambia el texto', t11.falla($$update public.preguntas_sin_respuesta set texto = 'otra cosa'$$));
select t11.ok('equipo: no agrega a mano', t11.falla($$insert into public.preguntas_sin_respuesta (texto, normalizada) values ('hola hola', 'hola hola')$$));
select t11.ok('equipo: no borra', t11.falla($$delete from public.preguntas_sin_respuesta$$));
reset role;
set role authenticated; select set_config('request.jwt.claim.sub', :MAE1, false);
select t11.ok('maestra: no ve la lista', (select count(*) from public.preguntas_sin_respuesta) = 0);
select t11.ok('maestra: no la marca', t11.afecta($$update public.preguntas_sin_respuesta set estado = 'pedida'$$) = 0);
reset role;
set role anon;
select t11.ok('visitante: nada', t11.falla($$select count(*) from public.preguntas_sin_respuesta$$));
reset role;

set role service_role;
select public.anotar_pregunta_sin_respuesta('¿Cuánto vive un virus?', 'cuanto vive un virus', null);
reset role;
select t11.ok('anotar: una descartada que vuelve a aparecer, vuelve a la lista', (select estado = 'pendiente' and veces = 2 from preguntas_sin_respuesta where normalizada = 'cuanto vive un virus'));

-- 90 días
update preguntas_sin_respuesta set ultima_vez = current_date - 91 where normalizada in ('que come una bacteria', 'por que brillan las medusas');
update preguntas_sin_respuesta set estado = 'pedida' where normalizada = 'por que brillan las medusas';
set role service_role;
select public.anotar_pregunta_sin_respuesta('¿Qué es una célula?', 'que es una celula', 'a3');
reset role;
select t11.ok('90 días sin que nadie la pregunte: se borra', not exists (select 1 from preguntas_sin_respuesta where normalizada = 'que come una bacteria'));
select t11.ok('90 días: una ya pedida se queda', exists (select 1 from preguntas_sin_respuesta where normalizada = 'por que brillan las medusas'));

-- Retirar la ficha la saca de la búsqueda (trigger de la migración 9)
set role authenticated; select set_config('request.jwt.claim.sub', :DVAL, false);
update fichas set estado = 'retirada', motivo_retiro = 'Prueba de retiro' where id = :'fic'::uuid;
reset role;
set role service_role;
select t11.ok('ficha retirada: no aparece más', not exists (select 1 from public.buscar_fragmentos(t11.vec(1), 20)));
reset role;

select t11.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

\o
\pset footer off
select case when ok then 'OK   ' else 'FALLA' end as " ", prueba from t11.resultado order by n;
select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS' as "asistente" from t11.resultado;
