-- =====================================================================
-- Migración 21 · Timer de la clase en vivo (etapa 3 de "Ajustes de
-- producto", pedido de Sofia del 8/11/2026)
--
-- La maestra puede ponerle una duración a la clase en vivo (es opcional)
-- y manejar el tiempo: iniciar, pausar, seguir, extender y finalizar.
--
-- 1. Columnas nuevas en sesiones. Todas tienen valor por defecto: las
--    clases que ya existen quedan "sin tiempo", exactamente como hoy.
--    El tiempo lo lleva la base, siempre con su propia hora (now()):
--      · corriendo → tiempo_fin (a qué hora termina)
--      · listo o pausado → tiempo_restante (cuántos segundos faltan)
--    Así todas las pantallas ven lo mismo y nada se pierde al recargar.
--    Una clase "corriendo" cuyo tiempo_fin ya pasó cuenta como terminada.
-- 2. public.mover_tiempo(sesión, maestra, acción, segundos): la ÚNICA forma
--    de cambiar el tiempo. Solo la llama el servidor (service_role), después
--    de comprobar quién es la maestra; la función lo vuelve a comprobar
--    (la sesión tiene que ser de un aula de esa maestra, activa).
--    Las maestras no pueden escribir esas columnas directamente.
-- 3. Cierre: "flexible" por defecto (al terminar el tiempo los chicos
--    pueden seguir guardando). "Cierre definitivo" lo elige la maestra:
--    cierra la tarea, y el bloqueo que ya existe impide guardar más.
--
-- No borra ni cambia nada existente. Para volver atrás alcanza con borrar
-- la función y las columnas nuevas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columnas del tiempo
-- ---------------------------------------------------------------------
alter table public.sesiones
  add column tiempo_estado       text not null default 'sin'
    check (tiempo_estado in ('sin', 'listo', 'corriendo', 'pausado', 'terminado')),
  add column tiempo_duracion     integer check (tiempo_duracion between 60 and 14400),
  add column tiempo_fin          timestamptz,
  add column tiempo_restante     integer check (tiempo_restante between 0 and 14400),
  add column tiempo_terminado_en timestamptz,
  add column cierre              text not null default 'flexible' check (cierre in ('flexible', 'definitivo'));

-- Cada estado guarda justo lo que necesita (nunca dos relojes a la vez)
alter table public.sesiones add constraint sesiones_tiempo_coherente check (
  (tiempo_estado = 'sin'       and tiempo_duracion is null and tiempo_fin is null and tiempo_restante is null and tiempo_terminado_en is null)
  or (tiempo_estado in ('listo', 'pausado') and tiempo_duracion is not null and tiempo_fin is null and tiempo_restante is not null and tiempo_terminado_en is null)
  or (tiempo_estado = 'corriendo' and tiempo_duracion is not null and tiempo_fin is not null and tiempo_restante is null and tiempo_terminado_en is null)
  or (tiempo_estado = 'terminado' and tiempo_duracion is not null and tiempo_fin is null and tiempo_restante is null and tiempo_terminado_en is not null)
);

-- Las maestras siguen pudiendo cambiar solo estado, pausada, desbloqueos y
-- cerrada_en (migración 2). Las columnas del tiempo NO se agregan a ese
-- permiso: se cambian solo con la función de abajo.

-- ---------------------------------------------------------------------
-- 2. La función del tiempo (solo el servidor)
-- ---------------------------------------------------------------------
-- Acciones:
--   poner      (segundos 60–14400)  sin o listo → listo
--   quitar                          listo → sin
--   iniciar                         listo → corriendo
--   pausar                          corriendo → pausado (o terminado, si ya se pasó)
--   seguir                          pausado → corriendo
--   extender   (segundos 60–3600)   listo, corriendo, pausado o terminado (flexible) → suma tiempo
--   finalizar                       listo, corriendo o pausado → terminado
--   definitivo                      cierre definitivo: termina el tiempo y cierra la tarea
-- Devuelve las columnas del tiempo y la hora de la base ("ahora"), para
-- que cada pantalla corrija la diferencia con su propio reloj.
create function public.mover_tiempo(p_sesion uuid, p_docente uuid, p_accion text, p_segundos integer default null)
returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  s        public.sesiones%rowtype;
  ahora    timestamptz := now();
  faltan   integer;
  v_estado text;
begin
  -- La sesión tiene que ser de un aula de esa maestra, y la maestra estar activa
  select se.* into s
    from public.sesiones se
    join public.aulas a on a.id = se.aula_id
    join public.docentes d on d.id = a.docente_id
   where se.id = p_sesion and a.docente_id = p_docente and d.estado = 'activa'
   for update of se;
  if not found then
    raise exception 'sesión inexistente o ajena' using errcode = '42501';
  end if;
  if s.estado = 'cerrada' then
    raise exception 'la clase ya está cerrada' using errcode = '22023';
  end if;

  -- Una clase corriendo cuyo fin ya pasó está, en realidad, terminada
  v_estado := s.tiempo_estado;
  if v_estado = 'corriendo' and s.tiempo_fin <= ahora then
    s.tiempo_estado := 'terminado';
    s.tiempo_terminado_en := s.tiempo_fin;
    s.tiempo_fin := null;
    v_estado := 'terminado';
  end if;

  case p_accion
    when 'poner' then
      if v_estado not in ('sin', 'listo') then raise exception 'el tiempo ya empezó' using errcode = '22023'; end if;
      if p_segundos is null or p_segundos not between 60 and 14400 then raise exception 'duración fuera de rango' using errcode = '22023'; end if;
      s.tiempo_estado := 'listo'; s.tiempo_duracion := p_segundos; s.tiempo_restante := p_segundos;
    when 'quitar' then
      if v_estado <> 'listo' then raise exception 'solo se quita antes de empezar' using errcode = '22023'; end if;
      s.tiempo_estado := 'sin'; s.tiempo_duracion := null; s.tiempo_restante := null;
    when 'iniciar' then
      if v_estado <> 'listo' then raise exception 'no hay tiempo para iniciar' using errcode = '22023'; end if;
      s.tiempo_estado := 'corriendo'; s.tiempo_fin := ahora + make_interval(secs => s.tiempo_restante); s.tiempo_restante := null;
    when 'pausar' then
      if v_estado = 'terminado' then
        null;  -- ya se había terminado: queda terminado
      elsif v_estado <> 'corriendo' then
        raise exception 'el tiempo no está corriendo' using errcode = '22023';
      else
        faltan := greatest(0, ceil(extract(epoch from (s.tiempo_fin - ahora)))::integer);
        s.tiempo_estado := 'pausado'; s.tiempo_restante := faltan; s.tiempo_fin := null;
      end if;
    when 'seguir' then
      if v_estado <> 'pausado' then raise exception 'el tiempo no está en pausa' using errcode = '22023'; end if;
      s.tiempo_estado := 'corriendo'; s.tiempo_fin := ahora + make_interval(secs => s.tiempo_restante); s.tiempo_restante := null;
    when 'extender' then
      if p_segundos is null or p_segundos not between 60 and 3600 then raise exception 'extensión fuera de rango' using errcode = '22023'; end if;
      if v_estado = 'sin' then raise exception 'no hay tiempo para extender' using errcode = '22023'; end if;
      if v_estado = 'terminado' and s.cierre = 'definitivo' then raise exception 'la clase tiene cierre definitivo' using errcode = '22023'; end if;
      if s.tiempo_duracion + p_segundos > 14400 then raise exception 'la clase no puede pasar de 4 horas' using errcode = '22023'; end if;
      s.tiempo_duracion := s.tiempo_duracion + p_segundos;
      if v_estado in ('listo', 'pausado') then
        s.tiempo_restante := s.tiempo_restante + p_segundos;
      elsif v_estado = 'corriendo' then
        s.tiempo_fin := s.tiempo_fin + make_interval(secs => p_segundos);
      else  -- terminado con cierre flexible: vuelve a correr desde ahora
        s.tiempo_estado := 'corriendo'; s.tiempo_fin := ahora + make_interval(secs => p_segundos); s.tiempo_terminado_en := null;
      end if;
    when 'finalizar' then
      if v_estado = 'sin' then raise exception 'no hay tiempo para finalizar' using errcode = '22023'; end if;
      if v_estado <> 'terminado' then
        s.tiempo_estado := 'terminado'; s.tiempo_terminado_en := ahora; s.tiempo_fin := null; s.tiempo_restante := null;
      end if;
    when 'definitivo' then
      if v_estado = 'sin' then
        null;  -- sin tiempo: solo se cierra la tarea
      elsif v_estado <> 'terminado' then
        s.tiempo_estado := 'terminado'; s.tiempo_terminado_en := ahora; s.tiempo_fin := null; s.tiempo_restante := null;
      end if;
      s.cierre := 'definitivo';
      update public.asignaciones set estado = 'cerrada', cerrada_en = ahora
       where id = s.asignacion_id and aula_id = s.aula_id and estado = 'activa';
    else
      raise exception 'acción desconocida' using errcode = '22023';
  end case;

  update public.sesiones
     set tiempo_estado = s.tiempo_estado, tiempo_duracion = s.tiempo_duracion, tiempo_fin = s.tiempo_fin,
         tiempo_restante = s.tiempo_restante, tiempo_terminado_en = s.tiempo_terminado_en, cierre = s.cierre
   where id = s.id;

  return jsonb_build_object(
    'tiempo_estado', s.tiempo_estado, 'tiempo_duracion', s.tiempo_duracion, 'tiempo_fin', s.tiempo_fin,
    'tiempo_restante', s.tiempo_restante, 'tiempo_terminado_en', s.tiempo_terminado_en, 'cierre', s.cierre,
    'ahora', ahora);
end;
$$;

revoke all on function public.mover_tiempo(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.mover_tiempo(uuid, uuid, text, integer) to service_role;

-- El servidor (service_role) parte sin permisos sobre sesiones y tareas
-- (migración 2: "lo que necesita y nada más"). La función corre con sus
-- permisos, así que se le da justo lo que usa: leer la clase, escribir las
-- columnas del tiempo y cerrar la tarea en el cierre definitivo.
grant select on public.sesiones to service_role;
grant update (tiempo_estado, tiempo_duracion, tiempo_fin, tiempo_restante, tiempo_terminado_en, cierre) on public.sesiones to service_role;
grant select (id, aula_id, estado) on public.asignaciones to service_role;
grant update (estado, cerrada_en) on public.asignaciones to service_role;
