import { notFound, redirect } from 'next/navigation';
import { equipoReal } from '@/lib/supabase/config';
import { obtenerMiembro } from '@/datos/equipo';
import { haySesion, quienEs } from '@/datos/acceso';
import { IngresoEquipo, RestringidoEquipo } from '@/pantallas/equipo/Acceso';

/*
  /equipo/entrar · Ingreso del equipo del Pasteur (solo con NEXT_PUBLIC_ASISTENTE=1).
  Todo se decide en el servidor (8/11):
    · integrante activa del equipo (redactora, validadora o admin) → a su panel;
    · con sesión de otra cuenta (maestra, alumno, o del equipo pero suspendida) → "Acceso restringido";
    · sin sesión → el formulario.
*/
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!equipoReal) notFound();
  if (await obtenerMiembro()) redirect('/equipo');
  if (await haySesion()) {
    const quien = await quienEs();
    return <RestringidoEquipo cuenta={quien.tipo === 'docente' || quien.tipo === 'alumno' ? quien.tipo : 'otra'} />;
  }
  const { error } = await searchParams;
  return <IngresoEquipo aviso={error === 'link' ? 'El link venció o ya se usó. Entrá con tu contraseña o pedile uno nuevo a la admin.' : undefined} />;
}
