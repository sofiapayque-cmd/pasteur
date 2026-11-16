-- =====================================================================
-- Migración 25 · Cuadernos y respuesta a la maestra (pedido de Sofia,
-- 16/11/2026: "cuando se responde una pregunta le debería llegar a la
-- maestra que la hizo; todos los nenes deberían tener cuadernos donde
-- tengan las anotaciones de sus experimentos y sus preguntas; las maestras
-- también: qué actividad hicieron, por cuánto, qué preguntas hicieron")
--
-- 1. preguntas_maestras: cada pregunta que una maestra le hace al Pasteur,
--    con su clase si la eligió. Sirve para su cuaderno y para avisarle
--    cuando se aprueba la respuesta de una que no la tenía. Lo anónimo
--    sigue igual: preguntas_sin_respuesta y los conteos por tema no saben
--    quién preguntó. Las preguntas delicadas no se guardan (como antes).
-- 2. notas_alumnos: notas y preguntas que escribe cada chico en su
--    cuaderno. Las ve él y su maestra; nada va a la IA. La maestra elige
--    qué preguntas le manda al Pasteur. Hasta 40 por chico por día.
-- 3. notas_maestras: el diario de cada clase (fecha, actividad, cuánto
--    duró, qué hicieron, qué preguntaron).
--
-- No cambia nada existente. Para volver atrás alcanza con borrar las tres
-- tablas y las dos funciones nuevas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Preguntas de cada maestra al Pasteur
-- ---------------------------------------------------------------------
create table public.preguntas_maestras (
  id            uuid primary key default gen_random_uuid(),
  docente_id    uuid not null references public.docentes (id) on delete cascade,
  aula_id       uuid references public.aulas (id) on delete set null,
  texto         text not null check (char_length(texto) between 3 and 300),
  normalizada   text not null check (char_length(normalizada) between 3 and 300),
  actividad     text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  resultado     text not null check (resultado in ('respuesta', 'parecidas', 'sin_respuesta')),
  ficha_id      uuid references public.fichas (id) on delete set null,
  respondida_en timestamptz, -- la respuesta llegó después (para el aviso)
  vista_en      timestamptz, -- la maestra ya vio el aviso
  creada_en     timestamptz not null default now()
);
create index preguntas_maestras_docente on public.preguntas_maestras (docente_id, creada_en desc);
create index preguntas_maestras_aula on public.preguntas_maestras (aula_id, creada_en desc);
create index preguntas_maestras_pendientes on public.preguntas_maestras (normalizada) where ficha_id is null;
alter table public.preguntas_maestras enable row level security;
revoke all on public.preguntas_maestras from public, anon, authenticated;
create policy "preguntas de maestras: la maestra ve las suyas" on public.preguntas_maestras
  for select to authenticated using (docente_id = (select auth.uid()) and (select privado.es_docente()));
create policy "preguntas de maestras: la maestra marca el aviso como visto" on public.preguntas_maestras
  for update to authenticated
  using (docente_id = (select auth.uid()) and (select privado.es_docente()))
  with check (docente_id = (select auth.uid()));
-- Los chicos ven las respondidas de su clase (para su cuaderno)
create policy "preguntas de maestras: los chicos ven las respondidas de su clase" on public.preguntas_maestras
  for select to authenticated using (aula_id = (select privado.mi_aula()) and ficha_id is not null);
grant select on public.preguntas_maestras to authenticated;
grant update (vista_en) on public.preguntas_maestras to authenticated;
-- Las anota el servidor, después de comprobar que es una maestra activa
grant select, insert, update, delete on public.preguntas_maestras to service_role;

-- ---------------------------------------------------------------------
-- 2. Notas y preguntas de cada chico
-- ---------------------------------------------------------------------
create table public.notas_alumnos (
  id                  uuid primary key default gen_random_uuid(),
  alumno_id           uuid not null default auth.uid() references public.alumnos (id) on delete cascade,
  aula_id             uuid not null references public.aulas (id) on delete cascade,
  actividad           text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  tipo                text not null check (tipo in ('nota', 'pregunta')),
  texto               text not null check (char_length(btrim(texto)) between 2 and 500),
  -- nueva: la maestra no hizo nada; enviada: se la mandó al Pasteur; conversada: la charlaron en clase
  estado              text not null default 'nueva' check (estado in ('nueva', 'enviada', 'conversada')),
  pregunta_maestra_id uuid references public.preguntas_maestras (id) on delete set null,
  creada_en           timestamptz not null default now()
);
create index notas_alumnos_alumno on public.notas_alumnos (alumno_id, creada_en desc);
create index notas_alumnos_aula on public.notas_alumnos (aula_id, creada_en desc);
alter table public.notas_alumnos enable row level security;
revoke all on public.notas_alumnos from public, anon, authenticated;
create policy "notas de alumnos: el chico ve las suyas" on public.notas_alumnos
  for select to authenticated using (alumno_id = (select auth.uid()));
create policy "notas de alumnos: el chico escribe en su aula" on public.notas_alumnos
  for insert to authenticated with check (
    alumno_id = (select auth.uid())
    and aula_id = (select privado.mi_aula())
    and estado = 'nueva'
    and pregunta_maestra_id is null
  );
create policy "notas de alumnos: el chico borra las que su maestra no usó" on public.notas_alumnos
  for delete to authenticated using (alumno_id = (select auth.uid()) and estado = 'nueva');
create policy "notas de alumnos: la maestra ve las de sus aulas" on public.notas_alumnos
  for select to authenticated using ((select privado.es_docente_de_aula(aula_id)));
create policy "notas de alumnos: la maestra marca las preguntas" on public.notas_alumnos
  for update to authenticated
  using ((select privado.es_docente_de_aula(aula_id)) and tipo = 'pregunta')
  with check ((select privado.es_docente_de_aula(aula_id)) and tipo = 'pregunta');
grant select, delete on public.notas_alumnos to authenticated;
grant insert (aula_id, actividad, tipo, texto) on public.notas_alumnos to authenticated;
grant update (estado, pregunta_maestra_id) on public.notas_alumnos to authenticated;
grant select, insert, update, delete on public.notas_alumnos to service_role;

-- Hasta 40 notas por chico por día (que un chico no llene la base sin querer)
create function privado.limitar_notas_alumno() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.notas_alumnos n
       where n.alumno_id = new.alumno_id and n.creada_en > now() - interval '1 day') >= 40 then
    raise exception 'demasiadas notas por hoy' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function privado.limitar_notas_alumno() from public, anon, authenticated;
create trigger notas_alumnos_limite before insert on public.notas_alumnos
  for each row execute function privado.limitar_notas_alumno();

-- ---------------------------------------------------------------------
-- 3. Diario de clase de cada maestra
-- ---------------------------------------------------------------------
create table public.notas_maestras (
  id             uuid primary key default gen_random_uuid(),
  docente_id     uuid not null default auth.uid() references public.docentes (id) on delete cascade,
  aula_id        uuid not null references public.aulas (id) on delete cascade,
  fecha          date not null default current_date,
  actividad      text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  minutos        smallint check (minutos between 1 and 600),
  texto          text not null default '' check (char_length(texto) <= 3000),
  sesion_id      uuid references public.sesiones (id) on delete set null,
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);
create index notas_maestras_aula on public.notas_maestras (aula_id, fecha desc);
alter table public.notas_maestras enable row level security;
revoke all on public.notas_maestras from public, anon, authenticated;
create policy "diario de clase: la maestra ve el suyo" on public.notas_maestras
  for select to authenticated using (docente_id = (select auth.uid()) and (select privado.es_docente_de_aula(aula_id)));
create policy "diario de clase: la maestra escribe" on public.notas_maestras
  for insert to authenticated with check (docente_id = (select auth.uid()) and (select privado.es_docente_de_aula(aula_id)));
create policy "diario de clase: la maestra corrige" on public.notas_maestras
  for update to authenticated
  using (docente_id = (select auth.uid()) and (select privado.es_docente_de_aula(aula_id)))
  with check (docente_id = (select auth.uid()) and (select privado.es_docente_de_aula(aula_id)));
create policy "diario de clase: la maestra borra" on public.notas_maestras
  for delete to authenticated using (docente_id = (select auth.uid()) and (select privado.es_docente_de_aula(aula_id)));
grant select, delete on public.notas_maestras to authenticated;
grant insert (aula_id, fecha, actividad, minutos, texto, sesion_id) on public.notas_maestras to authenticated;
grant update (fecha, actividad, minutos, texto, actualizada_en) on public.notas_maestras to authenticated;
grant select, insert, update, delete on public.notas_maestras to service_role;

-- ---------------------------------------------------------------------
-- 4. Preguntas de maestras que ya tienen respuesta aprobada: las que
--    quedaron sin respuesta y el equipo después respondió (la ficha de
--    preguntas_sin_respuesta ya está publicada). Lo usa el servidor para
--    avisarle a la maestra; se llama al abrir su panel y una vez por día.
-- ---------------------------------------------------------------------
create function public.marcar_preguntas_respondidas(p_docente uuid default null)
returns integer
language sql security invoker set search_path = '' as $$
  with listas as (
    update public.preguntas_maestras pm
       set ficha_id = p.ficha_id, respondida_en = now()
      from public.preguntas_sin_respuesta p
      join public.fichas_validadas fv on fv.ficha_id = p.ficha_id
     where pm.ficha_id is null
       and p.normalizada = pm.normalizada
       and (p_docente is null or pm.docente_id = p_docente)
    returning pm.id
  )
  select count(*)::integer from listas
$$;
revoke all on function public.marcar_preguntas_respondidas(uuid) from public, anon, authenticated;
grant execute on function public.marcar_preguntas_respondidas(uuid) to service_role;
