\set ON_ERROR_STOP off
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-0000000000c1'),('00000000-0000-0000-0000-0000000000c2');
-- Maestra A abre una sala
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into docentes (id, nombre) values (auth.uid(), 'Maestra A');
insert into salas (codigo, docente_id, actividad) values ('K7RM', auth.uid(), 'a1');
-- Maestra B no ve la sala de A ni puede crear una a nombre de A
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into docentes (id, nombre) values (auth.uid(), 'Maestra B');
select 'B ve salas de A: ' || count(*) from salas;
insert into salas (codigo, docente_id, actividad) values ('ABCD', '00000000-0000-0000-0000-00000000000a', 'a2');
-- Niño 1 entra con el código
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select 'niño 1 entra: ' || (unirse_a_sala('k7rm', 'Coco curioso', '#EF6F5E') is not null);
select 'niño 1 ve su sala: ' || count(*) from salas;
update alumnos_en_sala set etapa = 'ambiente', datos = '{"x":1}' where usuario_id = auth.uid();
select 'niño 1 guardó: ' || etapa || ' ' || datos::text from alumnos_en_sala;
update alumnos_en_sala set apodo = 'Hackeado';
update salas set estado = 'cerrada';
select 'sala sigue: ' || estado from salas;
select 'código inválido:'; select unirse_a_sala('ZZZZ', 'X', '#000000');
-- Niño 2 no ve al niño 1, pero sí los apodos ocupados
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'niño 2 entra: ' || (unirse_a_sala('K7RM', 'Bacilo veloz', '#F2B13B') is not null);
select 'niño 2 ve alumnos: ' || count(*) from alumnos_en_sala;
select 'apodos ocupados: ' || array_to_string(apodos_ocupados('K7RM'), ', ');
select 'apodo repetido:'; select unirse_a_sala('K7RM', 'Coco curioso', '#F2B13B');
-- Maestra A ve a los dos y pausa la sala
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'maestra A ve alumnos: ' || count(*) from alumnos_en_sala;
update salas set pausada = true, estado = 'en-curso' returning 'maestra pausó: ' || pausada;
-- Sin sesión (anon) no se puede entrar ni leer
reset request.jwt.claim.sub; set role anon;
select 'anon lee salas: ' || count(*) from salas;
select 'anon entra:'; select unirse_a_sala('K7RM', 'Y', '#000000');
reset role;
-- Código repetido entre salas abiertas
insert into salas (codigo, docente_id, actividad) values ('K7RM', '00000000-0000-0000-0000-00000000000b', 'a2');
update salas set estado = 'cerrada' where codigo = 'K7RM';
insert into salas (codigo, docente_id, actividad) values ('K7RM', '00000000-0000-0000-0000-00000000000b', 'a2') returning 'código reutilizable tras cerrar: ok';
