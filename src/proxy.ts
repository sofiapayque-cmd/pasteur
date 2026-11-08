import type { NextRequest } from 'next/server';
import { actualizarSesion } from '@/lib/supabase/proxy';

/*
  proxy.ts (Next.js 16; antes se llamaba middleware.ts).
  Corre antes de cada pedido de las rutas del matcher y renueva la sesión de Supabase.
  En las rutas de la maestra, del equipo del Pasteur, de inicio de sesión, en las del alumno que
  usan su cuenta (/clase y /lab) y, desde el 8/11, en /explorar: las actividades ya no son
  públicas y la página necesita la sesión al día para saber quién es.
  Sin Supabase configurado, deja pasar todo sin tocar nada.
*/
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: ['/maestra/:path*', '/equipo/:path*', '/auth/:path*', '/clase/:path*', '/lab/:path*', '/explorar/:path*'],
};
