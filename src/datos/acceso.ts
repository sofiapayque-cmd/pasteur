import 'server-only';
import { cache } from 'react';
import { aulasReales } from '@/lib/supabase/config';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { puedeEntrar, type Area, type TipoPersona } from '@/lib/acceso/permisos';
import { obtenerAlumno } from './alumno';
import { obtenerDocente } from './docente';
import { obtenerMiembro } from './equipo';
import type { Rol } from '@/lib/equipo/comun';

/*
  QUIÉN ES LA PERSONA DE ESTE PEDIDO (solo servidor).
  Reúne los tres controles que ya existían (alumno, maestra y equipo) en una
  sola respuesta, para que cada página y cada acción decida con la misma
  tabla (src/lib/acceso/permisos.ts). Se usa en la página o la acción misma,
  no solo en un layout: la guía de autenticación de Next.js 16 advierte que
  un control en el layout no impide que la página se arme.

  Las cuentas son excluyentes (un alumno nunca es maestra, y una cuenta del
  equipo no puede ser de maestra), así que a lo sumo una de las tres responde.
  Una maestra pendiente o suspendida cuenta como visitante.
*/
export type Quien =
  | { tipo: 'visitante' }
  | { tipo: 'alumno'; id: string }
  | { tipo: 'docente'; id: string }
  | { tipo: 'equipo'; id: string; rol: Rol };

export const quienEs = cache(async (): Promise<Quien> => {
  const alumno = await obtenerAlumno();
  if (alumno) return { tipo: 'alumno', id: alumno.id };
  const [docente, miembro] = await Promise.all([obtenerDocente(), obtenerMiembro()]);
  if (docente?.estado === 'activa') return { tipo: 'docente', id: docente.id };
  if (miembro) return { tipo: 'equipo', id: miembro.id, rol: miembro.rol };
  return { tipo: 'visitante' };
});

/**
 * ¿La persona de este pedido puede entrar a esa área?
 * Sin el sistema real de aulas (prototipo o compu de desarrollo sin base),
 * todo sigue abierto, como antes: no hay cuentas con las que entrar.
 */
export async function puede(area: Area): Promise<boolean> {
  if (!aulasReales) return true;
  const quien = await quienEs();
  return puedeEntrar(quien.tipo, area);
}

/**
 * ¿Hay alguna sesión abierta en este navegador, sea de quien sea?
 * Sirve para distinguir a un visitante de alguien que entró con otra cuenta
 * (por ejemplo, una maestra que abre el ingreso del equipo).
 */
export const haySesion = cache(async (): Promise<boolean> => {
  const supabase = await crearClienteServidor();
  if (!supabase) return false;
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims?.sub);
});

export type { TipoPersona };
