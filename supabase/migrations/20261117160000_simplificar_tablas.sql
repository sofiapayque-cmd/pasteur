-- =====================================================================
-- Migración 26 · Menos tablas (pedido de Sofia, 17/11/2026: "¿son
-- necesarias todas las tablas? ¿no se pueden poner como estados dentro de
-- otras si son del mismo tema?")
--
-- De 44 tablas quedan 41:
--
-- 1. Se borra "resultados": nunca la usó el código. Lo que hace cada chico
--    en una actividad se guarda en "progreso".
-- 2. Se borra "busquedas_guardadas": era para búsquedas automáticas de
--    artículos que nunca se armaron. Con ella se va la columna
--    ejecuciones_busqueda.busqueda_id, que la apuntaba (siempre vacía).
-- 3. "preguntas_sin_respuesta" y "consultas_sin_tema" pasan a ser UNA tabla,
--    "preguntas_pendientes". Las dos guardaban lo mismo: preguntas a
--    "Preguntale al Pasteur" que el equipo tiene que mirar, sin maestra, sin
--    aula y sin hora. Una misma pregunta podía estar en las dos. Ahora cada
--    pregunta es una fila, con dos estados:
--      · respuesta: vacío si el asistente sí encontró respuesta; si no,
--        'pendiente' → 'pedida' (ya se está escribiendo) o 'descartada'.
--      · veces_sin_tema: cuántas veces no se pareció a ningún tema de
--        curiosidades. 0 quiere decir que ya tiene tema (o nunca le faltó).
--    Una pregunta a la que no le falta nada no queda en la lista.
--
-- Las funciones que usa el servidor mantienen su nombre y lo que reciben
-- (anotar_pregunta_sin_respuesta, anotar_consulta_sin_tema,
-- ubicar_consulta_sin_tema, limpiar_curiosidades,
-- marcar_preguntas_respondidas): solo cambia la tabla que tocan. Se agrega
-- descartar_sin_tema(), porque ahora descartar el tema no siempre borra la
-- fila (puede faltarle la respuesta todavía).
--
-- Copia lo que haya en las dos tablas viejas antes de borrarlas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 y 2. Tablas que no usa nada
-- ---------------------------------------------------------------------
drop table public.resultados;

alter table public.ejecuciones_busqueda drop column busqueda_id;
drop table public.busquedas_guardadas;

-- ---------------------------------------------------------------------
-- 3. Una sola lista de preguntas pendientes
-- ---------------------------------------------------------------------
create table public.preguntas_pendientes (
  id                  uuid primary key default gen_random_uuid(),
  texto               text not null check (char_length(texto) between 3 and 300),
  normalizada         text not null unique check (char_length(normalizada) between 3 and 300),
  actividad           text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  primera_vez         date not null default current_date,
  ultima_vez          date not null default current_date,
  -- Le falta respuesta (vacío: el asistente sí encontró una aprobada)
  respuesta           text check (respuesta in ('pendiente', 'pedida', 'descartada')),
  ficha_id            uuid references public.fichas (id) on delete set null, -- la respuesta que se pidió
  veces_sin_respuesta integer not null default 0 check (veces_sin_respuesta >= 0),
  -- Le falta tema (0: ya tiene)
  veces_sin_tema      integer not null default 0 check (veces_sin_tema >= 0),
  -- Si no le falta nada, no está en la lista
  check (respuesta is not null or veces_sin_tema > 0)
);
create index preguntas_pendientes_respuesta on public.preguntas_pendientes (respuesta, ultima_vez desc) where respuesta is not null;
create index preguntas_pendientes_sin_tema on public.preguntas_pendientes (ultima_vez desc) where veces_sin_tema > 0;

alter table public.preguntas_pendientes enable row level security;
revoke all on public.preguntas_pendientes from public, anon, authenticated;
create policy "preguntas pendientes: el equipo ve" on public.preguntas_pendientes
  for select to authenticated using ((select privado.es_equipo()));
-- El equipo marca la respuesta (pedida o descartada). El tema lo ubica o
-- lo descarta el servidor, con las funciones de abajo.
create policy "preguntas pendientes: el equipo marca la respuesta" on public.preguntas_pendientes
  for update to authenticated
  using ((select privado.es_equipo()))
  with check ((select privado.es_equipo()) and respuesta is not null);
grant select on public.preguntas_pendientes to authenticated;
grant update (respuesta, ficha_id) on public.preguntas_pendientes to authenticated;
grant select, insert, update, delete on public.preguntas_pendientes to service_role;

-- Lo que ya había (conserva los ids de las preguntas sin respuesta)
insert into public.preguntas_pendientes (id, texto, normalizada, actividad, primera_vez, ultima_vez, respuesta, ficha_id, veces_sin_respuesta)
select id, texto, normalizada, actividad, primera_vez, ultima_vez, estado, ficha_id, veces
  from public.preguntas_sin_respuesta;

insert into public.preguntas_pendientes as p (id, texto, normalizada, actividad, primera_vez, ultima_vez, veces_sin_tema)
select id, texto, normalizada, actividad, primera_vez, ultima_vez, veces
  from public.consultas_sin_tema
on conflict (normalizada) do update
  set veces_sin_tema = excluded.veces_sin_tema,
      primera_vez = least(p.primera_vez, excluded.primera_vez),
      ultima_vez = greatest(p.ultima_vez, excluded.ultima_vez),
      actividad = coalesce(p.actividad, excluded.actividad);

-- ---------------------------------------------------------------------
-- Las funciones, con la tabla nueva
-- ---------------------------------------------------------------------

-- La pregunta no tuvo respuesta: la anota (o suma una vez más) y borra lo
-- que nadie preguntó en 90 días, salvo las que ya se pidieron.
create or replace function public.anotar_pregunta_sin_respuesta(p_texto text, p_normalizada text, p_actividad text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.preguntas_pendientes
   where ultima_vez < current_date - 90 and respuesta is distinct from 'pedida';
  update public.preguntas_pendientes set veces_sin_tema = 0
   where ultima_vez < current_date - 90 and veces_sin_tema > 0;
  insert into public.preguntas_pendientes as p (texto, normalizada, actividad, respuesta, veces_sin_respuesta)
  values (left(btrim(p_texto), 300), left(p_normalizada, 300),
          case when p_actividad in ('a1', 'a2', 'a3', 'a4') then p_actividad end,
          'pendiente', 1)
  on conflict (normalizada) do update
    set veces_sin_respuesta = p.veces_sin_respuesta + 1,
        ultima_vez = current_date,
        actividad = coalesce(p.actividad, excluded.actividad),
        -- estaba solo por el tema, o la habían descartado y vuelve: pendiente
        respuesta = case when p.respuesta is null or p.respuesta = 'descartada' then 'pendiente' else p.respuesta end;
end;
$$;

-- La pregunta no se parece a ningún tema: la anota (o suma una vez más)
create or replace function public.anotar_consulta_sin_tema(p_texto text, p_normalizada text, p_actividad text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.preguntas_pendientes as p (texto, normalizada, actividad, veces_sin_tema)
  values (left(btrim(p_texto), 300), left(btrim(p_normalizada), 300),
          case when p_actividad in ('a1', 'a2', 'a3', 'a4') then p_actividad end, 1)
  on conflict (normalizada) do update
    set veces_sin_tema = p.veces_sin_tema + 1,
        ultima_vez = current_date,
        actividad = coalesce(p.actividad, excluded.actividad);
$$;

-- El equipo ubica una pregunta sin tema: sus veces pasan al tema (con su
-- última fecha) y deja de faltarle tema. Si tampoco le falta respuesta, se
-- borra. La llama el servidor después de comprobar que quien lo pide es del
-- equipo.
create or replace function public.ubicar_consulta_sin_tema(p_id uuid, p_tema uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v public.preguntas_pendientes;
begin
  if not exists (select 1 from public.temas t where t.id = p_tema and t.activo) then
    return false;
  end if;
  select * into v from public.preguntas_pendientes p where p.id = p_id and p.veces_sin_tema > 0 for update;
  if v.id is null then
    return false;
  end if;
  if v.respuesta is null then
    delete from public.preguntas_pendientes p where p.id = p_id;
  else
    update public.preguntas_pendientes p set veces_sin_tema = 0 where p.id = p_id;
  end if;
  insert into public.consultas_tema as c (tema_id, dia, origen, veces)
  values (p_tema, v.ultima_vez, 'asistente', v.veces_sin_tema)
  on conflict (tema_id, dia, origen) do update set veces = c.veces + excluded.veces;
  return true;
end;
$$;

-- El equipo descarta el tema de una pregunta (no hace falta ubicarla). Si
-- tampoco le falta respuesta, se borra. Solo el servidor, como la anterior.
create function public.descartar_sin_tema(p_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v public.preguntas_pendientes;
begin
  select * into v from public.preguntas_pendientes p where p.id = p_id and p.veces_sin_tema > 0 for update;
  if v.id is null then
    return false;
  end if;
  if v.respuesta is null then
    delete from public.preguntas_pendientes p where p.id = p_id;
  else
    update public.preguntas_pendientes p set veces_sin_tema = 0 where p.id = p_id;
  end if;
  return true;
end;
$$;
revoke all on function public.descartar_sin_tema(uuid) from public, anon, authenticated;
grant execute on function public.descartar_sin_tema(uuid) to service_role;

-- Limpieza: conteos y preguntas de más de 90 días (las pedidas se quedan,
-- pero ya sin el tema); vistas de aulas de más de 30
create or replace function public.limpiar_curiosidades() returns void
language sql security invoker set search_path = '' as $$
  delete from public.consultas_tema where dia < current_date - 90;
  delete from public.preguntas_pendientes where ultima_vez < current_date - 90 and respuesta is distinct from 'pedida';
  update public.preguntas_pendientes set veces_sin_tema = 0 where ultima_vez < current_date - 90 and veces_sin_tema > 0;
  delete from public.curiosidades_vistas where dia < current_date - 30;
$$;

-- Preguntas de maestras que ya tienen respuesta aprobada (migración 25)
create or replace function public.marcar_preguntas_respondidas(p_docente uuid default null)
returns integer
language sql security invoker set search_path = '' as $$
  with listas as (
    update public.preguntas_maestras pm
       set ficha_id = p.ficha_id, respondida_en = now()
      from public.preguntas_pendientes p
      join public.fichas_validadas fv on fv.ficha_id = p.ficha_id
     where pm.ficha_id is null
       and p.normalizada = pm.normalizada
       and (p_docente is null or pm.docente_id = p_docente)
    returning pm.id
  )
  select count(*)::integer from listas
$$;

-- ---------------------------------------------------------------------
-- Las dos tablas viejas
-- ---------------------------------------------------------------------
drop table public.preguntas_sin_respuesta;
drop table public.consultas_sin_tema;
