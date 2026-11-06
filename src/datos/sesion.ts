import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config';
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

/*
  Abre la sesión que trae un link de mail de Supabase (invitación o
  recuperación). setSession() le pregunta a Supabase si el token es válido
  antes de guardarlo en las cookies. Las cuentas de alumnos no entran por acá.
*/
export async function abrirSesionConTokens(accessToken: string, refreshToken: string): Promise<'maestra' | 'equipo' | null> {
  const cliente = await crearClienteServidor();
  if (!cliente) return null;
  const { data, error } = await cliente.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error || !data.user) return null;
  if (data.user.app_metadata?.rol === 'alumno') {
    await cliente.auth.signOut();
    return null;
  }
  // ¿Es del equipo del Pasteur? (migración 8; si la tabla no existe todavía, es maestra)
  const { data: fila } = await cliente.from('equipo').select('id').eq('id', data.user.id).maybeSingle();
  return fila ? 'equipo' : 'maestra';
}

/*
  Pide el mail para elegir una contraseña nueva. Usa el flujo "implícito"
  (la sesión vuelve en el # del link; ver src/components/LinkDeMail.tsx), así
  la maestra puede pedirlo en la escuela y abrirlo en el celular. Con la clave
  secreta, reenvía la IP real como en el ingreso.
*/
export async function pedirLinkDeClave(email: string, volverA: string): Promise<void> {
  const cliente =
    crearClienteAdmin(await ipDelPedido()) ??
    createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  const { error } = await cliente.auth.resetPasswordForEmail(email, { redirectTo: volverA });
  // A la maestra no se le dice (no revela si el mail tiene cuenta); queda en el registro del servidor.
  if (error) console.error('[maestra] no se pudo pedir el link de clave:', error.code ?? error.status);
}
