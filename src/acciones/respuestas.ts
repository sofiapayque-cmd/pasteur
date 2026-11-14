'use server';

import { refresh } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { miembroCon } from '@/datos/equipo';
import { pedidasHoy, preguntasDeActividad } from '@/datos/respuestas';
import { iaConfigurada } from '@/lib/ia/openai';
import { separarPreguntas } from '@/lib/ia/redaccion';
import { proponer, responderPregunta, type Resultado } from '@/lib/ia/redactar';

/*
  ACCIONES DEL TABLERO DE RESPUESTAS (Server Actions del equipo).
  · Pedir respuestas: la IA busca, redacta y manda a revisión (ver
    src/lib/ia/redactar.ts). Hasta 4 preguntas por vez y 120 por persona
    cada 24 horas, para cuidar el presupuesto.
  · Ideas de preguntas: la IA propone; no se guarda nada.
*/
export type EstadoPedido = { mensaje: string; ok?: boolean; resultados?: Resultado[] };
export type EstadoIdeas = { mensaje: string; ok?: boolean; preguntas?: string[] };

const POR_VEZ = 4;
// 120 desde el 14/11/2026 (antes 40): pedido de Sofia para pedir de una vez
// el lote de 100 preguntas. El gasto lo sigue cuidando el límite mensual de OpenAI.
const POR_DIA = 120;
const SIN_PERMISO = { mensaje: 'No tenés permiso para hacer eso.' };
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const actividadDe = (f: FormData) => {
  const a = leer(f, 'actividad');
  return /^a[1-4]$/.test(a) ? a : null;
};

/** De a dos a la vez: no saturar OpenAlex ni Europe PMC. */
async function deADos<T, R>(items: T[], fn: (t: T) => Promise<R>): Promise<R[]> {
  const salida: R[] = new Array(items.length);
  let siguiente = 0;
  await Promise.all(
    [0, 1].map(async () => {
      while (siguiente < items.length) {
        const i = siguiente++;
        salida[i] = await fn(items[i]);
      }
    }),
  );
  return salida;
}

export async function pedirRespuestas(_previo: EstadoPedido, datos: FormData): Promise<EstadoPedido> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor (SUPABASE_SECRET_KEY).' };
  const { preguntas, sobran } = separarPreguntas(leer(datos, 'preguntas'), POR_VEZ);
  if (!preguntas.length) return { mensaje: 'Escribí al menos una pregunta (una por renglón).' };
  const hoy = await pedidasHoy(yo.id);
  if (hoy + preguntas.length > POR_DIA) return { mensaje: `Ya pediste ${hoy} respuestas en las últimas 24 horas (el máximo es ${POR_DIA}). Probá mañana.` };

  const db = (await crearClienteServidor())!;
  const contexto = { db, admin, actorId: yo.id, actividad: actividadDe(datos) };
  console.info(`[ia] ${yo.id} pidió ${preguntas.length} respuesta(s)`);
  const resultados = await deADos(preguntas, async (p) => {
    try {
      return await responderPregunta(contexto, p);
    } catch (e) {
      console.error('[ia] error inesperado:', e instanceof Error ? e.message : e);
      return { pregunta: p, ok: false, mensaje: 'Algo falló sin aviso. Probá de nuevo con esta pregunta.' } satisfies Resultado;
    }
  });
  const uso = resultados.reduce((t, r) => ({ entrada: t.entrada + (r.uso?.entrada ?? 0), salida: t.salida + (r.uso?.salida ?? 0) }), { entrada: 0, salida: 0 });
  console.info(`[ia] tokens: ${uso.entrada} de entrada, ${uso.salida} de salida`);
  refresh();
  const listas = resultados.filter((r) => r.enRevision).length;
  return {
    ok: listas > 0,
    resultados,
    mensaje:
      (listas === resultados.length
        ? `Listo: ${listas === 1 ? 'la respuesta está esperando' : `las ${listas} respuestas están esperando`} revisión.`
        : `${listas} de ${resultados.length} quedaron esperando revisión. Abajo está qué pasó con cada una.`) +
      (sobran ? ` Quedaron ${sobran} preguntas sin pedir (hasta ${POR_VEZ} por vez).` : ''),
  };
}

export async function ideasDePreguntas(_previo: EstadoIdeas, datos: FormData): Promise<EstadoIdeas> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  const actividad = actividadDe(datos);
  if (!actividad) return { mensaje: 'Elegí la actividad.' };
  const enfoque = leer(datos, 'enfoque').replace(/\s+/g, ' ').slice(0, 200);
  const r = await proponer(actividad, enfoque, await preguntasDeActividad(actividad));
  if (r.error) return { mensaje: `No se pudieron pedir ideas: ${r.error}.` };
  if (!r.preguntas.length) return { mensaje: 'No salieron ideas nuevas. Probá con otro enfoque.' };
  return { ok: true, preguntas: r.preguntas, mensaje: 'Elegí las que te sirvan y agregalas a la lista.' };
}

// ---------------------------------------------------------------------
// Preguntas de las clases sin respuesta (las anota el asistente)
// ---------------------------------------------------------------------
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La IA redacta las elegidas (hasta 4) y quedan "pedidas", unidas a su ficha. */
export async function redactarPendientes(_previo: EstadoPedido, datos: FormData): Promise<EstadoPedido> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor (SUPABASE_SECRET_KEY).' };
  const ids = [...new Set(datos.getAll('id').map(String).filter((x) => UUID.test(x)))].slice(0, POR_VEZ);
  if (!ids.length) return { mensaje: 'Elegí al menos una pregunta.' };
  const hoy = await pedidasHoy(yo.id);
  if (hoy + ids.length > POR_DIA) return { mensaje: `Ya pediste ${hoy} respuestas en las últimas 24 horas (el máximo es ${POR_DIA}). Probá mañana.` };

  const db = (await crearClienteServidor())!;
  const { data: filas } = await db.from('preguntas_sin_respuesta').select('id, texto, actividad').in('id', ids).eq('estado', 'pendiente');
  if (!filas?.length) return { mensaje: 'Esas preguntas ya no están pendientes.' };
  console.info(`[ia] ${yo.id} pidió ${filas.length} respuesta(s) de preguntas de clases`);
  type Fila = { id: string; texto: string; actividad: string | null };
  const resultados = await deADos<Fila, Resultado>(filas as Fila[], async (f) => {
    try {
      const r = await responderPregunta({ db, admin, actorId: yo.id, actividad: f.actividad }, f.texto);
      if (r.fichaId) await db.from('preguntas_sin_respuesta').update({ estado: 'pedida', ficha_id: r.fichaId }).eq('id', f.id);
      return r;
    } catch (e) {
      console.error('[ia] error inesperado:', e instanceof Error ? e.message : e);
      return { pregunta: f.texto, ok: false, mensaje: 'Algo falló sin aviso. Probá de nuevo con esta pregunta.' } satisfies Resultado;
    }
  });
  refresh();
  const listas = resultados.filter((r) => r.enRevision).length;
  return {
    ok: listas > 0,
    resultados,
    mensaje: listas === resultados.length ? 'Listo: están esperando revisión.' : `${listas} de ${resultados.length} quedaron esperando revisión. Abajo está qué pasó con cada una.`,
  };
}

export async function descartarPregunta(id: string): Promise<void> {
  const yo = await miembroCon();
  if (!yo || !UUID.test(id)) return;
  const db = (await crearClienteServidor())!;
  await db.from('preguntas_sin_respuesta').update({ estado: 'descartada' }).eq('id', id);
  refresh();
}
