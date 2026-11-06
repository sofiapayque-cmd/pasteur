'use client';

import { useActionState, type ReactNode } from 'react';
import Cabecera from '@/components/Cabecera';
import { elegirClaveEquipo, ingresarEquipo, type Estado } from '@/acciones/equipo';

/* Pantallas de acceso del equipo del Pasteur: entrar y elegir contraseña. */
function Marco({ titulo, bajada, children }: { titulo: string; bajada: string; children: ReactNode }) {
  return (
    <main className="pantalla acceso">
      <Cabecera miga="Equipo del Institut Pasteur" />
      <div className="acceso__cuerpo">
        <section className="acceso__tarjeta anim-crecer">
          <span className="etiqueta">Equipo</span>
          <h1>{titulo}</h1>
          <p className="acceso__bajada">{bajada}</p>
          {children}
        </section>
      </div>
    </main>
  );
}

export function IngresoEquipo({ aviso }: { aviso?: string }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(ingresarEquipo, { mensaje: aviso ?? '' });
  return (
    <Marco titulo="Panel del equipo" bajada="Fichas, revisión y biblioteca científica. Entrá con el mail y la contraseña de tu invitación.">
      <form action={accion} className="acceso__form" noValidate>
        <label className="campo">
          <span className="campo__nombre">Mail</span>
          <input className="campo__entrada" type="email" name="email" autoComplete="username" required defaultValue={estado.email} />
        </label>
        <label className="campo">
          <span className="campo__nombre">Contraseña</span>
          <input className="campo__entrada" type="password" name="clave" autoComplete="current-password" required />
        </label>
        <p className="acceso__mensaje" role="alert" aria-live="polite">
          {estado.mensaje}
        </p>
        <button className="btn btn--primario btn--grande" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="acceso__bajada">¿Olvidaste la contraseña? Pedile a la admin del equipo un link nuevo.</p>
      </form>
    </Marco>
  );
}

export function ClaveEquipo({ email }: { email: string | null }) {
  const [estado, accion, enviando] = useActionState<Estado, FormData>(elegirClaveEquipo, { mensaje: '' });
  return (
    <Marco titulo="Elegí tu contraseña" bajada={email ? `Para entrar como ${email}. Al menos 10 caracteres.` : 'Al menos 10 caracteres.'}>
      <form action={accion} className="acceso__form" noValidate>
        <input type="email" name="usuario" autoComplete="username" defaultValue={email ?? ''} hidden readOnly />
        <label className="campo">
          <span className="campo__nombre">Contraseña nueva</span>
          <input className="campo__entrada" type="password" name="clave" autoComplete="new-password" minLength={10} required />
        </label>
        <label className="campo">
          <span className="campo__nombre">Repetila</span>
          <input className="campo__entrada" type="password" name="repetida" autoComplete="new-password" minLength={10} required />
        </label>
        <p className="acceso__mensaje" role="alert" aria-live="polite">
          {estado.mensaje}
        </p>
        <button className="btn btn--primario btn--grande" type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </form>
    </Marco>
  );
}
