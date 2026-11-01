-- =====================================================================
-- BORRADOR DEL ESQUEMA — La ciencia sin límites (etapa 5 de la migración)
-- NO APLICAR TODAVÍA. Es para revisar (también con el Institut Pasteur)
-- antes de crear nada en Supabase. Ver supabase/borrador/LEEME.md.
-- =====================================================================
--
-- Quién es quién:
--   · La maestra inicia sesión con su mail (Supabase Auth).
--   · Los niños NO tienen cuenta ni dan su nombre: entran con el código de la
--     sala y un apodo. Por dentro reciben una sesión anónima de Supabase
--     (Authentication → Sign In / Providers → "Allow anonymous sign-ins"),
--     que sirve solo para que las reglas sepan cuál es "su" fila.
--   · El modo individual (explorar sin sala) sigue guardándose solo en el
--     navegador: no llega a la base.
--
-- Seguridad: todas las tablas tienen RLS (Row Level Security). La clave
-- publicable que va en la web no alcanza para leer nada que las reglas no permitan.

-- ---------------------------------------------------------------------
-- Docentes: una fila por maestra con cuenta (misma id que auth.users)
-- ---------------------------------------------------------------------
create table public.docentes (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  escuela    text not null default '',          -- VALIDAR: ¿hace falta?
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Grupos: las clases de cada maestra (ej. "4° B"). Opcional al abrir una sala.
-- ---------------------------------------------------------------------
create table public.grupos (
  id          uuid primary key default gen_random_uuid(),
  docente_id  uuid not null references public.docentes (id) on delete cascade,
  nombre      text not null,
  grado       smallint check (grado between 1 and 6),
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Salas: una por cada vez que la maestra abre una actividad con su clase.
-- Mismos campos que la sala de prueba de hoy (src/tipos/sala.ts).
-- ---------------------------------------------------------------------
create table public.salas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text not null check (codigo ~ '^[A-HJ-NP-Z2-9]{4}$'),  -- sin O/0 ni I/1
  docente_id   uuid not null references public.docentes (id) on delete cascade,
  grupo_id     uuid references public.grupos (id) on delete set null,
  actividad    text not null check (actividad in ('a1', 'a2', 'a3', 'a4')),
  estado       text not null default 'esperando' check (estado in ('esperando', 'en-curso', 'puesta', 'cerrada')),
  pausada      boolean not null default false,
  opciones     jsonb not null default '{}'::jsonb,
  desbloqueos  jsonb not null default '{}'::jsonb,
  creada_en    timestamptz not null default now(),
  cerrada_en   timestamptz
);

-- El código solo tiene que ser único entre las salas abiertas
create unique index salas_codigo_abierta on public.salas (codigo) where estado <> 'cerrada';

-- ---------------------------------------------------------------------
-- Alumnos en sala: un niño (sesión anónima) dentro de una sala.
-- `datos` es lo que la actividad va guardando (lo ve la maestra en el tablero).
-- ---------------------------------------------------------------------
create table public.alumnos_en_sala (
  id          uuid primary key default gen_random_uuid(),
  sala_id     uuid not null references public.salas (id) on delete cascade,
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  apodo       text not null,
  color       text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  etapa       text not null,
  datos       jsonb not null default '{}'::jsonb,
  desde       timestamptz not null default now(),   -- desde cuándo está en esta etapa
  unique (sala_id, usuario_id),
  unique (sala_id, apodo)
);

create index alumnos_en_sala_sala on public.alumnos_en_sala (sala_id);

-- =====================================================================
-- Funciones de ayuda para las reglas (security definer: evitan que las
-- reglas de salas y alumnos se llamen entre sí en bucle)
-- =====================================================================
create function public.es_docente_de_sala(p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.salas s where s.id = p_sala and s.docente_id = auth.uid());
$$;

create function public.estoy_en_sala(p_sala uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alumnos_en_sala a where a.sala_id = p_sala and a.usuario_id = auth.uid());
$$;

-- El niño entra a una sala abierta con su código, apodo y color.
-- Es la única forma de crear una fila en alumnos_en_sala.
create function public.unirse_a_sala(p_codigo text, p_apodo text, p_color text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_sala uuid;
begin
  if auth.uid() is null then
    raise exception 'Hace falta una sesión (anónima) para entrar a la sala';
  end if;
  select s.id into v_sala from public.salas s
    where s.codigo = upper(p_codigo) and s.estado <> 'cerrada';
  if v_sala is null then
    raise exception 'Ese código no existe';
  end if;
  -- VALIDAR: la primera etapa depende de la actividad (hoy sale de aN/etapas.js)
  insert into public.alumnos_en_sala (sala_id, usuario_id, apodo, color, etapa)
    values (v_sala, auth.uid(), p_apodo, p_color, 'inicio')
    on conflict (sala_id, usuario_id) do update set apodo = excluded.apodo, color = excluded.color;
  return v_sala;
end;
$$;

-- Apodos ya elegidos en una sala abierta (para no repetir), sin mostrar nada más.
create function public.apodos_ocupados(p_codigo text) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a.apodo), '{}')
  from public.alumnos_en_sala a join public.salas s on s.id = a.sala_id
  where s.codigo = upper(p_codigo) and s.estado <> 'cerrada';
$$;

-- =====================================================================
-- Reglas (RLS)
-- =====================================================================
alter table public.docentes        enable row level security;
alter table public.grupos          enable row level security;
alter table public.salas           enable row level security;
alter table public.alumnos_en_sala enable row level security;

-- Docentes: cada maestra ve y edita solo su fila
create policy "docente: su fila" on public.docentes
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Grupos: solo la maestra dueña
create policy "grupos: de la maestra" on public.grupos
  for all to authenticated using (docente_id = auth.uid()) with check (docente_id = auth.uid());

-- Salas: la maestra dueña hace todo; el niño solo ve la sala en la que está
create policy "salas: de la maestra" on public.salas
  for all to authenticated using (docente_id = auth.uid()) with check (docente_id = auth.uid());
create policy "salas: el niño ve la suya" on public.salas
  for select to authenticated using (public.estoy_en_sala(id));

-- Alumnos: el niño ve y actualiza solo su fila; la maestra ve y edita los de sus salas
create policy "alumnos: el niño ve la suya" on public.alumnos_en_sala
  for select to authenticated using (usuario_id = auth.uid());
create policy "alumnos: el niño actualiza la suya" on public.alumnos_en_sala
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "alumnos: la maestra ve los de sus salas" on public.alumnos_en_sala
  for select to authenticated using (public.es_docente_de_sala(sala_id));
create policy "alumnos: la maestra los quita de sus salas" on public.alumnos_en_sala
  for delete to authenticated using (public.es_docente_de_sala(sala_id));

-- =====================================================================
-- Permisos explícitos. El proyecto se crea con "Automatically expose new
-- tables" DESACTIVADO: nada queda accesible si no se da acá. Las reglas RLS
-- de arriba filtran después qué filas ve cada uno.
-- Sin sesión (anon) no hay ningún permiso.
-- =====================================================================
revoke all on public.docentes, public.grupos, public.salas, public.alumnos_en_sala from anon, authenticated;
grant select, insert, update, delete on public.docentes, public.grupos, public.salas to authenticated;
grant select, delete on public.alumnos_en_sala to authenticated;
-- El niño solo puede cambiar su etapa, sus datos y "desde" (no su sala, su apodo ni su id).
-- Las filas se crean únicamente con unirse_a_sala().
grant update (etapa, datos, desde) on public.alumnos_en_sala to authenticated;

-- Funciones de las reglas: las usa cualquiera con sesión
revoke execute on function public.es_docente_de_sala(uuid), public.estoy_en_sala(uuid) from public, anon;
grant execute on function public.es_docente_de_sala(uuid), public.estoy_en_sala(uuid) to authenticated;

-- Las funciones las puede llamar cualquiera con sesión (también la anónima de los niños)
revoke execute on function public.unirse_a_sala(text, text, text) from public, anon;
grant execute on function public.unirse_a_sala(text, text, text) to authenticated;
revoke execute on function public.apodos_ocupados(text) from public, anon;
grant execute on function public.apodos_ocupados(text) to authenticated;

-- =====================================================================
-- Tiempo real: la maestra ve el tablero moverse y los niños ven la pausa
-- =====================================================================
alter publication supabase_realtime add table public.salas, public.alumnos_en_sala;

-- =====================================================================
-- PENDIENTE DE DECIDIR (con el Institut Pasteur / Ceibal)
-- · Cuánto tiempo se guardan las salas cerradas y los datos de los niños
--   (propuesta: borrar alumnos_en_sala a los 30 días de cerrada la sala).
-- · Si la maestra se registra sola o la habilita el Instituto.
-- · Si hacen falta "grupos" desde el principio o alcanza con salas.
-- =====================================================================
