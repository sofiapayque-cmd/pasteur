-- =====================================================================
-- Pruebas de seguridad para correr en un proyecto REAL de Supabase
-- (solo el de desarrollo), sin dejar rastro.
--
-- Son las mismas pruebas de 1-pruebas-seguridad.sql, más unas "extra" que
-- miran los permisos por defecto de la API de Supabase.
--
-- Cómo se deshace todo:
--   · Se manda como UNA sola consulta (conector de Supabase o SQL Editor).
--     Postgres ejecuta varias sentencias de una sola consulta como UNA transacción.
--   · La última sentencia lanza un error A PROPÓSITO con el resultado adentro.
--     El error deshace la transacción entera: usuarios de prueba, docentes,
--     aulas, alumnos, el esquema "t"… nada queda guardado.
--   · Roles e identidades se cambian con SET LOCAL / set_config(…, true):
--     también se deshacen con la transacción.
--
-- Diferencias con la versión local (psql):
--   · Sin comandos de psql (\set, \gset, \o): las identidades van escritas.
--   · "etapa_desde se actualiza sola": dentro de una transacción now() no
--     avanza, así que primero se pone etapa_desde una hora atrás y después se
--     comprueba que el cambio de etapa la renueva.
--   · Las lecturas que se hacen sin reglas (como postgres) se limitan a las
--     filas de prueba, por si el proyecto ya tiene datos.
-- =====================================================================

create schema t;
create table t.resultado (n serial, prueba text, ok boolean);
create table t.ids (aula_a uuid, aula_b uuid, asig_a1 uuid, asig_a2 uuid);
grant usage on schema t to anon, authenticated, service_role;
grant all on t.resultado, t.resultado_n_seq, t.ids to anon, authenticated, service_role;

-- ¿la sentencia da error? (se ejecuta con el rol y la sesión actuales)
create function t.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
-- cantidad de filas que devuelve una consulta (o -1 si da error)
create function t.filas(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || sql || ') x' into n; return n;
exception when others then return -1; end $$;
-- cantidad de filas afectadas por un update/delete (o -1 si da error)
create function t.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
-- cambia la identidad de la sesión (como lo hace Supabase con el JWT)
create function t.como(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(uid, ''), true),
         set_config('request.jwt.claims',
                    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end,
                    true);
$$;
grant execute on all functions in schema t to anon, authenticated, service_role;

-- Identidades fijas
--   A  = aaaaaaaa-0000-0000-0000-000000000001 (maestra A)
--   B  = bbbbbbbb-0000-0000-0000-000000000001 (maestra B)
--   C1 = cccccccc-0000-0000-0000-000000000001 (alumno K7RM-01, aula de A)
--   C2 = cccccccc-0000-0000-0000-000000000002 (alumno K7RM-02, aula de A)
--   C3 = cccccccc-0000-0000-0000-000000000003 (alumno ZZZZ-01, aula de B)

-- ---------- Usuarios (lo hace Supabase Auth) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@escuela.uy', '{"nombre":"Maestra A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'b@escuela.uy', '{"nombre":"Maestra B"}');
insert into auth.users (id, email, raw_app_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'k7rm-01@alumnos.invalid', '{"rol":"alumno"}'),
  ('cccccccc-0000-0000-0000-000000000002', 'k7rm-02@alumnos.invalid', '{"rol":"alumno"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'zzzz-01@alumnos.invalid', '{"rol":"alumno"}');
select t.ok('trigger: crea docentes solo para maestras',
  (select count(*) from public.docentes where id::text like any (array['aaaaaaaa-%', 'bbbbbbbb-%', 'cccccccc-%'])) = 2);
select t.ok('trigger: guarda el nombre',
  (select nombre from public.docentes where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Maestra A');
insert into auth.users (id, is_anonymous) values ('dddddddd-0000-0000-0000-000000000001', true);
select t.ok('trigger: un usuario anónimo no se vuelve docente',
  not exists (select 1 from public.docentes where id = 'dddddddd-0000-0000-0000-000000000001'));

-- ---------- Maestra A crea su aula ----------
set local role authenticated; select t.como('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.aulas (nombre, grado) values ('4° B', 4);
select t.ok('maestra crea aula con código de 4', (select codigo ~ '^[A-HJ-NP-Z2-9]{4}$' from public.aulas limit 1));
select t.ok('maestra crea aula y recibe la fila (insert … returning, como supabase-js)', t.afecta($$insert into public.aulas (nombre, grado) values ('3° A', 3) returning codigo$$) = 1);
select t.ok('maestra edita su aula y recibe la fila (update … returning)', t.afecta($$update public.aulas set nombre = '3° A bis' where nombre = '3° A' returning id$$) = 1);
select t.ok('maestra no elige docente_id ajeno', t.falla($$insert into public.aulas (nombre, docente_id) values ('x', 'bbbbbbbb-0000-0000-0000-000000000001')$$));
reset role;
insert into t.ids (aula_a) select id from public.aulas where docente_id = 'aaaaaaaa-0000-0000-0000-000000000001' and nombre = '4° B';

-- Maestra B
set local role authenticated; select t.como('bbbbbbbb-0000-0000-0000-000000000001');
insert into public.aulas (nombre, grado) values ('5° A', 5);
select t.ok('maestra B no ve el aula de A', t.filas('select 1 from public.aulas where id = (select aula_a from t.ids)') = 0);
select t.ok('maestra B no puede editar el aula de A', t.afecta($$update public.aulas set nombre = 'robada' where id = (select aula_a from t.ids)$$) = 0);
reset role;
update t.ids set aula_b = (select id from public.aulas where docente_id = 'bbbbbbbb-0000-0000-0000-000000000001');

-- ---------- El servidor crea las cuentas de los niños (service_role) ----------
set local role service_role;
insert into public.alumnos (id, aula_id, numero, usuario) values
  ('cccccccc-0000-0000-0000-000000000001', (select aula_a from t.ids), 1, 'K7RM-01'),
  ('cccccccc-0000-0000-0000-000000000002', (select aula_a from t.ids), 2, 'K7RM-02'),
  ('cccccccc-0000-0000-0000-000000000003', (select aula_b from t.ids), 1, 'ZZZZ-01');
select t.ok('servidor ve intentos_ingreso', t.filas($$select 1 from public.intentos_ingreso where usuario = 'K7RM-01'$$) = 0);
insert into public.intentos_ingreso (usuario, fallos) values ('K7RM-01', 1);
select t.ok('servidor no borra aulas', t.falla('delete from public.aulas where id is null'));
select t.ok('servidor no borra alumnos', t.falla('delete from public.alumnos where id is null'));
reset role;

-- La maestra no puede crear alumnos sin pasar por el servidor
set local role authenticated; select t.como('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('maestra no crea alumnos directo', t.falla($$insert into public.alumnos (id, aula_id, numero, usuario) values ('cccccccc-0000-0000-0000-000000000009', (select aula_a from t.ids), 9, 'K7RM-09')$$));
select t.ok('maestra ve sus 2 alumnos', t.filas('select 1 from public.alumnos') = 2);
select t.ok('maestra no ve alumnos de otra', t.filas($$select 1 from public.alumnos where id = 'cccccccc-0000-0000-0000-000000000003'$$) = 0);
select t.ok('maestra no lee intentos de ingreso', t.filas('select 1 from public.intentos_ingreso') = -1);
-- Asignaciones
insert into public.asignaciones (aula_id, actividad, opciones) values ((select aula_a from t.ids), 'a1', '{"ambientes":["antartida-suelo"]}');
insert into public.asignaciones (aula_id, actividad, estado) values ((select aula_a from t.ids), 'a2', 'borrador');
reset role;
update t.ids set
  asig_a1 = (select id from public.asignaciones where aula_id = (select aula_a from t.ids) and actividad = 'a1'),
  asig_a2 = (select id from public.asignaciones where aula_id = (select aula_a from t.ids) and actividad = 'a2');

set local role authenticated; select t.como('bbbbbbbb-0000-0000-0000-000000000001');
select t.ok('maestra B no asigna en aula ajena', t.falla($$insert into public.asignaciones (aula_id, actividad) values ((select aula_a from t.ids), 'a3')$$));
select t.ok('maestra B no ve asignaciones ajenas', t.filas('select 1 from public.asignaciones') = 0);

-- ---------- Alumno 1 ----------
select t.como('cccccccc-0000-0000-0000-000000000001');
select t.ok('alumno ve su aula', t.filas('select 1 from public.aulas') = 1);
select t.ok('alumno ve solo su fila de alumnos', t.filas('select 1 from public.alumnos') = 1);
select t.ok('alumno no ve borradores', t.filas('select 1 from public.asignaciones') = 1);
select t.ok('alumno no crea aulas', t.falla($$insert into public.aulas (nombre) values ('mía')$$));
select t.ok('alumno no se hace docente', t.falla($$insert into public.docentes (id) values ('cccccccc-0000-0000-0000-000000000001')$$));
select t.ok('alumno no ve docentes', t.filas('select 1 from public.docentes') = 0);
insert into public.progreso (asignacion_id, aula_id, actividad, etapa, datos)
  values ((select asig_a1 from t.ids), (select aula_a from t.ids), 'a1', 'paisaje', '{"ambiente":"antartida-suelo"}');
select t.ok('alumno guarda su progreso', t.filas('select 1 from public.progreso') = 1);
-- now() no avanza dentro de la transacción: se lleva etapa_desde una hora atrás
reset role;
update public.progreso set etapa_desde = now() - interval '1 hour' where alumno_id = 'cccccccc-0000-0000-0000-000000000001';
set local role authenticated; select t.como('cccccccc-0000-0000-0000-000000000001');
select t.ok('alumno avanza de etapa', t.afecta($$update public.progreso set etapa = 'muestra', datos = datos || '{"muestra":1}'$$) = 1);
select t.ok('etapa_desde se actualiza sola', (select etapa_desde from public.progreso) > now() - interval '1 minute');
select t.ok('alumno no guarda a nombre de otro', t.falla($$insert into public.progreso (alumno_id, asignacion_id, aula_id, actividad, etapa) values ('cccccccc-0000-0000-0000-000000000002', (select asig_a1 from t.ids), (select aula_a from t.ids), 'a1', 'x')$$));
select t.ok('alumno no mezcla actividad y asignación', t.falla($$insert into public.resultados (asignacion_id, aula_id, actividad, tipo, valor) values ((select asig_a1 from t.ids), (select aula_a from t.ids), 'a3', 'x', '{}')$$));
select t.ok('alumno no trabaja en un borrador', t.falla($$insert into public.progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a2 from t.ids), (select aula_a from t.ids), 'a2', 'x')$$));
select t.ok('alumno no cambia de aula su progreso', t.falla($$update public.progreso set aula_id = (select aula_b from t.ids)$$));
select t.ok('datos de más de 64 KB se rechazan', t.falla($$update public.progreso set datos = jsonb_build_object('x', repeat('a', 70000))$$));
insert into public.resultados (asignacion_id, aula_id, actividad, tipo, valor)
  values ((select asig_a1 from t.ids), (select aula_a from t.ids), 'a1', 'placa', '{"temperatura":37,"colonias":12}');
select t.ok('alumno registra un resultado', t.filas('select 1 from public.resultados') = 1);
select t.ok('alumno no modifica resultados', t.falla($$update public.resultados set valor = '{}'$$));
select t.ok('alumno no borra resultados', t.falla('delete from public.resultados'));
select t.ok('alumno elige apodo', t.afecta($$update public.alumnos set apodo = 'Coco curioso', color = '#EF6F5E'$$) = 1);
select t.ok('alumno no cambia su número', t.falla('update public.alumnos set numero = 5'));
select t.ok('alumno no cambia su usuario', t.falla($$update public.alumnos set usuario = 'ZZZZ-09'$$));
select t.ok('alumno no puede desactivarse a sí mismo', t.falla('update public.alumnos set activo = false'));
select t.ok('alumno no lee intentos de ingreso', t.filas('select 1 from public.intentos_ingreso') = -1);

-- ---------- Alumno 2 (misma aula) y alumno 3 (otra aula) ----------
select t.como('cccccccc-0000-0000-0000-000000000002');
select t.ok('compañero no ve el progreso de otro', t.filas('select 1 from public.progreso') = 0);
select t.ok('compañero no ve resultados de otro', t.filas('select 1 from public.resultados') = 0);
select t.ok('compañero no ve la fila de otro', t.filas($$select 1 from public.alumnos where id = 'cccccccc-0000-0000-0000-000000000001'$$) = 0);
select t.como('cccccccc-0000-0000-0000-000000000003');
select t.ok('alumno de otra aula no ve la asignación', t.filas('select 1 from public.asignaciones') = 0);
select t.ok('alumno de otra aula no guarda en ella', t.falla($$insert into public.progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a1 from t.ids), (select aula_a from t.ids), 'a1', 'x')$$));

-- ---------- Etapa 3: año lectivo, entre aulas, entre alumnos, cerrar sesiones ----------
select t.como('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('aula: año lectivo por defecto es el año actual', (select anio_lectivo from public.aulas where id = (select aula_a from t.ids)) = extract(year from now() at time zone 'America/Montevideo'));
select t.ok('maestra cambia el año lectivo de su aula', t.afecta($$update public.aulas set anio_lectivo = 2027 where id = (select aula_a from t.ids)$$) = 1);
select t.ok('año lectivo fuera de rango se rechaza', t.falla($$update public.aulas set anio_lectivo = 1999 where id = (select aula_a from t.ids)$$));
select t.ok('maestra no pasa su aula a otra docente', t.falla($$update public.aulas set docente_id = 'bbbbbbbb-0000-0000-0000-000000000001'$$));
select t.ok('maestra no cambia de aula a un alumno', t.falla($$update public.alumnos set aula_id = (select aula_b from t.ids)$$));
select t.ok('maestra no cambia usuario ni número de un alumno', t.falla($$update public.alumnos set usuario = 'ZZZZ-02'$$) and t.falla('update public.alumnos set numero = 9'));
select t.como('bbbbbbbb-0000-0000-0000-000000000001');
select t.ok('maestra B no cambia el año lectivo del aula de A', t.afecta($$update public.aulas set anio_lectivo = 2030 where id = (select aula_a from t.ids)$$) = 0);
select t.ok('maestra B no ve los alumnos del aula de A', t.filas($$select 1 from public.alumnos where aula_id = (select aula_a from t.ids)$$) = 0);
select t.ok('maestra B no desactiva alumnos del aula de A', t.afecta($$update public.alumnos set activo = false where aula_id = (select aula_a from t.ids)$$) = 0);
select t.como('cccccccc-0000-0000-0000-000000000001');
select t.ok('alumno no ve otra aula', t.filas($$select 1 from public.aulas where id = (select aula_b from t.ids)$$) = 0);
select t.ok('alumno no cambia el apodo de un compañero', t.afecta($$update public.alumnos set apodo = 'x' where id = 'cccccccc-0000-0000-0000-000000000002'$$) = 0);
select t.ok('alumno no cambia el nombre de su aula', t.afecta($$update public.aulas set nombre = 'x'$$) = 0);
select t.como('cccccccc-0000-0000-0000-000000000003');
select t.ok('alumno de otra aula no ve los alumnos del aula', t.filas($$select 1 from public.alumnos where aula_id = (select aula_a from t.ids)$$) = 0);
select t.ok('alumno de otra aula no ve el progreso del aula', t.filas('select 1 from public.progreso') = 0);
select t.ok('alumno de otra aula no ve el aula', t.filas($$select 1 from public.aulas where id = (select aula_a from t.ids)$$) = 0);
reset role;
insert into auth.sessions (id, user_id) values (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000002'), (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001');
set local role authenticated; select t.como('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('maestra no cierra sesiones directo (solo el servidor)', t.falla($$select public.cerrar_sesiones_alumno('cccccccc-0000-0000-0000-000000000002')$$));
select t.como('cccccccc-0000-0000-0000-000000000001');
select t.ok('alumno no cierra sesiones de otro', t.falla($$select public.cerrar_sesiones_alumno('cccccccc-0000-0000-0000-000000000002')$$));
reset role;
set local role service_role; 
select t.ok('servidor cierra las sesiones de un alumno', public.cerrar_sesiones_alumno('cccccccc-0000-0000-0000-000000000002') = 1);
select t.ok('servidor no cierra sesiones de una maestra con esa función', public.cerrar_sesiones_alumno('aaaaaaaa-0000-0000-0000-000000000001') = 0);
reset role;
select t.ok('la sesión de la maestra sigue abierta', (select count(*) from auth.sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select t.ok('ninguna tabla de la web guarda contraseñas', not exists (select 1 from information_schema.columns where table_schema = 'public' and column_name ~* '(clave|password|contrasen|secret)'));
set local role authenticated;

-- ---------- Sesión en vivo ----------
select t.como('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.sesiones (asignacion_id, aula_id) values ((select asig_a1 from t.ids), (select aula_a from t.ids));
select t.ok('una sola sesión abierta por aula', t.falla($$insert into public.sesiones (asignacion_id, aula_id) values ((select asig_a1 from t.ids), (select aula_a from t.ids))$$));
select t.ok('sesión: no se mezcla asignación de otra aula', t.falla($$insert into public.sesiones (asignacion_id, aula_id) values ((select asig_a1 from t.ids), (select aula_b from t.ids))$$));
select t.ok('maestra ve progreso de su aula', t.filas('select 1 from public.progreso') = 1);
select t.ok('maestra ve resultados de su aula', t.filas('select 1 from public.resultados') = 1);
select t.ok('maestra no modifica el progreso del alumno', t.afecta($$update public.progreso set etapa = 'x'$$) = 0);
select t.ok('maestra pausa la sesión', t.afecta('update public.sesiones set pausada = true, estado = $$en-curso$$') = 1);
select t.como('cccccccc-0000-0000-0000-000000000001');
select t.ok('alumno ve la sesión (pausa)', (select pausada from public.sesiones limit 1));
select t.ok('alumno no maneja la sesión', t.afecta('update public.sesiones set pausada = false') = 0);
select t.como('bbbbbbbb-0000-0000-0000-000000000001');
select t.ok('maestra B no ve progreso ajeno', t.filas('select 1 from public.progreso') = 0);
select t.ok('maestra B no ve sesiones ajenas', t.filas('select 1 from public.sesiones') = 0);

-- ---------- Desactivar, cerrar, archivar ----------
select t.como('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('maestra desactiva a un alumno', t.afecta($$update public.alumnos set activo = false where usuario = 'K7RM-01'$$) = 1);
select t.como('cccccccc-0000-0000-0000-000000000001');
select t.ok('desactivado: ya no ve asignaciones', t.filas('select 1 from public.asignaciones') = 0);
select t.ok('desactivado: ya no guarda progreso', t.afecta($$update public.progreso set etapa = 'y'$$) = 0);
select t.ok('desactivado: no se reactiva solo', t.afecta('update public.alumnos set activo = true') = 0);
select t.como('aaaaaaaa-0000-0000-0000-000000000001');
update public.asignaciones set estado = 'cerrada', cerrada_en = now() where actividad = 'a1';
select t.como('cccccccc-0000-0000-0000-000000000002');
select t.ok('asignación cerrada: no se empieza', t.falla($$insert into public.progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a1 from t.ids), (select aula_a from t.ids), 'a1', 'x')$$));
select t.como('aaaaaaaa-0000-0000-0000-000000000001');
update public.asignaciones set estado = 'activa', cerrada_en = null where actividad = 'a1';
update public.aulas set archivada_en = now() where id = (select aula_a from t.ids);
select t.como('cccccccc-0000-0000-0000-000000000002');
select t.ok('aula archivada: no se empieza', t.falla($$insert into public.progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a1 from t.ids), (select aula_a from t.ids), 'a1', 'x')$$));
select t.ok('nadie borra aulas', t.falla('delete from public.aulas'));
select t.como('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok('la maestra tampoco borra aulas', t.falla('delete from public.aulas'));
select t.ok('la maestra no borra alumnos', t.falla('delete from public.alumnos'));
select t.ok('la maestra no borra resultados', t.falla('delete from public.resultados'));

-- ---------- Maestra suspendida / pendiente ----------
reset role;
update public.docentes set estado = 'suspendida' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
set local role authenticated; select t.como('bbbbbbbb-0000-0000-0000-000000000001');
select t.ok('suspendida: no ve sus aulas', t.filas('select 1 from public.aulas') = 0);
select t.ok('suspendida: no crea aulas', t.falla($$insert into public.aulas (nombre) values ('otra')$$));
select t.ok('suspendida: no ve sus alumnos', t.filas('select 1 from public.alumnos') = 0);
select t.ok('suspendida: ve su propio estado', (select estado from public.docentes) = 'suspendida');
select t.ok('la maestra no cambia su estado', t.falla($$update public.docentes set estado = 'activa'$$));
reset role;
update public.docentes set estado = 'pendiente' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
set local role authenticated; select t.como('bbbbbbbb-0000-0000-0000-000000000001');
select t.ok('pendiente: no crea aulas', t.falla($$insert into public.aulas (nombre) values ('otra')$$));
reset role;
update public.docentes set estado = 'activa' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
set local role authenticated; select t.como('bbbbbbbb-0000-0000-0000-000000000001');
select t.ok('reactivada: vuelve a ver su aula', t.filas('select 1 from public.aulas') = 1);

-- ---------- Una cuenta de alumno nunca es maestra (migración 7) ----------
reset role;
insert into auth.users (id, email) values ('eeeeeeee-0000-0000-0000-000000000001', 'k7rm-09@alumnos.invalid');
select t.ok('trigger: un mail interno de alumno nunca crea una fila de docente', not exists (select 1 from public.docentes where id = 'eeeeeeee-0000-0000-0000-000000000001'));
insert into public.docentes (id, nombre) values ('cccccccc-0000-0000-0000-000000000002', 'fila puesta a propósito');
set local role authenticated; select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000002', true), set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"rol":"alumno"}}', true);
select t.ok('alumno con fila de docente igual no crea aulas', t.falla($$insert into public.aulas (nombre) values ('trampa')$$));
select t.ok('alumno con fila de docente igual no ve aulas como maestra', t.filas('select 1 from public.aulas') = 1);
reset role;
delete from public.aulas where nombre = 'trampa'; delete from public.docentes where id = 'cccccccc-0000-0000-0000-000000000002';

-- ---------- Sin sesión ----------
reset role; set local role anon; select t.como(null);
select t.ok('sin sesión: no lee aulas', t.filas('select 1 from public.aulas') = -1);
select t.ok('sin sesión: no lee alumnos', t.filas('select 1 from public.alumnos') = -1);
select t.ok('sin sesión: no lee progreso', t.filas('select 1 from public.progreso') = -1);
select t.ok('sin sesión: no genera códigos', t.falla('select privado.generar_codigo_aula()'));
reset role;

-- ---------- Funciones de ayuda fuera de la API (lo que mira el asesor, lint 0029) ----------
select t.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));
set local role anon; select t.como(null);

-- ---------- Extra (solo Supabase real: permisos por defecto de la API) ----------
select t.ok('extra · sin sesión: no lee docentes', t.filas('select 1 from public.docentes') = -1);
select t.ok('extra · sin sesión: no lee asignaciones', t.filas('select 1 from public.asignaciones') = -1);
select t.ok('extra · sin sesión: no lee sesiones', t.filas('select 1 from public.sesiones') = -1);
select t.ok('extra · sin sesión: no lee resultados', t.filas('select 1 from public.resultados') = -1);
select t.ok('extra · sin sesión: no lee intentos de ingreso', t.filas('select 1 from public.intentos_ingreso') = -1);
select t.ok('extra · sin sesión: no llama a es_docente()', t.falla('select privado.es_docente()'));
select t.ok('extra · sin sesión: no llama a mi_aula()', t.falla('select privado.mi_aula()'));
select t.ok('extra · sin sesión: no llama a asignacion_abierta()', t.falla($$select privado.asignacion_abierta('00000000-0000-0000-0000-000000000000')$$));
reset role;
select t.ok('extra · anon no tiene ningún permiso de tabla en public',
  not exists (select 1 from information_schema.role_table_grants
              where grantee = 'anon' and table_schema = 'public'));
select t.ok('extra · authenticated no puede borrar en ninguna tabla de public',
  not exists (select 1 from information_schema.role_table_grants
              where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('DELETE', 'TRUNCATE')));

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS ('
         || count(*) filter (where prueba not like 'extra%') || ' originales + '
         || count(*) filter (where prueba like 'extra%') || ' extra)'
    into total from t.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\n' order by n)
    into detalle from t.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\n%', total, detalle;
end $$;
