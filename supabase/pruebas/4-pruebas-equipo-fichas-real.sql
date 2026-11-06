-- =====================================================================
-- Pruebas de las migraciones 8 (equipo) y 9 (fichas) para correr en un
-- proyecto REAL de Supabase (solo el de desarrollo), sin dejar rastro.
--
-- Generado desde 3-pruebas-equipo-fichas.sql. Se manda como UNA sola
-- consulta (conector de Supabase o SQL Editor): Postgres la ejecuta como
-- una transacción, y la última sentencia lanza un error A PROPÓSITO con el
-- resultado adentro. El error deshace todo: usuarios de prueba, equipo,
-- fichas, el esquema "t3"… nada queda guardado.
--
-- Diferencias con la versión local: crea su propia maestra y su propio
-- alumno de prueba, guarda los ids en t3.v en vez de variables de psql y
-- cambia de rol con SET LOCAL.
-- =====================================================================

-- Maestra y alumno de prueba (en la versión local los crean las pruebas de aulas)
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@escuela.uy', '{"nombre":"Maestra A"}');
insert into auth.users (id, email, raw_app_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', 'k7rm-01@alumnos.invalid', '{"rol":"alumno"}');
-- =====================================================================
-- Pruebas de las migraciones 8 (equipo) y 9 (fichas), en el Postgres
-- local. Corre DESPUÉS de 1-pruebas-seguridad.sql (usa la maestra A y los
-- alumnos que esas pruebas dejan creados). Cada prueba imprime OK o FALLA.
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '', false);
create schema t3;
create table t3.resultado (n serial, prueba text, ok boolean);
create table t3.v (k text primary key, val text);
grant usage on schema t3 to anon, authenticated, service_role;
grant all on t3.resultado, t3.resultado_n_seq, t3.v to anon, authenticated, service_role;
create function t3.falla(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
-- el mensaje de error (o '' si no falla)
create function t3.error(sql text) returns text language plpgsql as $$
begin execute sql; return ''; exception when others then return sqlerrm; end $$;
create function t3.filas(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || sql || ') x' into n; return n;
exception when others then return -1; end $$;
create function t3.afecta(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute sql; get diagnostics n = row_count; return n;
exception when others then return -1; end $$;
create function t3.ok(prueba text, cond boolean) returns void language sql as
  $$ insert into t3.resultado (prueba, ok) values (prueba, coalesce(cond, false)) $$;
grant execute on all functions in schema t3 to anon, authenticated, service_role;


-- =====================================================================
-- Alta por invitación (la primera admin la carga el servidor)
-- =====================================================================
set local role service_role;
insert into invitaciones_equipo (email, rol, nombre_visible) values ('admin@pasteur.test', 'admin', 'Admin');
reset role;
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000001', 'admin@pasteur.test');
select t3.ok('alta: con invitación entra al equipo con su rol', (select rol from equipo where id = 'a0000000-0000-0000-0000-000000000001') = 'admin');
select t3.ok('alta: con invitación NO se vuelve maestra', not exists (select 1 from docentes where id = 'a0000000-0000-0000-0000-000000000001'));
select t3.ok('alta: la invitación queda usada', (select usada_por from invitaciones_equipo where email = 'admin@pasteur.test') = 'a0000000-0000-0000-0000-000000000001');

set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
insert into invitaciones_equipo (email, rol, nombre_visible) values ('redactora@pasteur.test', 'redactor', 'Redactora');
insert into invitaciones_equipo (email, rol, nombre_visible, laboratorio) values ('val@pasteur.test', 'validador', 'Validadora', 'Lab');
insert into invitaciones_equipo (email, rol) values ('val2@pasteur.test', 'validador');
select t3.ok('admin: crea invitaciones y las ve', t3.filas('select 1 from invitaciones_equipo') = 4);
select t3.ok('admin: no repite una invitación pendiente', t3.falla($$insert into invitaciones_equipo (email, rol) values ('val@pasteur.test', 'validador')$$));
select t3.ok('admin: no invita a un mail interno de alumno', t3.falla($$insert into invitaciones_equipo (email, rol) values ('k7rm-05@alumnos.invalid', 'validador')$$));
select t3.ok('admin: no marca una invitación como usada', t3.falla($$insert into invitaciones_equipo (email, rol, usada_en) values ('x@pasteur.test', 'validador', now())$$));
select t3.ok('el rol viejo "investigador" ya no existe', t3.falla($$insert into invitaciones_equipo (email, rol) values ('y@pasteur.test', 'investigador')$$));
reset role;
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-000000000002', 'redactora@pasteur.test'), ('a0000000-0000-0000-0000-000000000003', 'Val@Pasteur.test'), ('a0000000-0000-0000-0000-000000000004', 'val2@pasteur.test');
select t3.ok('alta: el mail se compara sin mayúsculas', (select rol from equipo where id = 'a0000000-0000-0000-0000-000000000003') = 'validador');
select t3.ok('alta: sin invitación sigue siendo maestra', exists (select 1 from docentes where id = 'aaaaaaaa-0000-0000-0000-000000000001') and not exists (select 1 from equipo where id = 'aaaaaaaa-0000-0000-0000-000000000001'));

-- =====================================================================
-- Roles
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('redactora: ve al equipo', t3.filas('select 1 from equipo') = 4);
select t3.ok('redactora: edita su nombre', t3.afecta($$update equipo set nombre_visible = 'Sofia' where id = 'a0000000-0000-0000-0000-000000000002'$$) = 1);
select t3.ok('redactora: no se sube el rol', t3.falla($$update equipo set rol = 'validador' where id = 'a0000000-0000-0000-0000-000000000002'$$));
select t3.ok('redactora: no cambia el rol de otra', t3.afecta($$update equipo set rol = 'redactor' where id = 'a0000000-0000-0000-0000-000000000003'$$) <= 0
  and (select rol from equipo where id = 'a0000000-0000-0000-0000-000000000003') = 'validador');
select t3.ok('redactora: no ve invitaciones', t3.filas('select 1 from invitaciones_equipo') = 0);
select t3.ok('redactora: no invita', t3.falla($$insert into invitaciones_equipo (email, rol) values ('z@pasteur.test', 'admin')$$));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
select t3.ok('admin: no cambia su propio rol', t3.falla($$update equipo set rol = 'validador' where id = 'a0000000-0000-0000-0000-000000000001'$$));
select t3.ok('admin: cambia el rol de otra', t3.afecta($$update equipo set rol = 'redactor' where id = 'a0000000-0000-0000-0000-000000000004'$$) = 1);
select t3.ok('admin: lo vuelve a validadora', t3.afecta($$update equipo set rol = 'validador' where id = 'a0000000-0000-0000-0000-000000000004'$$) = 1);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select t3.ok('maestra: no ve al equipo', t3.filas('select 1 from equipo') = 0);
select t3.ok('maestra: no ve invitaciones', t3.filas('select 1 from invitaciones_equipo') = 0);
reset role;
set local role anon; select set_config('request.jwt.claim.sub', '', false);
select t3.ok('sin sesión: no lee el equipo', t3.filas('select 1 from equipo') = -1);
reset role;

-- =====================================================================
-- Fichas: la redactora escribe, la validadora revisa
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
insert into fichas (slug, formato, actividad) values ('celula-que-es', 'pregunta', 'a3');
select t3.ok('redactora: crea una ficha en borrador', (select estado from fichas where slug = 'celula-que-es') = 'borrador');
select t3.ok('redactora: la ficha queda a su nombre', (select creada_por from fichas where slug = 'celula-que-es') = 'a0000000-0000-0000-0000-000000000002');
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil)
  select id, '¿Qué es una célula?', 'La célula es la unidad estructural y funcional de los seres vivos.',
         'Una célula es la pieza más chiquita de un ser vivo que puede vivir por su cuenta.'
  from fichas where slug = 'celula-que-es';
reset role;
insert into t3.v (k, val) select 'v1', (id)::text from ficha_versiones where pregunta = '¿Qué es una célula?';
insert into t3.v (k, val) select 'f1', (id)::text from fichas where slug = 'celula-que-es';
select t3.ok('versión: número 1, borrador, sin huella', (select numero = 1 and estado = 'borrador' and huella is null from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1')));

set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('redactora: no la publica ella misma', t3.falla(format($$update ficha_versiones set estado = 'publicada' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))));
select t3.ok('redactora: sin fuentes no se envía', t3.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) like '%al menos una fuente%');
insert into fuentes (tipo, cita) values ('comunicacion', 'Comunicación de una investigadora del Institut Pasteur de Montevideo, 2026');
insert into version_fuentes (version_id, publicacion_id, pasaje, ubicacion)
  values ((select val::uuid from t3.v where k = 'v1'), 'eeeeeeee-1111-0000-0000-000000000001', '', '');
select t3.ok('redactora: un artículo sin pasaje no se envía', t3.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) like '%pasaje%');
select t3.ok('redactora: un pasaje no textual pide paráfrasis', t3.error(format($$update version_fuentes set pasaje = 'Cells are the basic unit of life.', ubicacion = 'Resumen' where version_id = %L$$, (select val::uuid from t3.v where k = 'v1'))) = ''
  and t3.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) like '%paráfrasis%');
select t3.ok('redactora: quita una cita de su borrador', t3.afecta(format($$delete from version_fuentes where version_id = %L and publicacion_id is not null$$, (select val::uuid from t3.v where k = 'v1'))) = 1);
insert into version_fuentes (version_id, fuente_id, ubicacion) select (select val::uuid from t3.v where k = 'v1'), id, 'conversación' from fuentes limit 1;
update ficha_versiones set version_infantil = repeat('palabra ', 91) where id = (select val::uuid from t3.v where k = 'v1');
select t3.ok('redactora: más de 90 palabras no se envía', t3.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) like '%90 palabras%');
update ficha_versiones set version_infantil = 'Una célula es la pieza más chiquita de un ser vivo.' where id = (select val::uuid from t3.v where k = 'v1');
select t3.ok('redactora: envía a revisión', t3.afecta(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) = 1);
reset role;
insert into t3.v (k, val) select 'h1', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1');
select t3.ok('envío: calcula la huella', (select val from t3.v where k = 'h1') ~ '^[0-9a-f]{64}$');

-- ---------- Corregir en revisión ----------
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('en revisión: la redactora corrige su texto', t3.afecta(format($$update ficha_versiones set version_infantil = 'Una célula es la pieza más chiquita de un ser vivo que puede vivir por su cuenta.' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) = 1);
reset role;
insert into t3.v (k, val) select 'h1b', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1');
select t3.ok('en revisión: corregir cambia la huella', (select val from t3.v where k = 'h1b') <> (select val from t3.v where k = 'h1') and (select estado from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1')) = 'en_revision');
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('en revisión: no se pasa del largo al corregir', t3.error(format($$update ficha_versiones set version_infantil = repeat('palabra ', 91) where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) like '%90 palabras%');
select t3.ok('en revisión: no se queda sin fuentes', t3.falla(format($$delete from version_fuentes where version_id = %L$$, (select val::uuid from t3.v where k = 'v1'))));
select t3.ok('redactora: no puede revisar', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v1'), (select val from t3.v where k = 'h1b'))));
reset role;

set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
select t3.ok('validadora: con el texto viejo no aprueba', t3.error(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v1'), (select val from t3.v where k = 'h1'))) like '%cambió%');
select t3.ok('validadora: corrige una palabra en revisión', t3.afecta(format($$update ficha_versiones set explicacion_cientifica = 'La célula es la unidad estructural y funcional de todos los seres vivos.' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) = 1);
select t3.ok('validadora: no cambia el estado a mano', t3.afecta(format($$update ficha_versiones set estado = 'publicada' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) <= 0
  and (select estado from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1')) = 'en_revision');
reset role;
insert into t3.v (k, val) select 'h1c', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1');
select t3.ok('registro: queda quién corrigió en revisión', exists (select 1 from eventos_editoriales where accion = 'corregir_en_revision' and actor_id = 'a0000000-0000-0000-0000-000000000003'));
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
select t3.ok('validadora: rechazar sin comentario no vale', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'rechazar', %L)$$, (select val::uuid from t3.v where k = 'v1'), (select val from t3.v where k = 'h1c'))));
select t3.ok('validadora: no se pone otra como revisora', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada, revisor_id) values ('ficha_version', %L, 'aprobar', %L, 'a0000000-0000-0000-0000-000000000004')$$, (select val::uuid from t3.v where k = 'v1'), (select val from t3.v where k = 'h1c'))));
select t3.ok('validadora: aprueba lo que está viendo', t3.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v1'), (select val from t3.v where k = 'h1c'))) = 1);
select t3.ok('aprobada: versión publicada', (select estado from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1')) = 'publicada');
select t3.ok('aprobada: la ficha apunta a esa versión', (select estado = 'publicada' and version_publicada_id = (select val::uuid from t3.v where k = 'v1') from fichas where id = (select val::uuid from t3.v where k = 'f1')));
select t3.ok('aprobada: aparece en fichas_validadas, no autoaprobada', t3.filas(format($$select 1 from fichas_validadas where version_id = %L and aprobada_por = 'a0000000-0000-0000-0000-000000000003' and not autoaprobada$$, (select val::uuid from t3.v where k = 'v1'))) = 1);
select t3.ok('aprobada: no se aprueba dos veces', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v1'), (select val from t3.v where k = 'h1c'))));
select t3.ok('publicada: la validadora ya no la cambia', t3.afecta(format($$update ficha_versiones set version_infantil = 'x' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) <= 0);
select t3.ok('revisiones: no se editan', t3.afecta($$update revisiones set comentario = 'x'$$) <= 0);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('publicada: la redactora ya no la cambia', t3.afecta(format($$update ficha_versiones set version_infantil = 'x' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))) <= 0);
select t3.ok('publicada: no se le agregan citas', t3.falla(format($$insert into version_fuentes (version_id, fuente_id) select %L, id from fuentes limit 1$$, (select val::uuid from t3.v where k = 'v1'))));
reset role;
select t3.ok('publicada: ni el dueño de la base cambia el texto', t3.falla(format($$update ficha_versiones set version_infantil = 'trampa' where id = %L$$, (select val::uuid from t3.v where k = 'v1'))));
select t3.ok('revisiones: ni el dueño de la base las cambia', t3.falla($$update revisiones set comentario = 'x'$$));
select t3.ok('revisiones: ni el dueño de la base las borra', t3.falla($$delete from revisiones$$));
select t3.ok('registro: quedó crear, enviar y revisar', (select count(distinct accion) from eventos_editoriales where accion in ('crear', 'enviar_a_revision', 'revisar')) = 3);
select t3.ok('registro: no se borra', t3.falla($$delete from eventos_editoriales$$));
set local role service_role;
select t3.ok('servidor: ve la ficha validada', t3.filas('select 1 from fichas_validadas') = 1);
select t3.ok('servidor: indexa la versión publicada', t3.afecta(format($$insert into fragmentos (ficha_id, version_id, tipo, texto) values (%L, %L, 'infantil', 'Una célula es la pieza más chiquita')$$, (select val::uuid from t3.v where k = 'f1'), (select val::uuid from t3.v where k = 'v1'))) = 1);
select t3.ok('índice: encuentra "célula" escrito sin tilde', t3.filas($$select 1 from fragmentos where tsv @@ plainto_tsquery('spanish', privado.normalizar('celula'))$$) = 1);
select t3.ok('índice: encuentra "CÉLULAS" en mayúsculas y plural', t3.filas($$select 1 from fragmentos where tsv @@ plainto_tsquery('spanish', privado.normalizar('CÉLULAS'))$$) = 1);
select t3.ok('servidor: no cambia el texto de un fragmento', t3.falla($$update fragmentos set texto = 'otra'$$));
reset role;

-- ---------- La validadora aprueba su propio texto (queda marcado) ----------
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
insert into fichas (slug, formato, actividad) values ('mitocondria', 'dato', 'a3');
insert into ficha_versiones (ficha_id, version_infantil) select id, repeat('dato ', 61) from fichas where slug = 'mitocondria';
reset role;
insert into t3.v (k, val) select 'v9', (id)::text from ficha_versiones where version_infantil like 'dato dato%';
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
insert into version_fuentes (version_id, fuente_id, ubicacion) select (select val::uuid from t3.v where k = 'v9'), id, 'conversación' from fuentes limit 1;
select t3.ok('dato: más de 60 palabras no se envía', t3.error(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v9'))) like '%60 palabras%');
update ficha_versiones set version_infantil = 'Las mitocondrias son pequeñas centrales de energía.' where id = (select val::uuid from t3.v where k = 'v9');
select t3.ok('dato: corto y sin pregunta igual se envía', t3.afecta(format($$update ficha_versiones set estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v9'))) = 1);
reset role;
insert into t3.v (k, val) select 'h9', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v9');
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
select t3.ok('validadora: aprueba su propio texto', t3.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v9'), (select val from t3.v where k = 'h9'))) = 1);
select t3.ok('autoaprobada: queda marcada en fichas_validadas', t3.filas(format($$select 1 from fichas_validadas where version_id = %L and autoaprobada$$, (select val::uuid from t3.v where k = 'v9'))) = 1);
select t3.ok('autoaprobada: queda marcada en el registro', exists (select 1 from eventos_editoriales where accion = 'revisar' and entidad_id = (select val::uuid from t3.v where k = 'v9') and (despues ->> 'autoaprobada')::boolean));
reset role;

-- ---------- La admin escribe pero no aprueba ----------
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
insert into fichas (slug, formato) values ('nucleo', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'El núcleo guarda el ADN de la célula, como una caja fuerte.' from fichas where slug = 'nucleo';
reset role;
insert into t3.v (k, val) select 'v7', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'nucleo';
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
insert into version_fuentes (version_id, fuente_id, ubicacion) select (select val::uuid from t3.v where k = 'v7'), id, 'conversación' from fuentes limit 1;
update ficha_versiones set estado = 'en_revision' where id = (select val::uuid from t3.v where k = 'v7');
reset role;
insert into t3.v (k, val) select 'h7', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v7');
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
select t3.ok('admin: no aprueba (ni su propio texto)', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v7'), (select val from t3.v where k = 'h7'))));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000004', false);
select t3.ok('otra validadora aprueba lo de la admin', t3.afecta(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v7'), (select val from t3.v where k = 'h7'))) = 1);
reset role;

-- ---------- Cambiar una ficha publicada: versión nueva, pedir cambios, reenviar ----------
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
insert into ficha_versiones (ficha_id, pregunta, explicacion_cientifica, version_infantil)
  values ((select val::uuid from t3.v where k = 'f1'), '¿Qué es una célula?', 'La célula es la unidad estructural y funcional de todos los seres vivos.',
          'Todos los seres vivos están hechos de células, como una casa está hecha de ladrillos.');
select t3.ok('redactora: no abre dos versiones a la vez', t3.falla(format($$insert into ficha_versiones (ficha_id) values (%L)$$, (select val::uuid from t3.v where k = 'f1'))));
reset role;
insert into t3.v (k, val) select 'v2', (id)::text from ficha_versiones where ficha_id = (select val::uuid from t3.v where k = 'f1') and numero = 2;
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, fuente_id, ubicacion) select (select val::uuid from t3.v where k = 'v2'), id, 'conversación' from fuentes limit 1;
update ficha_versiones set estado = 'en_revision' where id = (select val::uuid from t3.v where k = 'v2');
select t3.ok('redactora: retira su envío para seguir editando', t3.afecta(format($$update ficha_versiones set estado = 'borrador' where id = %L$$, (select val::uuid from t3.v where k = 'v2'))) = 1);
select t3.ok('retirar el envío: vuelve a borrador sin huella', (select estado = 'borrador' and huella is null from ficha_versiones where id = (select val::uuid from t3.v where k = 'v2')));
update ficha_versiones set estado = 'en_revision' where id = (select val::uuid from t3.v where k = 'v2');
reset role;
insert into t3.v (k, val) select 'h2', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v2');
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
select t3.ok('validadora: no devuelve a borrador a mano', t3.afecta(format($$update ficha_versiones set estado = 'borrador' where id = %L$$, (select val::uuid from t3.v where k = 'v2'))) <= 0);
insert into revisiones (objeto, objeto_id, decision, huella_revisada, comentario) values ('ficha_version', (select val::uuid from t3.v where k = 'v2'), 'pedir_cambios', (select val from t3.v where k = 'h2'), 'Aclarar que algunos seres vivos tienen una sola célula.');
select t3.ok('cambios pedidos: la MISMA versión vuelve a borrador', (select estado from ficha_versiones where id = (select val::uuid from t3.v where k = 'v2')) = 'borrador');
select t3.ok('cambios pedidos: sigue publicada la anterior', (select version_publicada_id from fichas where id = (select val::uuid from t3.v where k = 'f1')) = (select val::uuid from t3.v where k = 'v1'));
reset role;
set local role service_role;
select t3.ok('servidor: no indexa una versión que no está publicada', t3.falla(format($$insert into fragmentos (ficha_id, version_id, tipo, texto) values (%L, %L, 'infantil', 'x')$$, (select val::uuid from t3.v where k = 'f1'), (select val::uuid from t3.v where k = 'v2'))));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('redactora: corrige y reenvía la misma versión', t3.afecta(format($$update ficha_versiones set version_infantil = 'Los seres vivos están hechos de células. Algunos, como las bacterias, son una sola célula.', estado = 'en_revision' where id = %L$$, (select val::uuid from t3.v where k = 'v2'))) = 1);
reset role;
insert into t3.v (k, val) select 'h2b', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v2');
select t3.ok('reenvío: la huella es del texto corregido', (select val from t3.v where k = 'h2b') <> (select val from t3.v where k = 'h2'));
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', (select val::uuid from t3.v where k = 'v2'), 'aprobar', (select val from t3.v where k = 'h2b'));
select t3.ok('reemplazo: la versión 1 pasa a reemplazada', (select estado from ficha_versiones where id = (select val::uuid from t3.v where k = 'v1')) = 'reemplazada');
select t3.ok('reemplazo: la ficha apunta a la versión 2', (select version_publicada_id from fichas where id = (select val::uuid from t3.v where k = 'f1')) = (select val::uuid from t3.v where k = 'v2'));
select t3.ok('reemplazo: el índice de la versión 1 se apaga', not exists (select 1 from fragmentos where version_id = (select val::uuid from t3.v where k = 'v1') and activo));
select t3.ok('reemplazo: fichas_validadas muestra solo la versión 2', t3.filas(format($$select 1 from fichas_validadas where ficha_id = %L and version_id = %L$$, (select val::uuid from t3.v where k = 'f1'), (select val::uuid from t3.v where k = 'v2'))) = 1
  and t3.filas(format($$select 1 from fichas_validadas where ficha_id = %L$$, (select val::uuid from t3.v where k = 'f1'))) = 1);
reset role;

-- ---------- Retirar ----------
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
select t3.ok('redactora: no retira (eso es de validadora o admin)', t3.falla(format($$update fichas set estado = 'retirada', motivo_retiro = 'ya no sirve' where id = %L$$, (select val::uuid from t3.v where k = 'f1'))));
select t3.ok('redactora: no elige la versión publicada', t3.falla(format($$update fichas set version_publicada_id = %L where id = %L$$, (select val::uuid from t3.v where k = 'v1'), (select val::uuid from t3.v where k = 'f1'))));
select t3.ok('redactora: cambia el tema y la actividad', t3.afecta(format($$update fichas set actividad = 'a1' where id = %L$$, (select val::uuid from t3.v where k = 'f1'))) = 1);
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
select t3.ok('validadora: retirar exige motivo', t3.falla(format($$update fichas set estado = 'retirada' where id = %L$$, (select val::uuid from t3.v where k = 'f1'))));
select t3.ok('validadora: retira con motivo', t3.afecta(format($$update fichas set estado = 'retirada', motivo_retiro = 'Hay datos nuevos que revisar' where id = %L$$, (select val::uuid from t3.v where k = 'f1'))) = 1);
select t3.ok('retirada: sale de fichas_validadas', t3.filas(format($$select 1 from fichas_validadas where ficha_id = %L$$, (select val::uuid from t3.v where k = 'f1'))) = 0);
reset role;

-- ---------- Validadora suspendida ----------
update equipo set estado_desde = now() - interval '1 hour' where id = 'a0000000-0000-0000-0000-000000000004';
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
update equipo set estado = 'suspendida' where id = 'a0000000-0000-0000-0000-000000000004';
reset role;
select t3.ok('suspendida: guarda la fecha', (select estado_desde > now() - interval '1 minute' from equipo where id = 'a0000000-0000-0000-0000-000000000004'));
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
insert into fichas (slug, formato) values ('adn', 'dato');
insert into ficha_versiones (ficha_id, version_infantil) select id, 'El ADN es como un libro de instrucciones que tiene cada célula.' from fichas where slug = 'adn';
reset role;
insert into t3.v (k, val) select 'v8', (v.id)::text from ficha_versiones v join fichas f on f.id = v.ficha_id where f.slug = 'adn';
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
insert into version_fuentes (version_id, fuente_id, ubicacion) select (select val::uuid from t3.v where k = 'v8'), id, 'conversación' from fuentes limit 1;
update ficha_versiones set estado = 'en_revision' where id = (select val::uuid from t3.v where k = 'v8');
reset role;
insert into t3.v (k, val) select 'h8', (huella)::text from ficha_versiones where id = (select val::uuid from t3.v where k = 'v8');
set local role authenticated; select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000004', false);
select t3.ok('suspendida: no revisa', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v8'), (select val from t3.v where k = 'h8'))));
select t3.ok('suspendida: no corrige', t3.afecta(format($$update ficha_versiones set version_infantil = 'otra cosa larga' where id = %L$$, (select val::uuid from t3.v where k = 'v8'))) <= 0);
select t3.ok('suspendida: no ve fichas', t3.filas('select 1 from fichas') = 0);
reset role;
select t3.ok('suspendida: lo que aprobó antes sigue validado', exists (select 1 from fichas_validadas where version_id = (select val::uuid from t3.v where k = 'v7')));
select t3.ok('revisión de publicaciones: todavía no disponible', t3.error(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada, revisor_id) values ('publicacion', %L, 'aprobar', %L, %L)$$, (select val::uuid from t3.v where k = 'v8'), (select val from t3.v where k = 'h8'), 'a0000000-0000-0000-0000-000000000003')) like '%todavía no está disponible%');

-- =====================================================================
-- Maestras, alumnos y sin sesión no ven nada editorial
-- =====================================================================
set local role authenticated; select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select t3.ok('maestra: no ve fichas', t3.filas('select 1 from fichas') = 0);
select t3.ok('maestra: no ve versiones', t3.filas('select 1 from ficha_versiones') = 0);
select t3.ok('maestra: no ve fichas_validadas', t3.filas('select 1 from fichas_validadas') = 0);
select t3.ok('maestra: no crea fichas', t3.falla($$insert into fichas (slug, formato) values ('trampa', 'dato')$$));
select t3.ok('maestra: no corrige en revisión', t3.afecta(format($$update ficha_versiones set version_infantil = 'trampa larga' where id = %L$$, (select val::uuid from t3.v where k = 'v8'))) <= 0);
select t3.ok('maestra: no revisa', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v8'), (select val from t3.v where k = 'h8'))));
select t3.ok('maestra: no indexa', t3.falla(format($$insert into fragmentos (ficha_id, version_id, tipo, texto) values (%L, %L, 'infantil', 'x')$$, (select val::uuid from t3.v where k = 'f1'), (select val::uuid from t3.v where k = 'v2'))));
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000001', false), set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","app_metadata":{"rol":"alumno"}}', false);
select t3.ok('alumno: no ve fichas', t3.filas('select 1 from fichas') = 0);
select t3.ok('alumno: no ve el índice', t3.filas('select 1 from fragmentos') = 0);
reset role;
-- Una cuenta de alumno con fila en equipo (puesta a propósito) igual no ve nada
insert into equipo (id, rol) values ('cccccccc-0000-0000-0000-000000000001', 'validador');
set local role authenticated;
select t3.ok('alumno con fila en equipo: no ve fichas', t3.filas('select 1 from fichas') = 0);
select t3.ok('alumno con fila en equipo: no revisa', t3.falla(format($$insert into revisiones (objeto, objeto_id, decision, huella_revisada) values ('ficha_version', %L, 'aprobar', %L)$$, (select val::uuid from t3.v where k = 'v8'), (select val from t3.v where k = 'h8'))));
select t3.ok('alumno con fila en equipo: no corrige', t3.afecta(format($$update ficha_versiones set version_infantil = 'trampa larga' where id = %L$$, (select val::uuid from t3.v where k = 'v8'))) <= 0);
reset role;
delete from equipo where id = 'cccccccc-0000-0000-0000-000000000001';
select set_config('request.jwt.claims', '', false);
set local role anon; select set_config('request.jwt.claim.sub', '', false);
select t3.ok('sin sesión: no lee fichas', t3.filas('select 1 from fichas') = -1);
select t3.ok('sin sesión: no lee fichas_validadas', t3.filas('select 1 from fichas_validadas') = -1);
select t3.ok('sin sesión: no llama a las funciones del equipo', t3.falla('select privado.es_equipo()'));
reset role;

select t3.ok('la API no publica funciones security definer que un usuario pueda llamar (con las nuevas)',
  not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
              and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))));

-- ---------- Resultado: se informa con un error, que deshace TODO ----------
do $$
declare
  total text; detalle text;
begin
  select count(*) filter (where ok) || ' OK · ' || count(*) filter (where not ok) || ' FALLAS'
    into total from t3.resultado;
  select string_agg(case when ok then 'OK    ' else 'FALLA ' end || prueba, E'\n' order by n)
    into detalle from t3.resultado;
  raise exception E'RESULTADO (todo se deshizo): %\n%', total, detalle;
end $$;

