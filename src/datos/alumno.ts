import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/*
  EL ALUMNO QUE ENTRÓ (solo servidor, con SU sesión: las reglas RLS solo le
  muestran su fila y su aula). Si la cuenta está desactivada o el aula
  archivada, es como si no hubiera entrado.
*/
export type Alumno = {
  id: string;
  numero: number;
  usuario: string;
  apodo: string | null;
  color: string | null;
  aula: { nombre: string; grado: number | null; anio_lectivo: number };
};

type Fila = {
  id: string;
  numero: number;
  usuario: string;
  apodo: string | null;
  color: string | null;
  activo: boolean;
  aulas: { nombre: string; grado: number | null; anio_lectivo: number; archivada_en: string | null } | null;
};

export const obtenerAlumno = cache(async (): Promise<Alumno | null> => {
  if (!aulasReales) return null;
  const supabase = await crearClienteServidor();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || (claims.app_metadata as { rol?: string } | undefined)?.rol !== 'alumno') return null;
  const { data: fila } = await supabase
    .from('alumnos')
    .select('id, numero, usuario, apodo, color, activo, aulas(nombre, grado, anio_lectivo, archivada_en)')
    .eq('id', claims.sub)
    .maybeSingle<Fila>();
  if (!fila || !fila.activo || !fila.aulas || fila.aulas.archivada_en) return null;
  const { aulas, ...resto } = fila;
  return { id: resto.id, numero: resto.numero, usuario: resto.usuario, apodo: resto.apodo, color: resto.color, aula: aulas };
});

/** Para las pantallas del alumno: sin sistema de aulas → 404; sin alumno → a /clase. */
export async function exigirAlumno(): Promise<Alumno> {
  if (!aulasReales) notFound();
  const alumno = await obtenerAlumno();
  if (!alumno) redirect('/clase');
  return alumno;
}
