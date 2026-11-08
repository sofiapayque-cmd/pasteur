'use server';

import { equipoReal } from '@/lib/supabase/config';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { puede } from '@/datos/acceso';

/*
  "PREGUNTAS DEL PASTEUR" DENTRO DE LAS ACTIVIDADES (bloque 4).
  Las respuestas aprobadas por una investigadora para cada actividad, para
  que los chicos las lean mientras investigan. Los chicos NO escriben: solo
  eligen de la lista (así nada de lo que escriben va a OpenAI; ver
  docs/PLAN-ENTREGA.md, privacidad). Son contenido aprobado y público: se
  leen con la clave secreta solo para eso (la vista del sello es del equipo).
  Cada vez que alguien abre una, se suma una vista anónima (migración 20).
  Desde el 8/11 las actividades no son públicas: estas acciones piden la
  misma sesión que hacer una actividad (alumno, maestra o equipo).
*/
export type RespuestaPublica = { fichaId: string; pregunta: string; texto: string; fuentes: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function respuestasDeActividad(actividad: string): Promise<RespuestaPublica[]> {
  if (!equipoReal || !/^a[1-4]$/.test(actividad)) return [];
  if (!(await puede('actividad'))) return [];
  const admin = crearClienteAdmin();
  if (!admin) return [];
  const { data: fichas } = await admin
    .from('fichas_validadas')
    .select('ficha_id, version_id, pregunta, version_infantil')
    .eq('actividad', actividad)
    .eq('formato', 'pregunta')
    .order('pregunta')
    .limit(40);
  const lista = (fichas ?? []) as { ficha_id: string; version_id: string; pregunta: string; version_infantil: string }[];
  if (!lista.length) return [];
  const { data: citas } = await admin
    .from('version_fuentes')
    .select('version_id, orden, publicaciones(titulo), fuentes(cita)')
    .in(
      'version_id',
      lista.map((f) => f.version_id),
    )
    .order('orden');
  const fuentes = new Map<string, string[]>();
  for (const c of (citas ?? []) as unknown as { version_id: string; publicaciones: { titulo: string } | null; fuentes: { cita: string } | null }[]) {
    const t = c.publicaciones?.titulo ?? c.fuentes?.cita;
    if (t) fuentes.set(c.version_id, [...(fuentes.get(c.version_id) ?? []), t]);
  }
  return lista.map((f) => ({ fichaId: f.ficha_id, pregunta: f.pregunta, texto: f.version_infantil, fuentes: (fuentes.get(f.version_id) ?? []).slice(0, 4) }));
}

/** Suma una vista anónima (solo de respuestas publicadas: lo controla la base). */
export async function contarVistaEnActividad(fichaId: string): Promise<void> {
  if (!equipoReal || !UUID.test(fichaId)) return;
  if (!(await puede('actividad'))) return;
  const admin = crearClienteAdmin();
  if (!admin) return;
  const { error } = await admin.rpc('contar_vista_respuesta', { p_ficha: fichaId, p_origen: 'actividad' });
  if (error) console.error('[respuestas] vista:', error.code);
}
