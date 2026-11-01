-- =====================================================================
-- Migración 5 · La maestra puede ver el aula que acaba de crear
--
-- Problema (encontrado el 1/11 con una cuenta real en el proyecto dev):
-- al crear un aula pidiendo la fila de vuelta (INSERT … RETURNING, que es lo
-- que hace supabase-js con .insert().select() para mostrar el código),
-- Postgres exige que la fila nueva cumpla también la regla de LECTURA.
-- Esa regla preguntaba es_docente_de_aula(id), que busca el aula en la tabla…
-- y dentro de la misma sentencia el aula todavía no se ve. Resultado:
-- "new row violates row-level security policy". Sin RETURNING funcionaba,
-- por eso las pruebas no lo detectaban.
--
-- Arreglo: las reglas de lectura y edición de aulas miran las columnas de la
-- propia fila (docente_id = quien llama y maestra activa), que es la misma
-- condición sin volver a buscar el aula. ALTER POLICY cambia la regla en el
-- lugar: no borra nada.
-- =====================================================================
alter policy "aulas: la maestra ve las suyas" on public.aulas
  using (docente_id = (select auth.uid()) and (select privado.es_docente()));

alter policy "aulas: la maestra edita las suyas" on public.aulas
  using (docente_id = (select auth.uid()) and (select privado.es_docente()))
  with check (docente_id = (select auth.uid()) and (select privado.es_docente()));
