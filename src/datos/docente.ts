import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { aulasReales } from '@/lib/supabase/config';

/*
  CAPA DE ACCESO A DATOS · maestras (solo servidor).
  Siguiendo la guía de seguridad de Next.js: toda lectura de la maestra pasa
  por acá, y cada Server Action vuelve a verificar con exigirDocenteActiva().
  La frontera real igual es RLS en la base: esto es una segunda capa.
*/
export type EstadoDocente = 'activa' | 'pendiente' | 'suspendida';
export type Docente = { id: string; email: string | null; nombre: string; escuela: string; estado: EstadoDocente };

/** La maestra con sesión (cualquier estado), o null. Una sola consulta por pedido (cache). */
export const obtenerDocente = cache(async (): Promise<Docente | null> => {
  if (!aulasReales) return null;
  const supabase = await crearClienteServidor();
  if (!supabase) return null;
  // getClaims() verifica el token (nunca confiar en getSession() en el servidor)
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || claims.app_metadata?.rol === 'alumno') return null;
  const { data: fila } = await supabase
    .from('docentes')
    .select('id, nombre, escuela, estado')
    .eq('id', claims.sub)
    .maybeSingle();
  if (!fila) return null;
  return { ...fila, email: typeof claims.email === 'string' ? claims.email : null } as Docente;
});

/** Para páginas y acciones de la maestra: si no hay una maestra activa, va al ingreso. */
export async function exigirDocenteActiva(): Promise<Docente> {
  const docente = await obtenerDocente();
  if (!docente || docente.estado !== 'activa') redirect('/maestra/entrar');
  return docente;
}
