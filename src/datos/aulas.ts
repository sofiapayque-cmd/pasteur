import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { exigirDocenteActiva } from './docente';

/*
  CAPA DE ACCESO A DATOS · aulas y alumnos, vistos POR LA MAESTRA (solo servidor).

  Todo pasa por el cliente con la sesión de la maestra: las reglas RLS de la
  base solo le dejan ver sus propias aulas y sus propios alumnos. Por eso,
  cuando una Server Action necesita la clave secreta (crear cuentas, cambiar
  claves), PRIMERO busca el aula o el alumno con estas funciones: si la
  maestra no es la dueña, la base no lo devuelve y la acción no sigue.
*/

export type Aula = {
  id: string;
  nombre: string;
  grado: number | null;
  anio_lectivo: number;
  codigo: string;
  creada_en: string;
  archivada_en: string | null;
};

export type AulaConCantidad = Aula & { alumnos: number };

export type Alumno = {
  id: string;
  aula_id: string;
  numero: number;
  usuario: string;
  apodo: string | null;
  color: string | null;
  activo: boolean;
  ultimo_ingreso: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

const COLUMNAS_AULA = 'id, nombre, grado, anio_lectivo, codigo, creada_en, archivada_en';
const COLUMNAS_ALUMNO = 'id, aula_id, numero, usuario, apodo, color, activo, ultimo_ingreso';

async function clienteDeLaMaestra() {
  await exigirDocenteActiva();
  const supabase = await crearClienteServidor();
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

/** Las aulas de la maestra con sesión (activas primero), con cuántos alumnos tiene cada una. */
export async function listarAulas(): Promise<AulaConCantidad[]> {
  const supabase = await clienteDeLaMaestra();
  const { data, error } = await supabase
    .from('aulas')
    .select(`${COLUMNAS_AULA}, alumnos(count)`)
    .order('archivada_en', { ascending: true, nullsFirst: true })
    .order('anio_lectivo', { ascending: false })
    .order('creada_en', { ascending: false });
  if (error) throw new Error('No se pudieron leer las aulas');
  return (data ?? []).map(({ alumnos, ...aula }) => ({
    ...(aula as Aula),
    alumnos: Array.isArray(alumnos) ? Number((alumnos[0] as { count?: number })?.count ?? 0) : 0,
  }));
}

/** Un aula de la maestra con sesión, o null si no existe o no es suya. */
export async function obtenerAula(id: unknown): Promise<Aula | null> {
  if (!esUuid(id)) return null;
  const supabase = await clienteDeLaMaestra();
  const { data } = await supabase.from('aulas').select(COLUMNAS_AULA).eq('id', id).maybeSingle();
  return (data as Aula | null) ?? null;
}

/** Los alumnos de un aula de la maestra con sesión (vacío si el aula no es suya). */
export async function listarAlumnos(aulaId: string): Promise<Alumno[]> {
  if (!esUuid(aulaId)) return [];
  const supabase = await clienteDeLaMaestra();
  const { data, error } = await supabase.from('alumnos').select(COLUMNAS_ALUMNO).eq('aula_id', aulaId).order('numero');
  if (error) throw new Error('No se pudieron leer los alumnos');
  return (data as Alumno[]) ?? [];
}

/** Un alumno de alguna aula de la maestra con sesión, o null. */
export async function obtenerAlumno(id: unknown): Promise<Alumno | null> {
  if (!esUuid(id)) return null;
  const supabase = await clienteDeLaMaestra();
  const { data } = await supabase.from('alumnos').select(COLUMNAS_ALUMNO).eq('id', id).maybeSingle();
  return (data as Alumno | null) ?? null;
}
