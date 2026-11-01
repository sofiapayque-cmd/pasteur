import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/*
  Cliente de Supabase para el servidor (Server Components, Server Actions, Route Handlers).
  Lee y escribe la sesión en cookies. Crear uno nuevo en cada función: no
  guardarlo en una variable global (en Vercel varias personas comparten el servidor).
  Devuelve null si Supabase todavía no está configurado.
  Basado en el ejemplo oficial with-supabase de Next.js.
*/
export async function crearClienteServidor() {
  if (!supabaseConfigurado) return null;
  const almacen = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(aGuardar) {
        try {
          aGuardar.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Llamado desde un Server Component (no puede escribir cookies):
          // no pasa nada, proxy.ts ya renueva la sesión en cada pedido.
        }
      },
    },
  });
}

/*
  La maestra con sesión iniciada, o null.
  Usa getClaims(), que verifica el token en cada llamada
  (nunca confiar en getSession() en el servidor).
*/
export async function obtenerDocente(): Promise<{ id: string; email: string | null } | null> {
  const supabase = await crearClienteServidor();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
}
