'use client';

import { useActionState, type ReactNode } from 'react';

/*
  Formulario del panel: llama a una Server Action y muestra su mensaje.
  La acción recibe (estadoAnterior, datos) y devuelve { mensaje, ok }.
  `confirmar` pide confirmación antes de mandar (para retirar o rechazar).
*/
type Estado = { mensaje: string; ok?: boolean };

export default function Forma({
  accion,
  children,
  boton,
  enviando = 'Guardando…',
  variante = 'primario',
  confirmar,
  className = 'eq-form',
}: {
  accion: (previo: Estado, datos: FormData) => Promise<Estado>;
  children?: ReactNode;
  boton: string;
  enviando?: string;
  variante?: 'primario' | 'secundario' | 'claro';
  confirmar?: string;
  className?: string;
}) {
  const [estado, despachar, pendiente] = useActionState<Estado, FormData>(accion, { mensaje: '' });
  return (
    <form
      action={despachar}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {children}
      <div className="eq-botones">
        <button className={`btn btn--${variante} btn--chico`} type="submit" disabled={pendiente}>
          {pendiente ? enviando : boton}
        </button>
        {estado.mensaje && (
          <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status" aria-live="polite">
            {estado.mensaje}
          </p>
        )}
      </div>
    </form>
  );
}
