-- =====================================================================
-- Migración 9 · Fichas validadas: temas, fuentes, fichas de pregunta y de
-- dato, versiones, citas con pasaje, revisiones y registro editorial.
--
-- La regla central: una ficha cuenta como "revisada por el Pasteur" solo si
-- su versión publicada la aprobó una VALIDADORA, y el texto publicado es
-- idéntico al que ella aprobó (misma huella). La base lo impone con
-- triggers; la web no puede saltearlo.
--
-- Ciclo de una versión:
--   borrador ⇄ en_revision → publicada (la anterior pasa a reemplazada)
--                          → borrador   (si la validadora pide cambios)
--                          → rechazada
--   · En borrador la edita su autora.
--   · En revisión la pueden corregir su autora y cualquier validadora. Cada
--     cambio recalcula la huella: la validadora aprueba solo el texto que
--     está viendo; si alguien lo cambió en el medio, tiene que volver a
--     cargarlo.
--   · Publicada, reemplazada o rechazada ya no cambia nunca. Para cambiar
--     una ficha publicada se abre una versión nueva (copia), y los chicos
--     siguen viendo la anterior hasta que se apruebe la nueva.
--   · Una validadora puede aprobar su propio texto: queda marcado.
--     Una redactora o la admin no aprueban nunca.
--
-- Quién lee esto: solo el equipo (con su sesión) y el servidor (clave
-- secreta). Maestras y alumnos no ven estas tablas: el asistente les
-- responde desde el servidor.
--
-- Todo es nuevo: no modifica ninguna tabla existente.
-- =====================================================================

create extension if not exists vector   with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Texto en minúsculas y sin tildes, para la búsqueda por palabras
create function privado.normalizar(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;
revoke all on function privado.normalizar(text) from public, anon;
grant execute on function privado.normalizar(text) to authenticated, service_role;

-- Cantidad de palabras de un texto
create function privado.palabras(t text) returns int
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array_length(regexp_split_to_array(btrim(coalesce(t, '')), '[[:space:]]+'), 1), 0)
         - case when btrim(coalesce(t, '')) = '' then 1 else 0 end;
$$;
revoke all on function privado.palabras(text) from public, anon;
grant execute on function privado.palabras(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Temas (taxonomía de ~12, acordada con el Instituto)
-- ---------------------------------------------------------------------
create table public.temas (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  nombre       text not null check (char_length(nombre) between 1 and 80),
  descripcion  text not null default '' check (char_length(descripcion) <= 600),
  padre_id     uuid references public.temas (id) on delete restrict,
  actividad    text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  orden        smallint not null default 0,
  activo       boolean not null default true,
  embedding    extensions.vector(1536)
);

-- ---------------------------------------------------------------------
-- Fuentes que no son artículos (libros, sitios, comunicación de una
-- investigadora). Los artículos vienen de la biblioteca (migración 13).
-- ---------------------------------------------------------------------
create table public.fuentes (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null check (tipo in ('libro', 'sitio', 'comunicacion', 'material_docente', 'otro')),
  cita             text not null check (char_length(cita) between 3 and 600),
  url              text check (url is null or (url ~ '^https://' and char_length(url) <= 500)),
  anio             smallint check (anio between 1800 and 2100),
  es_del_instituto boolean not null default false,
  creada_por       uuid not null default auth.uid() references public.equipo (id) on delete restrict,
  creada_en        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fichas: la identidad estable de una respuesta (pregunta) o de un dato
-- ---------------------------------------------------------------------
create table public.fichas (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  formato              text not null check (formato in ('pregunta', 'dato')),
  tema_id              uuid references public.temas (id) on delete restrict,
  actividad            text check (actividad in ('a1', 'a2', 'a3', 'a4')),
  estado               text not null default 'borrador' check (estado in ('borrador', 'publicada', 'retirada')),
  version_publicada_id uuid,
  creada_por           uuid not null default auth.uid() references public.equipo (id) on delete restrict,
  creada_en            timestamptz not null default now(),
  retirada_en          timestamptz,
  motivo_retiro        text check (char_length(motivo_retiro) <= 600),
  check ((estado = 'publicada') = (version_publicada_id is not null) or estado = 'retirada')
);

create table public.ficha_versiones (
  id                     uuid primary key default gen_random_uuid(),
  ficha_id               uuid not null references public.fichas (id) on delete restrict,
  numero                 smallint not null default 0,
  pregunta               text not null default '' check (char_length(pregunta) <= 300),
  variantes              text[] not null default '{}' check (cardinality(variantes) <= 20),
  explicacion_cientifica text not null default '' check (char_length(explicacion_cientifica) <= 4000),
  version_infantil       text not null default '' check (char_length(version_infantil) <= 1000),
  grado_min              smallint not null default 5 check (grado_min between 1 and 6),
  grado_max              smallint not null default 6 check (grado_max between 1 and 6),
  asistida_por_ia        boolean not null default false,
  nota_interna           text not null default '' check (char_length(nota_interna) <= 2000),
  estado                 text not null default 'borrador'
                           check (estado in ('borrador', 'en_revision', 'publicada', 'reemplazada', 'rechazada')),
  autor_id               uuid not null default auth.uid() references public.equipo (id) on delete restrict,
  huella                 text check (huella ~ '^[0-9a-f]{64}$'),
  creada_en              timestamptz not null default now(),
  enviada_en             timestamptz,
  decidida_en            timestamptz,
  unique (ficha_id, numero),
  unique (id, ficha_id),
  check (grado_min <= grado_max),
  check ((estado = 'borrador') = (huella is null))
);
-- Una sola versión abierta (borrador o en revisión) por ficha
create unique index ficha_versiones_una_abierta
  on public.ficha_versiones (ficha_id) where estado in ('borrador', 'en_revision');

alter table public.fichas
  add constraint fichas_version_publicada_fk
  foreign key (version_publicada_id, id) references public.ficha_versiones (id, ficha_id)
  on delete restrict deferrable initially deferred;

-- Citas de cada versión: un artículo de la biblioteca (publicacion_id, la
-- clave foránea se agrega en la migración 13) o una fuente de otro tipo.
create table public.version_fuentes (
  id              uuid primary key default gen_random_uuid(),
  version_id      uuid not null references public.ficha_versiones (id) on delete cascade,
  publicacion_id  uuid,
  fuente_id       uuid references public.fuentes (id) on delete restrict,
  pasaje          text not null default '' check (char_length(pasaje) <= 600),
  pasaje_textual  boolean not null default false,
  ubicacion       text not null default '' check (char_length(ubicacion) <= 120),
  parafrasis      text not null default '' check (char_length(parafrasis) <= 600),
  orden           smallint not null default 0,
  check ((publicacion_id is not null) <> (fuente_id is not null)),
  check (not pasaje_textual or char_length(pasaje) > 0)
);
create index version_fuentes_version on public.version_fuentes (version_id);

-- ---------------------------------------------------------------------
-- Revisiones (solo se agregan) y registro editorial (solo se agrega)
-- ---------------------------------------------------------------------
create table public.revisiones (
  id                  uuid primary key default gen_random_uuid(),
  objeto              text not null check (objeto in ('ficha_version', 'publicacion', 'curiosidad')),
  objeto_id           uuid not null,
  revisor_id          uuid not null default auth.uid() references public.equipo (id) on delete restrict,
  decision            text not null check (decision in ('aprobar', 'pedir_cambios', 'rechazar')),
  comentario          text not null default '' check (char_length(comentario) <= 2000),
  huella_revisada     text not null check (huella_revisada ~ '^[0-9a-f]{64}$'),
  autoaprobada        boolean not null default false,
  licencia_al_aprobar text check (char_length(licencia_al_aprobar) <= 60),
  creada_en           timestamptz not null default now()
);
create index revisiones_objeto on public.revisiones (objeto, objeto_id);

create table public.eventos_editoriales (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  accion       text not null,
  entidad      text not null,
  entidad_id   uuid not null,
  antes        jsonb,
  despues      jsonb,
  ocurrido_en  timestamptz not null default now()
);
create index eventos_editoriales_entidad on public.eventos_editoriales (entidad, entidad_id);

-- ---------------------------------------------------------------------
-- Índice de respuestas del asistente: SOLO versiones publicadas.
-- Lo llena el servidor (embeddings de OpenAI) después de cada publicación.
-- ---------------------------------------------------------------------
create table public.fragmentos (
  id          uuid primary key default gen_random_uuid(),
  ficha_id    uuid not null,
  version_id  uuid not null,
  tipo        text not null check (tipo in ('pregunta', 'variante', 'explicacion', 'infantil', 'dato')),
  texto       text not null check (char_length(texto) between 1 and 4000),
  tsv         tsvector generated always as (to_tsvector('spanish', privado.normalizar(texto))) stored,
  embedding   extensions.vector(1536),
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  foreign key (version_id, ficha_id) references public.ficha_versiones (id, ficha_id) on delete restrict
);
create index fragmentos_tsv on public.fragmentos using gin (tsv);
create index fragmentos_embedding on public.fragmentos
  using hnsw (embedding extensions.vector_cosine_ops);
create index fragmentos_version on public.fragmentos (version_id);

-- =====================================================================
-- Reglas en triggers
--
-- "Directo" = la sentencia la manda un usuario por la API (rol
-- authenticated). Los cambios que hacen los triggers de revisión corren
-- como dueño de las tablas y pasan las validaciones de flujo, pero nunca
-- las de contenido congelado.
-- =====================================================================
create function privado.es_directo() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('authenticated', 'anon');
$$;
revoke all on function privado.es_directo() from public, anon;
grant execute on function privado.es_directo() to authenticated, service_role;

-- Huella de una versión: su contenido (tal como viene, también desde un
-- trigger BEFORE) + sus citas guardadas, en un orden fijo
create function privado.huella_de(v public.ficha_versiones) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to(jsonb_build_object(
    'pregunta', v.pregunta,
    'variantes', to_jsonb(v.variantes),
    'explicacion', v.explicacion_cientifica,
    'infantil', v.version_infantil,
    'grados', jsonb_build_array(v.grado_min, v.grado_max),
    'formato', (select f.formato from public.fichas f where f.id = v.ficha_id),
    'fuentes', coalesce((
      select jsonb_agg(jsonb_build_array(vf.publicacion_id, vf.fuente_id, vf.pasaje, vf.pasaje_textual,
                                         vf.ubicacion, vf.parafrasis)
                       order by vf.orden, vf.id)
      from public.version_fuentes vf where vf.version_id = v.id), '[]'::jsonb)
  )::text, 'UTF8')), 'hex');
$$;

-- Registro editorial
create function privado.registrar(p_accion text, p_entidad text, p_id uuid, p_antes jsonb, p_despues jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.eventos_editoriales (actor_id, accion, entidad, entidad_id, antes, despues)
  values (auth.uid(), p_accion, p_entidad, p_id, p_antes, p_despues);
$$;

-- ¿La versión cumple lo mínimo para estar en revisión? (si no, error)
create function privado.validar_para_revision(v public.ficha_versiones) returns void
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
             and (char_length(btrim(vf.pasaje)) = 0 or char_length(btrim(vf.ubicacion)) = 0)) then
    raise exception 'cada artículo citado necesita su pasaje y dónde está' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf where vf.version_id = v.id
             and char_length(btrim(vf.pasaje)) > 0 and not vf.pasaje_textual and char_length(btrim(vf.parafrasis)) = 0) then
    raise exception 'un pasaje que no es textual necesita su paráfrasis' using errcode = '23514';
  end if;
end;
$$;

-- ---------- Fichas ----------
-- Sin security definer: tiene que ver QUIÉN manda la sentencia (current_user).
create function privado.fichas_antes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if privado.es_directo() then
      new.estado := 'borrador';
      new.version_publicada_id := null;
      new.creada_por := auth.uid();
      new.retirada_en := null;
      new.motivo_retiro := null;
    end if;
    return new;
  end if;

  if new.id is distinct from old.id or new.formato is distinct from old.formato
     or new.creada_por is distinct from old.creada_por or new.creada_en is distinct from old.creada_en then
    raise exception 'el formato, la autora y la fecha de una ficha no se cambian' using errcode = '42501';
  end if;

  if privado.es_directo() then
    if new.version_publicada_id is distinct from old.version_publicada_id then
      raise exception 'la versión publicada la decide una revisión' using errcode = '42501';
    end if;
    if new.estado is distinct from old.estado then
      if new.estado <> 'retirada' or not (privado.es_validador() or privado.es_admin_equipo()) then
        raise exception 'solo una validadora o la admin retiran fichas' using errcode = '42501';
      end if;
      if char_length(btrim(coalesce(new.motivo_retiro, ''))) < 5 then
        raise exception 'retirar una ficha exige un motivo' using errcode = '23514';
      end if;
      new.retirada_en := now();
    elsif new.motivo_retiro is distinct from old.motivo_retiro or new.retirada_en is distinct from old.retirada_en then
      raise exception 'el motivo de retiro solo se pone al retirar' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger fichas_antes before insert or update on public.fichas
  for each row execute function privado.fichas_antes();

create function privado.fichas_despues() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform privado.registrar('crear', 'ficha', new.id, null, to_jsonb(new));
  elsif new is distinct from old then
    if new.estado = 'retirada' and old.estado <> 'retirada' then
      update public.fragmentos set activo = false where ficha_id = new.id and activo;
    end if;
    perform privado.registrar(case when new.estado = 'retirada' and old.estado <> 'retirada' then 'retirar' else 'editar' end,
                              'ficha', new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return null;
end;
$$;
create trigger fichas_despues after insert or update on public.fichas
  for each row execute function privado.fichas_despues();

-- ---------- Versiones ----------
-- Sin security definer, por la misma razón.
create function privado.versiones_antes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if privado.es_directo() then
      new.estado := 'borrador';
      new.autor_id := auth.uid();
      new.enviada_en := null;
      new.decidida_en := null;
    end if;
    new.huella := null;
    select coalesce(max(numero), 0) + 1 into new.numero
      from public.ficha_versiones where ficha_id = new.ficha_id;
    return new;
  end if;

  -- Publicada, reemplazada o rechazada: el contenido ya no cambia (para
  -- nadie, tampoco los triggers ni el dueño de la base)
  if old.estado not in ('borrador', 'en_revision') and (
       new.pregunta is distinct from old.pregunta or new.variantes is distinct from old.variantes
    or new.explicacion_cientifica is distinct from old.explicacion_cientifica
    or new.version_infantil is distinct from old.version_infantil
    or new.grado_min is distinct from old.grado_min or new.grado_max is distinct from old.grado_max
    or new.asistida_por_ia is distinct from old.asistida_por_ia
    or new.huella is distinct from old.huella) then
    raise exception 'una versión ya decidida no se modifica: abrí una versión nueva' using errcode = '42501';
  end if;
  if new.ficha_id is distinct from old.ficha_id or new.numero is distinct from old.numero
     or new.autor_id is distinct from old.autor_id or new.creada_en is distinct from old.creada_en then
    raise exception 'ficha, número, autora y fecha de una versión no se cambian' using errcode = '42501';
  end if;

  -- Quien edita por la API solo puede enviar a revisión o retirar su envío
  if new.estado is distinct from old.estado and privado.es_directo()
     and not (old.estado, new.estado) in (('borrador', 'en_revision'), ('en_revision', 'borrador')) then
    raise exception 'el estado de una versión lo cambia una revisión' using errcode = '42501';
  end if;

  if new.estado = 'borrador' then
    new.huella := null;
    new.enviada_en := null;
  elsif new.estado = 'en_revision' then
    -- Al enviar y en cada corrección: cumple lo mínimo y huella nueva
    perform privado.validar_para_revision(new);
    new.huella := privado.huella_de(new);
    if old.estado = 'borrador' then
      new.enviada_en := now();
    end if;
  end if;
  return new;
end;
$$;
create trigger versiones_antes before insert or update on public.ficha_versiones
  for each row execute function privado.versiones_antes();

create function privado.versiones_despues() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform privado.registrar('crear_version', 'ficha_version', new.id, null,
      jsonb_build_object('ficha_id', new.ficha_id, 'numero', new.numero, 'autor_id', new.autor_id));
  elsif new.estado is distinct from old.estado then
    perform privado.registrar(
      case when new.estado = 'en_revision' then 'enviar_a_revision'
           when old.estado = 'en_revision' and new.estado = 'borrador' then 'volver_a_borrador'
           else new.estado end,
      'ficha_version', new.id, jsonb_build_object('estado', old.estado),
      jsonb_build_object('estado', new.estado, 'huella', new.huella));
  elsif new.estado = 'en_revision' and new.huella is distinct from old.huella then
    perform privado.registrar('corregir_en_revision', 'ficha_version', new.id,
      jsonb_build_object('huella', old.huella), jsonb_build_object('huella', new.huella));
  end if;
  return null;
end;
$$;
create trigger versiones_despues after insert or update on public.ficha_versiones
  for each row execute function privado.versiones_despues();

-- ---------- Citas: se tocan en borrador o en revisión ----------
create function privado.citas_editables() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
begin
  v_ids := case tg_op when 'INSERT' then array[new.version_id]
                      when 'DELETE' then array[old.version_id]
                      else array[old.version_id, new.version_id] end;
  if exists (select 1 from public.ficha_versiones v
             where v.id = any (v_ids) and v.estado not in ('borrador', 'en_revision')) then
    raise exception 'las citas de una versión ya decidida no se modifican' using errcode = '42501';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end;
$$;
create trigger citas_editables before insert or update or delete on public.version_fuentes
  for each row execute function privado.citas_editables();

-- Si la versión está en revisión, cambiar una cita cambia su huella
create function privado.citas_rehuellar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.ficha_versiones set huella = huella
   where id in (case tg_op when 'DELETE' then old.version_id else new.version_id end,
                case tg_op when 'UPDATE' then old.version_id else null end)
     and estado = 'en_revision';
  return null;
end;
$$;
create trigger citas_rehuellar after insert or update or delete on public.version_fuentes
  for each row execute function privado.citas_rehuellar();

-- ---------- Revisiones: validadora, huella y efectos ----------
create function privado.revisar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v public.ficha_versiones;
  anterior uuid;
begin
  -- revisor_id, autoaprobada y creada_en no están entre las columnas que el
  -- usuario puede mandar: toman sus valores acá o por defecto.
  if new.objeto <> 'ficha_version' then
    raise exception 'la revisión de % todavía no está disponible', new.objeto using errcode = '0A000';
  end if;
  if not exists (select 1 from public.equipo e where e.id = new.revisor_id and e.estado = 'activa' and e.rol = 'validador') then
    raise exception 'solo una validadora activa revisa' using errcode = '42501';
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
create trigger revisiones_revisar before insert on public.revisiones
  for each row execute function privado.revisar();

-- Revisiones y registro: nunca se cambian ni se borran (tampoco el servidor)
create function privado.solo_agregar() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% solo admite agregar filas', tg_table_name using errcode = '42501';
end;
$$;
create trigger revisiones_solo_agregar before update or delete on public.revisiones
  for each row execute function privado.solo_agregar();
create trigger eventos_solo_agregar before update or delete on public.eventos_editoriales
  for each row execute function privado.solo_agregar();

-- ---------- Fragmentos: solo de la versión publicada vigente ----------
create function privado.fragmento_valido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.activo and not exists (
       select 1 from public.fichas f join public.ficha_versiones v on v.id = f.version_publicada_id
       where f.id = new.ficha_id and v.id = new.version_id
         and f.estado = 'publicada' and v.estado = 'publicada') then
    raise exception 'solo se indexan versiones publicadas y vigentes' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.texto is distinct from old.texto or new.version_id is distinct from old.version_id
                           or new.ficha_id is distinct from old.ficha_id or new.tipo is distinct from old.tipo) then
    raise exception 'un fragmento no cambia de texto: se crea otro' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger fragmentos_valido before insert or update on public.fragmentos
  for each row execute function privado.fragmento_valido();

revoke all on function privado.huella_de(public.ficha_versiones), privado.registrar(text, text, uuid, jsonb, jsonb),
  privado.validar_para_revision(public.ficha_versiones),
  privado.fichas_antes(), privado.fichas_despues(), privado.versiones_antes(), privado.versiones_despues(),
  privado.citas_editables(), privado.citas_rehuellar(), privado.revisar(), privado.solo_agregar(),
  privado.fragmento_valido()
  from public, anon, authenticated;
-- versiones_antes corre con el rol de quien edita y las necesita
grant execute on function privado.huella_de(public.ficha_versiones),
  privado.validar_para_revision(public.ficha_versiones) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Vista: lo único que puede llevar el sello "Revisado por el Pasteur"
-- (security_invoker: respeta los permisos de quien la consulta)
-- ---------------------------------------------------------------------
create view public.fichas_validadas with (security_invoker = true) as
select f.id as ficha_id, f.slug, f.formato, f.tema_id, f.actividad,
       v.id as version_id, v.numero, v.pregunta, v.variantes, v.explicacion_cientifica,
       v.version_infantil, v.grado_min, v.grado_max, v.huella, v.autor_id,
       r.revisor_id as aprobada_por, r.creada_en as aprobada_en, r.autoaprobada
from public.fichas f
join public.ficha_versiones v on v.id = f.version_publicada_id and v.estado = 'publicada'
join lateral (
  select r.revisor_id, r.creada_en, r.autoaprobada from public.revisiones r
  join public.equipo e on e.id = r.revisor_id and e.rol = 'validador'
  where r.objeto = 'ficha_version' and r.objeto_id = v.id and r.decision = 'aprobar'
    and r.huella_revisada = v.huella
  order by r.creada_en desc limit 1
) r on true
where f.estado = 'publicada';

-- ---------------------------------------------------------------------
-- RLS y permisos (partimos de cero)
-- ---------------------------------------------------------------------
alter table public.temas               enable row level security;
alter table public.fuentes             enable row level security;
alter table public.fichas              enable row level security;
alter table public.ficha_versiones     enable row level security;
alter table public.version_fuentes     enable row level security;
alter table public.revisiones          enable row level security;
alter table public.eventos_editoriales enable row level security;
alter table public.fragmentos          enable row level security;
revoke all on public.temas, public.fuentes, public.fichas, public.ficha_versiones, public.version_fuentes,
  public.revisiones, public.eventos_editoriales, public.fragmentos, public.fichas_validadas
  from anon, authenticated, service_role;

-- Temas: el equipo los ve; la admin los mantiene
create policy "temas: el equipo ve" on public.temas
  for select to authenticated using ((select privado.es_equipo()));
create policy "temas: la admin crea" on public.temas
  for insert to authenticated with check ((select privado.es_admin_equipo()));
create policy "temas: la admin edita" on public.temas
  for update to authenticated using ((select privado.es_admin_equipo())) with check ((select privado.es_admin_equipo()));
grant select on public.temas to authenticated;
grant insert (slug, nombre, descripcion, padre_id, actividad, orden, activo) on public.temas to authenticated;
grant update (nombre, descripcion, padre_id, actividad, orden, activo) on public.temas to authenticated;

-- Fuentes: el equipo las ve y las crea; las edita quien las creó o la admin
create policy "fuentes: el equipo ve" on public.fuentes
  for select to authenticated using ((select privado.es_equipo()));
create policy "fuentes: el equipo crea" on public.fuentes
  for insert to authenticated with check ((select privado.es_equipo()) and creada_por = (select auth.uid()));
create policy "fuentes: quien la creó o la admin edita" on public.fuentes
  for update to authenticated
  using ((select privado.es_equipo()) and (creada_por = (select auth.uid()) or (select privado.es_admin_equipo())))
  with check ((select privado.es_equipo()));
grant select on public.fuentes to authenticated;
grant insert (tipo, cita, url, anio, es_del_instituto) on public.fuentes to authenticated;
grant update (tipo, cita, url, anio, es_del_instituto) on public.fuentes to authenticated;

-- Fichas: el equipo las ve y las crea; tema y actividad los cambia quien
-- la creó, una validadora o la admin; retirar, solo validadora o admin
-- (lo controla el trigger).
create policy "fichas: el equipo ve" on public.fichas
  for select to authenticated using ((select privado.es_equipo()));
create policy "fichas: el equipo crea" on public.fichas
  for insert to authenticated with check ((select privado.es_equipo()));
create policy "fichas: editar o retirar" on public.fichas
  for update to authenticated
  using ((select privado.es_equipo())
         and (creada_por = (select auth.uid()) or (select privado.es_validador()) or (select privado.es_admin_equipo())))
  with check ((select privado.es_equipo()));
grant select on public.fichas to authenticated;
grant insert (slug, formato, tema_id, actividad) on public.fichas to authenticated;
grant update (tema_id, actividad, estado, motivo_retiro) on public.fichas to authenticated;

-- Versiones: el equipo las ve; cada una escribe SUS borradores y los envía;
-- en revisión las corrigen su autora y las validadoras.
create policy "versiones: el equipo ve" on public.ficha_versiones
  for select to authenticated using ((select privado.es_equipo()));
create policy "versiones: el equipo crea borradores" on public.ficha_versiones
  for insert to authenticated with check ((select privado.es_equipo()));
create policy "versiones: la autora edita la suya" on public.ficha_versiones
  for update to authenticated
  using ((select privado.es_equipo()) and autor_id = (select auth.uid()) and estado in ('borrador', 'en_revision'))
  with check (autor_id = (select auth.uid()) and estado in ('borrador', 'en_revision'));
create policy "versiones: la validadora corrige en revisión" on public.ficha_versiones
  for update to authenticated
  using ((select privado.es_validador()) and estado = 'en_revision')
  with check (estado = 'en_revision');
grant select on public.ficha_versiones to authenticated;
grant insert (ficha_id, pregunta, variantes, explicacion_cientifica, version_infantil, grado_min, grado_max,
  asistida_por_ia, nota_interna) on public.ficha_versiones to authenticated;
grant update (pregunta, variantes, explicacion_cientifica, version_infantil, grado_min, grado_max,
  asistida_por_ia, nota_interna, estado) on public.ficha_versiones to authenticated;

-- Citas: el equipo las ve; las cambia la autora (borrador o revisión) y las
-- validadoras (en revisión)
create function privado.puede_editar_version(p_version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ficha_versiones v
    where v.id = p_version
      and ((v.autor_id = auth.uid() and v.estado in ('borrador', 'en_revision') and privado.es_equipo())
           or (v.estado = 'en_revision' and privado.es_validador())));
$$;
revoke all on function privado.puede_editar_version(uuid) from public, anon;
grant execute on function privado.puede_editar_version(uuid) to authenticated;

create policy "citas: el equipo ve" on public.version_fuentes
  for select to authenticated using ((select privado.es_equipo()));
create policy "citas: agregar" on public.version_fuentes
  for insert to authenticated with check (privado.puede_editar_version(version_id));
create policy "citas: cambiar" on public.version_fuentes
  for update to authenticated
  using (privado.puede_editar_version(version_id)) with check (privado.puede_editar_version(version_id));
create policy "citas: quitar" on public.version_fuentes
  for delete to authenticated using (privado.puede_editar_version(version_id));
grant select, delete on public.version_fuentes to authenticated;
grant insert (version_id, publicacion_id, fuente_id, pasaje, pasaje_textual, ubicacion, parafrasis, orden)
  on public.version_fuentes to authenticated;
grant update (publicacion_id, fuente_id, pasaje, pasaje_textual, ubicacion, parafrasis, orden)
  on public.version_fuentes to authenticated;

-- Revisiones: el equipo las ve; las validadoras las agregan
create policy "revisiones: el equipo ve" on public.revisiones
  for select to authenticated using ((select privado.es_equipo()));
create policy "revisiones: la validadora revisa" on public.revisiones
  for insert to authenticated with check ((select privado.es_validador()) and revisor_id = (select auth.uid()));
grant select on public.revisiones to authenticated;
grant insert (objeto, objeto_id, decision, comentario, huella_revisada) on public.revisiones to authenticated;

-- Registro editorial: el equipo lo lee; solo los triggers escriben
create policy "eventos: el equipo ve" on public.eventos_editoriales
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.eventos_editoriales to authenticated;

-- Fragmentos: el equipo los ve; solo el servidor los escribe
create policy "fragmentos: el equipo ve" on public.fragmentos
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.fragmentos to authenticated;

-- Vista del sello: el equipo (con sus permisos) y el servidor
grant select on public.fichas_validadas to authenticated, service_role;

-- Servidor (clave secreta): lee todo lo editorial y mantiene el índice
grant select on public.temas, public.fuentes, public.fichas, public.ficha_versiones,
  public.version_fuentes, public.revisiones, public.eventos_editoriales to service_role;
grant select, insert, update (activo, embedding) on public.fragmentos to service_role;
grant update (embedding) on public.temas to service_role;
