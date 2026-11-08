-- =====================================================================
-- Pruebas de la migración 16 (ingreso de los alumnos: intentos y bloqueo),
-- en el Postgres local. Cada prueba imprime OK o FALLA.
-- Para el proyecto real se genera 10-pruebas-ingreso-alumnos-real.sql con
-- a-real.py (misma lógica, en una transacción que se deshace).
-- La prueba de 30 intentos a la vez está en carrera-ingreso.sh.
-- =====================================================================
\set ON_ERROR_STOP on
\o /dev/null
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t9;
create table t9.resultado (n serial, prueba text, ok boolean);
create table t9.v (k text primary key, val text);
grant usage on schema t9 to anon, authenticated, service_role;
grant all on t9.resultado, t9.resultado_n_seq, t9.v to anon, authenticated, service_role;
create function t9.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t9.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t9.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
grant execute on all functions in schema t9 to anon, authenticated, service_role;

-- Usuarios de prueba (no hace falta que existan cuentas: el contador va por usuario)
\set U1 '''T9QA-01'''
\set U2 '''T9QA-02'''
\set U3 '''T9QA-03'''

-- =====================================================================
-- Quién puede usarlas
-- =====================================================================
select t9.ok('visitante: no puede pedir intentos', not has_function_privilege('anon', 'public.reservar_intento_ingreso(text)', 'execute'));
select t9.ok('alumno o maestra: no puede pedir intentos', not has_function_privilege('authenticated', 'public.reservar_intento_ingreso(text)', 'execute'));
select t9.ok('nadie más que el servidor devuelve intentos', not has_function_privilege('authenticated', 'public.devolver_intento_ingreso(text)', 'execute')
  and not has_function_privilege('anon', 'public.devolver_intento_ingreso(text)', 'execute'));
select t9.ok('el servidor sí', has_function_privilege('service_role', 'public.reservar_intento_ingreso(text)', 'execute')
  and has_function_privilege('service_role', 'public.devolver_intento_ingreso(text)', 'execute'));
select t9.ok('no son security definer', not exists (select 1 from pg_proc where proname in ('reservar_intento_ingreso', 'devolver_intento_ingreso') and prosecdef));
set role authenticated;
select t9.ok('alumno: llamarla falla', t9.falla($$select public.reservar_intento_ingreso('T9QA-01')$$));
select t9.ok('alumno: no ve la tabla de intentos', t9.falla($$select count(*) from public.intentos_ingreso$$));
reset role;

-- =====================================================================
-- Cinco intentos y bloqueo
-- =====================================================================
set role service_role;
insert into t9.v (k, val) select 'r' || g, public.reservar_intento_ingreso(:U1)::text from generate_series(1, 5) g;
select t9.ok('del 1.º al 5.º intento: pasa', (select count(*) from t9.v where k like 'r%' and val = 'true') = 5);
select t9.ok('el 6.º: no pasa', not public.reservar_intento_ingreso(:U1));
reset role;
select t9.ok('el 6.º deja la cuenta bloqueada unos 10 minutos', (select bloqueado_hasta between now() + interval '9 minutes' and now() + interval '11 minutes' from public.intentos_ingreso where usuario = :U1));
set role service_role;
select t9.ok('bloqueada: tampoco pasa el 7.º', not public.reservar_intento_ingreso(:U1));
reset role;
select t9.ok('bloqueada: los intentos rechazados no alargan el bloqueo', (select bloqueado_hasta <= now() + interval '10 minutes' from public.intentos_ingreso where usuario = :U1));
select t9.ok('otro usuario no se ve afectado', (select count(*) from public.intentos_ingreso where usuario = :U2) = 0);
set role service_role;
select t9.ok('otro usuario: pasa', public.reservar_intento_ingreso(:U2));
reset role;

-- Termina el bloqueo (se simula moviendo la hora del bloqueo)
update public.intentos_ingreso set bloqueado_hasta = now() - interval '1 second' where usuario = :U1;
set role service_role;
select t9.ok('terminado el bloqueo: vuelve a pasar', public.reservar_intento_ingreso(:U1));
reset role;
select t9.ok('terminado el bloqueo: la cuenta empieza de cero', (select fallos = 1 and bloqueado_hasta is null from public.intentos_ingreso where usuario = :U1));

-- Pasaron 10 minutos sin intentos: empieza de cero
set role service_role;
select public.reservar_intento_ingreso(:U3) from generate_series(1, 4);
reset role;
update public.intentos_ingreso set actualizado_en = now() - interval '11 minutes' where usuario = :U3;
set role service_role;
select t9.ok('10 minutos sin intentos: vuelve a tener 5', public.reservar_intento_ingreso(:U3));
reset role;
select t9.ok('10 minutos sin intentos: la cuenta quedó en 1', (select fallos from public.intentos_ingreso where usuario = :U3) = 1);

-- =====================================================================
-- Devolver un intento (Supabase frenó el pedido antes de probar la clave)
-- =====================================================================
set role service_role;
select public.devolver_intento_ingreso(:U3);
reset role;
select t9.ok('devolver: resta uno', (select fallos from public.intentos_ingreso where usuario = :U3) = 0);
set role service_role;
select public.devolver_intento_ingreso(:U3);
reset role;
select t9.ok('devolver: nunca baja de cero', (select fallos from public.intentos_ingreso where usuario = :U3) = 0);
set role service_role;
select public.reservar_intento_ingreso(:U2) from generate_series(1, 5);
reset role;
select t9.ok('devolver: no saca un bloqueo', (select bloqueado_hasta is not null from public.intentos_ingreso where usuario = :U2));
set role service_role;
select public.devolver_intento_ingreso(:U2);
reset role;
select t9.ok('devolver: el bloqueo sigue', (select bloqueado_hasta > now() from public.intentos_ingreso where usuario = :U2));

-- =====================================================================
-- Formato
-- =====================================================================
set role service_role;
select t9.ok('usuario con formato raro: no pasa', not public.reservar_intento_ingreso('hola'));
select t9.ok('usuario vacío: no pasa', not public.reservar_intento_ingreso(''));
select t9.ok('usuario nulo: no pasa', not public.reservar_intento_ingreso(null));
select t9.ok('minúsculas: no pasa (el servidor manda mayúsculas)', not public.reservar_intento_ingreso('t9qa-01'));
reset role;
select t9.ok('formato raro: no deja filas', (select count(*) from public.intentos_ingreso where usuario in ('hola', '', 't9qa-01')) = 0);

-- Un ingreso correcto: el servidor borra la fila (service_role puede)
set role service_role;
select t9.ok('ingreso correcto: el servidor borra la cuenta de intentos', not t9.falla($$delete from public.intentos_ingreso where usuario = 'T9QA-01'$$));
reset role;
select t9.ok('ingreso correcto: quedó borrada', (select count(*) from public.intentos_ingreso where usuario = :U1) = 0);

-- Limpieza (en la versión real, todo se deshace igual)
delete from public.intentos_ingreso where usuario like 'T9QA-%';

\o
\pset footer off
select case when ok then 'OK   ' else 'FALLA' end as " ", prueba from t9.resultado order by n;
select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS' as "ingreso de alumnos" from t9.resultado;
