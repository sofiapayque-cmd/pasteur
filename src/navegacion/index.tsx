'use client';

/*
  CAPA DE NAVEGACIÓN (etapa 3 de la migración).

  Las pantallas usaban react-router (useNavigate, useParams, <Navigate>).
  Este archivo ofrece la misma forma de uso pero por dentro usa el
  App Router de Next.js (next/navigation). Así las pantallas solo cambian
  la línea del import y no hay que reescribir su lógica.

  - useNavigate()         → navegar('/ruta') o navegar('/ruta', { replace: true })
  - useParams()           → { act, codigo } según la carpeta [act] / [codigo]
  - <Navigate to replace> → redirige apenas se muestra (igual que antes)
  - useDesde()            → de dónde vino la maestra (antes location.state.desde,
                            ahora ?desde=… en la dirección, así sobrevive a recargar)
  - useVolver(porDefecto) → el botón "Volver": a la página anterior, o a porDefecto
*/
import { useEffect } from 'react';
import { useParams as useParamsNext, useRouter, useSearchParams } from 'next/navigation';

export type OpcionesNavegar = { replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  return (a: string, opciones: OpcionesNavegar = {}) => {
    if (opciones.replace) router.replace(a);
    else router.push(a);
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): Partial<T> {
  return (useParamsNext() ?? {}) as Partial<T>;
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [router, to, replace]);
  return null;
}

/* Solo se aceptan rutas internas de la maestra (su panel o "Preparar la clase"): un ?desde= armado a mano no puede mandar a otro sitio. */
const DESDE_VALIDO = /^\/maestra(\/a[1-3]\/preparar)?$/;

export function useDesde(): string | undefined {
  const desde = useSearchParams()?.get('desde');
  return desde && DESDE_VALIDO.test(desde) ? desde : undefined;
}

export function conDesde(ruta: string, desde: string): string {
  return `${ruta}?desde=${encodeURIComponent(desde)}`;
}

/*
  "Volver" (pedido de Sofia, 16/11): vuelve a la página de la web de donde se
  vino, como la flecha del navegador. Por ejemplo: inicio → Acceso
  investigadores → Volver = el inicio.
  Va a porDefecto (la página de arriba de esta) si:
  · se entró de afuera (un link de un mail, la dirección escrita);
  · la anterior es un ingreso: después de entrar, Volver no lleva de nuevo
    a la pantalla de la contraseña;
  · el navegador es viejo y no dice cuál fue la página anterior.
*/
const INGRESO = /^\/((maestra|equipo)\/(entrar|clave|recuperar)|auth\/)/;

type Historial = { canGoBack?: boolean; currentEntry?: { index: number }; entries?: () => { url: string | null }[] };

export function useVolver(porDefecto: string) {
  const router = useRouter();
  return () => {
    // La lista del navegador solo tiene las páginas de esta web de esta pestaña
    const h = (window as unknown as { navigation?: Historial }).navigation;
    const anterior = h?.canGoBack && h.currentEntry ? h.entries?.()[h.currentEntry.index - 1]?.url : null;
    if (anterior && !INGRESO.test(new URL(anterior).pathname)) router.back();
    else router.push(porDefecto);
  };
}
