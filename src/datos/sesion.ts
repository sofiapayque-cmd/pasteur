import 'server-only';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { ipDelPedido } from './ip';

/*
  Inicio de sesión del lado del servidor (maestras hoy; alumnos en la etapa 4).
  - Con clave secreta: inicia sesión reenviando la IP real y copia la sesión a
    las cookies seguras del navegador.
  - Sin clave secreta (desarrollo): inicia sesión directo con la clave pública.
  Devuelve el id del usuario o null. Nunca dice si el mail existe o no.
*/
export async function iniciarSesion(email: string, clave: string): Promise<string | null> {
  const cliente = await crearClienteServidor();
  if (!cliente) return null;

  const admin = crearClienteAdmin(await ipDelPedido());
  if (admin) {
    const { data, error } = await admin.auth.signInWithPassword({ email, password: clave });
    if (error || !data.session) return null;
    const { error: errorCookies } = await cliente.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return errorCookies ? null : data.session.user.id;
  }

  const { data, error } = await cliente.auth.signInWithPassword({ email, password: clave });
  return error || !data.user ? null : data.user.id;
}

export async function cerrarSesion(): Promise<void> {
  const cliente = await crearClienteServidor();
  await cliente?.auth.signOut();
}
