'use server';

import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { miembroCon } from '@/datos/equipo';
import { indexarTemas } from '@/datos/curiosidades';
import { actualizarCuriosidades } from '@/datos/curiosidadesAutomaticas';
import { iaConfigurada } from '@/lib/ia/openai';
import { slugDe } from '@/lib/equipo/comun';

import { TEMAS_INICIALES } from '@/lib/curiosidades/temasIniciales';
import { esUuid, leer } from '@/lib/formularios';

/*
  ACCIONES DE CURIOSIDADES (panel del equipo, /equipo/curiosidades).
  Cada una vuelve a comprobar quién la llama. Lo que se escribe en temas y
  fichas va con la sesión del miembro (deciden las reglas de la base); la
  clave secreta solo se usa para lo que es del servidor (embeddings de temas,
  mover el conteo de una pregunta sin tema), después de comprobar.
  · Cargar los temas iniciales (admin, una vez).
  · Crear un tema (admin).
  · Ubicar en un tema una pregunta que no se parecía a ninguno, o descartarla.
  · Curiosidades automáticas (15/11): actualizar ahora (admin) y ocultar una
    (admin o validadora). Ver src/datos/curiosidadesAutomaticas.ts.
*/
export type EstadoCuriosidades = { mensaje: string; ok?: boolean };

const SIN_PERMISO = { mensaje: 'No tenés permiso para hacer eso.' };

export async function cargarTemasIniciales(): Promise<EstadoCuriosidades> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  const db = (await crearClienteServidor())!;
  const { data: hay } = await db.from('temas').select('slug');
  const existentes = new Set(((hay ?? []) as { slug: string }[]).map((t) => t.slug));
  const nuevos = TEMAS_INICIALES.filter((t) => !existentes.has(t.slug)).map((t, i) => ({ ...t, orden: i }));
  if (!nuevos.length) return { mensaje: 'Los temas iniciales ya estaban cargados.' };
  const { error } = await db.from('temas').insert(nuevos);
  if (error) return { mensaje: `No se pudieron cargar: ${error.message}` };
  const admin = crearClienteAdmin();
  if (admin) await indexarTemas(admin);
  refresh();
  return { ok: true, mensaje: `Listo: ${nuevos.length} temas cargados. Ya pueden contar preguntas y recibir curiosidades.` };
}

export async function crearTema(_previo: EstadoCuriosidades, datos: FormData): Promise<EstadoCuriosidades> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  const nombre = leer(datos, 'nombre').slice(0, 80);
  const descripcion = leer(datos, 'descripcion').slice(0, 600);
  const act = leer(datos, 'actividad');
  if (nombre.length < 3) return { mensaje: 'Escribí el nombre del tema.' };
  if (descripcion.length < 10) return { mensaje: 'Escribí una descripción: con ella se reconoce qué preguntas son de este tema.' };
  const db = (await crearClienteServidor())!;
  const { error } = await db.from('temas').insert({ slug: slugDe(nombre).slice(0, 60) || 'tema', nombre, descripcion, actividad: /^a[1-3]$/.test(act) ? act : null });
  if (error) return { mensaje: /duplicate/i.test(error.message) ? 'Ya hay un tema con ese nombre.' : `No se pudo crear: ${error.message}` };
  const admin = crearClienteAdmin();
  if (admin) await indexarTemas(admin);
  refresh();
  return { ok: true, mensaje: `Tema "${nombre}" creado.` };
}

export async function ubicarConsulta(id: string, temaId: string): Promise<EstadoCuriosidades> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (!esUuid(id) || !esUuid(temaId)) return { mensaje: 'Elegí un tema.' };
  // Primero con la sesión del miembro: si no la puede ver, no es suya para mover
  const db = (await crearClienteServidor())!;
  const { data: fila } = await db.from('preguntas_pendientes').select('id').eq('id', id).gt('veces_sin_tema', 0).maybeSingle();
  if (!fila) return { mensaje: 'Esa pregunta ya no está.' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor.' };
  const { data: ok, error } = await admin.rpc('ubicar_consulta_sin_tema', { p_id: id, p_tema: temaId });
  if (error || !ok) return { mensaje: 'No se pudo ubicar (¿el tema está apagado?).' };
  refresh();
  return { ok: true, mensaje: 'Listo: la pregunta ahora cuenta para ese tema.' };
}

export async function descartarConsulta(id: string): Promise<EstadoCuriosidades> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (!esUuid(id)) return { mensaje: 'Esa pregunta ya no está.' };
  // Igual que ubicar: primero con la sesión del miembro, después el servidor.
  // Si a la pregunta todavía le falta respuesta, sigue en esa lista.
  const db = (await crearClienteServidor())!;
  const { data: fila } = await db.from('preguntas_pendientes').select('id').eq('id', id).gt('veces_sin_tema', 0).maybeSingle();
  if (!fila) return { mensaje: 'Esa pregunta ya no está.' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor.' };
  const { data: ok, error } = await admin.rpc('descartar_sin_tema', { p_id: id });
  if (error || !ok) return { mensaje: 'No se pudo descartar.' };
  refresh();
  return { ok: true, mensaje: 'Descartada.' };
}

// ---------------------------------------------------------------------
// Curiosidades automáticas (migración 23, pedido de Sofia del 15/11)
// ---------------------------------------------------------------------

/** Hace ahora lo que el trabajo diario hace solo (temas nuevos, curiosidades de las aprobadas). Admin. */
export async function actualizarCuriosidadesAhora(): Promise<EstadoCuriosidades> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor (SUPABASE_SECRET_KEY).' };
  const i = await actualizarCuriosidades(admin);
  refresh();
  const partes = [
    i.respuestasMiradas ? `Miré ${i.respuestasMiradas} ${i.respuestasMiradas === 1 ? 'respuesta aprobada' : 'respuestas aprobadas'} y saqué ${i.curiosidadesNuevas} ${i.curiosidadesNuevas === 1 ? 'curiosidad' : 'curiosidades'}.` : 'No había respuestas aprobadas nuevas para mirar.',
    i.temasNuevos.length ? `Temas nuevos: ${i.temasNuevos.join(', ')}.` : '',
    i.errores.length ? `Quedaron ${i.errores.length} sin hacer (se reintentan mañana).` : '',
  ];
  return { ok: i.errores.length === 0, mensaje: partes.filter(Boolean).join(' ') };
}

/** Ocultar (o volver a mostrar) una curiosidad automática. Admin o validadora. */
export async function ocultarCuriosidadAuto(id: string, oculta: boolean): Promise<EstadoCuriosidades> {
  const yo = await miembroCon();
  if (!yo || (yo.rol !== 'admin' && yo.rol !== 'validador')) return SIN_PERMISO;
  if (!esUuid(id)) return SIN_PERMISO;
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor.' };
  const { error } = await admin.from('curiosidades_auto').update({ oculta: Boolean(oculta) }).eq('id', id);
  if (error) return { mensaje: 'No se pudo cambiar.' };
  console.info(`[curiosidades] ${yo.id} ${oculta ? 'ocultó' : 'volvió a mostrar'} la automática ${id}`);
  refresh();
  return { ok: true, mensaje: oculta ? 'Oculta: no se muestra más.' : 'Se vuelve a mostrar.' };
}
