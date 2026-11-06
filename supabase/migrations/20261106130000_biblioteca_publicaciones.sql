-- =====================================================================
-- Migración 13 · Biblioteca científica: publicaciones
--
-- Lo que se trae de OpenAlex y Europe PMC queda en una ZONA DE CURADURÍA
-- que solo ve el equipo. Una publicación pasa a ser citable cuando una
-- VALIDADORA la aprueba como fuente confiable; recién ahí una ficha que la
-- cita puede ir a revisión. A los chicos nunca llega texto de un artículo:
-- llegan las fichas, que pasan su propia revisión.
--
-- Ciclo de una publicación:
--   candidata ⇄ en_revision → aprobada → retirada (a mano o por retractación)
--                           → candidata (si la validadora pide cambios)
--                           → rechazada (se borra su resumen interno)
--   · La agrega el servidor (botón "Agregar" del equipo), con
--     public.guardar_registro(): normaliza identificadores y une duplicados.
--   · Cualquiera del equipo la manda a revisión o la saca de revisión.
--   · Aprueba solo una validadora activa, con la huella de lo que está
--     viendo (como en las fichas). Si la agregó ella, queda marcado.
--   · Aprobada: título, año, tipo, revista y autores ya no cambian.
--   · Si se retira o se retracta: las fichas en revisión que la citan vuelven
--     a borrador, y las publicadas que la tenían como ÚNICA fuente se retiran
--     (salen del asistente en la misma transacción).
--
-- Sin texto completo: se guardan metadatos, enlaces y, solo para el equipo,
-- el resumen. Cada cita de una ficha guarda el pasaje que sirve (migración 9).
--
-- Toca de lo existente: agrega la clave foránea de version_fuentes a
-- publicaciones y reemplaza dos funciones de la migración 9 (CREATE OR
-- REPLACE, mismos permisos):
--   · validar_para_revision: un artículo citado necesita su ubicación y su
--     pasaje O su paráfrasis (si la licencia no deja copiar, va paráfrasis),
--     y la publicación tiene que estar aprobada.
--   · revisar: ahora también revisa publicaciones.
-- No borra nada.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- Título comparable: minúsculas, sin tildes ni signos
create function privado.normalizar_titulo(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select btrim(regexp_replace(privado.normalizar(t), '[^a-z0-9]+', ' ', 'g'));
$$;
revoke all on function privado.normalizar_titulo(text) from public, anon;
grant execute on function privado.normalizar_titulo(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Proveedores y tipos de identificador (son tablas, no tipos: sumar una
-- fuente nueva es agregar filas)
-- ---------------------------------------------------------------------
create table public.proveedores_cientificos (
  id                 text primary key check (id ~ '^[a-z0-9_]+$' and char_length(id) <= 30),
  nombre             text not null check (char_length(nombre) between 1 and 80),
  activo             boolean not null default true,
  url_base           text not null check (url_base ~ '^https://' and char_length(url_base) <= 200),
  url_terminos       text check (url_terminos is null or (url_terminos ~ '^https://' and char_length(url_terminos) <= 300)),
  version_adaptador  text not null default '1' check (char_length(version_adaptador) <= 20),
  limites            jsonb not null default '{}'::jsonb check (jsonb_typeof(limites) = 'object')
);
insert into public.proveedores_cientificos (id, nombre, url_base, limites) values
  ('openalex',  'OpenAlex',   'https://api.openalex.org',
   '{"consultas_por_segundo_sin_clave": 10, "consultas_por_segundo_con_clave": 30, "por_pagina_max": 100}'),
  ('europepmc', 'Europe PMC', 'https://www.ebi.ac.uk/europepmc/webservices/rest',
   '{"por_pagina_max": 1000}');

create table public.tipos_identificador (
  id      text primary key check (id ~ '^[a-z0-9_]+$' and char_length(id) <= 30),
  nombre  text not null check (char_length(nombre) between 1 and 80),
  patron  text not null check (char_length(patron) <= 200)   -- cómo es un valor ya normalizado
);
insert into public.tipos_identificador (id, nombre, patron) values
  ('doi',       'DOI',            '^10\.[0-9]{4,9}/[^[:space:]]{1,250}$'),
  ('pmid',      'PubMed',         '^[1-9][0-9]{0,9}$'),
  ('pmcid',     'PubMed Central', '^PMC[0-9]{1,10}$'),
  ('openalex',  'OpenAlex',       '^W[0-9]{1,12}$'),
  ('europepmc', 'Europe PMC',     '^[A-Z]{3}:[A-Z0-9._-]{1,40}$');

-- Normaliza un identificador; devuelve null si no tiene forma válida
create function privado.normalizar_identificador(p_tipo text, p_valor text) returns text
language plpgsql stable set search_path = '' as $$
declare
  v text := btrim(coalesce(p_valor, ''));
  patron text;
begin
  if v = '' then
    return null;
  end if;
  if p_tipo = 'doi' then
    v := lower(v);
    v := regexp_replace(v, '^(https?://)?(dx\.)?doi\.org/', '');
    v := regexp_replace(v, '^doi:[[:space:]]*', '');
    v := replace(replace(v, '%2f', '/'), '%3a', ':');
    v := regexp_replace(v, '[[:space:]]+', '', 'g');
  elsif p_tipo = 'pmid' then
    v := substring(v from '([0-9]+)/?$');
  elsif p_tipo = 'pmcid' then
    v := 'PMC' || substring(upper(v) from '(?:PMC)?([0-9]+)/?$');
  elsif p_tipo = 'openalex' then
    v := substring(upper(v) from '(W[0-9]+)/?$');
  elsif p_tipo = 'europepmc' then
    v := upper(v);
  end if;
  select t.patron into patron from public.tipos_identificador t where t.id = p_tipo;
  if patron is null or v is null or v !~ patron then
    return null;
  end if;
  return v;
end;
$$;
revoke all on function privado.normalizar_identificador(text, text) from public, anon;
grant execute on function privado.normalizar_identificador(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Búsquedas guardadas y bitácora de cada llamada a un proveedor
-- ---------------------------------------------------------------------
create table public.busquedas_guardadas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (char_length(nombre) between 1 and 120),
  tema_id         uuid references public.temas (id) on delete set null,
  consulta        jsonb not null check (jsonb_typeof(consulta) = 'object' and octet_length(consulta::text) <= 4000),
  proveedores     text[] not null default '{openalex,europepmc}' check (cardinality(proveedores) between 1 and 10),
  frecuencia      text not null default 'manual' check (frecuencia in ('manual', 'semanal')),
  max_resultados  smallint not null default 25 check (max_resultados between 1 and 200),
  activa          boolean not null default true,
  creada_por      uuid not null default auth.uid() references public.equipo (id) on delete restrict,
  creada_en       timestamptz not null default now()
);

create table public.ejecuciones_busqueda (
  id                uuid primary key default gen_random_uuid(),
  busqueda_id       uuid references public.busquedas_guardadas (id) on delete set null,
  proveedor         text not null references public.proveedores_cientificos (id),
  -- La consulta tal como se mandó, SIN la clave (la clave va en un encabezado)
  consulta_enviada  text not null check (char_length(consulta_enviada) <= 2000 and consulta_enviada !~* 'api[_-]?key'),
  pedida_por        uuid references public.equipo (id) on delete set null,
  estado            text not null default 'en_curso' check (estado in ('en_curso', 'ok', 'parcial', 'error')),
  recibidos         int not null default 0 check (recibidos >= 0),
  nuevos            int not null default 0 check (nuevos >= 0),
  duplicados        int not null default 0 check (duplicados >= 0),
  costo_usd         numeric(10, 6) check (costo_usd >= 0),
  error             text check (char_length(error) <= 1000),
  iniciada_en       timestamptz not null default now(),
  terminada_en      timestamptz
);
create index ejecuciones_busqueda_busqueda on public.ejecuciones_busqueda (busqueda_id);

-- Lo que devolvió el proveedor, tal cual (procedencia exacta). Se purgan a
-- los 90 días salvo los de publicaciones aprobadas (tarea programada, después).
create table public.registros_crudos (
  id            uuid primary key default gen_random_uuid(),
  proveedor     text not null references public.proveedores_cientificos (id),
  id_externo    text not null check (char_length(id_externo) between 1 and 200),
  ejecucion_id  uuid references public.ejecuciones_busqueda (id) on delete set null,
  payload       jsonb not null check (octet_length(payload::text) <= 500000),
  huella        text not null check (huella ~ '^[0-9a-f]{64}$'),
  obtenido_en   timestamptz not null default now(),
  expira_en     timestamptz not null default now() + interval '90 days',
  unique (proveedor, id_externo, huella)
);

-- ---------------------------------------------------------------------
-- Publicaciones: una fila por obra real, aunque llegue de varias fuentes
-- ---------------------------------------------------------------------
create table public.publicaciones (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null check (char_length(titulo) between 1 and 1000),
  titulo_normalizado  text generated always as (privado.normalizar_titulo(titulo)) stored,
  anio                smallint check (anio between 1800 and 2100),
  tipo                text not null default 'otro' check (tipo in ('articulo', 'revision', 'preprint', 'otro')),
  revista             text not null default '' check (char_length(revista) <= 300),
  idioma              text not null default '' check (char_length(idioma) <= 10),
  autores             jsonb not null default '[]'::jsonb check (jsonb_typeof(autores) = 'array'),
  primer_autor        text generated always as (privado.normalizar(autores -> 0 ->> 'apellido')) stored,
  temas_externos      jsonb not null default '[]'::jsonb check (jsonb_typeof(temas_externos) = 'array'),
  mesh                text[] not null default '{}' check (cardinality(mesh) <= 60),
  citas               int not null default 0 check (citas >= 0),
  oa_estado           text not null default '' check (char_length(oa_estado) <= 20),
  retractada          boolean not null default false,
  del_instituto       boolean not null default false,
  -- Solo para la revisión del equipo: nunca lo ven maestras ni chicos
  resumen_interno     text check (char_length(resumen_interno) <= 10000),
  resumen_origen      text check (resumen_origen in ('europepmc', 'openalex')),
  resumen_tsv         tsvector generated always as (to_tsvector('english', coalesce(resumen_interno, ''))) stored,
  resumen_embedding   extensions.vector(1536),
  licencia_codigo     text,          -- la clave foránea a licencias se agrega en la migración 14
  licencia_revisar    boolean not null default false,
  estado              text not null default 'candidata'
                        check (estado in ('candidata', 'en_revision', 'aprobada', 'rechazada', 'retirada')),
  huella              text check (huella ~ '^[0-9a-f]{64}$'),
  agregada_por        uuid references public.equipo (id) on delete restrict,
  creada_en           timestamptz not null default now(),
  actualizada_en      timestamptz not null default now(),
  enviada_en          timestamptz,
  decidida_en         timestamptz,
  retirada_en         timestamptz,
  motivo_retiro       text check (char_length(motivo_retiro) <= 600),
  vence_en            timestamptz default now() + interval '90 days',
  check ((estado = 'candidata') = (huella is null)),
  check (resumen_interno is not null or resumen_origen is null)
);
create index publicaciones_estado on public.publicaciones (estado);
create index publicaciones_titulo_trgm on public.publicaciones using gin (titulo_normalizado extensions.gin_trgm_ops);
create index publicaciones_resumen_tsv on public.publicaciones using gin (resumen_tsv);
create index publicaciones_resumen_embedding on public.publicaciones
  using hnsw (resumen_embedding extensions.vector_cosine_ops);

-- Clave única (tipo, valor): la base impide que dos publicaciones tengan el
-- mismo DOI, PMID, etc.
create table public.publicacion_identificadores (
  publicacion_id  uuid not null references public.publicaciones (id) on delete cascade,
  tipo            text not null references public.tipos_identificador (id),
  valor           text not null check (char_length(valor) <= 300),
  agregado_en     timestamptz not null default now(),
  primary key (tipo, valor)
);
create index publicacion_identificadores_publicacion on public.publicacion_identificadores (publicacion_id);

create table public.publicacion_procedencias (
  id                 uuid primary key default gen_random_uuid(),
  publicacion_id     uuid not null references public.publicaciones (id) on delete cascade,
  proveedor          text not null references public.proveedores_cientificos (id),
  id_externo         text not null check (char_length(id_externo) between 1 and 200),
  registro_crudo_id  uuid references public.registros_crudos (id) on delete set null,
  ejecucion_id       uuid references public.ejecuciones_busqueda (id) on delete set null,
  campos_aportados   text[] not null default '{}',
  obtenida_en        timestamptz not null default now()
);
create index publicacion_procedencias_publicacion on public.publicacion_procedencias (publicacion_id);

create table public.publicacion_relaciones (
  id           uuid primary key default gen_random_uuid(),
  origen_id    uuid not null references public.publicaciones (id) on delete cascade,
  destino_id   uuid not null references public.publicaciones (id) on delete cascade,
  tipo         text not null check (tipo in ('posible_duplicado', 'preprint_de', 'retractacion_de')),
  estado       text not null default 'sugerida' check (estado in ('sugerida', 'confirmada', 'descartada')),
  motivo       text not null default '' check (char_length(motivo) <= 200),
  creada_en    timestamptz not null default now(),
  resuelta_por uuid references public.equipo (id) on delete set null,
  resuelta_en  timestamptz,
  check (origen_id <> destino_id)
);
create unique index publicacion_relaciones_unica
  on public.publicacion_relaciones (least(origen_id, destino_id), greatest(origen_id, destino_id), tipo);

create table public.publicacion_temas (
  publicacion_id  uuid not null references public.publicaciones (id) on delete cascade,
  tema_id         uuid not null references public.temas (id) on delete cascade,
  agregado_por    uuid default auth.uid() references public.equipo (id) on delete set null,
  primary key (publicacion_id, tema_id)
);

-- Solo enlaces: el servidor nunca los visita
create table public.publicacion_accesos (
  id              uuid primary key default gen_random_uuid(),
  publicacion_id  uuid not null references public.publicaciones (id) on delete cascade,
  tipo            text not null check (tipo in ('pagina', 'pdf', 'xml')),
  url             text not null check (url ~ '^https?://' and char_length(url) <= 1000),
  version         text not null default '' check (char_length(version) <= 40),
  es_oa           boolean not null default false,
  licencia_texto  text not null default '' check (char_length(licencia_texto) <= 200),
  proveedor       text references public.proveedores_cientificos (id),
  unique (publicacion_id, url)
);

-- Las citas de las fichas ahora apuntan a una publicación real
alter table public.version_fuentes
  add constraint version_fuentes_publicacion_fk
  foreign key (publicacion_id) references public.publicaciones (id) on delete restrict;
create index version_fuentes_publicacion on public.version_fuentes (publicacion_id);

-- =====================================================================
-- Reglas
-- =====================================================================

-- Huella de lo que la validadora ve al revisar una publicación
create function privado.huella_publicacion(p public.publicaciones) returns text
language sql stable set search_path = '' as $$
  select encode(sha256(convert_to(jsonb_build_object(
    'titulo', p.titulo, 'anio', p.anio, 'tipo', p.tipo, 'revista', p.revista, 'autores', p.autores,
    'retractada', p.retractada, 'del_instituto', p.del_instituto,
    'resumen', p.resumen_interno, 'licencia', p.licencia_codigo
  )::text, 'UTF8')), 'hex');
$$;
revoke all on function privado.huella_publicacion(public.publicaciones) from public, anon;
grant execute on function privado.huella_publicacion(public.publicaciones) to authenticated, service_role;

-- Sin security definer: tiene que ver QUIÉN manda la sentencia. "Externo" =
-- un usuario por la API o el servidor con su clave; las revisiones (que
-- corren como dueño) son las únicas que aprueban o rechazan.
create function privado.publicaciones_antes() returns trigger
language plpgsql set search_path = '' as $$
declare
  externo boolean := current_user in ('authenticated', 'anon', 'service_role');
begin
  if tg_op = 'INSERT' then
    new.estado := 'candidata';
    new.huella := null;
    new.enviada_en := null;
    new.decidida_en := null;
    new.retirada_en := null;
    new.motivo_retiro := null;
    new.creada_en := now();
    new.actualizada_en := now();
    new.vence_en := coalesce(new.vence_en, now() + interval '90 days');
    return new;
  end if;

  if new.id is distinct from old.id or new.creada_en is distinct from old.creada_en
     or new.agregada_por is distinct from old.agregada_por then
    raise exception 'id, fecha de alta y quién la agregó no se cambian' using errcode = '42501';
  end if;
  if old.retractada and not new.retractada then
    raise exception 'una retractación no se deshace' using errcode = '42501';
  end if;
  if externo and (new.huella is distinct from old.huella or new.enviada_en is distinct from old.enviada_en
                  or new.decidida_en is distinct from old.decidida_en or new.retirada_en is distinct from old.retirada_en) then
    raise exception 'la huella y las fechas de revisión las pone la base' using errcode = '42501';
  end if;
  -- Lo decidido no se pisa
  if old.estado in ('aprobada', 'rechazada', 'retirada') and (
       new.titulo is distinct from old.titulo or new.anio is distinct from old.anio
    or new.tipo is distinct from old.tipo or new.revista is distinct from old.revista
    or new.autores is distinct from old.autores) then
    raise exception 'los datos de una publicación ya decidida no se cambian' using errcode = '42501';
  end if;

  if new.estado is distinct from old.estado then
    if externo then
      if current_user = 'authenticated'
         and (old.estado, new.estado) in (('candidata', 'en_revision'), ('en_revision', 'candidata')) then
        null;  -- cualquiera del equipo (lo exige RLS)
      elsif current_user = 'authenticated' and old.estado = 'aprobada' and new.estado = 'retirada' then
        if not (privado.es_validador() or privado.es_admin_equipo()) then
          raise exception 'solo una validadora o la admin retiran publicaciones' using errcode = '42501';
        end if;
        if char_length(btrim(coalesce(new.motivo_retiro, ''))) < 5 then
          raise exception 'retirar una publicación exige un motivo' using errcode = '23514';
        end if;
      else
        raise exception 'el estado de una publicación lo cambia una revisión' using errcode = '42501';
      end if;
    end if;
  elsif externo and new.motivo_retiro is distinct from old.motivo_retiro then
    raise exception 'el motivo de retiro solo se pone al retirar' using errcode = '42501';
  end if;

  -- Una aprobada que se retracta sale de la biblioteca
  if new.retractada and not old.retractada and new.estado = 'aprobada' then
    new.estado := 'retirada';
    new.motivo_retiro := 'La publicación fue retractada';
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'en_revision' then
      new.enviada_en := now();
    elsif new.estado = 'candidata' then
      new.enviada_en := null;
    elsif new.estado = 'retirada' then
      new.retirada_en := now();
    else
      new.decidida_en := now();
    end if;
  end if;
  if new.estado = 'aprobada' then
    new.vence_en := null;
  elsif new.estado = 'rechazada' then
    new.resumen_interno := null;
    new.resumen_origen := null;
    new.resumen_embedding := null;
  end if;

  if new.estado = 'candidata' then
    new.huella := null;
  elsif new.estado = 'en_revision' then
    new.huella := privado.huella_publicacion(new);
  end if;
  new.actualizada_en := now();
  return new;
end;
$$;
create trigger publicaciones_antes before insert or update on public.publicaciones
  for each row execute function privado.publicaciones_antes();

-- Si una publicación se retira: las fichas en revisión que la citan vuelven
-- a borrador; las publicadas que la tenían como única fuente se retiran.
create function privado.retirar_citas(p_publicacion uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f record;
begin
  update public.ficha_versiones v set estado = 'borrador'
   where v.estado = 'en_revision'
     and exists (select 1 from public.version_fuentes vf where vf.version_id = v.id and vf.publicacion_id = p_publicacion);

  for f in
    select fi.id, fi.version_publicada_id from public.fichas fi
     where fi.estado = 'publicada'
       and exists (select 1 from public.version_fuentes vf
                   where vf.version_id = fi.version_publicada_id and vf.publicacion_id = p_publicacion)
  loop
    if exists (select 1 from public.version_fuentes vf
               left join public.publicaciones p on p.id = vf.publicacion_id
               where vf.version_id = f.version_publicada_id
                 and (vf.fuente_id is not null or (p.estado = 'aprobada' and p.id <> p_publicacion))) then
      perform privado.registrar('fuente_retirada', 'ficha', f.id, null,
        jsonb_build_object('publicacion_id', p_publicacion, 'motivo', p_motivo));
    else
      update public.fichas
         set estado = 'retirada', retirada_en = now(),
             motivo_retiro = left('Se retiró la publicación que la respaldaba: ' || coalesce(p_motivo, ''), 600)
       where id = f.id;
    end if;
  end loop;
end;
$$;

create function privado.publicaciones_despues() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform privado.registrar('agregar_candidata', 'publicacion', new.id, null,
      jsonb_build_object('titulo', new.titulo, 'agregada_por', new.agregada_por));
  elsif new.estado is distinct from old.estado then
    perform privado.registrar(
      case when new.estado = 'en_revision' then 'enviar_a_revision'
           when old.estado = 'en_revision' and new.estado = 'candidata' then 'volver_a_candidata'
           else new.estado end,
      'publicacion', new.id, jsonb_build_object('estado', old.estado),
      jsonb_build_object('estado', new.estado, 'huella', new.huella, 'motivo', new.motivo_retiro));
    if new.estado = 'retirada' then
      perform privado.retirar_citas(new.id, new.motivo_retiro);
    end if;
  elsif new.retractada and not old.retractada then
    perform privado.registrar('retractada', 'publicacion', new.id, null, jsonb_build_object('estado', new.estado));
  elsif new.estado = 'en_revision' and new.huella is distinct from old.huella then
    perform privado.registrar('actualizar_en_revision', 'publicacion', new.id,
      jsonb_build_object('huella', old.huella), jsonb_build_object('huella', new.huella));
  end if;
  return null;
end;
$$;
create trigger publicaciones_despues after insert or update on public.publicaciones
  for each row execute function privado.publicaciones_despues();

-- Relaciones: el equipo confirma o descarta una sugerida; nada más.
-- (Fusionar dos publicaciones confirmadas como duplicado queda para después.)
create function privado.relaciones_antes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.origen_id is distinct from old.origen_id or new.destino_id is distinct from old.destino_id
     or new.tipo is distinct from old.tipo or new.motivo is distinct from old.motivo
     or new.creada_en is distinct from old.creada_en then
    raise exception 'una relación solo cambia de estado' using errcode = '42501';
  end if;
  if new.estado is distinct from old.estado then
    if old.estado <> 'sugerida' or new.estado = 'sugerida' then
      raise exception 'solo se confirma o descarta una relación sugerida' using errcode = '42501';
    end if;
    new.resuelta_por := auth.uid();
    new.resuelta_en := now();
  elsif new.resuelta_por is distinct from old.resuelta_por or new.resuelta_en is distinct from old.resuelta_en then
    raise exception 'quién la resolvió lo pone la base' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger relaciones_antes before update on public.publicacion_relaciones
  for each row execute function privado.relaciones_antes();

-- ---------------------------------------------------------------------
-- Reemplazo de validar_para_revision (migración 9): artículo con ubicación
-- y pasaje O paráfrasis; la publicación citada tiene que estar aprobada.
-- ---------------------------------------------------------------------
create or replace function privado.validar_para_revision(v public.ficha_versiones) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  formato text;
  limite int;
begin
  select f.formato into formato from public.fichas f where f.id = v.ficha_id;
  limite := case formato when 'pregunta' then 90 else 60 end;
  if formato = 'pregunta' and char_length(btrim(v.pregunta)) < 5 then
    raise exception 'falta la pregunta principal' using errcode = '23514';
  end if;
  if formato = 'pregunta' and char_length(btrim(v.explicacion_cientifica)) < 20 then
    raise exception 'falta la explicación científica' using errcode = '23514';
  end if;
  if char_length(btrim(v.version_infantil)) < 10 then
    raise exception 'falta la versión para chicos' using errcode = '23514';
  end if;
  if privado.palabras(v.version_infantil) > limite then
    raise exception 'la versión para chicos tiene más de % palabras', limite using errcode = '23514';
  end if;
  if not exists (select 1 from public.version_fuentes vf where vf.version_id = v.id) then
    raise exception 'hace falta al menos una fuente para estar en revisión' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf where vf.version_id = v.id and vf.publicacion_id is not null
             and (char_length(btrim(vf.ubicacion)) = 0
                  or (char_length(btrim(vf.pasaje)) = 0 and char_length(btrim(vf.parafrasis)) = 0))) then
    raise exception 'cada artículo citado necesita dónde está y su pasaje o su paráfrasis' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf where vf.version_id = v.id
             and char_length(btrim(vf.pasaje)) > 0 and not vf.pasaje_textual and char_length(btrim(vf.parafrasis)) = 0) then
    raise exception 'un pasaje que no es textual necesita su paráfrasis' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf join public.publicaciones p on p.id = vf.publicacion_id
             where vf.version_id = v.id and p.estado <> 'aprobada') then
    raise exception 'cita una publicación que todavía no está aprobada como fuente' using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Revisión de publicaciones
-- ---------------------------------------------------------------------
create function privado.revisar_publicacion(r public.revisiones) returns public.revisiones
language plpgsql security definer set search_path = '' as $$
declare
  p public.publicaciones;
begin
  select * into p from public.publicaciones where id = r.objeto_id for update;
  if not found then
    raise exception 'la publicación no existe' using errcode = '23503';
  end if;
  if p.estado <> 'en_revision' then
    raise exception 'esa publicación no está esperando revisión' using errcode = '23514';
  end if;
  if p.huella <> r.huella_revisada or privado.huella_publicacion(p) <> p.huella then
    raise exception 'los datos cambiaron desde que los abriste: volvé a cargarlos' using errcode = '40001';
  end if;
  if r.decision <> 'aprobar' and char_length(btrim(r.comentario)) < 5 then
    raise exception 'pedir cambios o rechazar exige un comentario' using errcode = '23514';
  end if;
  if r.decision = 'aprobar' and p.retractada then
    raise exception 'una publicación retractada no se aprueba' using errcode = '23514';
  end if;
  r.autoaprobada := (r.decision = 'aprobar' and p.agregada_por = r.revisor_id);
  r.licencia_al_aprobar := case when r.decision = 'aprobar' then p.licencia_codigo end;

  update public.publicaciones
     set estado = case r.decision when 'aprobar' then 'aprobada' when 'pedir_cambios' then 'candidata' else 'rechazada' end
   where id = p.id;

  perform privado.registrar('revisar', 'publicacion', p.id, null,
    jsonb_build_object('decision', r.decision, 'revisor_id', r.revisor_id, 'huella', r.huella_revisada,
                       'autoaprobada', r.autoaprobada, 'licencia', r.licencia_al_aprobar));
  return r;
end;
$$;

-- Reemplazo de revisar (migración 9): igual para fichas, y ahora deriva las
-- publicaciones a revisar_publicacion.
create or replace function privado.revisar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.ficha_versiones;
  anterior uuid;
begin
  -- revisor_id, autoaprobada, licencia_al_aprobar y creada_en no están entre
  -- las columnas que el usuario puede mandar: toman sus valores acá o por defecto.
  if new.objeto not in ('ficha_version', 'publicacion') then
    raise exception 'la revisión de % todavía no está disponible', new.objeto using errcode = '0A000';
  end if;
  if not exists (select 1 from public.equipo e where e.id = new.revisor_id and e.estado = 'activa' and e.rol = 'validador') then
    raise exception 'solo una validadora activa revisa' using errcode = '42501';
  end if;
  new.licencia_al_aprobar := null;
  if new.objeto = 'publicacion' then
    return privado.revisar_publicacion(new);
  end if;

  select * into v from public.ficha_versiones where id = new.objeto_id for update;
  if not found then
    raise exception 'la versión no existe' using errcode = '23503';
  end if;
  if v.estado <> 'en_revision' then
    raise exception 'esa versión no está esperando revisión' using errcode = '23514';
  end if;
  if v.huella <> new.huella_revisada or privado.huella_de(v) <> v.huella then
    raise exception 'el texto cambió desde que lo abriste: volvé a cargarlo' using errcode = '40001';
  end if;
  if new.decision <> 'aprobar' and char_length(btrim(new.comentario)) < 5 then
    raise exception 'pedir cambios o rechazar exige un comentario' using errcode = '23514';
  end if;
  new.autoaprobada := (new.decision = 'aprobar' and v.autor_id = new.revisor_id);

  if new.decision = 'aprobar' then
    select version_publicada_id into anterior from public.fichas where id = v.ficha_id for update;
    if anterior is not null then
      update public.ficha_versiones set estado = 'reemplazada' where id = anterior;
      update public.fragmentos set activo = false where version_id = anterior and activo;
    end if;
    update public.ficha_versiones set estado = 'publicada', decidida_en = now() where id = v.id;
    update public.fichas
       set estado = 'publicada', version_publicada_id = v.id, retirada_en = null, motivo_retiro = null
     where id = v.ficha_id;
  elsif new.decision = 'pedir_cambios' then
    -- Vuelve a borrador la MISMA versión: la autora corrige y la reenvía
    update public.ficha_versiones set estado = 'borrador' where id = v.id;
  else
    update public.ficha_versiones set estado = 'rechazada', decidida_en = now() where id = v.id;
  end if;

  perform privado.registrar('revisar', 'ficha_version', v.id, null,
    jsonb_build_object('decision', new.decision, 'revisor_id', new.revisor_id,
                       'huella', new.huella_revisada, 'autoaprobada', new.autoaprobada));
  return new;
end;
$$;

revoke all on function privado.publicaciones_antes(), privado.publicaciones_despues(), privado.relaciones_antes(),
  privado.retirar_citas(uuid, text), privado.revisar_publicacion(public.revisiones)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Alta de un registro de un proveedor (solo el servidor). Normaliza los
-- identificadores, bloquea cada uno mientras dura la transacción (dos
-- búsquedas a la vez no crean la misma publicación dos veces) y:
--   · si coincide con UNA publicación, la completa según qué fuente manda
--     en cada campo y le suma la procedencia;
--   · si coincide con VARIAS, no fusiona: suma la procedencia a la más
--     antigua y deja una relación posible_duplicado para el equipo;
--   · si no coincide, crea una candidata y, si hay un título casi igual
--     (≥ 0,9) del mismo año ±1 y mismo primer autor, la sugiere como duplicado.
-- Qué fuente manda: OpenAlex en título, año, tipo, revista, autores, temas,
-- citas y acceso abierto; Europe PMC en resumen, MeSH y "es preprint".
-- Retractación y "del Instituto": basta con que una fuente lo diga.
-- Devuelve {publicacion_id, nueva, estado, posibles_duplicados}.
-- ---------------------------------------------------------------------
create function public.guardar_registro(p_registro jsonb, p_ejecucion uuid default null, p_actor uuid default null)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_proveedor   text := p_registro ->> 'proveedor';
  v_id_externo  text := left(btrim(coalesce(p_registro ->> 'id_externo', '')), 200);
  v_ids         jsonb := case jsonb_typeof(p_registro -> 'identificadores') when 'object' then p_registro -> 'identificadores' else '{}'::jsonb end;
  v_titulo      text := left(btrim(regexp_replace(coalesce(p_registro ->> 'titulo', ''), '[[:cntrl:]]+', ' ', 'g')), 1000);
  v_anio        smallint;
  v_tipo        text := case when p_registro ->> 'tipo' in ('articulo', 'revision', 'preprint', 'otro') then p_registro ->> 'tipo' else 'otro' end;
  v_revista     text := left(btrim(regexp_replace(coalesce(p_registro ->> 'revista', ''), '[[:cntrl:]]+', ' ', 'g')), 300);
  v_idioma      text := left(btrim(coalesce(p_registro ->> 'idioma', '')), 10);
  v_autores     jsonb;
  v_temas       jsonb;
  v_mesh        text[];
  v_citas       int := case when coalesce(p_registro ->> 'citas', '') ~ '^[0-9]{1,9}$' then (p_registro ->> 'citas')::int end;
  v_oa          text := left(btrim(coalesce(p_registro ->> 'oa_estado', '')), 20);
  v_resumen     text := nullif(left(btrim(regexp_replace(coalesce(p_registro ->> 'resumen', ''), '[[:cntrl:]]+', ' ', 'g')), 10000), '');
  v_retractada  boolean := coalesce(p_registro ->> 'retractada', '') = 'true';
  v_instituto   boolean := coalesce(p_registro ->> 'del_instituto', '') = 'true';
  v_crudo_json  jsonb := coalesce(p_registro -> 'crudo', '{}'::jsonb);
  manda         boolean := (p_registro ->> 'proveedor') = 'openalex';
  tipos         text[] := '{}';
  valores       text[] := '{}';
  coincidencias uuid[];
  posibles      uuid[] := '{}';
  v_pub         uuid;
  v_nueva       boolean := false;
  p             public.publicaciones;
  p2            public.publicaciones;
  abierta       boolean;
  campos        text[];
  v_crudo       uuid;
  k             text;
  val           text;
  norm          text;
begin
  if not exists (select 1 from public.proveedores_cientificos pc where pc.id = v_proveedor and pc.activo) then
    raise exception 'proveedor desconocido o apagado: %', v_proveedor using errcode = '22023';
  end if;
  if p_actor is not null and not exists (select 1 from public.equipo e where e.id = p_actor and e.estado = 'activa') then
    raise exception 'quien agrega tiene que ser del equipo' using errcode = '42501';
  end if;
  if v_id_externo = '' then
    raise exception 'falta el id del proveedor' using errcode = '22023';
  end if;
  if v_titulo = '' then
    raise exception 'falta el título' using errcode = '22023';
  end if;
  if coalesce(p_registro ->> 'anio', '') ~ '^[0-9]{4}$' and (p_registro ->> 'anio')::int between 1800 and 2100 then
    v_anio := (p_registro ->> 'anio')::smallint;
  end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'nombre', left(a ->> 'nombre', 200), 'apellido', left(a ->> 'apellido', 120), 'orcid', left(a ->> 'orcid', 40)))
         order by o), '[]'::jsonb)
    into v_autores
    from jsonb_array_elements(case jsonb_typeof(p_registro -> 'autores') when 'array' then p_registro -> 'autores' else '[]'::jsonb end)
         with ordinality as x(a, o)
   where o <= 50 and jsonb_typeof(a) = 'object';
  select coalesce(jsonb_agg(left(t, 120) order by o), '[]'::jsonb)
    into v_temas
    from jsonb_array_elements_text(case jsonb_typeof(p_registro -> 'temas') when 'array' then p_registro -> 'temas' else '[]'::jsonb end)
         with ordinality as x(t, o)
   where o <= 20;
  select coalesce(array_agg(left(m, 120) order by o), '{}')
    into v_mesh
    from jsonb_array_elements_text(case jsonb_typeof(p_registro -> 'mesh') when 'array' then p_registro -> 'mesh' else '[]'::jsonb end)
         with ordinality as x(m, o)
   where o <= 60;
  if octet_length(v_crudo_json::text) > 500000 then
    v_crudo_json := '{"omitido": "registro demasiado grande"}'::jsonb;
  end if;

  -- Identificadores normalizados (los que no tienen forma válida se ignoran)
  for k, val in select key, value from jsonb_each_text(v_ids) loop
    norm := privado.normalizar_identificador(k, val);
    if norm is not null then
      tipos := tipos || k;
      valores := valores || norm;
    end if;
  end loop;
  if cardinality(tipos) = 0 then
    raise exception 'el registro no trae ningún identificador válido' using errcode = '22023';
  end if;

  -- Un bloqueo por identificador, siempre en el mismo orden
  perform pg_advisory_xact_lock(hashtextextended(u.t || ':' || u.v, 0))
     from unnest(tipos, valores) as u(t, v) order by u.t, u.v;

  select coalesce(array_agg(distinct pi.publicacion_id), '{}') into coincidencias
    from public.publicacion_identificadores pi
    join unnest(tipos, valores) as u(t, v) on pi.tipo = u.t and pi.valor = u.v;

  if cardinality(coincidencias) = 0 then
    -- ¿Hay un título casi igual? (preprint y versión publicada, por ejemplo)
    select coalesce(array_agg(x.id), '{}') into posibles
      from public.publicaciones x
     where extensions.similarity(x.titulo_normalizado, privado.normalizar_titulo(v_titulo)) >= 0.9
       and (v_anio is null or x.anio is null or abs(x.anio - v_anio) <= 1)
       and (coalesce(x.primer_autor, '') = '' or coalesce(v_autores -> 0 ->> 'apellido', '') = ''
            or x.primer_autor = privado.normalizar(v_autores -> 0 ->> 'apellido'));

    insert into public.publicaciones (titulo, anio, tipo, revista, idioma, autores, temas_externos, mesh, citas,
                                      oa_estado, retractada, del_instituto, resumen_interno, resumen_origen, agregada_por)
    values (v_titulo, v_anio, v_tipo, v_revista, v_idioma, v_autores, v_temas, v_mesh, coalesce(v_citas, 0),
            v_oa, v_retractada, v_instituto, v_resumen, case when v_resumen is not null then v_proveedor end, p_actor)
    returning * into p2;
    v_pub := p2.id;
    v_nueva := true;
    campos := array_remove(array[
      'titulo',
      case when v_anio is not null then 'anio' end,
      case when v_tipo <> 'otro' then 'tipo' end,
      case when v_revista <> '' then 'revista' end,
      case when jsonb_array_length(v_autores) > 0 then 'autores' end,
      case when jsonb_array_length(v_temas) > 0 then 'temas_externos' end,
      case when cardinality(v_mesh) > 0 then 'mesh' end,
      case when v_citas is not null then 'citas' end,
      case when v_resumen is not null then 'resumen_interno' end,
      case when v_retractada then 'retractada' end,
      case when v_instituto then 'del_instituto' end], null);

    insert into public.publicacion_relaciones (origen_id, destino_id, tipo, motivo)
    select v_pub, x, 'posible_duplicado', 'título casi igual' from unnest(posibles) as x
    on conflict do nothing;
  else
    select * into p from public.publicaciones x
     where x.id = any (coincidencias) order by x.creada_en, x.id limit 1 for update;
    v_pub := p.id;
    posibles := array_remove(coincidencias, v_pub);
    abierta := p.estado in ('candidata', 'en_revision');

    update public.publicaciones x set
      titulo   = case when abierta and manda then v_titulo else x.titulo end,
      anio     = case when not abierta then x.anio when manda then coalesce(v_anio, x.anio) else coalesce(x.anio, v_anio) end,
      tipo     = case when not abierta then x.tipo
                      when v_proveedor = 'europepmc' and v_tipo = 'preprint' then 'preprint'
                      when manda and v_tipo <> 'otro' then v_tipo
                      when x.tipo = 'otro' then v_tipo
                      else x.tipo end,
      revista  = case when abierta and ((manda and v_revista <> '') or x.revista = '') then v_revista else x.revista end,
      autores  = case when abierta and ((manda and jsonb_array_length(v_autores) > 0) or jsonb_array_length(x.autores) = 0)
                      then v_autores else x.autores end,
      idioma   = case when (manda and v_idioma <> '') or x.idioma = '' then v_idioma else x.idioma end,
      temas_externos = case when (manda and jsonb_array_length(v_temas) > 0) or jsonb_array_length(x.temas_externos) = 0
                            then v_temas else x.temas_externos end,
      mesh     = case when (v_proveedor = 'europepmc' and cardinality(v_mesh) > 0) or cardinality(x.mesh) = 0 then v_mesh else x.mesh end,
      citas    = case when manda and v_citas is not null then v_citas when x.citas = 0 then coalesce(v_citas, 0) else x.citas end,
      oa_estado = case when (manda and v_oa <> '') or x.oa_estado = '' then v_oa else x.oa_estado end,
      retractada = x.retractada or v_retractada,
      del_instituto = x.del_instituto or v_instituto,
      resumen_interno = case when x.estado = 'rechazada' or v_resumen is null then x.resumen_interno
                             when v_proveedor = 'europepmc' or x.resumen_interno is null then v_resumen
                             else x.resumen_interno end,
      resumen_origen  = case when x.estado = 'rechazada' or v_resumen is null then x.resumen_origen
                             when v_proveedor = 'europepmc' or x.resumen_interno is null then v_proveedor
                             else x.resumen_origen end
     where x.id = v_pub
    returning * into p2;

    campos := array_remove(array[
      case when p2.titulo is distinct from p.titulo then 'titulo' end,
      case when p2.anio is distinct from p.anio then 'anio' end,
      case when p2.tipo is distinct from p.tipo then 'tipo' end,
      case when p2.revista is distinct from p.revista then 'revista' end,
      case when p2.autores is distinct from p.autores then 'autores' end,
      case when p2.temas_externos is distinct from p.temas_externos then 'temas_externos' end,
      case when p2.mesh is distinct from p.mesh then 'mesh' end,
      case when p2.citas is distinct from p.citas then 'citas' end,
      case when p2.resumen_interno is distinct from p.resumen_interno then 'resumen_interno' end,
      case when p2.retractada is distinct from p.retractada then 'retractada' end,
      case when p2.del_instituto is distinct from p.del_instituto then 'del_instituto' end], null);

    insert into public.publicacion_relaciones (origen_id, destino_id, tipo, motivo)
    select v_pub, x, 'posible_duplicado', 'comparten un identificador' from unnest(posibles) as x
    on conflict do nothing;
  end if;

  -- Identificadores nuevos (los que ya son de otra publicación no se mueven)
  insert into public.publicacion_identificadores (publicacion_id, tipo, valor)
  select v_pub, u.t, u.v from unnest(tipos, valores) as u(t, v)
  on conflict (tipo, valor) do nothing;

  -- Registro crudo y procedencia
  insert into public.registros_crudos (proveedor, id_externo, ejecucion_id, payload, huella)
  values (v_proveedor, v_id_externo, p_ejecucion, v_crudo_json,
          encode(sha256(convert_to(v_crudo_json::text, 'UTF8')), 'hex'))
  on conflict (proveedor, id_externo, huella)
    do update set obtenido_en = now(), expira_en = now() + interval '90 days'
  returning id into v_crudo;

  insert into public.publicacion_procedencias (publicacion_id, proveedor, id_externo, registro_crudo_id, ejecucion_id, campos_aportados)
  values (v_pub, v_proveedor, v_id_externo, v_crudo, p_ejecucion, coalesce(campos, '{}'));

  -- Enlaces (solo se guardan; nadie los visita desde el servidor)
  insert into public.publicacion_accesos (publicacion_id, tipo, url, version, es_oa, licencia_texto, proveedor)
  select v_pub, a ->> 'tipo', a ->> 'url', left(coalesce(a ->> 'version', ''), 40),
         coalesce(a ->> 'es_oa', '') = 'true', left(coalesce(a ->> 'licencia', ''), 200), v_proveedor
    from jsonb_array_elements(case jsonb_typeof(p_registro -> 'accesos') when 'array' then p_registro -> 'accesos' else '[]'::jsonb end)
         with ordinality as x(a, o)
   where o <= 20 and jsonb_typeof(a) = 'object'
     and a ->> 'tipo' in ('pagina', 'pdf', 'xml')
     and coalesce(a ->> 'url', '') ~ '^https?://[^[:space:]]+$' and char_length(a ->> 'url') <= 1000
  on conflict (publicacion_id, url) do nothing;

  return jsonb_build_object('publicacion_id', v_pub, 'nueva', v_nueva,
                            'estado', (select x.estado from public.publicaciones x where x.id = v_pub),
                            'posibles_duplicados', to_jsonb(posibles));
end;
$$;
revoke all on function public.guardar_registro(jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.guardar_registro(jsonb, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------
-- RLS y permisos (partimos de cero). Solo el equipo ve la biblioteca;
-- maestras, alumnos y visitantes no ven ninguna de estas tablas.
-- ---------------------------------------------------------------------
alter table public.proveedores_cientificos     enable row level security;
alter table public.tipos_identificador         enable row level security;
alter table public.busquedas_guardadas         enable row level security;
alter table public.ejecuciones_busqueda        enable row level security;
alter table public.registros_crudos            enable row level security;
alter table public.publicaciones               enable row level security;
alter table public.publicacion_identificadores enable row level security;
alter table public.publicacion_procedencias    enable row level security;
alter table public.publicacion_relaciones      enable row level security;
alter table public.publicacion_temas           enable row level security;
alter table public.publicacion_accesos         enable row level security;
revoke all on public.proveedores_cientificos, public.tipos_identificador, public.busquedas_guardadas,
  public.ejecuciones_busqueda, public.registros_crudos, public.publicaciones, public.publicacion_identificadores,
  public.publicacion_procedencias, public.publicacion_relaciones, public.publicacion_temas, public.publicacion_accesos
  from anon, authenticated, service_role;

-- Lectura: el equipo ve todo lo de la biblioteca
create policy "proveedores: el equipo ve" on public.proveedores_cientificos
  for select to authenticated using ((select privado.es_equipo()));
create policy "tipos: el equipo ve" on public.tipos_identificador
  for select to authenticated using ((select privado.es_equipo()));
create policy "busquedas: el equipo ve" on public.busquedas_guardadas
  for select to authenticated using ((select privado.es_equipo()));
create policy "ejecuciones: el equipo ve" on public.ejecuciones_busqueda
  for select to authenticated using ((select privado.es_equipo()));
create policy "crudos: el equipo ve" on public.registros_crudos
  for select to authenticated using ((select privado.es_equipo()));
create policy "publicaciones: el equipo ve" on public.publicaciones
  for select to authenticated using ((select privado.es_equipo()));
create policy "identificadores: el equipo ve" on public.publicacion_identificadores
  for select to authenticated using ((select privado.es_equipo()));
create policy "procedencias: el equipo ve" on public.publicacion_procedencias
  for select to authenticated using ((select privado.es_equipo()));
create policy "relaciones: el equipo ve" on public.publicacion_relaciones
  for select to authenticated using ((select privado.es_equipo()));
create policy "temas de publicaciones: el equipo ve" on public.publicacion_temas
  for select to authenticated using ((select privado.es_equipo()));
create policy "accesos: el equipo ve" on public.publicacion_accesos
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.proveedores_cientificos, public.tipos_identificador, public.busquedas_guardadas,
  public.ejecuciones_busqueda, public.registros_crudos, public.publicaciones, public.publicacion_identificadores,
  public.publicacion_procedencias, public.publicacion_relaciones, public.publicacion_temas, public.publicacion_accesos
  to authenticated;

-- Proveedores: la admin los prende o apaga
create policy "proveedores: la admin prende o apaga" on public.proveedores_cientificos
  for update to authenticated using ((select privado.es_admin_equipo())) with check ((select privado.es_admin_equipo()));
grant update (activo) on public.proveedores_cientificos to authenticated;

-- Búsquedas guardadas: el equipo las crea; las edita quien la creó o la admin
create policy "busquedas: el equipo crea" on public.busquedas_guardadas
  for insert to authenticated with check ((select privado.es_equipo()) and creada_por = (select auth.uid()));
create policy "busquedas: quien la creó o la admin edita" on public.busquedas_guardadas
  for update to authenticated
  using ((select privado.es_equipo()) and (creada_por = (select auth.uid()) or (select privado.es_admin_equipo())))
  with check ((select privado.es_equipo()));
grant insert (nombre, tema_id, consulta, proveedores, frecuencia, max_resultados, activa) on public.busquedas_guardadas to authenticated;
grant update (nombre, tema_id, consulta, proveedores, frecuencia, max_resultados, activa) on public.busquedas_guardadas to authenticated;

-- Publicaciones: el equipo cambia el estado (los triggers dicen qué cambios valen)
create policy "publicaciones: el equipo cambia el estado" on public.publicaciones
  for update to authenticated using ((select privado.es_equipo())) with check ((select privado.es_equipo()));
grant update (estado, motivo_retiro) on public.publicaciones to authenticated;

-- Relaciones: el equipo confirma o descarta
create policy "relaciones: el equipo resuelve" on public.publicacion_relaciones
  for update to authenticated using ((select privado.es_equipo())) with check ((select privado.es_equipo()));
grant update (estado) on public.publicacion_relaciones to authenticated;

-- Temas de cada publicación: el equipo los pone y los saca
create policy "temas de publicaciones: el equipo agrega" on public.publicacion_temas
  for insert to authenticated with check ((select privado.es_equipo()) and agregado_por = (select auth.uid()));
create policy "temas de publicaciones: el equipo quita" on public.publicacion_temas
  for delete to authenticated using ((select privado.es_equipo()));
grant insert (publicacion_id, tema_id) on public.publicacion_temas to authenticated;
grant delete on public.publicacion_temas to authenticated;

-- Servidor (clave secreta): trae registros, guarda la bitácora y mantiene
-- los datos. No puede aprobar: no escribe revisiones, y el trigger no le
-- deja cambiar el estado.
grant select on public.proveedores_cientificos, public.tipos_identificador, public.busquedas_guardadas,
  public.publicacion_relaciones, public.publicacion_temas to service_role;
grant select, insert, update on public.ejecuciones_busqueda to service_role;
grant select, insert, update (obtenido_en, expira_en), delete on public.registros_crudos to service_role;
grant select, insert, update on public.publicaciones to service_role;
grant select, insert on public.publicacion_identificadores, public.publicacion_procedencias,
  public.publicacion_accesos to service_role;
grant insert on public.publicacion_relaciones to service_role;
