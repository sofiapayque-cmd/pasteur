-- =====================================================================
-- Migración 19 · Prueba de calidad del asistente para la clase
--
-- El equipo corre, desde /equipo/asistente, un set fijo de preguntas contra
-- la búsqueda real (la misma que ve la maestra): formas de preguntar de los
-- chicos, con faltas y sin tildes, preguntas "trampa" del mismo tema con
-- otra respuesta, y preguntas de otros temas. Cada resultado queda guardado
-- para ver si la búsqueda acierta y calibrar los umbrales con datos reales.
--
-- Son preguntas escritas por el equipo (no de clases): no hay datos de
-- maestras ni de chicos. Escribe solo el servidor (después de verificar que
-- quien la corre es del equipo); el equipo puede leer.
-- No toca nada existente.
-- =====================================================================
create table public.pruebas_asistente (
  id           uuid primary key default gen_random_uuid(),
  corrida      uuid not null,
  orden        smallint not null default 0 check (orden >= 0),
  creada_en    timestamptz not null default now(),
  pedida_por   uuid references public.equipo (id) on delete set null,
  grupo        text not null check (grupo in ('variante', 'trampa', 'otro_tema')),
  consulta     text not null check (char_length(consulta) between 1 and 300),
  -- Pregunta de referencia del caso y la ficha aprobada que le corresponde (null = ninguna debería mostrarse como "la misma")
  ancla        text check (char_length(ancla) <= 300),
  esperada_id  uuid references public.fichas (id) on delete set null,
  resultado    text not null check (resultado in ('respuesta', 'parecidas', 'nada', 'error')),
  mostrada_id  uuid references public.fichas (id) on delete set null,
  parecidas    uuid[] not null default '{}' check (cardinality(parecidas) <= 5),
  similitud    real,
  eleccion     smallint,
  -- correcta: no mostró como "la misma" una respuesta equivocada. encontrada: (si había una esperada) apareció directa o entre las parecidas
  correcta     boolean not null,
  encontrada   boolean,
  detalle      jsonb not null default '{}'::jsonb check (jsonb_typeof(detalle) = 'object' and octet_length(detalle::text) <= 8000)
);
create index pruebas_asistente_corrida on public.pruebas_asistente (corrida);
create index pruebas_asistente_creada on public.pruebas_asistente (creada_en desc);

alter table public.pruebas_asistente enable row level security;
revoke all on public.pruebas_asistente from public, anon, authenticated;
create policy "pruebas del asistente: el equipo ve" on public.pruebas_asistente
  for select to authenticated using ((select privado.es_equipo()));
grant select on public.pruebas_asistente to authenticated;
grant select, insert on public.pruebas_asistente to service_role; -- solo se agregan resultados
