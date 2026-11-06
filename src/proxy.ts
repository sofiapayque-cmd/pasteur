import type { NextRequest } from 'next/server';
import { actualizarSesion } from '@/lib/supabase/proxy';

/*
  proxy.ts (Next.js 16; antes se llamaba middleware.ts).
  Corre antes de cada pedido de las rutas del matcher y renueva la sesión de Supabase.
  Solo en las rutas de la maestra, del equipo del Pasteur y de inicio de sesión: los niños no inician
  sesión (entran con código y apodo), así sus pantallas siguen siendo estáticas y rápidas.
  Sin Supabase configurado, deja pasar todo sin tocar nada.
*/
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: ['/maestra/:path*', '/equipo/:path*', '/auth/:path*'],
};
