import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';

/*
  PEDIDOS DE ACCESO (migración 20) · solo servidor.
  Los lee la admin del equipo con su sesión (RLS). Los ya resueltos se borran
  a los 180 días (solo se guardan para responder; ver docs).
*/
export type SolicitudAcceso = {
  id: string;
  nombre: string;
  email: string;
  escuela: string;
  departamento: string;
  cargo: 'maestra' | 'direccion' | 'otro';
  grados: string;
  mensaje: string;
  estado: 'pendiente' | 'invitada' | 'descartada';
  creada_en: string;
  resuelta_en: string | null;
};

const DIAS_GUARDADO = 180;

/** Pendientes primero (de la más vieja a la más nueva) y las últimas resueltas. Llamar solo después de miembroCon('admin'). */
export async function listarSolicitudes(): Promise<{ pendientes: SolicitudAcceso[]; resueltas: SolicitudAcceso[] }> {
  const admin = crearClienteAdmin();
  if (admin) {
    const limite = new Date(Date.now() - DIAS_GUARDADO * 86400_000).toISOString();
    const { error } = await admin.from('solicitudes_acceso').delete().neq('estado', 'pendiente').lt('resuelta_en', limite);
    if (error) console.error('[acceso] limpieza:', error.code);
  }
  const db = (await crearClienteServidor())!;
  const columnas = 'id, nombre, email, escuela, departamento, cargo, grados, mensaje, estado, creada_en, resuelta_en';
  const [{ data: pendientes }, { data: resueltas }] = await Promise.all([
    db.from('solicitudes_acceso').select(columnas).eq('estado', 'pendiente').order('creada_en').limit(200),
    db.from('solicitudes_acceso').select(columnas).neq('estado', 'pendiente').order('resuelta_en', { ascending: false }).limit(20),
  ]);
  return { pendientes: (pendientes ?? []) as SolicitudAcceso[], resueltas: (resueltas ?? []) as SolicitudAcceso[] };
}

/** Cuántos pedidos esperan (para el número en la barra de la admin). */
export async function solicitudesPendientes(): Promise<number> {
  const db = await crearClienteServidor();
  if (!db) return 0;
  const { count } = await db.from('solicitudes_acceso').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente');
  return count ?? 0;
}
