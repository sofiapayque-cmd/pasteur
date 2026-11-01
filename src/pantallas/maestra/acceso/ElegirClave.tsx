'use client';

import { useActionState } from 'react';
import { elegirClave, type EstadoFormulario } from '@/acciones/maestra';
import MarcoAcceso from './MarcoAcceso';

export default function ElegirClave({ email }: { email: string | null }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(elegirClave, { mensaje: '' });
  return (
    <MarcoAcceso etiqueta="Maestras" titulo="Elegí tu contraseña" bajada={email ? `Para entrar como ${email}. Al menos 10 caracteres.` : 'Al menos 10 caracteres.'}>
      <form action={accion} className="acceso__form" noValidate>
        {/* para que el gestor de contraseñas la guarde con el mail correcto */}
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
    </MarcoAcceso>
  );
}
