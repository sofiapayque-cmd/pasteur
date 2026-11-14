-- =====================================================================
-- GENERADO con a-real.py desde 19-pruebas-curiosidades.sql: no editar a mano.
--
-- Para correr en un proyecto REAL de Supabase (solo el de desarrollo), sin
-- dejar rastro. Se manda como UNA sola consulta: Postgres la ejecuta como una
-- transacción, y la última sentencia lanza un error A PROPÓSITO con el
-- resultado adentro. El error deshace todo: usuarios de prueba, equipo,
-- fichas, publicaciones, el esquema "t19"… nada queda guardado.
-- =====================================================================
-- =====================================================================
-- Pruebas de la migración 22 (curiosidades según lo más consultado), en el
-- Postgres local. Arma su propio equipo (admin, redactora, validadora),
-- una maestra con un aula, dos temas con embedding, una curiosidad
-- publicada (ficha "dato") y una respuesta publicada sin tema.
-- Para el proyecto real se genera 20-pruebas-curiosidades-real.sql con a-real.py.
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t19;
create table t19.resultado (n serial, prueba text, ok boolean);
create table t19.v (k text primary key, val text);
create table t19.tend (tema_id uuid, nombre text, actividad text, puntaje double precision, consultas bigint, curiosidades bigint);
grant usage on schema t19 to anon, authenticated, service_role;
grant all on t19.resultado, t19.resultado_n_seq, t19.v, t19.tend to anon, authenticated, service_role;
create function t19.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t19.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t19.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t19.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
-- Un vector de 1536 con un 1 en la posición k (y un poco de k2, si se pide)
create function t19.vec(k int, k2 int default null, peso real default 0) returns extensions.vector language sql as $$
  select (array_agg(case when i = k then 1 when i = k2 then peso else 0 end order by i))::real[]::extensions.vector
    from generate_series(1, 1536) i $$;
create function t19.val(clave text) returns uuid language sql as $$ select val::uuid from t19.v where k = clave $$;
grant execute on all functions in schema t19 to anon, authenticated, service_role;


-- =====================================================================
-- Preparación
-- =====================================================================
set local role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values
  ('g-admin@pasteur.test', 'admin', 'Admin G'), ('g-redactora@pasteur.test', 'redactor', 'Redactora G'), ('g-val@pasteur.test', 'validador', 'Validadora G');
reset role;
insert into auth.users (id, email) values ('f1900000-0000-0000-0000-000000000001', 'g-admin@pasteur.test'), ('f1900000-0000-0000-0000-000000000002', 'g-redactora@pasteur.test'), ('f1900000-0000-0000-0000-000000000003', 'g-val@pasteur.test');
insert into auth.users (id, email, raw_user_meta_data) values ('f1977777-0000-0000-0000-000000000001', 'g-maestra@escuela.uy', '{"nombre":"Maestra G"}');
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1977777-0000-0000-0000-000000000001', false);
insert into aulas (nombre, grado) values ('Aula T19', 5);
reset role;
insert into t19.v select 'aula', id::text from aulas where nombre = 'Aula T19';

-- Temas (los crea la admin) y su embedding (lo pone el servidor)
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1900000-0000-0000-0000-000000000001', false);
insert into temas (slug, nombre, actividad) values ('g-frio', 'Bacterias del frío', 'a1'), ('g-antibioticos', 'Antibióticos', 'a1'), ('g-viejo', 'Tema apagado', 'a1');
update temas set activo = false where slug = 'g-viejo';
reset role;
insert into t19.v select 'frio', id::text from temas where slug = 'g-frio';
insert into t19.v select 'anti', id::text from temas where slug = 'g-antibioticos';
insert into t19.v select 'viejo', id::text from temas where slug = 'g-viejo';
set local role service_role;
update temas set embedding = t19.vec(1) where slug = 'g-frio';
update temas set embedding = t19.vec(2) where slug = 'g-antibioticos';
update temas set embedding = t19.vec(3) where slug = 'g-viejo';
-- Un artículo para citar
insert into t19.v (k, val) select 'pub', guardar_registro($j${"proveedor":"openalex","id_externo":"W1901","identificadores":{"openalex":"W1901"},"titulo":"CSL test: cold bacteria","anio":2021,"tipo":"revision","resumen":"Some bacteria grow in the cold.","crudo":{"id":"W1901"}}$j$::jsonb, null, 'f1900000-0000-0000-0000-000000000002'::uuid) ->> 'publicacion_id';
reset role;

-- Una curiosidad (dato) con tema, y una respuesta (pregunta) sin tema; las dos se aprueban
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1900000-0000-0000-0000-000000000002', false);
update publicaciones set estado = 'en_revision' where id = t19.val('pub');
insert into fichas (slug, formato, actividad, tema_id) values ('g-dato-frio', 'dato', 'a1', t19.val('frio'));
insert into fichas (slug, formato, actividad) values ('g-respuesta', 'pregunta', 'a1'), ('g-dato-borrador', 'dato', 'a1');
insert into ficha_versiones (ficha_id, pregunta, version_infantil)
  select id, 'Bacterias que aguantan el frío', '¿Sabías que hay bacterias que crecen en el frío de la Antártida?' from fichas where slug = 'g-dato-frio';
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil)
  select id, '¿Cómo viven las bacterias en el frío?', 'Algunas bacterias crecen a bajas temperaturas.', 'Algunas bacterias crecen aunque haga mucho frío.' from fichas where slug = 'g-respuesta';
reset role;
insert into t19.v select 'vdato', v.id::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'g-dato-frio';
insert into t19.v select 'vresp', v.id::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'g-respuesta';
insert into t19.v select 'dato', id::text from fichas where slug = 'g-dato-frio';
insert into t19.v select 'resp', id::text from fichas where slug = 'g-respuesta';
insert into t19.v select 'borr', id::text from fichas where slug = 'g-dato-borrador';
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1900000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values
  (t19.val('vdato'), t19.val('pub'), 'Resumen, oración 1', 'Algunas bacterias crecen en el frío.'),
  (t19.val('vresp'), t19.val('pub'), 'Resumen, oración 1', 'Algunas bacterias crecen en el frío.');
update ficha_versiones set estado = 'en_revision' where id in (t19.val('vdato'), t19.val('vresp'));
reset role;
insert into t19.v select 'hdato', huella from ficha_versiones where id = t19.val('vdato');
insert into t19.v select 'hresp', huella from ficha_versiones where id = t19.val('vresp');
insert into t19.v select 'hpub', huella from publicaciones where id = t19.val('pub');
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1900000-0000-0000-0000-000000000003', false);
select aprobar_con_articulos(t19.val('vdato'), (select val from t19.v where k = 'hdato'), jsonb_build_object((select val from t19.v where k = 'pub'), (select val from t19.v where k = 'hpub')));
select aprobar_con_articulos(t19.val('vresp'), (select val from t19.v where k = 'hresp'), '{}'::jsonb);
reset role;
-- El índice del asistente: la pregunta de la respuesta, parecida al tema "frío"
set local role service_role;
insert into fragmentos (ficha_id, version_id, tipo, texto, embedding)
  values (t19.val('resp'), t19.val('vresp'), 'pregunta', '¿Cómo viven las bacterias en el frío?', t19.vec(1, 5, 0.3));
reset role;
select t19.ok('preparación: equipo, maestra con aula, temas, una curiosidad y una respuesta publicadas',
  (select count(*) from equipo where id in ('f1900000-0000-0000-0000-000000000001', 'f1900000-0000-0000-0000-000000000002', 'f1900000-0000-0000-0000-000000000003')) = 3 and t19.val('aula') is not null
  and (select estado from fichas where id = t19.val('dato')) = 'publicada'
  and (select estado from fichas where id = t19.val('resp')) = 'publicada');

-- =====================================================================
-- Quién puede usar las funciones
-- =====================================================================
select t19.ok('funciones: contar, anotar, ubicar, parecido y limpiar son solo del servidor',
  (select bool_and(has_function_privilege('service_role', f, 'execute')
                   and not has_function_privilege('authenticated', f, 'execute')
                   and not has_function_privilege('anon', f, 'execute'))
     from unnest(array['public.tema_parecido(extensions.vector, double precision)',
                       'public.contar_consulta_tema(uuid, text)',
                       'public.contar_consulta_de_ficha(uuid, text, double precision)',
                       'public.anotar_consulta_sin_tema(text, text, text)',
                       'public.ubicar_consulta_sin_tema(uuid, uuid)',
                       'public.limpiar_curiosidades()']) f));
select t19.ok('funciones: la tendencia la puede pedir el equipo con su sesión, el visitante no',
  has_function_privilege('authenticated', 'public.tendencia_temas(int, double precision)', 'execute')
  and not has_function_privilege('anon', 'public.tendencia_temas(int, double precision)', 'execute'));

-- =====================================================================
-- Contar consultas
-- =====================================================================
set local role service_role;
select public.contar_consulta_tema(t19.val('frio'), 'asistente');
select public.contar_consulta_tema(t19.val('frio'), 'asistente');
select public.contar_consulta_tema(t19.val('frio'), 'sin_respuesta');
select public.contar_consulta_tema(t19.val('viejo'), 'asistente');
select public.contar_consulta_tema(t19.val('frio'), 'otro');
reset role;
select t19.ok('contar: suma por tema, día y origen',
  (select veces from consultas_tema where tema_id = t19.val('frio') and origen = 'asistente') = 2
  and (select veces from consultas_tema where tema_id = t19.val('frio') and origen = 'sin_respuesta') = 1);
select t19.ok('contar: un tema apagado no suma', not exists (select 1 from consultas_tema where tema_id = t19.val('viejo')));
select t19.ok('contar: un origen raro no suma', (select count(*) from consultas_tema where tema_id = t19.val('frio')) = 2);

set local role service_role;
insert into t19.v select 'parecido', tema_id::text from public.tema_parecido(t19.vec(2, 7, 0.2));
insert into t19.v select 'cfdato', public.contar_consulta_de_ficha(t19.val('dato'), 'actividad')::text;
insert into t19.v select 'cfresp', public.contar_consulta_de_ficha(t19.val('resp'), 'actividad')::text;
insert into t19.v select 'cfborr', coalesce(public.contar_consulta_de_ficha(t19.val('borr'), 'actividad')::text, 'nada');
insert into t19.v select 'cflejos', coalesce(public.contar_consulta_de_ficha(t19.val('resp'), 'actividad', 0.99)::text, 'nada');
reset role;
select t19.ok('tema parecido: elige el tema más cercano', t19.val('parecido') = t19.val('anti'));
select t19.ok('ficha con tema: suma a su tema', t19.val('cfdato') = t19.val('frio'));
select t19.ok('ficha sin tema: suma al tema más parecido a su pregunta', t19.val('cfresp') = t19.val('frio'));
select t19.ok('ficha sin tema: no le cambia el tema (eso lo decide el equipo)', (select tema_id from fichas where id = t19.val('resp')) is null);
select t19.ok('ficha sin publicar: no suma', (select val from t19.v where k = 'cfborr') = 'nada');
select t19.ok('ficha sin tema y nada bastante parecido: no suma', (select val from t19.v where k = 'cflejos') = 'nada'
  and (select veces from consultas_tema where tema_id = t19.val('frio') and origen = 'actividad') = 2);

-- =====================================================================
-- Preguntas sin tema
-- =====================================================================
set local role service_role;
select public.anotar_consulta_sin_tema('¿Los volcanes tienen bacterias?', 'los volcanes tienen bacterias', 'a1');
select public.anotar_consulta_sin_tema('¿los volcanes tienen bacterias', 'los volcanes tienen bacterias', 'a9');
select public.anotar_consulta_sin_tema('¿Por qué brillan las luciérnagas?', 'por que brillan las luciernagas', 'zz');
reset role;
insert into t19.v select 'volcan', id::text from consultas_sin_tema where normalizada = 'los volcanes tienen bacterias';
insert into t19.v select 'luz', id::text from consultas_sin_tema where normalizada = 'por que brillan las luciernagas';
select t19.ok('sin tema: la misma pregunta suma veces', (select veces from consultas_sin_tema where id = t19.val('volcan')) = 2);
select t19.ok('sin tema: una actividad rara queda vacía', (select actividad from consultas_sin_tema where id = t19.val('luz')) is null
  and (select actividad from consultas_sin_tema where id = t19.val('volcan')) = 'a1');

set local role service_role;
insert into t19.v select 'ub_viejo', public.ubicar_consulta_sin_tema(t19.val('luz'), t19.val('viejo'))::text;
insert into t19.v select 'ub_frio', public.ubicar_consulta_sin_tema(t19.val('volcan'), t19.val('frio'))::text;
insert into t19.v select 'ub_otra', public.ubicar_consulta_sin_tema(t19.val('volcan'), t19.val('frio'))::text;
reset role;
select t19.ok('ubicar: en un tema apagado no se puede y la pregunta queda', (select val from t19.v where k = 'ub_viejo') = 'false'
  and exists (select 1 from consultas_sin_tema where id = t19.val('luz')));
select t19.ok('ubicar: sus veces pasan al tema y la pregunta se va', (select val from t19.v where k = 'ub_frio') = 'true'
  and not exists (select 1 from consultas_sin_tema where id = t19.val('volcan'))
  and (select veces from consultas_tema where tema_id = t19.val('frio') and origen = 'asistente') = 4);
select t19.ok('ubicar: dos veces la misma no suma de nuevo', (select val from t19.v where k = 'ub_otra') = 'false');

-- =====================================================================
-- Quién ve y quién cambia
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1900000-0000-0000-0000-000000000002', false);
select t19.ok('equipo: ve los conteos por tema', (select count(*) from consultas_tema) >= 3);
select t19.ok('equipo: no los cambia ni agrega', t19.afecta($$update consultas_tema set veces = 999$$) <= 0
  and t19.falla($$insert into consultas_tema (tema_id, origen, veces) values ('$$ || t19.val('anti') || $$', 'asistente', 50)$$));
select t19.ok('equipo: ve las preguntas sin tema', (select count(*) from consultas_sin_tema) = 1);
select t19.ok('equipo: no las cambia ni agrega', t19.afecta($$update consultas_sin_tema set veces = 999$$) <= 0
  and t19.falla($$insert into consultas_sin_tema (texto, normalizada) values ('hola hola', 'hola hola')$$));
select t19.ok('equipo: puede descartar una pregunta sin tema', t19.afecta($$delete from consultas_sin_tema where id = '$$ || t19.val('luz') || $$'$$) = 1);
select t19.ok('equipo: no ve qué curiosidad vio cada aula', t19.falla($$select count(*) from curiosidades_vistas$$));
reset role;

set local role authenticated; select set_config('request.jwt.claim.sub', 'f1977777-0000-0000-0000-000000000001', false);
select t19.ok('maestra: no ve los conteos ni las preguntas sin tema', (select count(*) from consultas_tema) = 0 and (select count(*) from consultas_sin_tema) = 0);
select t19.ok('maestra: no ve qué curiosidades vio su aula', t19.falla($$select count(*) from curiosidades_vistas$$));
select t19.ok('maestra: la tendencia no le muestra nada', (select count(*) from public.tendencia_temas()) = 0);
reset role;
set local role anon;
select t19.ok('visitante: no ve nada', t19.falla($$select count(*) from consultas_tema$$) and t19.falla($$select count(*) from consultas_sin_tema$$)
  and t19.falla($$select count(*) from curiosidades_vistas$$) and t19.falla($$select * from public.tendencia_temas()$$));
reset role;

select t19.ok('sin datos de quién preguntó: los conteos no tienen maestra, aula, alumno ni hora',
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'consultas_tema'
              and column_name not in ('tema_id', 'dia', 'origen', 'veces'))
  and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'consultas_sin_tema'
              and column_name not in ('id', 'texto', 'normalizada', 'actividad', 'veces', 'primera_vez', 'ultima_vez')));

-- =====================================================================
-- Tendencia: lo reciente pesa más que lo viejo
-- =====================================================================
set local role service_role;
-- Antibióticos: muchas consultas hace 20 días. Frío: pocas, pero de hoy.
insert into consultas_tema (tema_id, dia, origen, veces) values (t19.val('anti'), current_date - 20, 'asistente', 12);
insert into consultas_tema (tema_id, dia, origen, veces) values (t19.val('anti'), current_date - 40, 'asistente', 500);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1900000-0000-0000-0000-000000000002', false);
insert into t19.tend select * from public.tendencia_temas(30, 7);
reset role;
select t19.ok('tendencia: lo de hoy pesa más que muchas consultas de hace 20 días',
  (select puntaje from t19.tend where tema_id = t19.val('frio')) > (select puntaje from t19.tend where tema_id = t19.val('anti')));
select t19.ok('tendencia: lo de hace más de 30 días no cuenta', (select consultas from t19.tend where tema_id = t19.val('anti')) = 12);
select t19.ok('tendencia: cuenta las curiosidades publicadas de cada tema',
  (select curiosidades from t19.tend where tema_id = t19.val('frio')) = 1 and (select curiosidades from t19.tend where tema_id = t19.val('anti')) = 0);
select t19.ok('tendencia: los temas apagados no aparecen', not exists (select 1 from t19.tend where tema_id = t19.val('viejo')));

-- =====================================================================
-- Curiosidades vistas por aula y limpieza
-- =====================================================================
set local role service_role;
insert into curiosidades_vistas (aula_id, ficha_id, dia) values (t19.val('aula'), t19.val('dato'), current_date), (t19.val('aula'), t19.val('dato'), current_date - 31);
insert into consultas_sin_tema (texto, normalizada, ultima_vez, primera_vez) values ('pregunta vieja', 'pregunta vieja', current_date - 91, current_date - 91);
select public.limpiar_curiosidades();
reset role;
select t19.ok('limpiar: borra los conteos de más de 90 días y deja los recientes',
  not exists (select 1 from consultas_tema where dia < current_date - 90) and exists (select 1 from consultas_tema where dia = current_date - 20));
select t19.ok('limpiar: borra las preguntas sin tema de más de 90 días', not exists (select 1 from consultas_sin_tema where normalizada = 'pregunta vieja'));
select t19.ok('limpiar: borra lo que vio un aula hace más de 30 días y deja lo de hoy',
  (select count(*) from curiosidades_vistas where aula_id = t19.val('aula')) = 1);

select t19.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS'
    into total from t19.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\n' order by n)
    into detalle from t19.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\n%', total, detalle;
end $$;

