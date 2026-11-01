import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, aulasReales, supabaseConfigurado } from './config';

/*
  Renueva la sesión de Supabase en cada pedido (lo llama src/proxy.ts).
  Basado en el ejemplo oficial with-supabase de Next.js.

  Con el sistema de aulas prendido (aulasReales), las rutas de /maestra mandan
  a /maestra/entrar a quien no tenga sesión. Es comodidad: la seguridad real
  está en (docente)/layout.tsx, en cada Server Action y en las reglas RLS.
*/
const RUTA_INICIAR_SESION = '/maestra/entrar';
const SIN_SESION = ['/maestra/entrar', '/maestra/recuperar'];

export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  if (!supabaseConfigurado) return respuesta;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(aGuardar, encabezados) {
        aGuardar.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        aGuardar.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        // Encabezados que evitan que una página con sesión quede guardada en caché
        Object.entries(encabezados ?? {}).forEach(([clave, valor]) => respuesta.headers.set(clave, valor));
      },
    },
  });

  // IMPORTANTE (guía oficial): no poner código entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const docente = data?.claims;

  const ruta = request.nextUrl.pathname;
  if (aulasReales && !docente && ruta.startsWith('/maestra') && !SIN_SESION.includes(ruta)) {
    const url = request.nextUrl.clone();
    url.pathname = RUTA_INICIAR_SESION;
    const redireccion = NextResponse.redirect(url);
    respuesta.cookies.getAll().forEach((c) => redireccion.cookies.set(c));
    return redireccion;
  }

  // IMPORTANTE (guía oficial): devolver `respuesta` tal cual, con sus cookies.
  return respuesta;
}
