-- =====================================================================
-- Migración 15 · Respuestas redactadas con IA
--
-- La IA busca artículos, redacta la respuesta y la manda a revisión; una
-- validadora la aprueba en el tablero "Respuestas". Para eso:
--
--   1. La marca "asistida_por_ia" (migración 9) ya no se puede sacar: una
--      versión que redactó la IA queda marcada así para siempre (tampoco la
--      saca el servidor ni el dueño de la base).
--   2. Una ficha puede ir a revisión citando artículos que también están
--      esperando revisión (antes tenían que estar aprobados). Siguen sin
--      valer los artículos candidatos, rechazados o retirados.
--   3. Aprobar una ficha sigue exigiendo que TODOS sus artículos estén
--      aprobados. Para no hacer dos pasos, public.aprobar_con_articulos()
--      aprueba en una sola transacción los artículos que esperan y la ficha,
--      cada uno con la huella de lo que la validadora tiene en pantalla.
--
-- Toca de lo existente: reemplaza privado.validar_para_revision (migración
-- 13; CREATE OR REPLACE, mismos permisos). El resto se agrega. No borra nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. La marca de IA no se saca
-- ---------------------------------------------------------------------
create function privado.versiones_marca_ia() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.asistida_por_ia and not new.asistida_por_ia then
    raise exception 'una versión redactada con IA queda marcada así' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger versiones_marca_ia before update on public.ficha_versiones
  for each row execute function privado.versiones_marca_ia();

-- ---------------------------------------------------------------------
-- 2. Reemplazo de validar_para_revision (migración 13): los artículos
--    citados pueden estar aprobados o esperando revisión.
-- ---------------------------------------------------------------------
create or replace function privado.validar_para_revision(v public.ficha_versiones) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  formato text;
  limite int;
begin
  select f.formato into formato from public.fichas f where f.id = v.ficha_id;
  limite := case formato when 'pregunta' then 90 else 60 end;
  if formato = 'pregunta' and char_length(btrim(v.pregunta)) < 5 then
    raise exception 'falta la pregunta principal' using errcode = '23514';
  end if;
  if formato = 'pregunta' and char_length(btrim(v.explicacion_cientifica)) < 20 then
    raise exception 'falta la explicación científica' using errcode = '23514';
  end if;
  if char_length(btrim(v.version_infantil)) < 10 then
    raise exception 'falta la versión para chicos' using errcode = '23514';
  end if;
  if privado.palabras(v.version_infantil) > limite then
    raise exception 'la versión para chicos tiene más de % palabras', limite using errcode = '23514';
  end if;
  if not exists (select 1 from public.version_fuentes vf where vf.version_id = v.id) then
    raise exception 'hace falta al menos una fuente para estar en revisión' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf where vf.version_id = v.id and vf.publicacion_id is not null
             and (char_length(btrim(vf.ubicacion)) = 0
                  or (char_length(btrim(vf.pasaje)) = 0 and char_length(btrim(vf.parafrasis)) = 0))) then
    raise exception 'cada artículo citado necesita dónde está y su pasaje o su paráfrasis' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf where vf.version_id = v.id
             and char_length(btrim(vf.pasaje)) > 0 and not vf.pasaje_textual and char_length(btrim(vf.parafrasis)) = 0) then
    raise exception 'un pasaje que no es textual necesita su paráfrasis' using errcode = '23514';
  end if;
  if exists (select 1 from public.version_fuentes vf join public.publicaciones p on p.id = vf.publicacion_id
             where vf.version_id = v.id and p.estado not in ('aprobada', 'en_revision')) then
    raise exception 'cita una publicación que no está aprobada ni esperando revisión: sacala o mandala a revisión'
      using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Aprobar una ficha exige sus artículos aprobados
--    (corre antes que revisiones_revisar: los triggers van en orden
--    alfabético). Si quien revisa no es validadora, deja que revisar() dé
--    ese error.
-- ---------------------------------------------------------------------
create function privado.revision_exige_articulos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.objeto = 'ficha_version' and new.decision = 'aprobar'
     and exists (select 1 from public.equipo e where e.id = new.revisor_id and e.estado = 'activa' and e.rol = 'validador')
     and exists (select 1 from public.version_fuentes vf join public.publicaciones p on p.id = vf.publicacion_id
                 where vf.version_id = new.objeto_id and p.estado <> 'aprobada') then
    raise exception 'la ficha cita artículos que todavía no están aprobados como fuente'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger revisiones_articulos_aprobados before insert on public.revisiones
  for each row execute function privado.revision_exige_articulos();

revoke all on function privado.versiones_marca_ia(), privado.revision_exige_articulos()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Aprobar la ficha y sus artículos de una vez.
-- p_articulos: {"<id de la publicación>": "<huella que se ve en pantalla>"}
-- con cada artículo citado que está esperando revisión.
-- SECURITY INVOKER: corre con la sesión de la validadora, así que valen
-- las mismas reglas (RLS y triggers) que aprobando uno por uno. Si algo
-- falla, no queda nada aprobado.
-- ---------------------------------------------------------------------
create function public.aprobar_con_articulos(p_version uuid, p_huella text, p_articulos jsonb default '{}'::jsonb,
                                             p_comentario text default '')
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  a record;
  h text;
begin
  if not privado.es_validador() then
    raise exception 'solo una validadora activa revisa' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_articulos, '{}'::jsonb)) <> 'object' then
    raise exception 'formato de artículos desconocido' using errcode = '22023';
  end if;
  for a in
    select distinct p.id, p.huella
      from public.version_fuentes vf join public.publicaciones p on p.id = vf.publicacion_id
     where vf.version_id = p_version and p.estado = 'en_revision'
     order by p.id
  loop
    h := p_articulos ->> a.id::text;
    if h is null or h is distinct from a.huella then
      raise exception 'un artículo cambió desde que lo abriste: volvé a cargar la página' using errcode = '40001';
    end if;
    insert into public.revisiones (objeto, objeto_id, decision, comentario, huella_revisada)
    values ('publicacion', a.id, 'aprobar', 'Aprobado junto con la ficha que lo cita', h);
  end loop;
  insert into public.revisiones (objeto, objeto_id, decision, comentario, huella_revisada)
  values ('ficha_version', p_version, 'aprobar', left(coalesce(p_comentario, ''), 2000), p_huella);
end;
$$;
revoke all on function public.aprobar_con_articulos(uuid, text, jsonb, text) from public, anon;
grant execute on function public.aprobar_con_articulos(uuid, text, jsonb, text) to authenticated;
