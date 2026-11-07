-- =====================================================================
-- Migración 20 · Pedir acceso e historial anónimo de respuestas
--
-- 1. solicitudes_acceso: una escuela o maestra que encuentra la plataforma
--    pide acceso desde el inicio (pedido de Sofia, 6/11/2026). El pedido lo
--    guarda SOLO el servidor, después de controles contra el spam (campo
--    trampa, límite por conexión, un pedido pendiente por mail). Lo ve y lo
--    resuelve la admin del equipo: invitar (genera la cuenta de maestra) o
--    descartar. De la conexión se guarda solo una huella (SHA-256 con una
--    clave del servidor), nunca la IP.
-- 2. vistas_respuestas: cuántas veces se mostró cada respuesta aprobada,
--    por día (en el asistente de la maestra y dentro de las actividades).
--    Sin maestra, sin aula, sin alumno: solo la ficha, el día y un número.
--    Sirve para saber qué preguntan más y elegir próximas respuestas y
--    curiosidades.
-- No toca nada existente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pedidos de acceso
-- ---------------------------------------------------------------------
create table public.solicitudes_acceso (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 2 and 120),
  email         text not null check (char_length(email) between 6 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and email = lower(email)),
  escuela       text not null check (char_length(escuela) between 2 and 160),
  departamento  text not null check (char_length(departamento) between 2 and 60),
  cargo         text not null check (cargo in ('maestra', 'direccion', 'otro')),
  grados        text not null default '' check (char_length(grados) <= 40),
  mensaje       text not null default '' check (char_length(mensaje) <= 1000),
  huella_red    text check (huella_red ~ '^[0-9a-f]{64}$'),
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'invitada', 'descartada')),
  creada_en     timestamptz not null default now(),
  resuelta_en   timestamptz,
  resuelta_por  uuid references public.equipo (id) on delete set null
);
create unique index solicitudes_acceso_una_pendiente on public.solicitudes_acceso (email) where estado = 'pendiente';
create index solicitudes_acceso_estado on public.solicitudes_acceso (estado, creada_en desc);
create index solicitudes_acceso_red on public.solicitudes_acceso (huella_red, creada_en desc);

alter table public.solicitudes_acceso enable row level security;
revoke all on public.solicitudes_acceso from public, anon, authenticated;
create policy "solicitudes: la admin ve" on public.solicitudes_acceso
  for select to authenticated using ((select privado.es_admin_equipo()));
create policy "solicitudes: la admin resuelve" on public.solicitudes_acceso
  for update to authenticated using ((select privado.es_admin_equipo())) with check ((select privado.es_admin_equipo()));
grant select on public.solicitudes_acceso to authenticated;
grant update (estado, resuelta_en, resuelta_por) on public.solicitudes_acceso to authenticated;
grant select, insert, update, delete on public.solicitudes_acceso to service_role;

-- Alta de un pedido (solo el servidor). Devuelve 'ok', 'ya_pendiente' o 'muchos'.
create function public.registrar_solicitud_acceso(
  p_nombre text, p_email text, p_escuela text, p_departamento text, p_cargo text,
  p_grados text, p_mensaje text, p_huella_red text
) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
begin
  -- Hasta 3 pedidos por hora desde la misma conexión, y 20 por hora en total
  if p_huella_red is not null and (select count(*) from public.solicitudes_acceso
        where huella_red = p_huella_red and creada_en > now() - interval '1 hour') >= 3 then
    return 'muchos';
  end if;
  if (select count(*) from public.solicitudes_acceso where creada_en > now() - interval '1 hour') >= 20 then
    return 'muchos';
  end if;
  if exists (select 1 from public.solicitudes_acceso where email = v_email and estado = 'pendiente') then
    return 'ya_pendiente';
  end if;
  insert into public.solicitudes_acceso (nombre, email, escuela, departamento, cargo, grados, mensaje, huella_red)
  values (btrim(p_nombre), v_email, btrim(p_escuela), btrim(p_departamento), p_cargo,
          left(btrim(coalesce(p_grados, '')), 40), left(btrim(coalesce(p_mensaje, '')), 1000), p_huella_red);
  return 'ok';
exception when unique_violation then
  return 'ya_pendiente';
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Historial anónimo: cuántas veces se mostró cada respuesta aprobada
-- ---------------------------------------------------------------------
create table public.vistas_respuestas (
  ficha_id  uuid not null references public.fichas (id) on delete cascade,
  dia       date not null default current_date,
  origen    text not null check (origen in ('asistente', 'actividad')),
  veces     integer not null default 0 check (veces >= 0),
  primary key (ficha_id, dia, origen)
);
alter table public.vistas_respuestas enable row level security;
revoke all on public.vistas_respuestas from public, anon, authenticated;
create policy "vistas: el equipo ve" on public.vistas_respuestas
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.vistas_respuestas to authenticated;
grant select, insert, update on public.vistas_respuestas to service_role;

-- Suma una vista (solo el servidor; solo respuestas publicadas)
create function public.contar_vista_respuesta(p_ficha uuid, p_origen text) returns void
language sql security invoker set search_path = '' as $$
  insert into public.vistas_respuestas as v (ficha_id, dia, origen, veces)
  select f.id, current_date, p_origen, 1
    from public.fichas f
   where f.id = p_ficha and f.estado = 'publicada' and p_origen in ('asistente', 'actividad')
  on conflict (ficha_id, dia, origen) do update set veces = v.veces + 1;
$$;

revoke all on function public.registrar_solicitud_acceso(text, text, text, text, text, text, text, text),
  public.contar_vista_respuesta(uuid, text)
  from public, anon, authenticated;
grant execute on function public.registrar_solicitud_acceso(text, text, text, text, text, text, text, text),
  public.contar_vista_respuesta(uuid, text)
  to service_role;
