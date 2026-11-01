'use client';

import { useActionState } from 'react';
import { recuperarClave, type EstadoFormulario } from '@/acciones/maestra';
import MarcoAcceso from './MarcoAcceso';

export default function Recuperar() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(recuperarClave, { mensaje: '' });
  return (
    <MarcoAcceso etiqueta="Maestras" titulo="Elegí una contraseña nueva" bajada="Te mandamos un link a tu mail.">
      {estado.ok ? (
        <p className="acceso__listo" role="status">
          {estado.mensaje}
        </p>
      ) : (
        <form action={accion} className="acceso__form" noValidate>
          <label className="campo">
            <span className="campo__nombre">Mail</span>
            <input className="campo__entrada" type="email" name="email" autoComplete="username" required defaultValue={estado.email} />
          </label>
          <p className="acceso__mensaje" role="alert" aria-live="polite">
            {estado.mensaje}
          </p>
          <button className="btn btn--primario btn--grande" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Mandarme el link'}
          </button>
        </form>
      )}
      <a className="enlace" href="/maestra/entrar">
        Volver a entrar
      </a>
    </MarcoAcceso>
  );
}
