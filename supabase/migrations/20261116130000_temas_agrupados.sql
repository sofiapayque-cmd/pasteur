-- =====================================================================
-- Migración 24 · Temas más grandes (pedido de Sofia, 15/11/2026: "se
-- deberían agrupar mejor los temas, dudo que haya 40; si son de bacterias,
-- todas deberían estar en un tema")
--
-- Los 40 temas iniciales del 14/11 pasan a 6 temas grandes, dos por
-- actividad. Medido el 15/11 con las 75 respuestas aprobadas de la web
-- real: 74 caen en el mismo grupo que con los 40 temas.
--
-- Solo cambia datos (no tablas): crea los 6 temas, pasa a ellos todo lo que
-- apuntaba a los 40 (fichas, conteos, artículos y búsquedas) y borra los 40.
-- Las curiosidades automáticas (migración 23, va antes) recalculan su tema
-- solas en la próxima actualización. El embedding de los temas nuevos lo
-- calcula el servidor la primera vez que hace falta.
-- Los temas que agregó el equipo o que se armaron solos no se tocan.
-- =====================================================================

insert into public.temas (slug, nombre, descripcion, actividad, orden)
values
  ('bacterias', 'Bacterias', 'Qué son las bacterias y los microorganismos, cómo viven, se multiplican y se cultivan en placas, su ADN y en qué se diferencian de los hongos. Dónde viven: en el suelo y el campo, en la Antártida y otros lugares extremos, en la panza de la vaca, en los pingüinos, en nuestro cuerpo (el microbioma) y en alimentos como el yogur.', 'a1', 1),
  ('antibioticos-y-resistencia', 'Antibióticos', 'Qué son los antibióticos, de dónde salen (bacterias y hongos como el de la penicilina), cómo frenan a las bacterias, por qué no sirven contra los virus y cómo algunas bacterias se vuelven resistentes.', 'a1', 2),
  ('virus', 'Virus, dengue y zika', 'Qué es un virus y si está vivo, cómo entra a una célula y se copia. El dengue y el zika, su proteína E, el mosquito Aedes aegypti que los lleva, y las defensas del cuerpo: anticuerpos y vacunas.', 'a2', 3),
  ('proteinas-y-moleculas', 'Proteínas y moléculas', 'Qué son las moléculas, las proteínas y los aminoácidos, cómo se doblan y por qué su forma importa. Las enzimas, qué les pasa con el calor o el ácido, y cómo los científicos descubren su forma y las simulan en la computadora.', 'a2', 4),
  ('celulas', 'Células', 'Qué es una célula, su tamaño y sus partes (membrana, núcleo, mitocondrias), dónde guarda el ADN, cómo se divide y se mueve, cómo se cultivan células en el laboratorio y cómo son las células de las plantas (pared, cloroplastos, estomas).', 'a3', 5),
  ('microscopios-y-luz', 'Microscopios y luz', 'Cómo funcionan los microscopios y en qué se diferencian de una lupa, los microscopios especiales (electrónico, confocal, de fluorescencia), por qué se tiñen las células y cómo se miden, la historia del microscopio, la fluorescencia y los seres vivos que brillan, como luciérnagas y medusas.', 'a3', 6)
on conflict (slug) do nothing;

create temporary table temas_mapa (viejo text primary key, nuevo text not null);
insert into temas_mapa (viejo, nuevo) values
  ('que-es-una-bacteria', 'bacterias'),
  ('bacterias-del-suelo', 'bacterias'),
  ('el-suelo-del-campo', 'bacterias'),
  ('vida-en-la-antartida', 'bacterias'),
  ('lugares-extremos', 'bacterias'),
  ('bacterias-de-la-vaca', 'bacterias'),
  ('pinguinos', 'bacterias'),
  ('microbioma', 'bacterias'),
  ('bacterias-y-hongos', 'bacterias'),
  ('cultivar-bacterias', 'bacterias'),
  ('como-se-multiplican', 'bacterias'),
  ('adn-de-bacterias', 'bacterias'),
  ('bacterias-del-yogur', 'bacterias'),
  ('antibioticos', 'antibioticos-y-resistencia'),
  ('resistencia-a-antibioticos', 'antibioticos-y-resistencia'),
  ('que-es-un-virus', 'virus'),
  ('dengue', 'virus'),
  ('zika', 'virus'),
  ('mosquitos', 'virus'),
  ('defensas-del-cuerpo', 'virus'),
  ('moleculas', 'proteinas-y-moleculas'),
  ('proteinas', 'proteinas-y-moleculas'),
  ('forma-de-las-proteinas', 'proteinas-y-moleculas'),
  ('enzimas', 'proteinas-y-moleculas'),
  ('calor-y-acidez', 'proteinas-y-moleculas'),
  ('simular-moleculas', 'proteinas-y-moleculas'),
  ('ver-lo-muy-chiquito', 'proteinas-y-moleculas'),
  ('que-es-una-celula', 'celulas'),
  ('adentro-de-la-celula', 'celulas'),
  ('adn', 'celulas'),
  ('como-se-divide-una-celula', 'celulas'),
  ('celulas-que-se-mueven', 'celulas'),
  ('cultivar-celulas', 'celulas'),
  ('celulas-de-las-plantas', 'celulas'),
  ('microscopios', 'microscopios-y-luz'),
  ('microscopios-especiales', 'microscopios-y-luz'),
  ('historia-del-microscopio', 'microscopios-y-luz'),
  ('colorear-y-medir-celulas', 'microscopios-y-luz'),
  ('fluorescencia', 'microscopios-y-luz'),
  ('seres-vivos-que-brillan', 'microscopios-y-luz');

-- Fichas (curiosidades escritas a mano)
update public.fichas f set tema_id = tn.id
  from temas_mapa m
  join public.temas tv on tv.slug = m.viejo
  join public.temas tn on tn.slug = m.nuevo
 where f.tema_id = tv.id;

-- Conteos por tema y día: se suman en el tema nuevo
insert into public.consultas_tema as c (tema_id, dia, origen, veces)
select tn.id, ct.dia, ct.origen, sum(ct.veces)
  from public.consultas_tema ct
  join public.temas tv on tv.id = ct.tema_id
  join temas_mapa m on m.viejo = tv.slug
  join public.temas tn on tn.slug = m.nuevo
 group by tn.id, ct.dia, ct.origen
on conflict (tema_id, dia, origen) do update set veces = c.veces + excluded.veces;

-- Artículos marcados con un tema
insert into public.publicacion_temas (publicacion_id, tema_id, agregado_por)
select pt.publicacion_id, tn.id, pt.agregado_por
  from public.publicacion_temas pt
  join public.temas tv on tv.id = pt.tema_id
  join temas_mapa m on m.viejo = tv.slug
  join public.temas tn on tn.slug = m.nuevo
on conflict do nothing;

-- Búsquedas guardadas de la biblioteca
update public.busquedas_guardadas b set tema_id = tn.id
  from temas_mapa m
  join public.temas tv on tv.slug = m.viejo
  join public.temas tn on tn.slug = m.nuevo
 where b.tema_id = tv.id;

-- Subtemas (por ejemplo, armados solos) de un tema viejo: pasan al nuevo
update public.temas t set padre_id = tn.id
  from temas_mapa m
  join public.temas tv on tv.slug = m.viejo
  join public.temas tn on tn.slug = m.nuevo
 where t.padre_id = tv.id;

-- Curiosidades automáticas: su tema se recalcula en la próxima actualización
update public.curiosidades_auto set tema_id = null, similitud = null
 where tema_id in (select tv.id from public.temas tv join temas_mapa m on m.viejo = tv.slug);

-- Los 40 temas viejos (sus conteos y marcas de artículos se borran con ellos)
delete from public.temas t using temas_mapa m where t.slug = m.viejo and m.viejo <> m.nuevo;

drop table temas_mapa;
