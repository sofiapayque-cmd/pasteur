'use server';

import { refresh } from 'next/cache';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { miembroCon } from '@/datos/equipo';
import { respuestasConocidas } from '@/datos/pruebaAsistente';
import { embeber, iaConfigurada } from '@/lib/ia/openai';
import { indexarPendientes } from '@/lib/ia/indice';
import { buscarRespuesta } from '@/lib/ia/buscarRespuesta';
import { casos, evaluar, fichaDeAncla, resumir, type Resumen } from '@/lib/ia/pruebaAsistente';

/*
  PRUEBA DEL ASISTENTE (Server Action del equipo).
  Corre todo el set contra la MISMA búsqueda que usa la maestra
  (buscarRespuesta: embeddings + doble control), sin gastar cupos de
  maestras y sin anotar nada en "Preguntas de las clases". Guarda cada
  resultado en pruebas_asistente para mirarlo y calibrar.
  Una corrida por vez (si alguien corrió una hace menos de un minuto, espera).
*/
export type EstadoPrueba = { mensaje: string; ok?: boolean; resumen?: Resumen };

async function enParalelo<T, R>(items: T[], cuantos: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const salida: R[] = new Array(items.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: cuantos }, async () => {
      while (siguiente < items.length) {
        const i = siguiente++;
        salida[i] = await fn(items[i], i);
      }
    }),
  );
  return salida;
}

export async function correrPruebaAsistente(_previo: EstadoPrueba, _datos: FormData): Promise<EstadoPrueba> {
  const yo = await miembroCon();
  if (!yo) return { mensaje: 'No tenés permiso para hacer eso.' };
  if (!iaConfigurada()) return { mensaje: 'Falta la clave de OpenAI en el servidor (OPENAI_API_KEY).' };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'Falta la clave secreta de Supabase en el servidor (SUPABASE_SECRET_KEY).' };

  const { count: recientes } = await admin
    .from('pruebas_asistente')
    .select('id', { count: 'exact', head: true })
    .gte('creada_en', new Date(Date.now() - 60_000).toISOString());
  if (recientes) return { mensaje: 'Hay una prueba de hace menos de un minuto. Esperá un ratito y volvé a correrla.' };

  try {
    await indexarPendientes(admin, 30);
  } catch (e) {
    console.error('[prueba] índice:', e instanceof Error ? e.message : e);
  }
  const { publicadas } = await respuestasConocidas(admin);
  const lista = casos();
  const vectores = await embeber(lista.map((c) => c.consulta));
  if (!vectores) return { mensaje: 'OpenAI no respondió. Probá de nuevo en un rato.' };

  console.info(`[prueba] ${yo.id} corre ${lista.length} casos con ${publicadas.length} respuestas aprobadas`);
  const corrida = crypto.randomUUID();
  const filas = await enParalelo(lista, 6, async (c, i) => {
    const esperadaId = fichaDeAncla(c.ancla, publicadas);
    const b = await buscarRespuesta(admin, c.consulta, vectores[i]).catch((e) => ({
      decision: { tipo: 'nada' as const },
      candidatas: [],
      eleccion: null,
      motivo: '',
      error: e instanceof Error ? e.message : 'falló',
    }));
    const ev = evaluar(esperadaId, b.decision);
    return {
      corrida,
      orden: i,
      pedida_por: yo.id,
      grupo: c.grupo,
      consulta: c.consulta,
      ancla: c.ancla,
      esperada_id: esperadaId,
      resultado: b.error ? 'error' : b.decision.tipo,
      mostrada_id: ev.mostradaId,
      parecidas: ev.parecidas,
      similitud: b.candidatas[0]?.similitud ?? null,
      eleccion: b.eleccion,
      correcta: ev.correcta,
      encontrada: ev.encontrada,
      detalle: {
        candidatas: b.candidatas.map((x) => ({ p: x.pregunta.slice(0, 160), s: Math.round(x.similitud * 1000) / 1000 })),
        motivo: b.motivo,
        ...(b.error ? { error: b.error.slice(0, 200) } : {}),
      },
    };
  });

  const { error } = await admin.from('pruebas_asistente').insert(filas);
  if (error) {
    console.error('[prueba] guardar:', error.code, error.message);
    return { mensaje: 'La prueba corrió pero no se pudo guardar. Probá de nuevo.' };
  }
  const r = resumir(filas);
  console.info(`[prueba] ${r.equivocadas} equivocadas · ${r.encontradas}/${r.conRespuesta} encontradas · ${r.directas} directas · ${r.errores} errores`);
  refresh();
  return {
    ok: true,
    resumen: r,
    mensaje:
      r.errores > 0
        ? `Listo, pero ${r.errores} ${r.errores === 1 ? 'pregunta no se pudo probar' : 'preguntas no se pudieron probar'} (OpenAI no respondió).`
        : 'Listo: abajo están los resultados.',
  };
}
