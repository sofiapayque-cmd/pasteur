import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, supabaseConfigurado } from './config';

/*
  Cliente con la CLAVE SECRETA de Supabase. Solo servidor ('server-only' hace
  fallar el build si algo del navegador lo importa).

  SUPABASE_SECRET_KEY (sb_secret_…) se carga solo en Vercel y en .env.local,
  SIN el prefijo NEXT_PUBLIC_: así Next.js nunca la manda al navegador.
  Salta las reglas RLS, por eso se usa únicamente para:
    1. crear las cuentas de los alumnos y cambiar sus claves (etapa 3);
    2. iniciar sesión reenviando la IP real (Sb-Forwarded-For), para que los
       límites de Supabase cuenten por escuela y no por Vercel;
    3. registrar intentos de ingreso fallidos (etapa 4).
  Siempre DESPUÉS de verificar quién llama.
*/
const CLAVE_SECRETA = process.env.SUPABASE_SECRET_KEY ?? '';

export const claveSecretaConfigurada = supabaseConfigurado && CLAVE_SECRETA.startsWith('sb_secret_');

export function crearClienteAdmin(ipDelUsuario?: string | null) {
  if (!claveSecretaConfigurada) return null;
  return createClient(SUPABASE_URL, CLAVE_SECRETA, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: ipDelUsuario ? { 'Sb-Forwarded-For': ipDelUsuario } : {} },
  });
}
