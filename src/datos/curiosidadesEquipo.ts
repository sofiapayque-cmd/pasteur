import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { indexarTemas, limpiarCuriosidades } from '@/datos/curiosidades';
import { DIAS, VIDA_MEDIA } from '@/lib/curiosidades/elegir';

/*
  Datos de /equipo/curiosidades, leídos con la sesión del miembro (las
  reglas de la base deciden qué ve). De paso, con la clave secreta:
  embeddings de temas nuevos y limpieza de conteos viejos.
*/
export type TemaPanel = { id: string; nombre: string; descripcion: string; actividad: string | null; activo: boolean; conIndice: boolean };
export type TendenciaPanel = { temaId: string; nombre: string; actividad: string | null; puntaje: number; consultas: number; curiosidades: number };
export type CuriosidadPanel = { id: string; temaId: string | null; actividad: string | null; estado: 'publicada' | 'espera' | 'borrador' | 'rechazada' | 'retirada'; titulo: string; texto: string; ia: boolean };
export type SinTema = { id: string; texto: string; actividad: string | null; veces: number; ultimaVez: string };

/** Cuántas curiosidades publicadas tiene que tener un tema en tendencia para no pedir más. */
export const MINIMO_POR_TEMA = 3;

export async function panelCuriosidades() {
  const admin = crearClienteAdmin();
  if (admin) {
    await indexarTemas(admin).catch(() => 0);
    await limpiarCuriosidades(admin).catch(() => undefined);
  }
  const db = (await crearClienteServidor())!;
  const [temasR, tendR, fichasR, sinTemaR] = await Promise.all([
    db.from('temas').select('id, nombre, descripcion, actividad, activo, embedding').order('actividad').order('orden').order('nombre'),
    db.rpc('tendencia_temas', { p_dias: DIAS, p_vida_media: VIDA_MEDIA }),
    db
      .from('fichas')
      .select('id, tema_id, actividad, estado, ficha_versiones(numero, estado, pregunta, version_infantil, asistida_por_ia)')
      .eq('formato', 'dato')
      .order('creada_en', { ascending: false })
      .limit(300),
    db.from('consultas_sin_tema').select('id, texto, actividad, veces, ultima_vez').order('ultima_vez', { ascending: false }).order('veces', { ascending: false }).limit(60),
  ]);

  const temas: TemaPanel[] = ((temasR.data ?? []) as { id: string; nombre: string; descripcion: string; actividad: string | null; activo: boolean; embedding: unknown }[]).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    descripcion: t.descripcion,
    actividad: t.actividad,
    activo: t.activo,
    conIndice: t.embedding != null,
  }));
  const tendencia: TendenciaPanel[] = ((tendR.data ?? []) as { tema_id: string; nombre: string; actividad: string | null; puntaje: number; consultas: number; curiosidades: number }[]).map((t) => ({
    temaId: t.tema_id,
    nombre: t.nombre,
    actividad: t.actividad,
    puntaje: Number(t.puntaje) || 0,
    consultas: Number(t.consultas) || 0,
    curiosidades: Number(t.curiosidades) || 0,
  }));
  type Version = { numero: number; estado: string; pregunta: string; version_infantil: string; asistida_por_ia: boolean };
  const curiosidades: CuriosidadPanel[] = ((fichasR.data ?? []) as unknown as { id: string; tema_id: string | null; actividad: string | null; estado: string; ficha_versiones: Version[] }[]).map((f) => {
    const v = [...(f.ficha_versiones ?? [])].sort((a, b) => b.numero - a.numero)[0];
    const estado: CuriosidadPanel['estado'] =
      f.estado === 'publicada'
        ? 'publicada'
        : f.estado === 'retirada'
          ? 'retirada'
          : v?.estado === 'en_revision'
            ? 'espera'
            : v?.estado === 'rechazada'
                ? 'rechazada'
                : 'borrador';
    return { id: f.id, temaId: f.tema_id, actividad: f.actividad, estado, titulo: v?.pregunta ?? '', texto: v?.version_infantil ?? '', ia: Boolean(v?.asistida_por_ia) };
  });
  const sinTema: SinTema[] = ((sinTemaR.data ?? []) as { id: string; texto: string; actividad: string | null; veces: number; ultima_vez: string }[]).map((s) => ({
    id: s.id,
    texto: s.texto,
    actividad: s.actividad,
    veces: s.veces,
    ultimaVez: s.ultima_vez,
  }));
  return { temas, tendencia, curiosidades, sinTema };
}
