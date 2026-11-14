-- =====================================================================
-- Migración 22 · Curiosidades según lo más consultado (etapa 4 de
-- "Ajustes de producto", versión completa, pedido de Sofia del 14/11/2026)
--
-- Las curiosidades son fichas de tipo "dato" (migración 9): pasan por la
-- misma revisión que las respuestas y solo se muestran las publicadas.
-- Esta migración agrega lo que hace falta para elegirlas según lo que más
-- se consulta, sin guardar nada que identifique a una maestra o a un chico:
--
-- 1. consultas_tema: cuántas consultas hubo de cada tema por día y por
--    origen (pregunta al asistente con respuesta, sin respuesta, respuesta
--    vista en una actividad). Sin maestra, sin aula y sin hora.
-- 2. consultas_sin_tema: las preguntas al asistente que no se parecen a
--    ningún tema, para que el equipo las ubique (mismo trato que
--    preguntas_sin_respuesta: texto, veces y fechas; nada más).
-- 3. curiosidades_vistas: qué curiosidad se le mostró a qué aula y qué
--    día, para no repetirla en 14 días. Solo la usa el servidor.
-- 4. Funciones, todas solo para el servidor (service_role):
--      · tema_parecido(embedding, umbral): el tema activo más parecido;
--      · contar_consulta_tema(tema, origen);
--      · contar_consulta_de_ficha(ficha, origen): el tema de la ficha, o el
--        más parecido a su pregunta si todavía no tiene;
--      · anotar_consulta_sin_tema(texto, normalizada, actividad);
--      · ubicar_consulta_sin_tema(id, tema): suma sus veces al tema;
--      · limpiar_curiosidades(): borra conteos de más de 90 días y vistas
--        de aulas de más de 30.
--    tendencia_temas(días, vida media) la puede leer el equipo.
--
-- No borra ni cambia nada existente. Para volver atrás alcanza con borrar
-- las tres tablas y las funciones nuevas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Contador anónimo por tema y día
-- ---------------------------------------------------------------------
create table public.consultas_tema (
  tema_id uuid not null references public.temas (id) on delete cascade,
  dia     date not null default current_date,
  origen  text not null check (origen in ('asistente', 'sin_respuesta', 'actividad')),
  veces   integer not null default 0 check (veces >= 0),
  primary key (tema_id, dia, origen)
);
create index consultas_tema_dia on public.consultas_tema (dia);
alter table public.consultas_tema enable row level security;
revoke all on public.consultas_tema from public, anon, authenticated;
create policy "consultas por tema: el equipo ve" on public.consultas_tema
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.consultas_tema to authenticated;
grant select, insert, update, delete on public.consultas_tema to service_role;

-- ---------------------------------------------------------------------
-- 2. Preguntas que no se parecen a ningún tema
-- ---------------------------------------------------------------------
create table public.consultas_sin_tema (
  id          uuid primary key default gen_random_uuid(),
  texto       text not null check (char_length(texto) between 3 and 300),
  normalizada text not null unique check (char_length(normalizada) between 3 and 300),
  actividad   text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  veces       integer not null default 1 check (veces >= 1),
  primera_vez date not null default current_date,
  ultima_vez  date not null default current_date
);
create index consultas_sin_tema_ultima on public.consultas_sin_tema (ultima_vez desc);
alter table public.consultas_sin_tema enable row level security;
revoke all on public.consultas_sin_tema from public, anon, authenticated;
create policy "consultas sin tema: el equipo ve" on public.consultas_sin_tema
  for select to authenticated using ((select privado.es_equipo()));
create policy "consultas sin tema: el equipo descarta" on public.consultas_sin_tema
  for delete to authenticated using ((select privado.es_equipo()));
grant select, delete on public.consultas_sin_tema to authenticated;
grant select, insert, update, delete on public.consultas_sin_tema to service_role;

-- ---------------------------------------------------------------------
-- 3. Curiosidades que vio cada aula (solo el servidor)
-- ---------------------------------------------------------------------
create table public.curiosidades_vistas (
  aula_id  uuid not null references public.aulas (id) on delete cascade,
  ficha_id uuid not null references public.fichas (id) on delete cascade,
  dia      date not null default current_date,
  primary key (aula_id, ficha_id, dia)
);
create index curiosidades_vistas_dia on public.curiosidades_vistas (dia);
alter table public.curiosidades_vistas enable row level security; -- sin reglas: solo el servidor
revoke all on public.curiosidades_vistas from public, anon, authenticated;
grant select, insert, update, delete on public.curiosidades_vistas to service_role;

-- ---------------------------------------------------------------------
-- 4. Funciones
-- ---------------------------------------------------------------------

-- El tema activo más parecido a un texto (por su embedding), si pasa el umbral
create function public.tema_parecido(p_embedding extensions.vector, p_umbral double precision default 0.5)
returns table (tema_id uuid, similitud double precision)
language sql stable security invoker set search_path = '' as $$
  select t.id, 1 - (t.embedding operator(extensions.<=>) p_embedding)
    from public.temas t
   where t.activo and t.embedding is not null
   order by t.embedding operator(extensions.<=>) p_embedding
   limit 1
$$;
-- (el umbral se aplica afuera, en una sola línea, para poder calibrarlo sin migración)

-- Suma una consulta a un tema (solo temas activos)
create function public.contar_consulta_tema(p_tema uuid, p_origen text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.consultas_tema as c (tema_id, dia, origen, veces)
  select t.id, current_date, p_origen, 1
    from public.temas t
   where t.id = p_tema and t.activo and p_origen in ('asistente', 'sin_respuesta', 'actividad')
  on conflict (tema_id, dia, origen) do update set veces = c.veces + 1;
$$;

-- Suma una consulta al tema de una ficha publicada. Si la ficha todavía no
-- tiene tema, usa el más parecido a su pregunta (del índice del asistente)
-- y no la cambia: asignar el tema de una ficha lo decide el equipo.
create function public.contar_consulta_de_ficha(p_ficha uuid, p_origen text, p_umbral double precision default 0.5)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_tema uuid;
  v_emb  extensions.vector;
begin
  select f.tema_id into v_tema from public.fichas f where f.id = p_ficha and f.estado = 'publicada';
  if v_tema is null then
    select fr.embedding into v_emb
      from public.fragmentos fr
      join public.fichas f on f.id = fr.ficha_id and f.version_publicada_id = fr.version_id
     where fr.ficha_id = p_ficha and fr.activo and fr.tipo = 'pregunta' and fr.embedding is not null
     limit 1;
    if v_emb is not null then
      select tp.tema_id into v_tema from public.tema_parecido(v_emb) tp where tp.similitud >= p_umbral;
    end if;
  end if;
  if v_tema is not null then
    perform public.contar_consulta_tema(v_tema, p_origen);
  end if;
  return v_tema;
end;
$$;

-- Anota una pregunta que no se parece a ningún tema
create function public.anotar_consulta_sin_tema(p_texto text, p_normalizada text, p_actividad text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.consultas_sin_tema as c (texto, normalizada, actividad)
  values (left(btrim(p_texto), 300), left(btrim(p_normalizada), 300),
          case when p_actividad in ('a1', 'a2', 'a3', 'a4') then p_actividad end)
  on conflict (normalizada) do update
    set veces = c.veces + 1, ultima_vez = current_date,
        actividad = coalesce(c.actividad, excluded.actividad);
$$;

-- El equipo ubica una pregunta sin tema: sus veces pasan al tema (con su
-- última fecha) y la pregunta se borra. La llama el servidor después de
-- comprobar que quien lo pide es del equipo.
create function public.ubicar_consulta_sin_tema(p_id uuid, p_tema uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v public.consultas_sin_tema;
begin
  if not exists (select 1 from public.temas t where t.id = p_tema and t.activo) then
    return false;
  end if;
  delete from public.consultas_sin_tema c where c.id = p_id returning * into v;
  if v.id is null then
    return false;
  end if;
  insert into public.consultas_tema as c (tema_id, dia, origen, veces)
  values (p_tema, v.ultima_vez, 'asistente', v.veces)
  on conflict (tema_id, dia, origen) do update set veces = c.veces + excluded.veces;
  return true;
end;
$$;

-- Tendencia de los últimos días: cada consulta pesa menos cuanto más vieja
-- es (se reduce a la mitad cada p_vida_media días). Con RLS: el equipo ve
-- todo; cualquier otro, nada.
create function public.tendencia_temas(p_dias int default 30, p_vida_media double precision default 7)
returns table (tema_id uuid, nombre text, actividad text, puntaje double precision, consultas bigint, curiosidades bigint)
language sql stable security invoker set search_path = '' as $$
  with dias as (select least(greatest(coalesce(p_dias, 30), 1), 90) as n,
                       greatest(coalesce(p_vida_media, 7), 0.5) as vida)
  select t.id, t.nombre, t.actividad,
         coalesce(sum(c.veces * power(0.5, (current_date - c.dia) / d.vida)), 0)::double precision,
         coalesce(sum(c.veces), 0)::bigint,
         (select count(*) from public.fichas f
           where f.tema_id = t.id and f.formato = 'dato' and f.estado = 'publicada')::bigint
    from public.temas t
    cross join dias d
    left join public.consultas_tema c on c.tema_id = t.id and c.dia > current_date - d.n
   where t.activo
   group by t.id, t.nombre, t.actividad
   order by 4 desc, t.orden, t.nombre
$$;

-- Limpieza: conteos y preguntas sin tema de más de 90 días; vistas de aulas de más de 30
create function public.limpiar_curiosidades() returns void
language sql security invoker set search_path = '' as $$
  delete from public.consultas_tema where dia < current_date - 90;
  delete from public.consultas_sin_tema where ultima_vez < current_date - 90;
  delete from public.curiosidades_vistas where dia < current_date - 30;
$$;

revoke all on function public.tema_parecido(extensions.vector, double precision),
  public.contar_consulta_tema(uuid, text),
  public.contar_consulta_de_ficha(uuid, text, double precision),
  public.anotar_consulta_sin_tema(text, text, text),
  public.ubicar_consulta_sin_tema(uuid, uuid),
  public.tendencia_temas(int, double precision),
  public.limpiar_curiosidades()
  from public, anon, authenticated;
grant execute on function public.tema_parecido(extensions.vector, double precision),
  public.contar_consulta_tema(uuid, text),
  public.contar_consulta_de_ficha(uuid, text, double precision),
  public.anotar_consulta_sin_tema(text, text, text),
  public.ubicar_consulta_sin_tema(uuid, uuid),
  public.tendencia_temas(int, double precision),
  public.limpiar_curiosidades()
  to service_role;
-- La tendencia también la lee el equipo con su sesión (las reglas filtran)
grant execute on function public.tendencia_temas(int, double precision) to authenticated;
