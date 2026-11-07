import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { aulasReales, equipoReal } from '@/lib/supabase/config';
import { confirmarLink } from '@/acciones/maestra';
import MarcoAcceso from '@/pantallas/maestra/acceso/MarcoAcceso';

/*
  /auth/confirmar · Links de un solo uso (invitación de maestra o del equipo,
  y elegir contraseña nueva).

  El link trae token_hash y type, pero NO entra solo: muestra un botón
  "Entrar" y recién al tocarlo se usa (Server Action confirmarLink). Así no
  lo gastan las vistas previas de WhatsApp ni los filtros de mail que abren
  los links para revisarlos.

  Los links que copia la admin en el panel ya llegan acá. Con un servidor de
  mail propio (SMTP), las plantillas de Supabase también apuntan acá (ver
  docs/PLANTILLAS-MAIL.md). Los mails con la plantilla de siempre siguen
  entrando por LinkDeMail (la sesión en el "#").
*/
export const metadata: Metadata = { title: 'Entrar', robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  if (!aulasReales && !equipoReal) redirect('/');
  const { token_hash: tokenHash, type } = await searchParams;
  const ingreso = equipoReal && !aulasReales ? '/equipo/entrar' : '/maestra/entrar';
  if (!tokenHash || !type) redirect(`${ingreso}?error=link`);
  const paraClave = type === 'invite' || type === 'recovery';
  return (
    <MarcoAcceso
      etiqueta="La ciencia sin límites"
      titulo={type === 'recovery' ? 'Elegí tu contraseña nueva' : type === 'invite' ? '¡Te damos la bienvenida!' : 'Entrá a tu cuenta'}
      bajada={paraClave ? 'Tocá el botón para entrar. Después vas a elegir tu contraseña.' : 'Tocá el botón para entrar.'}
    >
      <form action={confirmarLink} className="acceso__form">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <button className="btn btn--primario btn--grande" type="submit">
          Entrar
        </button>
        <p className="acceso__aviso">Este link sirve una sola vez. Si ya lo usaste o pasó más de una hora, pedí uno nuevo.</p>
      </form>
    </MarcoAcceso>
  );
}
