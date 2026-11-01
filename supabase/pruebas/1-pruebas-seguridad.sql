-- =====================================================================
-- Pruebas de seguridad de las migraciones (Postgres local con
-- 0-imitacion-supabase.sql). Cada prueba imprime OK o FALLA.
-- Uso: psql -f 0-imitacion-supabase.sql, después las 3 migraciones, después este archivo.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
create schema t;
create table t.resultado (n serial, prueba text, ok boolean);
grant usage on schema t to anon, authenticated, service_role;
grant all on t.resultado, t.resultado_n_seq to anon, authenticated, service_role;

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
grant execute on all functions in schema t to anon, authenticated, service_role;

-- Identidades fijas
\set A  '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B  '''bbbbbbbb-0000-0000-0000-000000000001'''
\set C1 '''cccccccc-0000-0000-0000-000000000001'''
\set C2 '''cccccccc-0000-0000-0000-000000000002'''
\set C3 '''cccccccc-0000-0000-0000-000000000003'''

-- ---------- Usuarios (lo hace Supabase Auth) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  (:A, 'a@escuela.uy', '{"nombre":"Maestra A"}'), (:B, 'b@escuela.uy', '{"nombre":"Maestra B"}');
insert into auth.users (id, email, raw_app_meta_data) values
  (:C1, 'k7rm-01@alumnos.invalid', '{"rol":"alumno"}'),
  (:C2, 'k7rm-02@alumnos.invalid', '{"rol":"alumno"}'),
  (:C3, 'zzzz-01@alumnos.invalid', '{"rol":"alumno"}');
select t.ok('trigger: crea docentes solo para maestras', (select count(*) from docentes) = 2);
select t.ok('trigger: guarda el nombre', (select nombre from docentes where id = :A) = 'Maestra A');
insert into auth.users (id, is_anonymous) values ('dddddddd-0000-0000-0000-000000000001', true);
select t.ok('trigger: un usuario anónimo no se vuelve docente', (select count(*) from docentes) = 2);

-- ---------- Maestra A crea su aula ----------
set role authenticated; select set_config('request.jwt.claim.sub', :A, false);
insert into aulas (nombre, grado) values ('4° B', 4);
select t.ok('maestra crea aula con código de 4', (select codigo ~ '^[A-HJ-NP-Z2-9]{4}$' from aulas limit 1));
select t.ok('maestra no elige docente_id ajeno', t.falla($$insert into aulas (nombre, docente_id) values ('x', 'bbbbbbbb-0000-0000-0000-000000000001')$$));
reset role;
create temp table ids as select (select id from aulas where docente_id = :A) as aula_a;
grant select on ids to authenticated, service_role, anon;

-- Maestra B
set role authenticated; select set_config('request.jwt.claim.sub', :B, false);
insert into aulas (nombre, grado) values ('5° A', 5);
select t.ok('maestra B no ve el aula de A', t.filas('select 1 from aulas where id = (select aula_a from ids)') = 0);
select t.ok('maestra B no puede editar el aula de A', t.afecta($$update aulas set nombre = 'robada' where id = (select aula_a from ids)$$) = 0);
reset role;
insert into ids select (select id from aulas where docente_id = :B);
alter table ids add column aula_b uuid;
update ids set aula_b = (select id from aulas where docente_id = :B);
delete from ids where aula_a = aula_b or aula_a is null;

-- ---------- El servidor crea las cuentas de los niños (service_role) ----------
set role service_role;
insert into alumnos (id, aula_id, numero, usuario) values
  (:C1, (select aula_a from ids), 1, 'K7RM-01'),
  (:C2, (select aula_a from ids), 2, 'K7RM-02'),
  (:C3, (select aula_b from ids), 1, 'ZZZZ-01');
select t.ok('servidor ve intentos_ingreso', t.filas('select 1 from intentos_ingreso') = 0);
insert into intentos_ingreso (usuario, fallos) values ('K7RM-01', 1);
select t.ok('servidor no borra aulas', t.falla('delete from aulas where id is null'));
select t.ok('servidor no borra alumnos', t.falla('delete from alumnos where id is null'));
reset role;

-- La maestra no puede crear alumnos sin pasar por el servidor
set role authenticated; select set_config('request.jwt.claim.sub', :A, false);
select t.ok('maestra no crea alumnos directo', t.falla($$insert into alumnos (id, aula_id, numero, usuario) values ('cccccccc-0000-0000-0000-000000000009', (select aula_a from ids), 9, 'K7RM-09')$$));
select t.ok('maestra ve sus 2 alumnos', t.filas('select 1 from alumnos') = 2);
select t.ok('maestra no ve alumnos de otra', t.filas($$select 1 from alumnos where id = 'cccccccc-0000-0000-0000-000000000003'$$) = 0);
select t.ok('maestra no lee intentos de ingreso', t.filas('select 1 from intentos_ingreso') = -1);
-- Asignaciones
insert into asignaciones (aula_id, actividad, opciones) values ((select aula_a from ids), 'a1', '{"ambientes":["antartida-suelo"]}');
insert into asignaciones (aula_id, actividad, estado) values ((select aula_a from ids), 'a2', 'borrador');
reset role;
alter table ids add column asig_a1 uuid, add column asig_a2 uuid;
update ids set asig_a1 = (select id from asignaciones where actividad = 'a1'), asig_a2 = (select id from asignaciones where actividad = 'a2');

set role authenticated; select set_config('request.jwt.claim.sub', :B, false);
select t.ok('maestra B no asigna en aula ajena', t.falla($$insert into asignaciones (aula_id, actividad) values ((select aula_a from ids), 'a3')$$));
select t.ok('maestra B no ve asignaciones ajenas', t.filas('select 1 from asignaciones') = 0);

-- ---------- Alumno 1 ----------
select set_config('request.jwt.claim.sub', :C1, false);
select t.ok('alumno ve su aula', t.filas('select 1 from aulas') = 1);
select t.ok('alumno ve solo su fila de alumnos', t.filas('select 1 from alumnos') = 1);
select t.ok('alumno no ve borradores', t.filas('select 1 from asignaciones') = 1);
select t.ok('alumno no crea aulas', t.falla($$insert into aulas (nombre) values ('mía')$$));
select t.ok('alumno no se hace docente', t.falla($$insert into docentes (id) values ('cccccccc-0000-0000-0000-000000000001')$$));
select t.ok('alumno no ve docentes', t.filas('select 1 from docentes') = 0);
insert into progreso (asignacion_id, aula_id, actividad, etapa, datos)
  values ((select asig_a1 from ids), (select aula_a from ids), 'a1', 'paisaje', '{"ambiente":"antartida-suelo"}');
select t.ok('alumno guarda su progreso', t.filas('select 1 from progreso') = 1);
select etapa_desde as antes from progreso \gset
select pg_sleep(0.05);
select t.ok('alumno avanza de etapa', t.afecta($$update progreso set etapa = 'muestra', datos = datos || '{"muestra":1}'$$) = 1);
select t.ok('etapa_desde se actualiza sola', (select etapa_desde from progreso) > :'antes'::timestamptz);
select t.ok('alumno no guarda a nombre de otro', t.falla($$insert into progreso (alumno_id, asignacion_id, aula_id, actividad, etapa) values ('cccccccc-0000-0000-0000-000000000002', (select asig_a1 from ids), (select aula_a from ids), 'a1', 'x')$$));
select t.ok('alumno no mezcla actividad y asignación', t.falla($$insert into resultados (asignacion_id, aula_id, actividad, tipo, valor) values ((select asig_a1 from ids), (select aula_a from ids), 'a3', 'x', '{}')$$));
select t.ok('alumno no trabaja en un borrador', t.falla($$insert into progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a2 from ids), (select aula_a from ids), 'a2', 'x')$$));
select t.ok('alumno no cambia de aula su progreso', t.falla($$update progreso set aula_id = (select aula_b from ids)$$));
select t.ok('datos de más de 64 KB se rechazan', t.falla($$update progreso set datos = jsonb_build_object('x', repeat('a', 70000))$$));
insert into resultados (asignacion_id, aula_id, actividad, tipo, valor)
  values ((select asig_a1 from ids), (select aula_a from ids), 'a1', 'placa', '{"temperatura":37,"colonias":12}');
select t.ok('alumno registra un resultado', t.filas('select 1 from resultados') = 1);
select t.ok('alumno no modifica resultados', t.falla($$update resultados set valor = '{}'$$));
select t.ok('alumno no borra resultados', t.falla('delete from resultados'));
select t.ok('alumno elige apodo', t.afecta($$update alumnos set apodo = 'Coco curioso', color = '#EF6F5E'$$) = 1);
select t.ok('alumno no cambia su número', t.falla('update alumnos set numero = 5'));
select t.ok('alumno no cambia su usuario', t.falla($$update alumnos set usuario = 'ZZZZ-09'$$));
select t.ok('alumno no puede desactivarse a sí mismo', t.falla('update alumnos set activo = false'));
select t.ok('alumno no lee intentos de ingreso', t.filas('select 1 from intentos_ingreso') = -1);

-- ---------- Alumno 2 (misma aula) y alumno 3 (otra aula) ----------
select set_config('request.jwt.claim.sub', :C2, false);
select t.ok('compañero no ve el progreso de otro', t.filas('select 1 from progreso') = 0);
select t.ok('compañero no ve resultados de otro', t.filas('select 1 from resultados') = 0);
select t.ok('compañero no ve la fila de otro', t.filas($$select 1 from alumnos where id = 'cccccccc-0000-0000-0000-000000000001'$$) = 0);
select set_config('request.jwt.claim.sub', :C3, false);
select t.ok('alumno de otra aula no ve la asignación', t.filas('select 1 from asignaciones') = 0);
select t.ok('alumno de otra aula no guarda en ella', t.falla($$insert into progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a1 from ids), (select aula_a from ids), 'a1', 'x')$$));

-- ---------- Sesión en vivo ----------
select set_config('request.jwt.claim.sub', :A, false);
insert into sesiones (asignacion_id, aula_id) values ((select asig_a1 from ids), (select aula_a from ids));
select t.ok('una sola sesión abierta por aula', t.falla($$insert into sesiones (asignacion_id, aula_id) values ((select asig_a1 from ids), (select aula_a from ids))$$));
select t.ok('sesión: no se mezcla asignación de otra aula', t.falla($$insert into sesiones (asignacion_id, aula_id) values ((select asig_a1 from ids), (select aula_b from ids))$$));
select t.ok('maestra ve progreso de su aula', t.filas('select 1 from progreso') = 1);
select t.ok('maestra ve resultados de su aula', t.filas('select 1 from resultados') = 1);
select t.ok('maestra no modifica el progreso del alumno', t.afecta($$update progreso set etapa = 'x'$$) = 0);
select t.ok('maestra pausa la sesión', t.afecta('update sesiones set pausada = true, estado = $$en-curso$$') = 1);
select set_config('request.jwt.claim.sub', :C1, false);
select t.ok('alumno ve la sesión (pausa)', (select pausada from sesiones limit 1));
select t.ok('alumno no maneja la sesión', t.afecta('update sesiones set pausada = false') = 0);
select set_config('request.jwt.claim.sub', :B, false);
select t.ok('maestra B no ve progreso ajeno', t.filas('select 1 from progreso') = 0);
select t.ok('maestra B no ve sesiones ajenas', t.filas('select 1 from sesiones') = 0);

-- ---------- Desactivar, cerrar, archivar ----------
select set_config('request.jwt.claim.sub', :A, false);
select t.ok('maestra desactiva a un alumno', t.afecta($$update alumnos set activo = false where usuario = 'K7RM-01'$$) = 1);
select set_config('request.jwt.claim.sub', :C1, false);
select t.ok('desactivado: ya no ve asignaciones', t.filas('select 1 from asignaciones') = 0);
select t.ok('desactivado: ya no guarda progreso', t.afecta($$update progreso set etapa = 'y'$$) = 0);
select t.ok('desactivado: no se reactiva solo', t.afecta('update alumnos set activo = true') = 0);
select set_config('request.jwt.claim.sub', :A, false);
update asignaciones set estado = 'cerrada', cerrada_en = now() where actividad = 'a1';
select set_config('request.jwt.claim.sub', :C2, false);
select t.ok('asignación cerrada: no se empieza', t.falla($$insert into progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a1 from ids), (select aula_a from ids), 'a1', 'x')$$));
select set_config('request.jwt.claim.sub', :A, false);
update asignaciones set estado = 'activa', cerrada_en = null where actividad = 'a1';
update aulas set archivada_en = now() where id = (select aula_a from ids);
select set_config('request.jwt.claim.sub', :C2, false);
select t.ok('aula archivada: no se empieza', t.falla($$insert into progreso (asignacion_id, aula_id, actividad, etapa) values ((select asig_a1 from ids), (select aula_a from ids), 'a1', 'x')$$));
select t.ok('nadie borra aulas', t.falla('delete from aulas'));
select set_config('request.jwt.claim.sub', :A, false);
select t.ok('la maestra tampoco borra aulas', t.falla('delete from aulas'));
select t.ok('la maestra no borra alumnos', t.falla('delete from alumnos'));
select t.ok('la maestra no borra resultados', t.falla('delete from resultados'));

-- ---------- Maestra suspendida / pendiente ----------
reset role;
update docentes set estado = 'suspendida' where id = :B;
set role authenticated; select set_config('request.jwt.claim.sub', :B, false);
select t.ok('suspendida: no ve sus aulas', t.filas('select 1 from aulas') = 0);
select t.ok('suspendida: no crea aulas', t.falla($$insert into aulas (nombre) values ('otra')$$));
select t.ok('suspendida: no ve sus alumnos', t.filas('select 1 from alumnos') = 0);
select t.ok('suspendida: ve su propio estado', (select estado from docentes) = 'suspendida');
select t.ok('la maestra no cambia su estado', t.falla($$update docentes set estado = 'activa'$$));
reset role;
update docentes set estado = 'pendiente' where id = :B;
set role authenticated; select set_config('request.jwt.claim.sub', :B, false);
select t.ok('pendiente: no crea aulas', t.falla($$insert into aulas (nombre) values ('otra')$$));
reset role;
update docentes set estado = 'activa' where id = :B;
set role authenticated; select set_config('request.jwt.claim.sub', :B, false);
select t.ok('reactivada: vuelve a ver su aula', t.filas('select 1 from aulas') = 1);

-- ---------- Sin sesión ----------
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select t.ok('sin sesión: no lee aulas', t.filas('select 1 from aulas') = -1);
select t.ok('sin sesión: no lee alumnos', t.filas('select 1 from alumnos') = -1);
select t.ok('sin sesión: no lee progreso', t.filas('select 1 from progreso') = -1);
select t.ok('sin sesión: no genera códigos', t.falla('select privado.generar_codigo_aula()'));
reset role;

-- ---------- Funciones de ayuda fuera de la API (lo que mira el asesor, lint 0029) ----------
select t.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

-- ---------- Resultado ----------
\o
\pset footer off
select case when ok then 'OK   ' else 'FALLA' end as " ", prueba from t.resultado order by n;
select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS' as total from t.resultado;
