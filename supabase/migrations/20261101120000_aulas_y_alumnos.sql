-- =====================================================================
-- Migración 1/3 · Tablas: docentes, aulas, alumnos, asignaciones,
-- sesiones en vivo, progreso y resultados científicos.
-- La Ciencia sin límites · ver docs/ARQUITECTURA-SUPABASE.md
--
-- Principios:
--   · Los niños NO dan nombre ni mail. Cada uno es "K7RM-07" (código del aula
--     + número de lista). La maestra guarda en papel qué número es cada niño.
--   · Las cuentas de los niños las crea el SERVIDOR (clave secreta), nunca el navegador.
--   · Nada se borra desde la web: aulas se archivan, alumnos se desactivan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Código de aula: 4 caracteres sin letras que se confunden (sin O/0, I/1)
-- ---------------------------------------------------------------------
-- security definer: tiene que ver TODAS las aulas para no repetir códigos
-- (las reglas solo le muestran a cada maestra las suyas). Solo devuelve un código libre.
create function public.generar_codigo_aula() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := '';
    for i in 1..4 loop
      c := c || substr(letras, 1 + floor(random() * length(letras))::int, 1);
    end loop;
    exit when not exists (select 1 from public.aulas a where a.codigo = c);
  end loop;
  return c;
end;
$$;

-- ---------------------------------------------------------------------
-- Docentes: una fila por maestra (misma id que su usuario de Supabase Auth).
-- Se crea sola con un trigger cuando se crea un usuario que no es alumno.
--
-- estado:
--   · activa     → puede crear aulas y ver las suyas.
--   · pendiente  → (futuro "Solicitar acceso") se registró sola y espera que
--                  el equipo del Pasteur la apruebe. No puede hacer nada.
--   · suspendida → el equipo le quitó el acceso. No ve ni cambia nada.
-- Hoy el registro abierto está apagado y TODAS las maestras entran por
-- invitación, así que nacen 'activa'. Solo el servidor o el panel de
-- administración (futuro) cambian el estado; la maestra no puede.
-- ---------------------------------------------------------------------
create table public.docentes (
  id           uuid primary key references auth.users (id) on delete cascade,
  nombre       text not null default '' check (char_length(nombre) <= 120),
  escuela      text not null default '' check (char_length(escuela) <= 160),
  estado       text not null default 'activa' check (estado in ('pendiente', 'activa', 'suspendida')),
  creado_en    timestamptz not null default now(),
  estado_desde timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Aulas: los grupos de cada maestra ("4° B"). Persisten de una clase a otra.
-- ---------------------------------------------------------------------
create table public.aulas (
  id            uuid primary key default gen_random_uuid(),
  docente_id    uuid not null default auth.uid() references public.docentes (id) on delete restrict,
  nombre        text not null check (char_length(nombre) between 1 and 80),
  grado         smallint check (grado between 1 and 6),
  codigo        text not null unique default public.generar_codigo_aula()
                  check (codigo ~ '^[A-HJ-NP-Z2-9]{4}$'),
  creada_en     timestamptz not null default now(),
  archivada_en  timestamptz
);
create index aulas_docente on public.aulas (docente_id);

-- ---------------------------------------------------------------------
-- Alumnos: cuentas anónimas. id = usuario de Supabase Auth creado por el
-- servidor (app_metadata.rol = 'alumno'). La clave vive SOLO en Supabase Auth
-- (con hash); esta tabla nunca guarda claves.
-- ---------------------------------------------------------------------
create table public.alumnos (
  id              uuid primary key references auth.users (id) on delete cascade,
  aula_id         uuid not null references public.aulas (id) on delete restrict,
  numero          smallint not null check (numero between 1 and 60),
  usuario         text not null unique check (usuario ~ '^[A-HJ-NP-Z2-9]{4}-[0-9]{2}$'),
  apodo           text check (char_length(apodo) <= 40),
  color           text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  ultimo_ingreso  timestamptz,
  unique (aula_id, numero)
);
create index alumnos_aula on public.alumnos (aula_id);

-- ---------------------------------------------------------------------
-- Asignaciones: una actividad que la maestra le da a un aula, con sus
-- opciones (ej. ambientes de A1). Se puede hacer en clase o en casa.
-- ---------------------------------------------------------------------
create table public.asignaciones (
  id           uuid primary key default gen_random_uuid(),
  aula_id      uuid not null references public.aulas (id) on delete restrict,
  actividad    text not null check (actividad in ('a1', 'a2', 'a3', 'a4')),
  opciones     jsonb not null default '{}'::jsonb check (octet_length(opciones::text) <= 8192),
  desbloqueos  jsonb not null default '{}'::jsonb check (octet_length(desbloqueos::text) <= 4096),
  estado       text not null default 'activa' check (estado in ('borrador', 'activa', 'cerrada')),
  creada_en    timestamptz not null default now(),
  cerrada_en   timestamptz,
  -- para que progreso y sesiones no puedan mezclar aulas o actividades
  unique (id, aula_id),
  unique (id, aula_id, actividad)
);
create index asignaciones_aula on public.asignaciones (aula_id);

-- ---------------------------------------------------------------------
-- Sesiones en vivo: lo que hoy es la "sala" (esperando, en curso, pausa,
-- puesta en común). Una sola abierta por aula a la vez.
-- ---------------------------------------------------------------------
create table public.sesiones (
  id             uuid primary key default gen_random_uuid(),
  asignacion_id  uuid not null,
  aula_id        uuid not null,
  estado         text not null default 'esperando' check (estado in ('esperando', 'en-curso', 'puesta', 'cerrada')),
  pausada        boolean not null default false,
  desbloqueos    jsonb not null default '{}'::jsonb check (octet_length(desbloqueos::text) <= 4096),
  iniciada_en    timestamptz not null default now(),
  cerrada_en     timestamptz,
  foreign key (asignacion_id, aula_id) references public.asignaciones (id, aula_id) on delete restrict
);
create unique index sesiones_una_abierta_por_aula on public.sesiones (aula_id) where estado <> 'cerrada';

-- ---------------------------------------------------------------------
-- Progreso: dónde quedó cada niño en cada asignación. Es lo que permite
-- seguir desde otra computadora. `datos` = lo que guarda la actividad
-- (mismo objeto que hoy guarda useProgreso).
-- ---------------------------------------------------------------------
create table public.progreso (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null default auth.uid() references public.alumnos (id) on delete cascade,
  asignacion_id  uuid not null,
  aula_id        uuid not null,
  actividad      text not null,
  etapa          text not null check (char_length(etapa) <= 40),
  datos          jsonb not null default '{}'::jsonb check (octet_length(datos::text) <= 65536),
  etapa_desde    timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  completada_en  timestamptz,
  unique (alumno_id, asignacion_id),
  foreign key (asignacion_id, aula_id, actividad) references public.asignaciones (id, aula_id, actividad) on delete restrict
);
create index progreso_asignacion on public.progreso (asignacion_id);

-- ---------------------------------------------------------------------
-- Resultados científicos: registro que no se modifica (cada placa
-- incubada, cada corrida de la molécula, cada captura del microscopio).
-- Sirven para la puesta en común y para ver la evolución del grupo.
-- ---------------------------------------------------------------------
create table public.resultados (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null default auth.uid() references public.alumnos (id) on delete cascade,
  asignacion_id  uuid not null,
  aula_id        uuid not null,
  actividad      text not null,
  sesion_id      uuid references public.sesiones (id) on delete set null,
  tipo           text not null check (tipo ~ '^[a-z0-9-]{1,40}$'),
  valor          jsonb not null check (octet_length(valor::text) <= 16384),
  creado_en      timestamptz not null default now(),
  foreign key (asignacion_id, aula_id, actividad) references public.asignaciones (id, aula_id, actividad) on delete restrict
);
create index resultados_asignacion on public.resultados (asignacion_id);
create index resultados_alumno on public.resultados (alumno_id);

-- ---------------------------------------------------------------------
-- Intentos de ingreso de alumnos (protección contra adivinar claves).
-- Solo la usa el servidor; nadie más tiene permiso.
-- ---------------------------------------------------------------------
create table public.intentos_ingreso (
  usuario         text primary key,
  fallos          smallint not null default 0,
  bloqueado_hasta timestamptz,
  actualizado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Fechas automáticas
-- ---------------------------------------------------------------------
create function public.tocar_progreso() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  if new.etapa is distinct from old.etapa then
    new.etapa_desde := now();
  end if;
  return new;
end;
$$;
create trigger progreso_tocar before update on public.progreso
  for each row execute function public.tocar_progreso();

-- ---------------------------------------------------------------------
-- Alta automática de docentes: todo usuario nuevo que NO sea alumno
-- (los alumnos los crea el servidor con app_metadata.rol = 'alumno')
-- ni anónimo (si alguna vez se prende el ingreso anónimo de Supabase, esos
-- usuarios no tienen que volverse maestras).
-- ---------------------------------------------------------------------
create function public.crear_docente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'rol', '') <> 'alumno'
     and not coalesce(new.is_anonymous, false) then
    insert into public.docentes (id, nombre)
      values (new.id, coalesce(left(new.raw_user_meta_data ->> 'nombre', 120), ''))
      on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_docente();
