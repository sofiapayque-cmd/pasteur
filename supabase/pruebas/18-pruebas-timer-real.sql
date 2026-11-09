-- =====================================================================
-- GENERADO con a-real.py desde 17-pruebas-timer.sql: no editar a mano.
--
-- Para correr en un proyecto REAL de Supabase (solo el de desarrollo), sin
-- dejar rastro. Se manda como UNA sola consulta: Postgres la ejecuta como una
-- transacción, y la última sentencia lanza un error A PROPÓSITO con el
-- resultado adentro. El error deshace todo: usuarios de prueba, equipo,
-- fichas, publicaciones, el esquema "t17"… nada queda guardado.
-- =====================================================================
-- =====================================================================
-- Pruebas de la migración 21 (timer de la clase en vivo), en el Postgres
-- local. Arma dos maestras, un aula con un alumno, una tarea y una clase.
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', '', false);
create schema t17;
create table t17.resultado (n serial, prueba text, ok boolean);
create table t17.v (k text primary key, val text);
grant usage on schema t17 to anon, authenticated, service_role;
grant all on t17.resultado, t17.resultado_n_seq, t17.v to anon, authenticated, service_role;
create function t17.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
create function t17.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t17.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t17.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
-- Llama a la función del tiempo como el servidor y devuelve lo que devuelve
create function t17.tiempo(accion text, segundos integer default null, docente uuid default null) returns jsonb language sql as
  $$ select public.mover_tiempo((select val from t17.v where k = 'ses')::uuid,
                                coalesce(docente, (select val from t17.v where k = 'maeA')::uuid), accion, segundos) $$;
create function t17.fila() returns public.sesiones language sql as
  $$ select * from public.sesiones where id = (select val from t17.v where k = 'ses')::uuid $$;
grant execute on all functions in schema t17 to anon, authenticated, service_role;

insert into t17.v values ('maeA', 'f1700000-0000-0000-0000-00000000000a'), ('maeB', 'f1700000-0000-0000-0000-00000000000b');

-- =====================================================================
-- Preparación: maestras, aula, alumno, tarea y clase en vivo
-- =====================================================================
insert into auth.users (id, email, raw_user_meta_data) values ('f1700000-0000-0000-0000-00000000000a', 't17-a@escuela.uy', '{"nombre":"Maestra A17"}'), ('f1700000-0000-0000-0000-00000000000b', 't17-b@escuela.uy', '{"nombre":"Maestra B17"}');
insert into auth.users (id, email, raw_app_meta_data) values ('f1700000-0000-0000-0000-0000000000c1', 'txqz-01@alumnos.invalid', '{"rol":"alumno"}');
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-00000000000a', false);
insert into aulas (nombre, grado) values ('Aula T17', 5);
reset role;
insert into t17.v select 'aula', id::text from aulas where nombre = 'Aula T17';
set local role service_role;
insert into alumnos (id, aula_id, numero, usuario) values ('f1700000-0000-0000-0000-0000000000c1', (select val from t17.v where k = 'aula')::uuid, 1, 'TXQZ-01');
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-00000000000a', false);
insert into asignaciones (aula_id, actividad) values ((select val from t17.v where k = 'aula')::uuid, 'a1');
reset role;
insert into t17.v select 'asig', id::text from asignaciones where aula_id = (select val from t17.v where k = 'aula')::uuid;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-0000000000c1', false);
insert into progreso (asignacion_id, aula_id, actividad, etapa) values ((select val from t17.v where k = 'asig')::uuid, (select val from t17.v where k = 'aula')::uuid, 'a1', 'paisaje');
select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-00000000000a', false);
insert into sesiones (asignacion_id, aula_id) values ((select val from t17.v where k = 'asig')::uuid, (select val from t17.v where k = 'aula')::uuid);
reset role;
insert into t17.v select 'ses', id::text from sesiones where aula_id = (select val from t17.v where k = 'aula')::uuid;

-- =====================================================================
-- Sin tiempo: todo igual que antes
-- =====================================================================
select t17.ok('una clase nueva queda sin tiempo y con cierre flexible', (select tiempo_estado = 'sin' and cierre = 'flexible' and tiempo_duracion is null from t17.fila()));
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-00000000000a', false);
select t17.ok('la maestra sigue manejando la clase como antes (empezar, pausar)', t17.afecta($$update sesiones set estado = 'en-curso', pausada = true$$) = 1);
select t17.ok('la maestra NO escribe el tiempo directo (solo con la función)', t17.falla($$update sesiones set tiempo_estado = 'corriendo', tiempo_duracion = 60, tiempo_fin = now()$$));
select t17.ok('la maestra no puede cambiar el cierre directo', t17.falla($$update sesiones set cierre = 'definitivo'$$));
select t17.ok('la maestra no llama la función del tiempo', t17.falla($$select t17.tiempo('poner', 600)$$));
select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-0000000000c1', false);
select t17.ok('el alumno no llama la función del tiempo', t17.falla($$select t17.tiempo('poner', 600)$$));
reset role;
set local role anon;
select t17.ok('un visitante no llama la función del tiempo', t17.falla($$select public.mover_tiempo(gen_random_uuid(), gen_random_uuid(), 'poner', 600)$$));
reset role;
update sesiones set pausada = false where id = (select val from t17.v where k = 'ses')::uuid;

-- =====================================================================
-- El servidor maneja el tiempo
-- =====================================================================
set local role service_role;
select t17.ok('poner: rechaza menos de 1 minuto', t17.falla($$select t17.tiempo('poner', 30)$$));
select t17.ok('poner: rechaza más de 4 horas', t17.falla($$select t17.tiempo('poner', 20000)$$));
select t17.ok('poner: otra maestra no puede (aula ajena)', t17.falla($$select t17.tiempo('poner', 600, (select val from t17.v where k = 'maeB')::uuid)$$));
select t17.ok('iniciar sin duración: no se puede', t17.falla($$select t17.tiempo('iniciar')$$));
select t17.ok('poner 10 minutos → listo', (select t17.tiempo('poner', 600) ->> 'tiempo_estado') = 'listo');
select t17.ok('listo: guarda la duración y lo que falta', (select tiempo_duracion = 600 and tiempo_restante = 600 and tiempo_fin is null from t17.fila()));
select t17.ok('quitar el tiempo antes de empezar → sin tiempo', (select t17.tiempo('quitar') ->> 'tiempo_estado') = 'sin' and (select tiempo_duracion is null from t17.fila()));
select t17.tiempo('poner', 600);
select t17.tiempo('iniciar');
select t17.ok('iniciar → corriendo, termina en 10 minutos (hora de la base)', (select tiempo_estado = 'corriendo' and tiempo_fin between now() + interval '599 seconds' and now() + interval '600 seconds' from t17.fila()));
select t17.ok('la función devuelve la hora de la base para corregir relojes', (select (t17.tiempo('extender', 60) ->> 'ahora')::timestamptz = now()));
select t17.ok('extender corriendo: suma al fin y a la duración', (select tiempo_duracion = 660 and tiempo_fin between now() + interval '659 seconds' and now() + interval '660 seconds' from t17.fila()));
select t17.ok('quitar con el tiempo corriendo: no se puede', t17.falla($$select t17.tiempo('quitar')$$));
select t17.ok('pausar → guarda cuánto falta', (select t17.tiempo('pausar') ->> 'tiempo_estado') = 'pausado' and (select tiempo_restante between 659 and 660 and tiempo_fin is null from t17.fila()));
select t17.ok('pausar dos veces: no se puede', t17.falla($$select t17.tiempo('pausar')$$));
reset role;
insert into t17.v select 'r', tiempo_restante::text from t17.fila();
set local role service_role;
select t17.ok('extender en pausa: suma a lo que falta', (select (t17.tiempo('extender', 300) ->> 'tiempo_restante')::int) = (select val::int + 300 from t17.v where k = 'r'));
select t17.ok('seguir → corriendo de nuevo', (select t17.tiempo('seguir') ->> 'tiempo_estado') = 'corriendo');
reset role;

set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-0000000000c1', false);
select t17.ok('el alumno ve el tiempo de su clase', (select tiempo_estado = 'corriendo' and tiempo_fin is not null from sesiones));
select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-00000000000b', false);
select t17.ok('otra maestra no ve esa clase ni su tiempo', (select count(*) from sesiones where id = (select val from t17.v where k = 'ses')::uuid) = 0);
reset role;

-- Pasa el tiempo (se simula moviendo el fin al pasado)
update sesiones set tiempo_fin = now() - interval '5 seconds' where id = (select val from t17.v where k = 'ses')::uuid;
insert into t17.v select 'fin', tiempo_fin::text from t17.fila();
set local role service_role;
select t17.ok('si el fin ya pasó, pausar lo deja terminado (a la hora del fin)', (select t17.tiempo('pausar') ->> 'tiempo_estado') = 'terminado'
  and (select tiempo_terminado_en = (select val::timestamptz from t17.v where k = 'fin') from t17.fila()));
select t17.ok('terminado con cierre flexible: se puede extender y vuelve a correr', (select t17.tiempo('extender', 120) ->> 'tiempo_estado') = 'corriendo'
  and (select tiempo_fin between now() + interval '119 seconds' and now() + interval '120 seconds' and tiempo_terminado_en is null from t17.fila()));
select t17.ok('finalizar antes de tiempo → terminado ahora', (select t17.tiempo('finalizar') ->> 'tiempo_estado') = 'terminado' and (select tiempo_terminado_en = now() from t17.fila()));
reset role;
insert into t17.v select 'fin2', tiempo_terminado_en::text from t17.fila();
set local role service_role;
select t17.ok('finalizar de nuevo no cambia la hora del final', (select (t17.tiempo('finalizar') ->> 'tiempo_terminado_en')::timestamptz) = (select val::timestamptz from t17.v where k = 'fin2'));
reset role;

-- Con cierre flexible el alumno sigue guardando
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-0000000000c1', false);
select t17.ok('cierre flexible: el alumno sigue guardando después del final', t17.afecta($$update progreso set etapa = 'explorar'$$) = 1);
reset role;

-- Cierre definitivo
set local role service_role;
select t17.ok('cierre definitivo: queda marcado', (select t17.tiempo('definitivo') ->> 'cierre') = 'definitivo');
select t17.ok('el servidor no lee más de la tarea que lo que usa', t17.falla($$select opciones from asignaciones$$));
reset role;
select t17.ok('cierre definitivo: cierra la tarea', (select estado = 'cerrada' and cerrada_en is not null from asignaciones where id = (select val from t17.v where k = 'asig')::uuid));
set local role service_role;
select t17.ok('cierre definitivo: ya no se extiende', t17.falla($$select t17.tiempo('extender', 300)$$));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'f1700000-0000-0000-0000-0000000000c1', false);
select t17.ok('cierre definitivo: el alumno ya no guarda', t17.afecta($$update progreso set etapa = 'muestra'$$) <= 0);
select t17.ok('cierre definitivo: lo que guardó antes queda', (select etapa from progreso) = 'explorar');
reset role;

-- Coherencia y clase cerrada
select t17.ok('la base rechaza un tiempo incoherente (corriendo sin fin)', t17.falla($$update sesiones set tiempo_estado = 'corriendo' where id = (select val from t17.v where k = 'ses')::uuid$$));
update sesiones set estado = 'cerrada', cerrada_en = now() where id = (select val from t17.v where k = 'ses')::uuid;
set local role service_role;
select t17.ok('con la clase cerrada no se toca el tiempo', t17.falla($$select t17.tiempo('finalizar')$$));
select t17.ok('una acción desconocida da error', t17.falla($$select public.mover_tiempo(gen_random_uuid(), gen_random_uuid(), 'borrar')$$));
reset role;

select t17.ok('la función del tiempo no es security definer ni la llama un usuario',
  exists (select 1 from pg_proc p where p.proname = 'mover_tiempo' and not p.prosecdef
          and not has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')
          and has_function_privilege('service_role', p.oid, 'execute')));
select t17.ok('la API no publica funciones security definer que un usuario pueda llamar',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS'
    into total from t17.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\n' order by n)
    into detalle from t17.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\n%', total, detalle;
end $$;

