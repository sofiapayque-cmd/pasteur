import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { equipoReal } from '@/lib/supabase/config';

/*
  CAPA DE ACCESO A DATOS · equipo del Pasteur (solo servidor).
  Igual que con las maestras: toda lectura del miembro pasa por acá y cada
  Server Action vuelve a verificar con exigirMiembro(). La frontera real son
  las reglas RLS de la base (migraciones 8, 9, 13 y 14): esto es otra capa.

  Roles (migración 8):
    · redactor  → escribe fichas y fuentes, agrega publicaciones, manda a revisión
    · validador → además corrige en revisión, aprueba, pide cambios, rechaza, retira
    · admin     → invita y suspende, cambia roles y la política de licencias;
                  puede redactar, pero nunca aprueba contenido científico
*/
import type { Rol } from '@/lib/equipo/comun';
export type { Rol };
export type Miembro = {
  id: string;
  email: string | null;
  nombre_visible: string;
  laboratorio: string;
  rol: Rol;
  estado: 'activa' | 'suspendida';
};

/** El miembro activo con sesión, o null. Una consulta por pedido (cache). */
export const obtenerMiembro = cache(async (): Promise<Miembro | null> => {
  if (!equipoReal) return null;
  const supabase = await crearClienteServidor();
  if (!supabase) return null;
  // getClaims() verifica el token (nunca confiar en getSession() en el servidor)
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || claims.app_metadata?.rol === 'alumno') return null;
  // RLS: un miembro suspendido no ve ni su propia fila, así que vuelve null
  const { data: fila } = await supabase
    .from('equipo')
    .select('id, nombre_visible, laboratorio, rol, estado')
    .eq('id', claims.sub)
    .maybeSingle();
  if (!fila || fila.estado !== 'activa') return null;
  return { ...fila, email: typeof claims.email === 'string' ? claims.email : null } as Miembro;
});

/** Para páginas del panel: sin el interruptor, 404; sin un miembro activo, al ingreso. */
export async function exigirMiembro(): Promise<Miembro> {
  if (!equipoReal) notFound();
  const miembro = await obtenerMiembro();
  if (!miembro) redirect('/equipo/entrar');
  return miembro;
}

/** Para Server Actions: el miembro si tiene uno de esos roles; si no, null (la acción responde con un mensaje). */
export async function miembroCon(...roles: Rol[]): Promise<Miembro | null> {
  if (!equipoReal) return null;
  const miembro = await obtenerMiembro();
  if (!miembro) return null;
  return roles.length === 0 || roles.includes(miembro.rol) ? miembro : null;
}

export const nombreDe = (m: Pick<Miembro, 'nombre_visible' | 'email'>) => m.nombre_visible || m.email || 'Equipo';
