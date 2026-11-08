-- =====================================================================
-- GENERADO con a-real.py desde 15-pruebas-acceso.sql: no editar a mano.
--
-- Para correr en un proyecto REAL de Supabase (solo el de desarrollo), sin
-- dejar rastro. Se manda como UNA sola consulta: Postgres la ejecuta como una
-- transacción, y la última sentencia lanza un error A PROPÓSITO con el
-- resultado adentro. El error deshace todo: usuarios de prueba, equipo,
-- fichas, publicaciones, el esquema "t15"… nada queda guardado.
-- =====================================================================
-- =====================================================================
-- Pruebas de la migración 20 (pedir acceso e historial anónimo de
-- respuestas), en el Postgres local. Arma su propio equipo (admin,
-- redactora, validadora), una maestra y una ficha publicada.
-- Para el proyecto real se genera 16-pruebas-acceso-real.sql con a-real.py.
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t15;
create table t15.resultado (n serial, prueba text, ok boolean);
create table t15.v (k text primary key, val text);
grant usage on schema t15 to anon, authenticated, service_role;
grant all on t15.resultado, t15.resultado_n_seq, t15.v to anon, authenticated, service_role;
create function t15.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t15.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t15.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t15.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
grant execute on all functions in schema t15 to anon, authenticated, service_role;


-- =====================================================================
-- Preparación
-- =====================================================================
set local role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values
  ('f-admin@pasteur.test', 'admin', 'Admin F'), ('f-redactora@pasteur.test', 'redactor', 'Redactora F'), ('f-val@pasteur.test', 'validador', 'Validadora F');
reset role;
insert into auth.users (id, email) values ('f1500000-0000-0000-0000-000000000001', 'f-admin@pasteur.test'), ('f1500000-0000-0000-0000-000000000002', 'f-redactora@pasteur.test'), ('f1500000-0000-0000-0000-000000000003', 'f-val@pasteur.test');
insert into auth.users (id, email, raw_user_meta_data) values ('f1577777-0000-0000-0000-000000000001', 'f-maestra@escuela.uy', '{"nombre":"Maestra F"}');

-- Una ficha publicada (para el historial) y otra en borrador
set local role service_role;
insert into t15.v (k, val) select 'pub', guardar_registro($j${"proveedor":"openalex","id_externo":"W1501","identificadores":{"openalex":"W1501"},"titulo":"CSL test: cells","anio":2020,"tipo":"revision","resumen":"Cells are the units of life.","crudo":{"id":"W1501"}}$j$::jsonb, null, 'f1500000-0000-0000-0000-000000000002'::uuid) ->> 'publicacion_id';
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000002', false);
update publicaciones set estado = 'en_revision' where id = (select val from t15.v where k = 'pub')::uuid;
insert into fichas (slug, formato, actividad) values ('f-celula', 'pregunta', 'a3'), ('f-borrador', 'pregunta', 'a3');
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil)
  select id, '¿Qué es una célula?', 'La unidad de la vida.', 'Una célula es la parte más chiquita de un ser vivo.' from fichas where slug = 'f-celula';
reset role;
insert into t15.v (k, val) select 'ver', v.id::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'f-celula';
insert into t15.v (k, val) select 'fic', id::text from fichas where slug = 'f-celula';
insert into t15.v (k, val) select 'bor', id::text from fichas where slug = 'f-borrador';
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, publicacion_id, ubicacion, parafrasis) values ((select val from t15.v where k = 'ver')::uuid, (select val from t15.v where k = 'pub')::uuid, 'Resumen, oración 1', 'Las células son la unidad de la vida.');
update ficha_versiones set estado = 'en_revision' where id = (select val from t15.v where k = 'ver')::uuid;
reset role;
insert into t15.v (k, val) select 'hver', huella from ficha_versiones where id = (select val from t15.v where k = 'ver')::uuid;
insert into t15.v (k, val) select 'hpub', huella from publicaciones where id = (select val from t15.v where k = 'pub')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000003', false);
select aprobar_con_articulos((select val from t15.v where k = 'ver')::uuid, (select val from t15.v where k = 'hver'), jsonb_build_object((select val from t15.v where k = 'pub'), (select val from t15.v where k = 'hpub')));
reset role;
select t15.ok('preparación: admin, redactora, validadora, maestra y una ficha publicada',
  (select count(*) from equipo where id in ('f1500000-0000-0000-0000-000000000001', 'f1500000-0000-0000-0000-000000000002', 'f1500000-0000-0000-0000-000000000003')) = 3 and exists (select 1 from docentes where id = 'f1577777-0000-0000-0000-000000000001')
  and (select estado from fichas where id = (select val from t15.v where k = 'fic')::uuid) = 'publicada');

-- =====================================================================
-- Pedir acceso
-- =====================================================================
select t15.ok('pedir acceso: solo el servidor', has_function_privilege('service_role', 'public.registrar_solicitud_acceso(text, text, text, text, text, text, text, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.registrar_solicitud_acceso(text, text, text, text, text, text, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.registrar_solicitud_acceso(text, text, text, text, text, text, text, text)', 'execute'));

set local role service_role;
insert into t15.v (k, val) select 's1', public.registrar_solicitud_acceso('Ana Pérez', 'Ana@Escuela.uy', 'Escuela 123', 'Montevideo', 'maestra', '5, 6', 'Hola', repeat('a', 64));
insert into t15.v (k, val) select 's2', public.registrar_solicitud_acceso('Ana P.', 'ana@escuela.uy', 'Escuela 123', 'Montevideo', 'maestra', '', '', repeat('b', 64));
insert into t15.v (k, val) select 's3', public.registrar_solicitud_acceso('Luis', 'luis@escuela.uy', 'Escuela 9', 'Salto', 'direccion', '', '', repeat('a', 64));
insert into t15.v (k, val) select 's4', public.registrar_solicitud_acceso('Eva', 'eva@escuela.uy', 'Escuela 9', 'Salto', 'otro', '', '', repeat('a', 64));
insert into t15.v (k, val) select 's5', public.registrar_solicitud_acceso('Robot', 'robot@spam.com', 'Escuela X', 'Salto', 'otro', '', '', repeat('a', 64));
select t15.ok('pedido con datos bien: queda pendiente y el mail en minúscula', (select val from t15.v where k = 's1') = 'ok'
  and exists (select 1 from solicitudes_acceso where email = 'ana@escuela.uy' and estado = 'pendiente'));
select t15.ok('el mismo mail otra vez: no se duplica', (select val from t15.v where k = 's2') = 'ya_pendiente'
  and (select count(*) from solicitudes_acceso where email = 'ana@escuela.uy') = 1);
select t15.ok('desde la misma conexión: hasta 3 por hora', (select val from t15.v where k = 's3') = 'ok' and (select val from t15.v where k = 's4') = 'ok' and (select val from t15.v where k = 's5') = 'muchos');
select t15.ok('un mail mal escrito no entra', t15.falla($$select public.registrar_solicitud_acceso('X Y', 'sin-arroba', 'Escuela', 'Salto', 'otro', '', '', null)$$));
select t15.ok('un cargo que no existe no entra', t15.falla($$select public.registrar_solicitud_acceso('X Y', 'xy@escuela.uy', 'Escuela', 'Salto', 'admin', '', '', null)$$));
select t15.ok('no se guarda la IP: solo una huella de 64 caracteres', t15.falla($$select public.registrar_solicitud_acceso('X Y', 'xy@escuela.uy', 'Escuela', 'Salto', 'otro', '', '', '190.64.1.1')$$));
-- 20 por hora en total, aunque cambie la conexión
insert into t15.v (k, val) select 'tot', string_agg(public.registrar_solicitud_acceso('Persona ' || g, 'p' || g || '@escuela.uy', 'Escuela', 'Rocha', 'maestra', '', '', md5(g::text) || md5(g::text)), ',') from generate_series(1, 20) g;
select t15.ok('más de 20 pedidos por hora en total: se frenan', (select val from t15.v where k = 'tot') like '%muchos%' and (select count(*) from solicitudes_acceso where creada_en > now() - interval '1 hour') = 20);
reset role;

set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000001', false);
select t15.ok('admin: ve los pedidos', (select count(*) from solicitudes_acceso) = 20);
select t15.ok('admin: puede marcar uno como invitado', t15.afecta($$update solicitudes_acceso set estado = 'invitada', resuelta_en = now(), resuelta_por = 'f1500000-0000-0000-0000-000000000001' where email = 'ana@escuela.uy'$$) = 1);
select t15.ok('admin: no cambia el mail ni los datos', t15.falla($$update solicitudes_acceso set email = 'otro@x.uy'$$));
select t15.ok('admin: no carga pedidos a mano', t15.falla($$insert into solicitudes_acceso (nombre, email, escuela, departamento, cargo) values ('Yo', 'yo@x.uy', 'E', 'Salto', 'otro')$$));
select t15.ok('admin: no borra pedidos', t15.afecta($$delete from solicitudes_acceso$$) <= 0);
reset role;
select t15.ok('ya invitada: puede haber un pedido nuevo con ese mail (uno pendiente por mail)',
  t15.afecta($$insert into solicitudes_acceso (nombre, email, escuela, departamento, cargo) values ('Ana Pérez', 'ana@escuela.uy', 'Escuela 123', 'Montevideo', 'maestra')$$) = 1
  and t15.falla($$insert into solicitudes_acceso (nombre, email, escuela, departamento, cargo) values ('Ana Pérez', 'ana@escuela.uy', 'Escuela 123', 'Montevideo', 'maestra')$$));
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000002', false);
select t15.ok('redactora: no ve los pedidos', (select count(*) from solicitudes_acceso) = 0);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000003', false);
select t15.ok('validadora: no ve los pedidos', (select count(*) from solicitudes_acceso) = 0);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1577777-0000-0000-0000-000000000001', false);
select t15.ok('maestra: no ve los pedidos', (select count(*) from solicitudes_acceso) = 0);
select t15.ok('maestra: no los marca', t15.afecta($$update solicitudes_acceso set estado = 'descartada'$$) <= 0);
reset role;
set local role anon;
select t15.ok('visitante: nada', t15.falla($$select count(*) from solicitudes_acceso$$));
select t15.ok('visitante: no puede pedir directo (solo por el servidor)', t15.falla($$select public.registrar_solicitud_acceso('X Y', 'xy@escuela.uy', 'Escuela', 'Salto', 'otro', '', '', null)$$));
reset role;

-- =====================================================================
-- Historial anónimo de respuestas
-- =====================================================================
select t15.ok('contar vistas: solo el servidor', has_function_privilege('service_role', 'public.contar_vista_respuesta(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.contar_vista_respuesta(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.contar_vista_respuesta(uuid, text)', 'execute'));
set local role service_role;
select public.contar_vista_respuesta((select val from t15.v where k = 'fic')::uuid, 'asistente');
select public.contar_vista_respuesta((select val from t15.v where k = 'fic')::uuid, 'asistente');
select public.contar_vista_respuesta((select val from t15.v where k = 'fic')::uuid, 'actividad');
select public.contar_vista_respuesta((select val from t15.v where k = 'bor')::uuid, 'actividad');
select public.contar_vista_respuesta((select val from t15.v where k = 'fic')::uuid, 'otro');
reset role;
select t15.ok('vistas: suma por día y por origen', (select veces from vistas_respuestas where ficha_id = (select val from t15.v where k = 'fic')::uuid and origen = 'asistente') = 2
  and (select veces from vistas_respuestas where ficha_id = (select val from t15.v where k = 'fic')::uuid and origen = 'actividad') = 1);
select t15.ok('vistas: una respuesta sin publicar no suma', not exists (select 1 from vistas_respuestas where ficha_id = (select val from t15.v where k = 'bor')::uuid));
select t15.ok('vistas: un origen raro no suma', (select count(*) from vistas_respuestas where ficha_id = (select val from t15.v where k = 'fic')::uuid) = 2);
select t15.ok('vistas: sin datos de quién la vio', not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vistas_respuestas'
  and column_name not in ('ficha_id', 'dia', 'origen', 'veces')));
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1500000-0000-0000-0000-000000000002', false);
select t15.ok('equipo: ve las vistas', (select count(*) from vistas_respuestas) >= 2);
select t15.ok('equipo: no las cambia', t15.afecta($$update vistas_respuestas set veces = 999$$) <= 0);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1577777-0000-0000-0000-000000000001', false);
select t15.ok('maestra: no ve las vistas', (select count(*) from vistas_respuestas) = 0);
reset role;
set local role anon;
select t15.ok('visitante: no ve las vistas', t15.falla($$select count(*) from vistas_respuestas$$));
reset role;

select t15.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS'
    into total from t15.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\n' order by n)
    into detalle from t15.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\n%', total, detalle;
end $$;

