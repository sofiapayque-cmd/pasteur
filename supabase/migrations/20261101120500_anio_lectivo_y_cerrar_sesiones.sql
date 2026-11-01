-- =====================================================================
-- Migración 6 · Etapa 3: año lectivo del aula y cierre de sesiones de un alumno
--
-- 1. aulas.anio_lectivo: el año lectivo (2026). Se completa solo con el año
--    actual de Uruguay; la maestra lo puede cambiar. El "año escolar"
--    (1° a 6°) sigue siendo aulas.grado. Sirve para ordenar las aulas y,
--    más adelante, para decidir qué se hace con los datos al terminar el año.
--
-- 2. public.cerrar_sesiones_alumno(id): cuando la maestra genera una clave
--    nueva para un alumno (tarjeta perdida u olvidada), el servidor cierra
--    las sesiones que ese alumno tenía abiertas, para que la tarjeta vieja
--    deje de servir también en las computadoras donde ya se usó.
--    · Solo service_role (la clave secreta, en el servidor) la puede llamar.
--    · Solo afecta cuentas de ALUMNOS (no sirve contra una maestra).
--    · Borra filas de auth.sessions (y Supabase borra solas sus
--      refresh_tokens): son sesiones, no datos. El alumno vuelve a entrar
--      con la clave nueva y sigue con todo su progreso.
--
-- No borra ni cambia datos existentes.
-- =====================================================================

alter table public.aulas
  add column anio_lectivo smallint not null
    default (extract(year from (now() at time zone 'America/Montevideo')))::smallint
    check (anio_lectivo between 2024 and 2100);

grant insert (anio_lectivo) on public.aulas to authenticated;
grant update (anio_lectivo) on public.aulas to authenticated;

create function public.cerrar_sesiones_alumno(p_alumno uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  cerradas integer;
begin
  if not exists (select 1 from public.alumnos a where a.id = p_alumno) then
    return 0;  -- solo cuentas de alumnos
  end if;
  delete from auth.sessions s where s.user_id = p_alumno;
  get diagnostics cerradas = row_count;
  return cerradas;
end;
$$;

revoke all on function public.cerrar_sesiones_alumno(uuid) from public, anon, authenticated;
grant execute on function public.cerrar_sesiones_alumno(uuid) to service_role;
