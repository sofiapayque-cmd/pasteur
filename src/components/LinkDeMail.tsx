'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { aulasReales, equipoReal } from '@/lib/supabase/config';
import { abrirLinkDeMail } from '@/acciones/maestra';

/*
  Links de los mails de Supabase (invitación de maestra y recuperación de
  contraseña).

  Sin un servidor de mail propio (SMTP), Supabase no deja editar las
  plantillas: el mail trae su link por defecto. Supabase verifica ese link y
  vuelve a la web con la sesión después del "#":
    …/#access_token=…&refresh_token=…&type=invite      (todo bien)
    …/#error=access_denied&error_code=otp_expired&…    (vencido o ya usado)
  Lo que va después del "#" nunca llega al servidor. Este componente (en el
  layout raíz, porque el link puede volver a cualquier página):
    1. lo lee y lo borra de la dirección y del historial;
    2. se lo pasa a una Server Action, que lo valida con Supabase, guarda la
       sesión en cookies seguras y sigue a /maestra/clave.
  Con el sistema de aulas y el panel del equipo apagados no hace nada. Las
  invitadas del equipo (migración 8) siguen a /equipo/clave.
  (Cuando haya SMTP y plantillas propias, los links pueden ir directo a
  /auth/confirmar con token_hash, y este componente queda de respaldo.)
*/
export default function LinkDeMail() {
  const router = useRouter();
  const [abriendo, empezar] = useTransition();

  useEffect(() => {
    if (!aulasReales && !equipoReal) return;
    const { hash, pathname, search } = window.location;
    if (!hash.includes('access_token=') && !hash.includes('error_code=')) return;

    const datos = new URLSearchParams(hash.slice(1));
    window.history.replaceState(window.history.state, '', pathname + search);

    const accessToken = datos.get('access_token');
    const refreshToken = datos.get('refresh_token');
    if (!accessToken || !refreshToken) {
      router.replace(aulasReales ? '/maestra/entrar?error=link' : '/equipo/entrar?error=link');
      return;
    }
    empezar(async () => {
      await abrirLinkDeMail({ accessToken, refreshToken, tipo: datos.get('type') });
    });
  }, [router]);

  if (!abriendo) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--agar)',
        color: 'var(--nucleo)',
        font: '600 1.25rem/1.4 var(--font-display)',
      }}
    >
      Abriendo tu link…
    </div>
  );
}
