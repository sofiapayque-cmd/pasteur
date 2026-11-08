-- =====================================================================
-- Migración 7 · Una cuenta de alumno nunca puede ser maestra
--
-- Las cuentas de los niños las crea el servidor con la API de Supabase Auth
-- (app_metadata.rol = 'alumno'). Supabase podría guardar el usuario y
-- recién después agregarle el app_metadata: en ese instante el trigger que
-- da de alta a las maestras vería un usuario "sin rol" y le crearía una fila
-- en docentes como maestra ACTIVA. Dos capas para que eso no pueda pasar:
--
-- 1. El trigger también reconoce a los alumnos por su mail interno
--    (…@alumnos.invalid), que Supabase guarda desde el primer momento.
-- 2. es_docente() y es_docente_de_aula() exigen además que la sesión no sea
--    de un alumno (app_metadata.rol del token, que el usuario no puede
--    cambiar). Aunque existiera una fila de docente para un alumno, las
--    reglas no le darían nada.
--
-- CREATE OR REPLACE: mismas funciones, mismos permisos. No borra nada.
-- =====================================================================

create or replace function public.crear_docente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'rol', '') <> 'alumno'
     and not coalesce(new.is_anonymous, false)
     and lower(coalesce(new.email, '')) not like '%@alumnos.invalid' then
    insert into public.docentes (id, nombre)
      values (new.id, coalesce(left(new.raw_user_meta_data ->> 'nombre', 120), ''))
      on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function privado.es_docente() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') <> 'alumno'
     and exists (select 1 from public.docentes d where d.id = auth.uid() and d.estado = 'activa');
$$;

create or replace function privado.es_docente_de_aula(p_aula uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') <> 'alumno'
     and exists (
       select 1 from public.aulas a join public.docentes d on d.id = a.docente_id
       where a.id = p_aula and a.docente_id = auth.uid() and d.estado = 'activa'
     );
$$;
