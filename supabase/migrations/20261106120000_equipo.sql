-- =====================================================================
-- Migración 8 · Equipo del Pasteur: investigadoras, validadoras y admin
--
-- Quiénes son (ver docs del asistente, sección 4):
--   · investigador → escribe fichas y fuentes, las manda a revisión.
--   · validador    → además aprueba, pide cambios o rechaza lo que escribió
--                    OTRA persona (nadie aprueba su propio texto).
--   · admin        → invita y suspende miembros, cambia roles y ajustes.
--                    No valida contenido científico.
--
-- Cómo se entra: SOLO por invitación. La admin anota el mail y el rol en
-- invitaciones_equipo; el servidor manda la invitación de Supabase Auth.
-- Cuando Supabase crea el usuario, el trigger de alta lo encuentra en la
-- lista y le crea su fila en equipo, NO en docentes. Sin invitación todo
-- sigue como antes (maestra). Una persona que es maestra e investigadora
-- usa dos cuentas con mails distintos.
--
-- Lo único existente que se toca: la función del trigger de alta
-- (CREATE OR REPLACE, mismo nombre, mismos permisos). No borra nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.equipo (
  id              uuid primary key references auth.users (id) on delete cascade,
  nombre_visible  text not null default '' check (char_length(nombre_visible) <= 120),
  laboratorio     text not null default '' check (char_length(laboratorio) <= 160),
  rol             text not null check (rol in ('investigador', 'validador', 'admin')),
  estado          text not null default 'activa' check (estado in ('activa', 'suspendida')),
  creado_en       timestamptz not null default now(),
  estado_desde    timestamptz not null default now()
);
comment on table public.equipo is 'Equipo del Pasteur que escribe y valida contenido. Sin datos de niños.';

create table public.invitaciones_equipo (
  id              uuid primary key default gen_random_uuid(),
  email           text not null check (
                    email = lower(email)
                    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                    and email not like '%@alumnos.invalid'),
  rol             text not null check (rol in ('investigador', 'validador', 'admin')),
  nombre_visible  text not null default '' check (char_length(nombre_visible) <= 120),
  laboratorio     text not null default '' check (char_length(laboratorio) <= 160),
  invitado_por    uuid default auth.uid() references public.equipo (id) on delete set null,
  creada_en       timestamptz not null default now(),
  usada_en        timestamptz,
  usada_por       uuid references auth.users (id) on delete set null
);
-- Una sola invitación pendiente por mail
create unique index invitaciones_equipo_una_pendiente
  on public.invitaciones_equipo (email) where usada_en is null;

-- ---------------------------------------------------------------------
-- Funciones de ayuda (security definer, en el esquema privado que la API
-- no publica). Todas rechazan tokens de alumno, como es_docente().
-- ---------------------------------------------------------------------
create function privado.es_equipo() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') <> 'alumno'
     and exists (select 1 from public.equipo e where e.id = auth.uid() and e.estado = 'activa');
$$;

create function privado.es_validador() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') <> 'alumno'
     and exists (select 1 from public.equipo e
                 where e.id = auth.uid() and e.estado = 'activa' and e.rol = 'validador');
$$;

create function privado.es_admin_equipo() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') <> 'alumno'
     and exists (select 1 from public.equipo e
                 where e.id = auth.uid() and e.estado = 'activa' and e.rol = 'admin');
$$;

revoke all on function privado.es_equipo(), privado.es_validador(), privado.es_admin_equipo()
  from public, anon;
grant execute on function privado.es_equipo(), privado.es_validador(), privado.es_admin_equipo()
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Trigger de alta: invitación del equipo → equipo; si no, como antes.
-- Mantiene las tres protecciones de la migración 7 (rol alumno, anónimo,
-- mail interno de alumno).
-- ---------------------------------------------------------------------
create or replace function public.crear_docente() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitaciones_equipo;
begin
  if coalesce(new.raw_app_meta_data ->> 'rol', '') = 'alumno'
     or coalesce(new.is_anonymous, false)
     or lower(coalesce(new.email, '')) like '%@alumnos.invalid' then
    return new;
  end if;

  select * into inv from public.invitaciones_equipo i
   where i.email = lower(coalesce(new.email, '')) and i.usada_en is null
   for update;

  if found then
    insert into public.equipo (id, nombre_visible, laboratorio, rol)
      values (new.id, inv.nombre_visible, inv.laboratorio, inv.rol)
      on conflict (id) do nothing;
    update public.invitaciones_equipo
       set usada_en = now(), usada_por = new.id
     where id = inv.id;
  else
    insert into public.docentes (id, nombre)
      values (new.id, coalesce(left(new.raw_user_meta_data ->> 'nombre', 120), ''))
      on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Protección de roles: nadie cambia su propio rol ni su estado, y solo
-- la admin cambia los de otros. El servidor (sin sesión de usuario) sí
-- puede, para dar de alta a la primera admin.
-- ---------------------------------------------------------------------
create function privado.proteger_equipo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.rol is distinct from old.rol or new.estado is distinct from old.estado) then
    if auth.uid() is not null and (old.id = auth.uid() or not privado.es_admin_equipo()) then
      raise exception 'solo la admin cambia rol o estado, y nunca el propio'
        using errcode = '42501';
    end if;
    if new.estado is distinct from old.estado then
      new.estado_desde := now();
    end if;
  end if;
  if new.id is distinct from old.id or new.creado_en is distinct from old.creado_en then
    raise exception 'id y fecha de alta no se cambian' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger equipo_proteger before update on public.equipo
  for each row execute function privado.proteger_equipo();
revoke all on function privado.proteger_equipo() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS y permisos (partimos de cero, como en la migración 2)
-- ---------------------------------------------------------------------
alter table public.equipo              enable row level security;
alter table public.invitaciones_equipo enable row level security;
revoke all on public.equipo, public.invitaciones_equipo from anon, authenticated, service_role;

-- Equipo: los miembros activos se ven entre sí (para saber quién escribió
-- y quién aprobó). Cada uno edita su nombre y laboratorio; la admin, el
-- rol y el estado de los demás (lo controla el trigger de arriba).
create policy "equipo: los miembros se ven" on public.equipo
  for select to authenticated using ((select privado.es_equipo()));
create policy "equipo: cada uno edita su fila" on public.equipo
  for update to authenticated
  using (id = (select auth.uid()) and (select privado.es_equipo()))
  with check (id = (select auth.uid()));
create policy "equipo: la admin edita a los demás" on public.equipo
  for update to authenticated
  using ((select privado.es_admin_equipo()) and id <> (select auth.uid()))
  with check ((select privado.es_admin_equipo()));
grant select on public.equipo to authenticated;
grant update (nombre_visible, laboratorio, rol, estado) on public.equipo to authenticated;

-- Invitaciones: solo la admin las ve y las crea. Nadie las borra desde la web.
create policy "invitaciones: la admin ve" on public.invitaciones_equipo
  for select to authenticated using ((select privado.es_admin_equipo()));
create policy "invitaciones: la admin crea" on public.invitaciones_equipo
  for insert to authenticated
  with check ((select privado.es_admin_equipo()) and invitado_por = (select auth.uid()) and usada_en is null);
grant select on public.invitaciones_equipo to authenticated;
grant insert (email, rol, nombre_visible, laboratorio) on public.invitaciones_equipo to authenticated;

-- Servidor: lee el equipo, crea invitaciones (alta de la primera admin) y
-- las marca usadas.
grant select on public.equipo to service_role;
grant update (rol, estado) on public.equipo to service_role;
grant select, insert, update on public.invitaciones_equipo to service_role;
