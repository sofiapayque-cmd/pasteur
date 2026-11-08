-- =====================================================================
-- Migración 18 · PubMed en la biblioteca científica
--
-- Pedido de Sofia (6/11/2026), por recomendación de la validadora: PubMed es
-- la base que usan las investigadoras del Instituto. Pasa a ser la fuente
-- principal de la búsqueda y de la IA que redacta (OpenAlex y Europe PMC
-- quedan de respaldo). Los registros de PubMed llegan por las E-utilities
-- de NCBI (esearch + efetch), solo metadatos y resumen, nunca texto completo.
--
--   1. PubMed se suma como proveedor (es una fila: así lo previó la 13).
--   2. El resumen guardado puede venir de PubMed (resumen_origen).
--   3. guardar_registro(): PubMed manda en el resumen y en los términos MeSH,
--      igual que Europe PMC (son los mismos de MEDLINE). OpenAlex sigue
--      mandando en título, año, tipo, revista, autores y citas. Es la MISMA
--      función de la migración 13 con solo esos dos cambios (tres líneas).
--
-- No borra ni cambia datos: las publicaciones que ya están quedan igual.
-- =====================================================================

-- 1. Proveedor
insert into public.proveedores_cientificos (id, nombre, url_base, url_terminos, limites) values
  ('pubmed', 'PubMed', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
   'https://www.ncbi.nlm.nih.gov/home/about/policies/',
   '{"consultas_por_segundo_sin_clave": 3, "consultas_por_segundo_con_clave": 10, "por_pagina_max": 50}');

-- 2. De dónde viene el resumen (se amplía la lista; nada que ya esté guardado deja de cumplirla)
alter table public.publicaciones
  drop constraint publicaciones_resumen_origen_check,
  add constraint publicaciones_resumen_origen_check check (resumen_origen in ('europepmc', 'openalex', 'pubmed'));

-- 3. Alta de un registro: PubMed manda en resumen y MeSH (ver la migración 13)
create or replace function public.guardar_registro(p_registro jsonb, p_ejecucion uuid default null, p_actor uuid default null)
returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_proveedor   text := p_registro ->> 'proveedor';
  v_id_externo  text := left(btrim(coalesce(p_registro ->> 'id_externo', '')), 200);
  v_ids         jsonb := case jsonb_typeof(p_registro -> 'identificadores') when 'object' then p_registro -> 'identificadores' else '{}'::jsonb end;
  v_titulo      text := left(btrim(regexp_replace(coalesce(p_registro ->> 'titulo', ''), '[[:cntrl:]]+', ' ', 'g')), 1000);
  v_anio        smallint;
  v_tipo        text := case when p_registro ->> 'tipo' in ('articulo', 'revision', 'preprint', 'otro') then p_registro ->> 'tipo' else 'otro' end;
  v_revista     text := left(btrim(regexp_replace(coalesce(p_registro ->> 'revista', ''), '[[:cntrl:]]+', ' ', 'g')), 300);
  v_idioma      text := left(btrim(coalesce(p_registro ->> 'idioma', '')), 10);
  v_autores     jsonb;
  v_temas       jsonb;
  v_mesh        text[];
  v_citas       int := case when coalesce(p_registro ->> 'citas', '') ~ '^[0-9]{1,9}$' then (p_registro ->> 'citas')::int end;
  v_oa          text := left(btrim(coalesce(p_registro ->> 'oa_estado', '')), 20);
  v_resumen     text := nullif(left(btrim(regexp_replace(coalesce(p_registro ->> 'resumen', ''), '[[:cntrl:]]+', ' ', 'g')), 10000), '');
  v_retractada  boolean := coalesce(p_registro ->> 'retractada', '') = 'true';
  v_instituto   boolean := coalesce(p_registro ->> 'del_instituto', '') = 'true';
  v_crudo_json  jsonb := coalesce(p_registro -> 'crudo', '{}'::jsonb);
  manda         boolean := (p_registro ->> 'proveedor') = 'openalex';
  tipos         text[] := '{}';
  valores       text[] := '{}';
  coincidencias uuid[];
  posibles      uuid[] := '{}';
  v_pub         uuid;
  v_nueva       boolean := false;
  p             public.publicaciones;
  p2            public.publicaciones;
  abierta       boolean;
  campos        text[];
  v_crudo       uuid;
  k             text;
  val           text;
  norm          text;
begin
  if not exists (select 1 from public.proveedores_cientificos pc where pc.id = v_proveedor and pc.activo) then
    raise exception 'proveedor desconocido o apagado: %', v_proveedor using errcode = '22023';
  end if;
  if p_actor is not null and not exists (select 1 from public.equipo e where e.id = p_actor and e.estado = 'activa') then
    raise exception 'quien agrega tiene que ser del equipo' using errcode = '42501';
  end if;
  if v_id_externo = '' then
    raise exception 'falta el id del proveedor' using errcode = '22023';
  end if;
  if v_titulo = '' then
    raise exception 'falta el título' using errcode = '22023';
  end if;
  if coalesce(p_registro ->> 'anio', '') ~ '^[0-9]{4}$' and (p_registro ->> 'anio')::int between 1800 and 2100 then
    v_anio := (p_registro ->> 'anio')::smallint;
  end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'nombre', left(a ->> 'nombre', 200), 'apellido', left(a ->> 'apellido', 120), 'orcid', left(a ->> 'orcid', 40)))
         order by o), '[]'::jsonb)
    into v_autores
    from jsonb_array_elements(case jsonb_typeof(p_registro -> 'autores') when 'array' then p_registro -> 'autores' else '[]'::jsonb end)
         with ordinality as x(a, o)
   where o <= 50 and jsonb_typeof(a) = 'object';
  select coalesce(jsonb_agg(left(t, 120) order by o), '[]'::jsonb)
    into v_temas
    from jsonb_array_elements_text(case jsonb_typeof(p_registro -> 'temas') when 'array' then p_registro -> 'temas' else '[]'::jsonb end)
         with ordinality as x(t, o)
   where o <= 20;
  select coalesce(array_agg(left(m, 120) order by o), '{}')
    into v_mesh
    from jsonb_array_elements_text(case jsonb_typeof(p_registro -> 'mesh') when 'array' then p_registro -> 'mesh' else '[]'::jsonb end)
         with ordinality as x(m, o)
   where o <= 60;
  if octet_length(v_crudo_json::text) > 500000 then
    v_crudo_json := '{"omitido": "registro demasiado grande"}'::jsonb;
  end if;

  -- Identificadores normalizados (los que no tienen forma válida se ignoran)
  for k, val in select key, value from jsonb_each_text(v_ids) loop
    norm := privado.normalizar_identificador(k, val);
    if norm is not null then
      tipos := tipos || k;
      valores := valores || norm;
    end if;
  end loop;
  if cardinality(tipos) = 0 then
    raise exception 'el registro no trae ningún identificador válido' using errcode = '22023';
  end if;

  -- Un bloqueo por identificador, siempre en el mismo orden
  perform pg_advisory_xact_lock(hashtextextended(u.t || ':' || u.v, 0))
     from unnest(tipos, valores) as u(t, v) order by u.t, u.v;

  select coalesce(array_agg(distinct pi.publicacion_id), '{}') into coincidencias
    from public.publicacion_identificadores pi
    join unnest(tipos, valores) as u(t, v) on pi.tipo = u.t and pi.valor = u.v;

  if cardinality(coincidencias) = 0 then
    -- ¿Hay un título casi igual? (preprint y versión publicada, por ejemplo)
    select coalesce(array_agg(x.id), '{}') into posibles
      from public.publicaciones x
     where extensions.similarity(x.titulo_normalizado, privado.normalizar_titulo(v_titulo)) >= 0.9
       and (v_anio is null or x.anio is null or abs(x.anio - v_anio) <= 1)
       and (coalesce(x.primer_autor, '') = '' or coalesce(v_autores -> 0 ->> 'apellido', '') = ''
            or x.primer_autor = privado.normalizar(v_autores -> 0 ->> 'apellido'));

    insert into public.publicaciones (titulo, anio, tipo, revista, idioma, autores, temas_externos, mesh, citas,
                                      oa_estado, retractada, del_instituto, resumen_interno, resumen_origen, agregada_por)
    values (v_titulo, v_anio, v_tipo, v_revista, v_idioma, v_autores, v_temas, v_mesh, coalesce(v_citas, 0),
            v_oa, v_retractada, v_instituto, v_resumen, case when v_resumen is not null then v_proveedor end, p_actor)
    returning * into p2;
    v_pub := p2.id;
    v_nueva := true;
    campos := array_remove(array[
      'titulo',
      case when v_anio is not null then 'anio' end,
      case when v_tipo <> 'otro' then 'tipo' end,
      case when v_revista <> '' then 'revista' end,
      case when jsonb_array_length(v_autores) > 0 then 'autores' end,
      case when jsonb_array_length(v_temas) > 0 then 'temas_externos' end,
      case when cardinality(v_mesh) > 0 then 'mesh' end,
      case when v_citas is not null then 'citas' end,
      case when v_resumen is not null then 'resumen_interno' end,
      case when v_retractada then 'retractada' end,
      case when v_instituto then 'del_instituto' end], null);

    insert into public.publicacion_relaciones (origen_id, destino_id, tipo, motivo)
    select v_pub, x, 'posible_duplicado', 'título casi igual' from unnest(posibles) as x
    on conflict do nothing;
  else
    select * into p from public.publicaciones x
     where x.id = any (coincidencias) order by x.creada_en, x.id limit 1 for update;
    v_pub := p.id;
    posibles := array_remove(coincidencias, v_pub);
    abierta := p.estado in ('candidata', 'en_revision');

    update public.publicaciones x set
      titulo   = case when abierta and manda then v_titulo else x.titulo end,
      anio     = case when not abierta then x.anio when manda then coalesce(v_anio, x.anio) else coalesce(x.anio, v_anio) end,
      tipo     = case when not abierta then x.tipo
                      when v_proveedor = 'europepmc' and v_tipo = 'preprint' then 'preprint'
                      when manda and v_tipo <> 'otro' then v_tipo
                      when x.tipo = 'otro' then v_tipo
                      else x.tipo end,
      revista  = case when abierta and ((manda and v_revista <> '') or x.revista = '') then v_revista else x.revista end,
      autores  = case when abierta and ((manda and jsonb_array_length(v_autores) > 0) or jsonb_array_length(x.autores) = 0)
                      then v_autores else x.autores end,
      idioma   = case when (manda and v_idioma <> '') or x.idioma = '' then v_idioma else x.idioma end,
      temas_externos = case when (manda and jsonb_array_length(v_temas) > 0) or jsonb_array_length(x.temas_externos) = 0
                            then v_temas else x.temas_externos end,
      mesh     = case when (v_proveedor in ('europepmc', 'pubmed') and cardinality(v_mesh) > 0) or cardinality(x.mesh) = 0 then v_mesh else x.mesh end,
      citas    = case when manda and v_citas is not null then v_citas when x.citas = 0 then coalesce(v_citas, 0) else x.citas end,
      oa_estado = case when (manda and v_oa <> '') or x.oa_estado = '' then v_oa else x.oa_estado end,
      retractada = x.retractada or v_retractada,
      del_instituto = x.del_instituto or v_instituto,
      resumen_interno = case when x.estado = 'rechazada' or v_resumen is null then x.resumen_interno
                             when v_proveedor in ('europepmc', 'pubmed') or x.resumen_interno is null then v_resumen
                             else x.resumen_interno end,
      resumen_origen  = case when x.estado = 'rechazada' or v_resumen is null then x.resumen_origen
                             when v_proveedor in ('europepmc', 'pubmed') or x.resumen_interno is null then v_proveedor
                             else x.resumen_origen end
     where x.id = v_pub
    returning * into p2;

    campos := array_remove(array[
      case when p2.titulo is distinct from p.titulo then 'titulo' end,
      case when p2.anio is distinct from p.anio then 'anio' end,
      case when p2.tipo is distinct from p.tipo then 'tipo' end,
      case when p2.revista is distinct from p.revista then 'revista' end,
      case when p2.autores is distinct from p.autores then 'autores' end,
      case when p2.temas_externos is distinct from p.temas_externos then 'temas_externos' end,
      case when p2.mesh is distinct from p.mesh then 'mesh' end,
      case when p2.citas is distinct from p.citas then 'citas' end,
      case when p2.resumen_interno is distinct from p.resumen_interno then 'resumen_interno' end,
      case when p2.retractada is distinct from p.retractada then 'retractada' end,
      case when p2.del_instituto is distinct from p.del_instituto then 'del_instituto' end], null);

    insert into public.publicacion_relaciones (origen_id, destino_id, tipo, motivo)
    select v_pub, x, 'posible_duplicado', 'comparten un identificador' from unnest(posibles) as x
    on conflict do nothing;
  end if;

  -- Identificadores nuevos (los que ya son de otra publicación no se mueven)
  insert into public.publicacion_identificadores (publicacion_id, tipo, valor)
  select v_pub, u.t, u.v from unnest(tipos, valores) as u(t, v)
  on conflict (tipo, valor) do nothing;

  -- Registro crudo y procedencia
  insert into public.registros_crudos (proveedor, id_externo, ejecucion_id, payload, huella)
  values (v_proveedor, v_id_externo, p_ejecucion, v_crudo_json,
          encode(sha256(convert_to(v_crudo_json::text, 'UTF8')), 'hex'))
  on conflict (proveedor, id_externo, huella)
    do update set obtenido_en = now(), expira_en = now() + interval '90 days'
  returning id into v_crudo;

  insert into public.publicacion_procedencias (publicacion_id, proveedor, id_externo, registro_crudo_id, ejecucion_id, campos_aportados)
  values (v_pub, v_proveedor, v_id_externo, v_crudo, p_ejecucion, coalesce(campos, '{}'));

  -- Enlaces (solo se guardan; nadie los visita desde el servidor)
  insert into public.publicacion_accesos (publicacion_id, tipo, url, version, es_oa, licencia_texto, proveedor)
  select v_pub, a ->> 'tipo', a ->> 'url', left(coalesce(a ->> 'version', ''), 40),
         coalesce(a ->> 'es_oa', '') = 'true', left(coalesce(a ->> 'licencia', ''), 200), v_proveedor
    from jsonb_array_elements(case jsonb_typeof(p_registro -> 'accesos') when 'array' then p_registro -> 'accesos' else '[]'::jsonb end)
         with ordinality as x(a, o)
   where o <= 20 and jsonb_typeof(a) = 'object'
     and a ->> 'tipo' in ('pagina', 'pdf', 'xml')
     and coalesce(a ->> 'url', '') ~ '^https?://[^[:space:]]+$' and char_length(a ->> 'url') <= 1000
  on conflict (publicacion_id, url) do nothing;

  return jsonb_build_object('publicacion_id', v_pub, 'nueva', v_nueva,
                            'estado', (select x.estado from public.publicaciones x where x.id = v_pub),
                            'posibles_duplicados', to_jsonb(posibles));
end;
$$;
