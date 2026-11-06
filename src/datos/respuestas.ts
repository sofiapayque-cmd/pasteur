import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import type { EstadoVersion } from './fichas';

/*
  TABLERO DE RESPUESTAS (solo servidor, con la sesión del miembro: RLS).
  Una "respuesta" es una ficha de formato pregunta. Para cada una se mira su
  última versión: en qué estado está, si la redactó la IA, qué cita y qué
  decidió la última revisión.
*/
export type Grupo = 'espera' | 'cambios' | 'aprobada' | 'rechazada' | 'borrador' | 'retirada';
export const NOMBRE_GRUPO: Record<Grupo, string> = {
  espera: 'Esperando revisión',
  cambios: 'Con cambios pedidos',
  aprobada: 'Aprobadas',
  rechazada: 'Rechazadas',
  borrador: 'Borradores',
  retirada: 'Retiradas',
};

export type Respuesta = {
  fichaId: string;
  versionId: string;
  actividad: string | null;
  grupo: Grupo;
  pregunta: string;
  infantil: string;
  ia: boolean;
  autorId: string;
  creadaEn: string;
  enviadaEn: string | null;
  decididaEn: string | null;
  fuentes: { titulo: string; estado: string }[];
  ultima: { decision: string; comentario: string; revisorId: string; creadaEn: string } | null;
};

type FilaFicha = {
  id: string;
  estado: 'borrador' | 'publicada' | 'retirada';
  actividad: string | null;
  creada_en: string;
  ficha_versiones: {
    id: string;
    numero: number;
    estado: EstadoVersion;
    pregunta: string;
    version_infantil: string;
    asistida_por_ia: boolean;
    autor_id: string;
    creada_en: string;
    enviada_en: string | null;
    decidida_en: string | null;
  }[];
};

const NINGUNO = ['00000000-0000-0000-0000-000000000000'];

export async function listarRespuestas(): Promise<Respuesta[]> {
  const db = (await crearClienteServidor())!;
  const { data: fichas } = await db
    .from('fichas')
    .select(
      'id, estado, actividad, creada_en, ficha_versiones!ficha_versiones_ficha_id_fkey(id, numero, estado, pregunta, version_infantil, asistida_por_ia, autor_id, creada_en, enviada_en, decidida_en)',
    )
    .eq('formato', 'pregunta')
    .order('creada_en', { ascending: false })
    .limit(400);

  const filas = ((fichas ?? []) as unknown as FilaFicha[])
    .map((f) => ({ f, v: [...f.ficha_versiones].sort((a, b) => b.numero - a.numero)[0] }))
    .filter((x) => x.v);
  const ids = filas.map((x) => x.v.id);

  const [{ data: citas }, { data: revisiones }] = await Promise.all([
    db
      .from('version_fuentes')
      .select('version_id, orden, publicaciones(titulo, estado), fuentes(cita)')
      .in('version_id', ids.length ? ids : NINGUNO)
      .order('orden'),
    db
      .from('revisiones')
      .select('objeto_id, decision, comentario, revisor_id, creada_en')
      .eq('objeto', 'ficha_version')
      .in('objeto_id', ids.length ? ids : NINGUNO)
      .order('creada_en', { ascending: false }),
  ]);

  const fuentes: Record<string, Respuesta['fuentes']> = {};
  for (const c of (citas ?? []) as unknown as { version_id: string; publicaciones: { titulo: string; estado: string } | null; fuentes: { cita: string } | null }[]) {
    (fuentes[c.version_id] ??= []).push(c.publicaciones ? { titulo: c.publicaciones.titulo, estado: c.publicaciones.estado } : { titulo: c.fuentes?.cita ?? 'Fuente', estado: 'aprobada' });
  }
  const ultima: Record<string, Respuesta['ultima']> = {};
  for (const r of (revisiones ?? []) as { objeto_id: string; decision: string; comentario: string; revisor_id: string; creada_en: string }[]) {
    ultima[r.objeto_id] ??= { decision: r.decision, comentario: r.comentario, revisorId: r.revisor_id, creadaEn: r.creada_en };
  }

  return filas.map(({ f, v }) => {
    const u = ultima[v.id] ?? null;
    const grupo: Grupo =
      f.estado === 'retirada'
        ? 'retirada'
        : v.estado === 'en_revision'
          ? 'espera'
          : v.estado === 'publicada'
            ? 'aprobada'
            : v.estado === 'rechazada'
              ? 'rechazada'
              : v.estado === 'borrador' && u?.decision === 'pedir_cambios'
                ? 'cambios'
                : 'borrador';
    return {
      fichaId: f.id,
      versionId: v.id,
      actividad: f.actividad,
      grupo,
      pregunta: v.pregunta,
      infantil: v.version_infantil,
      ia: v.asistida_por_ia,
      autorId: v.autor_id,
      creadaEn: v.creada_en,
      enviadaEn: v.enviada_en,
      decididaEn: v.decidida_en,
      fuentes: fuentes[v.id] ?? [],
      ultima: u,
    };
  });
}

/** Preguntas que ya existen en una actividad (para que la IA no proponga las mismas). */
export async function preguntasDeActividad(actividad: string): Promise<string[]> {
  const db = (await crearClienteServidor())!;
  const { data } = await db
    .from('fichas')
    .select('ficha_versiones!ficha_versiones_ficha_id_fkey(pregunta)')
    .eq('formato', 'pregunta')
    .eq('actividad', actividad)
    .neq('estado', 'retirada')
    .limit(300);
  const todas = ((data ?? []) as unknown as { ficha_versiones: { pregunta: string }[] }[]).flatMap((f) => f.ficha_versiones.map((v) => v.pregunta));
  return [...new Set(todas.filter(Boolean))];
}

/** Cuántas respuestas pidió a la IA esta persona en las últimas 24 horas. */
export async function pedidasHoy(autorId: string): Promise<number> {
  const db = (await crearClienteServidor())!;
  const { count } = await db
    .from('ficha_versiones')
    .select('id', { count: 'exact', head: true })
    .eq('asistida_por_ia', true)
    .eq('autor_id', autorId)
    .gte('creada_en', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  return count ?? 0;
}
