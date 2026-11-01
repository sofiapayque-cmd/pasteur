-- =====================================================================
-- Migración 2/3 · Seguridad: funciones de ayuda, reglas RLS y permisos.
--
-- Modelo:
--   · anon (sin sesión): ningún permiso sobre ninguna tabla.
--   · authenticated: maestras y alumnos. Las reglas distinguen por TABLAS
--     (está en docentes / está en alumnos y activo), no por datos que manda el
--     navegador. Desactivar a un alumno le corta el acceso enseguida.
--   · service_role (clave secreta, solo en el servidor de Vercel): crea las
--     cuentas de los alumnos, cambia sus claves y registra intentos de ingreso.
--
-- El proyecto se crea con "Automatically expose new tables" desactivado:
-- cada permiso se da acá, uno por uno.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones de ayuda (security definer: leen las tablas sin pasar por las
-- reglas, así las reglas no se llaman entre sí en bucle)
-- ---------------------------------------------------------------------
create function public.es_docente() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.docentes d where d.id = auth.uid());
$$;

create function public.es_docente_de_aula(p_aula uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.aulas a
    where a.id = p_aula and a.docente_id = auth.uid()
  );
$$;

-- El aula del alumno con sesión (null si no es alumno o está desactivado)
create function public.mi_aula() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.aula_id from public.alumnos a where a.id = auth.uid() and a.activo;
$$;

-- ¿La asignación está abierta para trabajar? (activa y el aula sin archivar)
create function public.asignacion_abierta(p_asignacion uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.asignaciones s join public.aulas a on a.id = s.aula_id
    where s.id = p_asignacion and s.estado = 'activa' and a.archivada_en is null
  );
$$;

revoke execute on function public.es_docente(), public.es_docente_de_aula(uuid), public.mi_aula(),
  public.asignacion_abierta(uuid), public.generar_codigo_aula() from public, anon;
grant execute on function public.es_docente(), public.es_docente_de_aula(uuid), public.mi_aula(),
  public.asignacion_abierta(uuid), public.generar_codigo_aula() to authenticated;
revoke execute on function public.crear_docente(), public.tocar_progreso() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table public.docentes         enable row level security;
alter table public.aulas            enable row level security;
alter table public.alumnos          enable row level security;
alter table public.asignaciones     enable row level security;
alter table public.sesiones         enable row level security;
alter table public.progreso         enable row level security;
alter table public.resultados       enable row level security;
alter table public.intentos_ingreso enable row level security;  -- sin reglas: solo service_role

-- Partimos de cero: nadie tiene nada
revoke all on public.docentes, public.aulas, public.alumnos, public.asignaciones,
  public.sesiones, public.progreso, public.resultados, public.intentos_ingreso
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- Docentes: cada maestra ve y edita solo su fila (se crea con el trigger)
-- ---------------------------------------------------------------------
create policy "docente: ve su fila" on public.docentes
  for select to authenticated using (id = (select auth.uid()));
create policy "docente: edita su fila" on public.docentes
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.docentes to authenticated;
grant update (nombre, escuela) on public.docentes to authenticated;

-- ---------------------------------------------------------------------
-- Aulas: la maestra dueña crea, ve y edita (archiva); el alumno ve la suya
-- ---------------------------------------------------------------------
create policy "aulas: la maestra ve las suyas" on public.aulas
  for select to authenticated using (docente_id = (select auth.uid()));
create policy "aulas: la maestra crea" on public.aulas
  for insert to authenticated with check (docente_id = (select auth.uid()) and (select public.es_docente()));
create policy "aulas: la maestra edita las suyas" on public.aulas
  for update to authenticated using (docente_id = (select auth.uid())) with check (docente_id = (select auth.uid()));
create policy "aulas: el alumno ve la suya" on public.aulas
  for select to authenticated using (id = (select public.mi_aula()));
grant select on public.aulas to authenticated;
grant insert (nombre, grado) on public.aulas to authenticated;
grant update (nombre, grado, archivada_en) on public.aulas to authenticated;

-- ---------------------------------------------------------------------
-- Alumnos: los crea SOLO el servidor. La maestra ve y activa/desactiva los
-- de sus aulas; el alumno ve su fila y elige apodo y color.
-- ---------------------------------------------------------------------
create policy "alumnos: la maestra ve los de sus aulas" on public.alumnos
  for select to authenticated using ((select public.es_docente_de_aula(aula_id)));
create policy "alumnos: la maestra edita los de sus aulas" on public.alumnos
  for update to authenticated using ((select public.es_docente_de_aula(aula_id)))
  with check ((select public.es_docente_de_aula(aula_id)));
create policy "alumnos: el alumno ve su fila" on public.alumnos
  for select to authenticated using (id = (select auth.uid()));
-- activo en el using y en el check: un alumno desactivado no puede reactivarse
create policy "alumnos: el alumno edita apodo y color" on public.alumnos
  for update to authenticated using (id = (select auth.uid()) and activo)
  with check (id = (select auth.uid()) and activo);
grant select on public.alumnos to authenticated;
grant update (apodo, color, activo) on public.alumnos to authenticated;

-- ---------------------------------------------------------------------
-- Asignaciones: la maestra dueña del aula; el alumno ve las publicadas de su aula
-- ---------------------------------------------------------------------
create policy "asignaciones: la maestra ve" on public.asignaciones
  for select to authenticated using ((select public.es_docente_de_aula(aula_id)));
create policy "asignaciones: la maestra crea" on public.asignaciones
  for insert to authenticated with check ((select public.es_docente_de_aula(aula_id)));
create policy "asignaciones: la maestra edita" on public.asignaciones
  for update to authenticated using ((select public.es_docente_de_aula(aula_id)))
  with check ((select public.es_docente_de_aula(aula_id)));
create policy "asignaciones: el alumno ve las de su aula" on public.asignaciones
  for select to authenticated using (aula_id = (select public.mi_aula()) and estado <> 'borrador');
grant select on public.asignaciones to authenticated;
grant insert (aula_id, actividad, opciones, desbloqueos, estado) on public.asignaciones to authenticated;
grant update (opciones, desbloqueos, estado, cerrada_en) on public.asignaciones to authenticated;

-- ---------------------------------------------------------------------
-- Sesiones en vivo: la maestra las maneja; el alumno las ve (pausa, puesta)
-- ---------------------------------------------------------------------
create policy "sesiones: la maestra ve" on public.sesiones
  for select to authenticated using ((select public.es_docente_de_aula(aula_id)));
create policy "sesiones: la maestra abre" on public.sesiones
  for insert to authenticated with check ((select public.es_docente_de_aula(aula_id)));
create policy "sesiones: la maestra maneja" on public.sesiones
  for update to authenticated using ((select public.es_docente_de_aula(aula_id)))
  with check ((select public.es_docente_de_aula(aula_id)));
create policy "sesiones: el alumno ve la de su aula" on public.sesiones
  for select to authenticated using (aula_id = (select public.mi_aula()));
grant select on public.sesiones to authenticated;
grant insert (asignacion_id, aula_id, estado, desbloqueos) on public.sesiones to authenticated;
grant update (estado, pausada, desbloqueos, cerrada_en) on public.sesiones to authenticated;

-- ---------------------------------------------------------------------
-- Progreso: el alumno guarda el suyo (solo en asignaciones abiertas de su
-- aula); la maestra ve el de sus aulas.
-- ---------------------------------------------------------------------
create policy "progreso: el alumno ve el suyo" on public.progreso
  for select to authenticated using (alumno_id = (select auth.uid()));
create policy "progreso: el alumno empieza" on public.progreso
  for insert to authenticated with check (
    alumno_id = (select auth.uid())
    and aula_id = (select public.mi_aula())
    and (select public.asignacion_abierta(asignacion_id))
  );
create policy "progreso: el alumno guarda" on public.progreso
  for update to authenticated
  using (alumno_id = (select auth.uid()) and aula_id = (select public.mi_aula()))
  with check (
    alumno_id = (select auth.uid())
    and aula_id = (select public.mi_aula())
    and (select public.asignacion_abierta(asignacion_id))
  );
create policy "progreso: la maestra ve el de sus aulas" on public.progreso
  for select to authenticated using ((select public.es_docente_de_aula(aula_id)));
grant select on public.progreso to authenticated;
grant insert (asignacion_id, aula_id, actividad, etapa, datos) on public.progreso to authenticated;
grant update (etapa, datos, completada_en) on public.progreso to authenticated;

-- ---------------------------------------------------------------------
-- Resultados: el alumno agrega los suyos (no los cambia ni borra);
-- la maestra ve los de sus aulas.
-- ---------------------------------------------------------------------
create policy "resultados: el alumno ve los suyos" on public.resultados
  for select to authenticated using (alumno_id = (select auth.uid()));
create policy "resultados: el alumno agrega" on public.resultados
  for insert to authenticated with check (
    alumno_id = (select auth.uid())
    and aula_id = (select public.mi_aula())
    and (select public.asignacion_abierta(asignacion_id))
  );
create policy "resultados: la maestra ve los de sus aulas" on public.resultados
  for select to authenticated using ((select public.es_docente_de_aula(aula_id)));
grant select on public.resultados to authenticated;
grant insert (asignacion_id, aula_id, actividad, sesion_id, tipo, valor) on public.resultados to authenticated;

-- ---------------------------------------------------------------------
-- service_role (clave secreta, solo servidor): lo que necesita y nada más
-- (en Supabase ya salta las reglas RLS; acá se le dan los permisos de tabla)
-- ---------------------------------------------------------------------
grant select on public.aulas, public.docentes to service_role;
grant select, insert, update on public.alumnos to service_role;
grant select, insert, update, delete on public.intentos_ingreso to service_role;
