-- =====================================================================
-- Migración 17 · Asistente para la clase (modo clase, IA-3)
--
-- La maestra escribe la pregunta de la clase. El servidor busca entre las
-- respuestas APROBADAS (índice "fragmentos", migración 9): si coincide, la
-- muestra tal cual con el sello; si no, la anota para que el equipo del
-- Pasteur la prepare. Nunca se genera una respuesta nueva para los chicos.
--
--   1. buscar_fragmentos(): las preguntas aprobadas más parecidas (por
--      significado, con embeddings). Solo de versiones publicadas y vigentes.
--   2. cupos_asistente + usar_cupo_asistente(): hasta N preguntas por maestra
--      por día, contadas de forma atómica.
--   3. preguntas_sin_respuesta: la lista que ve el equipo. Sin maestra, sin
--      aula, sin hora (solo el día) y sin nada del chico. Se borra a los 90
--      días de la última vez que alguien la hizo, salvo que ya se haya pedido.
--
-- Todo lo nuevo lo usa SOLO el servidor (service_role), después de verificar
-- que quien pregunta es una maestra activa. El equipo puede ver la lista y
-- marcarla. No toca nada existente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Buscar entre las respuestas aprobadas
-- ---------------------------------------------------------------------
create function public.buscar_fragmentos(p_embedding extensions.vector, p_limite int default 8)
returns table (ficha_id uuid, version_id uuid, tipo text, texto text, similitud double precision)
language sql stable security invoker set search_path = '' as $$
  select fr.ficha_id, fr.version_id, fr.tipo, fr.texto,
         1 - (fr.embedding operator(extensions.<=>) p_embedding) as similitud
    from public.fragmentos fr
    join public.fichas f on f.id = fr.ficha_id and f.version_publicada_id = fr.version_id and f.estado = 'publicada'
    join public.ficha_versiones v on v.id = fr.version_id and v.estado = 'publicada'
   where fr.activo and fr.embedding is not null and fr.tipo in ('pregunta', 'variante')
   order by fr.embedding operator(extensions.<=>) p_embedding
   limit least(greatest(coalesce(p_limite, 8), 1), 20);
$$;

-- ---------------------------------------------------------------------
-- 2. Cupos por maestra y por día
-- ---------------------------------------------------------------------
create table public.cupos_asistente (
  docente_id uuid not null references public.docentes (id) on delete cascade,
  dia        date not null default current_date,
  usados     smallint not null default 0 check (usados >= 0),
  primary key (docente_id, dia)
);
alter table public.cupos_asistente enable row level security; -- sin reglas: solo el servidor
revoke all on public.cupos_asistente from public, anon, authenticated;
grant select, insert, update, delete on public.cupos_asistente to service_role;

-- true si todavía tiene cupo (y lo usa); false si llegó al límite
create function public.usar_cupo_asistente(p_docente uuid, p_limite int) returns boolean
language sql security invoker set search_path = '' as $$
  insert into public.cupos_asistente as c (docente_id, dia, usados)
  values (p_docente, current_date, 1)
  on conflict (docente_id, dia) do update set usados = c.usados + 1
    where c.usados < p_limite
  returning true;
$$;

-- ---------------------------------------------------------------------
-- 3. Preguntas de las clases que todavía no tienen respuesta
-- ---------------------------------------------------------------------
create table public.preguntas_sin_respuesta (
  id          uuid primary key default gen_random_uuid(),
  texto       text not null check (char_length(texto) between 3 and 300),
  normalizada text not null unique check (char_length(normalizada) between 3 and 300),
  actividad   text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  veces       integer not null default 1 check (veces >= 1),
  primera_vez date not null default current_date,
  ultima_vez  date not null default current_date,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'pedida', 'descartada')),
  ficha_id    uuid references public.fichas (id) on delete set null
);
create index preguntas_sin_respuesta_estado on public.preguntas_sin_respuesta (estado, ultima_vez desc);
alter table public.preguntas_sin_respuesta enable row level security;
revoke all on public.preguntas_sin_respuesta from public, anon, authenticated;

create policy "preguntas sin respuesta: el equipo ve" on public.preguntas_sin_respuesta
  for select to authenticated using ((select privado.es_equipo()));
create policy "preguntas sin respuesta: el equipo marca" on public.preguntas_sin_respuesta
  for update to authenticated using ((select privado.es_equipo())) with check ((select privado.es_equipo()));
grant select on public.preguntas_sin_respuesta to authenticated;
grant update (estado, ficha_id) on public.preguntas_sin_respuesta to authenticated;
grant select, insert, update, delete on public.preguntas_sin_respuesta to service_role;

-- La anota (o suma una vez más) y borra lo que nadie preguntó en 90 días
create function public.anotar_pregunta_sin_respuesta(p_texto text, p_normalizada text, p_actividad text default null)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.preguntas_sin_respuesta
   where ultima_vez < current_date - 90 and estado <> 'pedida';
  insert into public.preguntas_sin_respuesta as p (texto, normalizada, actividad)
  values (left(btrim(p_texto), 300), left(p_normalizada, 300),
          case when p_actividad in ('a1', 'a2', 'a3', 'a4') then p_actividad end)
  on conflict (normalizada) do update
    set veces = p.veces + 1,
        ultima_vez = current_date,
        actividad = coalesce(p.actividad, excluded.actividad),
        -- una descartada que vuelve a aparecer, vuelve a la lista
        estado = case when p.estado = 'descartada' then 'pendiente' else p.estado end;
end;
$$;

revoke all on function public.buscar_fragmentos(extensions.vector, int),
  public.usar_cupo_asistente(uuid, int),
  public.anotar_pregunta_sin_respuesta(text, text, text)
  from public, anon, authenticated;
grant execute on function public.buscar_fragmentos(extensions.vector, int),
  public.usar_cupo_asistente(uuid, int),
  public.anotar_pregunta_sin_respuesta(text, text, text)
  to service_role;
