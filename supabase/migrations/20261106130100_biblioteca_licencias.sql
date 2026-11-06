-- =====================================================================
-- Migración 14 · Biblioteca científica: licencias y pasajes
--
-- Acceso abierto no es lo mismo que permiso para copiar. Cada licencia dice
-- qué se puede hacer con el pasaje que respalda una ficha:
--   · textual         → se puede copiar, hasta 60 palabras, con atribución
--   · breve           → se puede copiar, hasta 25 palabras, con atribución
--   · solo_ubicacion  → no se copia: se pone dónde está y una paráfrasis
-- La política inicial es prudente: las licencias no comerciales y las del
-- editor quedan en "solo ubicación" hasta que el Instituto confirme; la
-- admin cambia una fila y listo. (No somos abogados: conviene validarla.)
--
-- Cómo se sabe la licencia de una publicación: el servidor junta las
-- señales de OpenAlex y Europe PMC con public.registrar_licencia(). Si no
-- coinciden, vale la más restrictiva y queda marcada para revisar. Una
-- validadora o la admin pueden fijarla a mano (por ejemplo, después de
-- mirar la página de la revista); lo automático no pisa lo fijado a mano.
-- Cada verificación queda guardada y no se edita.
--
-- Toca de lo existente: agrega la clave foránea de publicaciones a
-- licencias y dos triggers nuevos (en version_fuentes y ficha_versiones).
-- No borra nada.
-- =====================================================================

create table public.licencias (
  codigo  text primary key check (codigo ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(codigo) <= 40),
  nombre  text not null check (char_length(nombre) between 1 and 120),
  url     text check (url is null or (url ~ '^https://' and char_length(url) <= 300)),
  pasaje  text not null check (pasaje in ('textual', 'breve', 'solo_ubicacion')),
  -- De menos a más restrictiva: cuando las fuentes no coinciden, gana el número más alto
  orden   smallint not null unique check (orden between 0 and 1000),
  nota    text not null default '' check (char_length(nota) <= 600)
);
insert into public.licencias (codigo, nombre, url, pasaje, orden, nota) values
  ('cc0',             'CC0 (dominio público)',           'https://creativecommons.org/publicdomain/zero/1.0/',   'textual',         0, ''),
  ('dominio-publico', 'Dominio público',                 null,                                                   'textual',         5, ''),
  ('cc-by',           'CC BY',                           'https://creativecommons.org/licenses/by/4.0/',         'textual',        10, 'Con atribución'),
  ('cc-by-sa',        'CC BY-SA',                        'https://creativecommons.org/licenses/by-sa/4.0/',      'textual',        20, 'Con atribución'),
  ('cc-by-nd',        'CC BY-ND',                        'https://creativecommons.org/licenses/by-nd/4.0/',      'textual',        30, 'Con atribución; la cita va sin modificar'),
  ('cc-by-nc',        'CC BY-NC',                        'https://creativecommons.org/licenses/by-nc/4.0/',      'solo_ubicacion', 40, 'Pasa a "breve" si el Instituto confirma que el uso es no comercial'),
  ('cc-by-nc-sa',     'CC BY-NC-SA',                     'https://creativecommons.org/licenses/by-nc-sa/4.0/',   'solo_ubicacion', 50, 'Pasa a "breve" si el Instituto confirma que el uso es no comercial'),
  ('cc-by-nc-nd',     'CC BY-NC-ND',                     'https://creativecommons.org/licenses/by-nc-nd/4.0/',   'solo_ubicacion', 60, 'Pasa a "breve" si el Instituto confirma que el uso es no comercial'),
  ('editor-oa',       'Acceso abierto del editor, sin licencia abierta', null,                                   'solo_ubicacion', 70, 'Pasa a "breve" si el Instituto confirma la cita breve con atribución'),
  ('desconocida',     'Sin licencia o desconocida',      null,                                                   'solo_ubicacion', 80, 'Pasa a "breve" si el Instituto confirma la cita breve con atribución');

alter table public.publicaciones
  add constraint publicaciones_licencia_fk
  foreign key (licencia_codigo) references public.licencias (codigo) on update cascade on delete restrict;

create table public.verificaciones_licencia (
  id                 bigint generated always as identity primary key,
  publicacion_id     uuid not null references public.publicaciones (id) on delete cascade,
  senal_origen       text not null check (char_length(senal_origen) between 1 and 30),   -- openalex, europepmc o manual
  senal_texto        text not null default '' check (char_length(senal_texto) <= 300),
  licencia_detectada text not null references public.licencias (codigo) on update cascade,
  resultado          text not null check (resultado in ('coincide', 'difiere', 'sin_senal', 'manual', 'se_mantiene_manual')),
  verificada_por     uuid references public.equipo (id) on delete set null,
  verificada_en      timestamptz not null default now()
);
create index verificaciones_licencia_publicacion on public.verificaciones_licencia (publicacion_id);
-- El historial no se edita (sí se va con la publicación si algún día se purga una candidata)
create trigger verificaciones_solo_agregar before update on public.verificaciones_licencia
  for each row execute function privado.solo_agregar();

-- Señal de licencia → código ("CC BY 4.0", "cc-by",
-- "https://creativecommons.org/licenses/by/4.0/" → cc-by)
create function privado.normalizar_licencia(t text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  s text := lower(btrim(coalesce(t, '')));
begin
  if s = '' then
    return null;
  end if;
  s := regexp_replace(s, '^https?://(www\.)?', '');
  if s ~ '^creativecommons\.org/publicdomain/zero' or s in ('cc0', 'cc-0', 'cc zero', 'cc-zero', 'cc0-1.0', 'cc0 1.0') then
    return 'cc0';
  end if;
  if s ~ '^creativecommons\.org/publicdomain/mark' or s in ('public-domain', 'public domain', 'pd') then
    return 'dominio-publico';
  end if;
  if s ~ '^creativecommons\.org/licenses/' then
    s := 'cc-' || split_part(regexp_replace(s, '^creativecommons\.org/licenses/', ''), '/', 1);
  end if;
  s := regexp_replace(s, '[[:space:]_]+', '-', 'g');
  s := regexp_replace(s, '-[0-9][0-9.]*$', '');
  if s ~ '^by(-|$)' then
    s := 'cc-' || s;
  end if;
  if s = 'cc-by-nd-nc' then
    s := 'cc-by-nc-nd';
  end if;
  if s in ('cc-by', 'cc-by-sa', 'cc-by-nd', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd') then
    return s;
  end if;
  if s in ('publisher-specific-oa', 'publisher-specific', 'implied-oa', 'other-oa', 'unspecified-oa', 'open-access', 'free-to-read') then
    return 'editor-oa';
  end if;
  return 'desconocida';
end;
$$;
revoke all on function privado.normalizar_licencia(text) from public, anon;
grant execute on function privado.normalizar_licencia(text) to authenticated, service_role;

-- ¿Este pasaje se puede citar textual con la licencia vigente de su publicación?
create function privado.pasaje_permitido(p_publicacion uuid, p_pasaje text, p_textual boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_publicacion is null or not coalesce(p_textual, false) then true
    else coalesce((
      select case l.pasaje
               when 'textual' then privado.palabras(p_pasaje) <= 60
               when 'breve' then privado.palabras(p_pasaje) <= 25
               else false end
        from public.publicaciones p left join public.licencias l on l.codigo = p.licencia_codigo
       where p.id = p_publicacion), false)
  end;
$$;
revoke all on function privado.pasaje_permitido(uuid, text, boolean) from public, anon;
grant execute on function privado.pasaje_permitido(uuid, text, boolean) to authenticated, service_role;

-- Al citar: un pasaje textual solo si la licencia lo permite (y con su largo)
create function privado.cita_respeta_licencia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  politica text;
begin
  if new.publicacion_id is null or not new.pasaje_textual then
    return new;
  end if;
  select coalesce(l.pasaje, 'solo_ubicacion') into politica
    from public.publicaciones p left join public.licencias l on l.codigo = p.licencia_codigo
   where p.id = new.publicacion_id;
  if coalesce(politica, 'solo_ubicacion') = 'solo_ubicacion' then
    raise exception 'la licencia de esta publicación no permite copiar el texto: poné dónde está y una paráfrasis'
      using errcode = '23514';
  elsif politica = 'breve' and privado.palabras(new.pasaje) > 25 then
    raise exception 'con esta licencia la cita textual puede tener hasta 25 palabras' using errcode = '23514';
  elsif privado.palabras(new.pasaje) > 60 then
    raise exception 'una cita textual puede tener hasta 60 palabras' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger citas_licencia before insert or update on public.version_fuentes
  for each row execute function privado.cita_respeta_licencia();

-- Al enviar o corregir en revisión: si la licencia cambió desde que se citó,
-- primero hay que pasar ese pasaje a paráfrasis
create function privado.versiones_licencias() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'en_revision' and exists (
       select 1 from public.version_fuentes vf
        where vf.version_id = new.id and not privado.pasaje_permitido(vf.publicacion_id, vf.pasaje, vf.pasaje_textual)) then
    raise exception 'la licencia de una publicación citada ya no permite su pasaje textual: pasalo a paráfrasis'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
-- Corre después de versiones_antes (los triggers van en orden alfabético)
create trigger versiones_licencias before update on public.ficha_versiones
  for each row execute function privado.versiones_licencias();

-- Licencia de una publicación a partir de sus señales (solo el servidor).
-- p_senales: [{"origen": "openalex" | "europepmc" | "manual", "texto": "cc-by"}]
-- "manual" solo si p_actor es una validadora o la admin. Devuelve el código.
create function public.registrar_licencia(p_publicacion uuid, p_senales jsonb, p_actor uuid default null)
returns text
language plpgsql set search_path = '' as $$
declare
  s record;
  origenes text[] := '{}';
  textos text[] := '{}';
  codigos text[] := '{}';
  manual text;
  hay_manual_previa boolean;
  actual text;
  final text;
  resultado text;
begin
  select p.licencia_codigo into actual from public.publicaciones p where p.id = p_publicacion for update;
  if not found then
    raise exception 'la publicación no existe' using errcode = '23503';
  end if;
  if p_actor is not null and not exists (select 1 from public.equipo e where e.id = p_actor and e.estado = 'activa') then
    raise exception 'quien verifica tiene que ser del equipo' using errcode = '42501';
  end if;

  for s in
    select btrim(coalesce(e ->> 'origen', '')) as origen, left(btrim(coalesce(e ->> 'texto', '')), 300) as texto
      from jsonb_array_elements(case jsonb_typeof(p_senales) when 'array' then p_senales else '[]'::jsonb end) e
  loop
    if s.origen = 'manual' then
      if p_actor is null or not exists (select 1 from public.equipo e
                                         where e.id = p_actor and e.estado = 'activa' and e.rol in ('validador', 'admin')) then
        raise exception 'la licencia a mano la fija una validadora o la admin' using errcode = '42501';
      end if;
      if not exists (select 1 from public.licencias l where l.codigo = s.texto) then
        raise exception 'licencia desconocida: %', s.texto using errcode = '22023';
      end if;
      manual := s.texto;
    elsif not exists (select 1 from public.proveedores_cientificos pc where pc.id = s.origen) then
      raise exception 'origen de licencia desconocido: %', s.origen using errcode = '22023';
    elsif s.texto <> '' then
      origenes := origenes || s.origen;
      textos := textos || s.texto;
      codigos := codigos || privado.normalizar_licencia(s.texto);
    end if;
  end loop;

  hay_manual_previa := exists (select 1 from public.verificaciones_licencia v
                                where v.publicacion_id = p_publicacion and v.resultado = 'manual');

  if manual is not null then
    final := manual;
    resultado := 'manual';
    insert into public.verificaciones_licencia (publicacion_id, senal_origen, senal_texto, licencia_detectada, resultado, verificada_por)
    values (p_publicacion, 'manual', manual, manual, 'manual', p_actor);
  else
    if cardinality(codigos) = 0 then
      final := 'desconocida';
      resultado := 'sin_senal';
    else
      select l.codigo into final from public.licencias l where l.codigo = any (codigos) order by l.orden desc limit 1;
      resultado := case when (select count(distinct c) from unnest(codigos) c) = 1 then 'coincide' else 'difiere' end;
    end if;
    if hay_manual_previa then
      -- Lo fijado a mano manda; esto queda solo como registro
      resultado := 'se_mantiene_manual';
    end if;
    if cardinality(codigos) = 0 then
      insert into public.verificaciones_licencia (publicacion_id, senal_origen, licencia_detectada, resultado, verificada_por)
      values (p_publicacion, 'ninguna', 'desconocida', resultado, p_actor);
    else
      insert into public.verificaciones_licencia (publicacion_id, senal_origen, senal_texto, licencia_detectada, resultado, verificada_por)
      select p_publicacion, o, t, c, resultado, p_actor from unnest(origenes, textos, codigos) as u(o, t, c);
    end if;
  end if;

  if resultado = 'se_mantiene_manual' then
    update public.publicaciones
       set licencia_revisar = (final is distinct from actual)
     where id = p_publicacion;
    return actual;
  end if;
  update public.publicaciones
     set licencia_codigo = final, licencia_revisar = (resultado = 'difiere')
   where id = p_publicacion;
  return final;
end;
$$;
revoke all on function public.registrar_licencia(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.registrar_licencia(uuid, jsonb, uuid) to service_role;

-- Cambios en la política de licencias: quedan en el registro editorial
create function privado.licencias_despues() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform privado.registrar(case tg_op when 'INSERT' then 'crear_licencia' else 'editar_licencia' end,
    'licencia', md5(new.codigo)::uuid, case tg_op when 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return null;
end;
$$;
create trigger licencias_despues after insert or update on public.licencias
  for each row execute function privado.licencias_despues();

revoke all on function privado.cita_respeta_licencia(), privado.versiones_licencias(), privado.licencias_despues()
  from public, anon, authenticated;

-- Citas textuales que su licencia ya no permite (por ejemplo, porque la
-- licencia se volvió más restrictiva): hay que pasarlas a paráfrasis. Si la
-- versión ya está publicada sigue publicada (su texto es propio) y el
-- arreglo va en una versión nueva.
create view public.pasajes_a_revisar with (security_invoker = true) as
select vf.id as cita_id, vf.version_id, v.ficha_id, v.estado as estado_version,
       vf.publicacion_id, p.licencia_codigo, l.pasaje as politica, privado.palabras(vf.pasaje) as palabras
  from public.version_fuentes vf
  join public.ficha_versiones v on v.id = vf.version_id
  join public.publicaciones p on p.id = vf.publicacion_id
  left join public.licencias l on l.codigo = p.licencia_codigo
 where vf.pasaje_textual
   and v.estado in ('borrador', 'en_revision', 'publicada')
   and not privado.pasaje_permitido(vf.publicacion_id, vf.pasaje, vf.pasaje_textual);

-- ---------------------------------------------------------------------
-- RLS y permisos
-- ---------------------------------------------------------------------
alter table public.licencias               enable row level security;
alter table public.verificaciones_licencia enable row level security;
revoke all on public.licencias, public.verificaciones_licencia, public.pasajes_a_revisar
  from anon, authenticated, service_role;

-- Licencias: el equipo ve la política; solo la admin la cambia
create policy "licencias: el equipo ve" on public.licencias
  for select to authenticated using ((select privado.es_equipo()));
create policy "licencias: la admin agrega" on public.licencias
  for insert to authenticated with check ((select privado.es_admin_equipo()));
create policy "licencias: la admin edita" on public.licencias
  for update to authenticated using ((select privado.es_admin_equipo())) with check ((select privado.es_admin_equipo()));
grant select on public.licencias to authenticated;
grant insert (codigo, nombre, url, pasaje, orden, nota) on public.licencias to authenticated;
grant update (nombre, url, pasaje, orden, nota) on public.licencias to authenticated;

-- Verificaciones: el equipo las ve; las escribe el servidor
create policy "verificaciones: el equipo ve" on public.verificaciones_licencia
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.verificaciones_licencia to authenticated;

grant select on public.pasajes_a_revisar to authenticated, service_role;

grant select on public.licencias to service_role;
grant select, insert on public.verificaciones_licencia to service_role;
