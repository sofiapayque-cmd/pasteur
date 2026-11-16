-- =====================================================================
-- Migración 23 · Curiosidades automáticas (pedido de Sofia, 15/11/2026:
-- "las curiosidades deberían ser más automatizadas, sin nada que aprobar")
--
-- Cada día, sin que nadie apruebe nada nuevo:
-- 1. Las preguntas de las clases que no se parecían a ningún tema se agrupan
--    solas: si varias se parecen entre sí, se arma un tema nuevo (marcado
--    "automatico", como subtema del más cercano si hay uno).
-- 2. De cada respuesta aprobada por la validadora se eligen hasta 2 oraciones
--    de su versión para chicos que sirvan solas como "¿Sabías que…?". La
--    oración se guarda TAL CUAL (solo se pasa a minúscula la primera letra):
--    los chicos solo ven texto que aprobó una investigadora del Instituto.
-- 3. Cada curiosidad queda en el tema más parecido a su respuesta, y se
--    muestran siguiendo lo más consultado (como las fichas "dato").
--
-- Si la respuesta se retira o se publica otra versión, sus curiosidades
-- dejan de mostrarse solas (se muestran solo si su versión sigue siendo la
-- publicada). El equipo puede ocultar una.
--
-- No borra ni cambia nada existente. Para volver atrás alcanza con borrar
-- las dos tablas, la función nueva y la columna temas.automatico.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Temas armados solos
-- ---------------------------------------------------------------------
alter table public.temas add column automatico boolean not null default false;
grant select (automatico) on public.temas to authenticated, service_role;
-- El trabajo diario (sin sesión) crea los temas nuevos con la clave secreta
grant insert (slug, nombre, descripcion, padre_id, actividad, orden, activo, automatico) on public.temas to service_role;

-- ---------------------------------------------------------------------
-- 2. Respuestas ya analizadas (aunque no hayan dado ninguna curiosidad)
-- ---------------------------------------------------------------------
create table public.curiosidades_origen (
  version_id   uuid primary key references public.ficha_versiones (id) on delete cascade,
  analizada_en timestamptz not null default now(),
  cuantas      smallint not null default 0 check (cuantas between 0 and 2)
);
alter table public.curiosidades_origen enable row level security;
revoke all on public.curiosidades_origen from public, anon, authenticated;
create policy "origen de curiosidades: el equipo ve" on public.curiosidades_origen
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.curiosidades_origen to authenticated;
grant select, insert, update, delete on public.curiosidades_origen to service_role;

-- ---------------------------------------------------------------------
-- 3. Curiosidades sacadas de respuestas aprobadas
-- ---------------------------------------------------------------------
create table public.curiosidades_auto (
  id         uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.curiosidades_origen (version_id) on delete cascade,
  ficha_id   uuid not null references public.fichas (id) on delete cascade,
  oracion    smallint not null check (oracion between 1 and 40), -- número de oración en la versión para chicos
  texto      text not null check (char_length(texto) between 20 and 300),
  tema_id    uuid references public.temas (id) on delete set null,
  similitud  real,
  oculta     boolean not null default false,
  creada_en  timestamptz not null default now(),
  unique (version_id, oracion)
);
create index curiosidades_auto_tema on public.curiosidades_auto (tema_id) where not oculta;
create index curiosidades_auto_ficha on public.curiosidades_auto (ficha_id);
alter table public.curiosidades_auto enable row level security;
revoke all on public.curiosidades_auto from public, anon, authenticated;
create policy "curiosidades automáticas: el equipo ve" on public.curiosidades_auto
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.curiosidades_auto to authenticated;
grant select, insert, update, delete on public.curiosidades_auto to service_role;

-- ---------------------------------------------------------------------
-- 4. El tema más parecido a cada respuesta aprobada (por su pregunta, con
--    el índice del asistente). El umbral se aplica afuera, como en
--    tema_parecido, para poder calibrarlo sin migración.
-- ---------------------------------------------------------------------
create function public.temas_de_respuestas()
returns table (ficha_id uuid, version_id uuid, tema_id uuid, similitud double precision)
language sql stable security invoker set search_path = '' as $$
  select distinct on (fr.ficha_id)
         fr.ficha_id, fr.version_id, t.id,
         1 - (fr.embedding operator(extensions.<=>) t.embedding)
    from public.fragmentos fr
    join public.fichas_validadas fv on fv.version_id = fr.version_id and fv.formato = 'pregunta'
    cross join public.temas t
   where fr.activo and fr.tipo = 'pregunta' and t.activo and t.embedding is not null
   order by fr.ficha_id, fr.embedding operator(extensions.<=>) t.embedding
$$;
revoke all on function public.temas_de_respuestas() from public, anon, authenticated;
grant execute on function public.temas_de_respuestas() to service_role;
