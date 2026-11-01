import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigurado } from './config';

/*
  Cliente de Supabase para el navegador (Client Components).
  Devuelve null si Supabase todavía no está configurado.
  Basado en el ejemplo oficial with-supabase de Next.js.
*/
export function crearClienteNavegador() {
  if (!supabaseConfigurado) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
