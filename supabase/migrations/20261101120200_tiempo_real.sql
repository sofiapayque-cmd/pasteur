-- =====================================================================
-- Migración 3/3 · Tiempo real
-- La maestra ve el tablero moverse (progreso) y los niños ven la pausa y la
-- puesta en común (sesiones). Realtime respeta las reglas RLS.
-- =====================================================================
alter publication supabase_realtime add table public.sesiones, public.progreso;
