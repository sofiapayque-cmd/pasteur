import type { NextRequest } from 'next/server';
import { actualizarSesion } from '@/lib/supabase/proxy';

/*
  proxy.ts (Next.js 16; antes se llamaba middleware.ts).
  Corre antes de cada pedido de las rutas del matcher y renueva la sesión de Supabase.
  En las rutas de la maestra, del equipo del Pasteur, de inicio de sesión y, desde la etapa 4, en las
  del alumno que usan su cuenta (/clase y /lab). Explorar y las actividades no pasan por acá: siguen
  siendo estáticas y rápidas.
  Sin Supabase configurado, deja pasar todo sin tocar nada.
*/
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: ['/maestra/:path*', '/equipo/:path*', '/auth/:path*', '/clase/:path*', '/lab/:path*'],
};
