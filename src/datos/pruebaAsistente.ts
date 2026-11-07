import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { pedidaDeNota, type Publicada } from '@/lib/ia/pruebaAsistente';

/*
  PRUEBA DEL ASISTENTE · datos (solo servidor).
  · Lo que lee el equipo con su sesión (RLS): la última corrida.
  · Lo que necesita la clave secreta (siempre después de exigirMiembro):
    respuestas publicadas con lo que se le pidió a la IA, y los chequeos del
    índice y de las fuentes.
*/
type FilaVersion = { id: string; estado: string; numero: number; pregunta: string; variantes: string[] | null; nota_interna: string | null };
type FilaFicha = { id: string; estado: string; version_publicada_id: string | null; ficha_versiones: FilaVersion[] };

/** publicadas: las que llevan el sello (fichas_validadas). existentes: todas las que no se retiraron ni se rechazaron. */
export async function respuestasConocidas(admin: SupabaseClient): Promise<{ publicadas: Publicada[]; existentes: Publicada[] }> {
  const [{ data: fichas }, { data: validadas }] = await Promise.all([
    admin
      .from('fichas')
      .select('id, estado, version_publicada_id, ficha_versiones!ficha_versiones_ficha_id_fkey(id, estado, numero, pregunta, variantes, nota_interna)')
      .eq('formato', 'pregunta')
      .neq('estado', 'retirada')
      .limit(1000),
    admin.from('fichas_validadas').select('ficha_id, version_id').limit(1000),
  ]);
  const conSello = new Map(((validadas ?? []) as { ficha_id: string; version_id: string }[]).map((v) => [v.ficha_id, v.version_id]));
  const publicadas: Publicada[] = [];
  const existentes: Publicada[] = [];
  for (const f of (fichas ?? []) as unknown as FilaFicha[]) {
    const versiones = [...f.ficha_versiones].sort((a, b) => b.numero - a.numero);
    const ultima = versiones[0];
    const vigente = versiones.find((v) => v.id === conSello.get(f.id));
    const de = (v: FilaVersion): Publicada => ({ fichaId: f.id, pregunta: v.pregunta, variantes: v.variantes ?? [], pedida: pedidaDeNota(v.nota_interna) });
    if (vigente) publicadas.push(de(vigente));
    if (ultima && ultima.estado !== 'rechazada') existentes.push(de(ultima));
    else if (vigente) existentes.push(de(vigente));
  }
  return { publicadas, existentes };
}

export type Chequeo = { titulo: string; ok: boolean; problemas: string[] };

/** Que el asistente solo pueda mostrar respuestas aprobadas, con las fuentes de la versión aprobada. */
export async function chequeos(admin: SupabaseClient): Promise<Chequeo[]> {
  const [{ data: frags }, { data: fichas }, { data: validadas }] = await Promise.all([
    admin.from('fragmentos').select('ficha_id, version_id, tipo').eq('activo', true).limit(5000),
    admin.from('fichas').select('id, slug, estado, version_publicada_id').eq('formato', 'pregunta').limit(1000),
    admin.from('fichas_validadas').select('ficha_id, version_id, pregunta').limit(1000),
  ]);
  const fichaPor = new Map(((fichas ?? []) as { id: string; slug: string; estado: string; version_publicada_id: string | null }[]).map((f) => [f.id, f]));
  const vals = (validadas ?? []) as { ficha_id: string; version_id: string; pregunta: string }[];
  const fr = (frags ?? []) as { ficha_id: string; version_id: string; tipo: string }[];

  // 1. El índice solo tiene versiones publicadas y vigentes
  const fuera = fr.filter((x) => {
    const f = fichaPor.get(x.ficha_id);
    return !f || f.estado !== 'publicada' || f.version_publicada_id !== x.version_id;
  });
  // 2. Cada respuesta con sello está en el índice
  const indexadas = new Set(fr.filter((x) => x.tipo === 'pregunta').map((x) => x.version_id));
  const sinIndice = vals.filter((v) => !indexadas.has(v.version_id));
  // 3. Publicadas sin sello vigente (no aparecen en el asistente: está bien, pero conviene saberlo)
  const conSello = new Set(vals.map((v) => v.ficha_id));
  const sinSello = [...fichaPor.values()].filter((f) => f.estado === 'publicada' && !conSello.has(f.id));
  // 4. Fuentes: las de la versión aprobada, y todas aprobadas como fuente
  const ids = vals.map((v) => v.version_id);
  const { data: citas } = ids.length
    ? await admin.from('version_fuentes').select('version_id, publicacion_id, fuente_id, publicaciones(titulo, estado)').in('version_id', ids)
    : { data: [] };
  const porVersion = new Map<string, { titulo: string; estado: string }[]>();
  for (const c of (citas ?? []) as unknown as { version_id: string; fuente_id: string | null; publicaciones: { titulo: string; estado: string } | null }[]) {
    const lista = porVersion.get(c.version_id) ?? [];
    lista.push(c.publicaciones ? { titulo: c.publicaciones.titulo, estado: c.publicaciones.estado } : { titulo: 'fuente manual', estado: 'aprobada' });
    porVersion.set(c.version_id, lista);
  }
  const problemasFuentes = vals.flatMap((v) => {
    const fs = porVersion.get(v.version_id) ?? [];
    if (!fs.length) return [`"${v.pregunta}" no tiene fuentes`];
    return fs.filter((x) => x.estado !== 'aprobada').map((x) => `"${v.pregunta}" cita un artículo que está ${x.estado}: ${x.titulo.slice(0, 80)}`);
  });

  return [
    {
      titulo: 'El índice del asistente solo tiene respuestas aprobadas y vigentes',
      ok: fuera.length === 0,
      problemas: fuera.slice(0, 10).map((x) => `Fragmento de "${fichaPor.get(x.ficha_id)?.slug ?? x.ficha_id}" que no es la versión publicada`),
    },
    {
      titulo: 'Todas las respuestas aprobadas están en el índice',
      ok: sinIndice.length === 0,
      problemas: sinIndice.map((v) => `"${v.pregunta}" todavía no está (se agrega sola al correr la prueba o cuando alguien pregunte)`),
    },
    {
      titulo: 'Cada respuesta aprobada muestra las fuentes de su versión aprobada, y todas están aprobadas',
      ok: problemasFuentes.length === 0,
      problemas: problemasFuentes,
    },
    {
      titulo: 'No hay respuestas publicadas sin la aprobación de una validadora',
      ok: sinSello.length === 0,
      problemas: sinSello.map((f) => `"${f.slug}" está publicada pero sin una aprobación vigente: el asistente no la muestra`),
    },
  ];
}

export type FilaPrueba = {
  orden: number;
  grupo: 'variante' | 'trampa' | 'otro_tema';
  consulta: string;
  ancla: string | null;
  esperada_id: string | null;
  resultado: 'respuesta' | 'parecidas' | 'nada' | 'error';
  mostrada_id: string | null;
  parecidas: string[];
  similitud: number | null;
  eleccion: number | null;
  correcta: boolean;
  encontrada: boolean | null;
  detalle: { candidatas?: { p: string; s: number }[]; motivo?: string; error?: string };
};

/** La última corrida (con la sesión del miembro: RLS). */
export async function ultimaCorrida(): Promise<{ corrida: string; creadaEn: string; pedidaPor: string | null; filas: FilaPrueba[] } | null> {
  const db = (await crearClienteServidor())!;
  const { data: ultima } = await db.from('pruebas_asistente').select('corrida, creada_en, pedida_por').order('creada_en', { ascending: false }).limit(1).maybeSingle();
  if (!ultima) return null;
  const { data: filas } = await db
    .from('pruebas_asistente')
    .select('orden, grupo, consulta, ancla, esperada_id, resultado, mostrada_id, parecidas, similitud, eleccion, correcta, encontrada, detalle')
    .eq('corrida', ultima.corrida)
    .order('orden');
  return { corrida: ultima.corrida, creadaEn: ultima.creada_en, pedidaPor: ultima.pedida_por, filas: (filas ?? []) as FilaPrueba[] };
}
