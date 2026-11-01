'use client';

import { useActionState } from 'react';
import { ingresar, type EstadoFormulario } from '@/acciones/maestra';
import MarcoAcceso from './MarcoAcceso';

export default function Ingreso({ aviso }: { aviso?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(ingresar, { mensaje: aviso ?? '' });
  return (
    <MarcoAcceso etiqueta="Maestras" titulo="Entrá a tus aulas" bajada="Con el mail y la contraseña de tu invitación.">
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
        <a className="enlace" href="/maestra/recuperar">
          Olvidé mi contraseña
        </a>
      </form>
    </MarcoAcceso>
  );
}
