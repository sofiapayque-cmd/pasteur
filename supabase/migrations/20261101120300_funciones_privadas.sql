-- =====================================================================
-- Migración 4/4 · Funciones de ayuda fuera de la API
--
-- El asesor de seguridad de Supabase (lint 0029) avisa que las funciones
-- SECURITY DEFINER del esquema public se pueden llamar desde la API
-- (/rest/v1/rpc/…) por cualquier usuario con sesión. Las reglas RLS las
-- necesitan; la API no. La guía de Supabase pide guardarlas en un esquema
-- que la API no publique.
--
-- ALTER FUNCTION … SET SCHEMA mueve la función sin borrarla ni cambiarla:
-- las reglas y el valor por defecto de aulas.codigo la siguen usando igual.
-- No borra nada; se vuelve atrás moviéndolas de nuevo a public.
-- =====================================================================
create schema privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;  -- anon no: sin sesión no se evalúa ninguna regla

alter function public.es_docente()              set schema privado;
alter function public.es_docente_de_aula(uuid)  set schema privado;
alter function public.mi_aula()                 set schema privado;
alter function public.asignacion_abierta(uuid)  set schema privado;
alter function public.generar_codigo_aula()     set schema privado;
