'use server';

import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { miembroCon } from '@/datos/equipo';
import { pedidasHoy } from '@/datos/respuestas';
import { indexarTemas } from '@/datos/curiosidades';
import { iaConfigurada } from '@/lib/ia/openai';
import { slugDe } from '@/lib/equipo/comun';
import { proponerCuriosidad, type Resultado } from '@/lib/ia/redactar';
import { TEMAS_INICIALES } from '@/lib/curiosidades/temasIniciales';

/*
  ACCIONES DE CURIOSIDADES (panel del equipo, /equipo/curiosidades).
  Cada una vuelve a comprobar quién la llama. Lo que se escribe en temas y
  fichas va con la sesión del miembro (deciden las reglas de la base); la
  clave secreta solo se usa para lo que es del servidor (embeddings de temas,
  mover el conteo de una pregunta sin tema), después de comprobar.
  · Cargar los temas iniciales (admin, una vez).
  · Crear un tema (admin).
  · Ubicar en un tema una pregunta que no se parecía a ninguno, o descartarla.
  · Pedirle a la IA borradores de curiosidades para un tema: quedan esperando
    revisión, como las respuestas. Cuentan para el mismo límite diario.
*/
export type EstadoCuriosidades = { mensaje: string; ok?: boolean; resultados?: Resultado[] };

const SIN_PERMISO = { mensaje: 'No tenés permiso para hacer eso.' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POR_TEMA = 3;
const POR_DIA = 120; // el mismo límite que las respuestas (src/acciones/respuestas.ts)
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

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
  const { error } = await db.from('temas').insert({ slug: slugDe(nombre).slice(0, 60) || 'tema', nombre, descripcion, actividad: /^a[1-4]$/.test(act) ? act : null });
  if (error) return { mensaje: /duplicate/i.test(error.message) ? 'Ya hay un tema con ese nombre.' : `No se pudo crear: ${error.message}` };
  const admin = crearClienteAdmin();
  if (admin) await indexarTemas(admin);
  refresh();
  return { ok: true, mensaje: `Tema "${nombre}" creado.` };
}

export async function ubicarConsulta(id: string, temaId: string): Promise<EstadoCuriosidades> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (!UUID.test(id) || !UUID.test(temaId)) return { mensaje: 'Elegí un tema.' };
  // Primero con la sesión del miembro: si no la puede ver, no es suya para mover
  const db = (await crearClienteServidor())!;
  const { data: fila } = await db.from('consultas_sin_tema').select('id').eq('id', id).maybeSingle();
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
  if (!UUID.test(id)) return { mensaje: 'Esa pregunta ya no está.' };
  const db = (await crearClienteServidor())!;
  const { error } = await db.from('consultas_sin_tema').delete().eq('id', id);
  if (error) return { mensaje: 'No se pudo descartar.' };
  refresh();
  return { ok: true, mensaje: 'Descartada.' };
}

export async function pedirCuriosidades(_previo: EstadoCuriosidades, datos: FormData): Promise<EstadoCuriosidades> {
  const yo = await miembroCon('redactor', 'admin');
  if (!yo) return { mensaje: 'Las curiosidades las pide la redactora o la admin, así la validadora las revisa sin autoaprobarse.' };
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor (SUPABASE_SECRET_KEY).' };
  const temaId = leer(datos, 'tema');
  const cuantas = Math.min(Math.max(Number(leer(datos, 'cuantas')) || 2, 1), POR_TEMA);
  if (!UUID.test(temaId)) return { mensaje: 'Elegí un tema.' };
  const hoy = await pedidasHoy(yo.id);
  if (hoy + cuantas > POR_DIA) return { mensaje: `Ya pediste ${hoy} borradores a la IA en las últimas 24 horas (el máximo es ${POR_DIA}). Probá mañana.` };

  const db = (await crearClienteServidor())!;
  const { data: tema } = await db.from('temas').select('id, nombre, descripcion, actividad').eq('id', temaId).eq('activo', true).maybeSingle<{ id: string; nombre: string; descripcion: string; actividad: string | null }>();
  if (!tema) return { mensaje: 'Ese tema no está (o está apagado).' };
  // Las que ya hay del tema (publicadas o no), para no repetirlas
  const { data: previas } = await db.from('fichas').select('ficha_versiones(version_infantil)').eq('tema_id', tema.id).eq('formato', 'dato');
  const existentes = ((previas ?? []) as unknown as { ficha_versiones: { version_infantil: string }[] }[]).flatMap((f) => f.ficha_versiones.map((v) => v.version_infantil)).filter(Boolean);

  const contexto = { db, admin, actorId: yo.id, actividad: tema.actividad };
  console.info(`[ia] ${yo.id} pidió ${cuantas} curiosidad(es) del tema ${tema.id}`);
  const resultados: Resultado[] = [];
  for (let i = 0; i < cuantas; i++) {
    try {
      const r = await proponerCuriosidad(contexto, tema, existentes);
      resultados.push(r);
      if (r.ok && r.fichaId) {
        const { data: v } = await db.from('ficha_versiones').select('version_infantil').eq('ficha_id', r.fichaId).maybeSingle<{ version_infantil: string }>();
        if (v?.version_infantil) existentes.push(v.version_infantil);
      }
    } catch (e) {
      console.error('[ia] curiosidad:', e instanceof Error ? e.message : e);
      resultados.push({ pregunta: tema.nombre, ok: false, mensaje: 'Algo falló sin aviso. Probá de nuevo.' });
    }
  }
  refresh();
  const listas = resultados.filter((r) => r.enRevision).length;
  return {
    ok: listas > 0,
    resultados,
    mensaje: listas ? `Listo: ${listas === 1 ? 'una curiosidad quedó esperando' : `${listas} curiosidades quedaron esperando`} revisión.` : 'No salió ninguna. Abajo está qué pasó.',
  };
}
