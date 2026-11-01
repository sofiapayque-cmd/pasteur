'use client';

import { salir } from '@/acciones/maestra';

/* Arriba a la derecha del panel: quién entró y el botón para salir. */
export default function CuentaDocente({ nombre }: { nombre: string }) {
  return (
    <form action={salir} className="cuenta-docente">
      <span className="etiqueta cuenta-docente__nombre">{nombre}</span>
      <button className="btn btn--claro" type="submit">
        Salir
      </button>
    </form>
  );
}
