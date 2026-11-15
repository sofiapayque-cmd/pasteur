'use client';

import { useActionState, type ReactNode } from 'react';
import Cabecera from '@/components/Cabecera';
import PieInstitucional from '@/components/PieInstitucional';
import Link from 'next/link';
import { elegirClaveEquipo, ingresarEquipo, salirEquipo, type Estado } from '@/acciones/equipo';

/* Pantallas de acceso del equipo del Pasteur: entrar y elegir contraseña. */
function Marco({ titulo, bajada, children }: { titulo: string; bajada: string; children: ReactNode }) {
  return (
    <main className="pantalla acceso">
      <Cabecera volverA="/rol" miga="Equipo del Institut Pasteur" />
      <div className="acceso__cuerpo">
        <section className="acceso__tarjeta anim-crecer">
          <span className="etiqueta">Equipo</span>
          <h1>{titulo}</h1>
          <p className="acceso__bajada">{bajada}</p>
          {children}
        </section>
      </div>
      <PieInstitucional />
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

/**
 * Alguien con sesión de otra cuenta abrió el ingreso del equipo (8/11).
 * "Salir" cierra esa sesión y vuelve al formulario del equipo.
 */
const CUENTAS = {
  docente: { nombre: 'una cuenta de maestra', volver: '/maestra', volverTexto: 'Volver a mi panel' },
  alumno: { nombre: 'una cuenta de alumno', volver: '/lab', volverTexto: 'Volver a mi laboratorio' },
  otra: { nombre: 'una cuenta que no es del equipo, o que está suspendida', volver: '/', volverTexto: 'Volver al inicio' },
} as const;

export function RestringidoEquipo({ cuenta }: { cuenta: keyof typeof CUENTAS }) {
  const c = CUENTAS[cuenta];
  return (
    <Marco titulo="Acceso restringido" bajada={`El panel del equipo es solo para investigadoras e investigadores del Institut Pasteur. En este navegador entraste con ${c.nombre}.`}>
      <form action={salirEquipo} className="acceso__form">
        <button className="btn btn--primario btn--grande" type="submit">
          Salir y entrar con otra cuenta
        </button>
        <Link className="enlace" href={c.volver}>
          {c.volverTexto}
        </Link>
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
