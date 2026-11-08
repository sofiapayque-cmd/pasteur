-- =====================================================================
-- Migración 16 · Ingreso de los alumnos (etapa 4 de aulas)
--
-- El niño entra con el código del aula, su número y su clave. El ingreso lo
-- hace el SERVIDOR (clave secreta, con la IP real del niño). Para que nadie
-- pueda probar claves sin fin contra una cuenta, antes de cada intento el
-- servidor pide permiso acá:
--
--   · hasta 5 intentos seguidos por usuario; el 6.º lo bloquea 10 minutos;
--   · un ingreso correcto borra la cuenta de intentos (lo hace el servidor);
--   · pasados 10 minutos sin intentos, la cuenta vuelve a empezar;
--   · la maestra, al darle una clave nueva, también la borra (ya lo hacía).
--
-- Se cuentan los INTENTOS (no solo los fallos) y la cuenta se hace con la fila
-- bloqueada: aunque lleguen 30 intentos a la vez para el mismo usuario, pasan
-- 5. Un intento que Supabase frena por exceso de pedidos se devuelve.
--
-- Usa la tabla intentos_ingreso (migración 1; RLS sin reglas: solo el
-- servidor). Las funciones son SECURITY INVOKER y solo las ejecuta
-- service_role: para cualquier otro no existen. No toca nada existente.
-- =====================================================================

create function public.reservar_intento_ingreso(p_usuario text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  f public.intentos_ingreso;
begin
  if p_usuario is null or p_usuario !~ '^[A-HJ-NP-Z2-9]{4}-[0-9]{2}$' then
    return false;
  end if;
  insert into public.intentos_ingreso (usuario, fallos, actualizado_en)
  values (p_usuario, 0, now())
  on conflict (usuario) do nothing;
  select * into f from public.intentos_ingreso where usuario = p_usuario for update;

  -- Bloqueado: no se cuenta ni se deja pasar
  if f.bloqueado_hasta > now() then
    return false;
  end if;
  -- Terminó un bloqueo o pasaron 10 minutos sin intentos: empieza de cero
  if f.bloqueado_hasta is not null or f.actualizado_en < now() - interval '10 minutes' then
    f.fallos := 0;
  end if;
  if f.fallos >= 5 then
    update public.intentos_ingreso
       set fallos = 0, bloqueado_hasta = now() + interval '10 minutes', actualizado_en = now()
     where usuario = p_usuario;
    return false;
  end if;
  update public.intentos_ingreso
     set fallos = f.fallos + 1, bloqueado_hasta = null, actualizado_en = now()
   where usuario = p_usuario;
  return true;
end;
$$;

-- Devuelve un intento que no llegó a probar la clave (Supabase frenó el pedido).
create function public.devolver_intento_ingreso(p_usuario text) returns void
language sql security invoker set search_path = '' as $$
  update public.intentos_ingreso
     set fallos = greatest(fallos - 1, 0)
   where usuario = p_usuario and bloqueado_hasta is null;
$$;

revoke all on function public.reservar_intento_ingreso(text), public.devolver_intento_ingreso(text)
  from public, anon, authenticated;
grant execute on function public.reservar_intento_ingreso(text), public.devolver_intento_ingreso(text)
  to service_role;
