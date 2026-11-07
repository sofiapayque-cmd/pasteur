'use client';

import Link from 'next/link';
import { salir } from '@/acciones/maestra';

/* Arriba a la derecha de las pantallas de la maestra: el asistente, sus aulas, quién entró y el botón para salir. */
export default function CuentaDocente({ nombre }: { nombre: string }) {
  return (
    <form action={salir} className="cuenta-docente">
      <Link className="btn btn--claro cuenta-docente__aulas" href="/maestra/preguntar">
        Preguntale al Pasteur
      </Link>
      <Link className="btn btn--secundario cuenta-docente__aulas" href="/maestra/aulas">
        Mis aulas
      </Link>
      <span className="etiqueta cuenta-docente__nombre">{nombre}</span>
      <button className="btn btn--claro" type="submit">
        Salir
      </button>
    </form>
  );
}
