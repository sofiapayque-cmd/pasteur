'use client';

import { useState, useTransition } from 'react';
import type { EstadoTareaForm } from '@/acciones/tareas';

/* En "Empezar una clase en vivo": hacer en vivo una actividad que ya se mandó (el avance de cada chico es el mismo). */
export default function TareasParaClase({
  tareas,
  accion,
}: {
  tareas: { id: string; nombre: string; detalle: string }[];
  accion: (tareaId: string) => Promise<EstadoTareaForm>;
}) {
  const [mensaje, setMensaje] = useState('');
  const [pendiente, empezar] = useTransition();
  if (!tareas.length) return null;
  return (
    <section className="aulas__bloque" aria-labelledby="titulo-ya-mandadas">
      <h2 id="titulo-ya-mandadas">O hacé en vivo una que ya mandaste</h2>
      <ul className="aula__tareas">
        {tareas.map((t) => (
          <li key={t.id} className="aula__tarea">
            <div>
              <strong>{t.nombre}</strong>
              <span className="aulas__bajada">{t.detalle}</span>
            </div>
            <button
              className="btn btn--secundario btn--chico"
              type="button"
              disabled={pendiente}
              onClick={() =>
                empezar(async () => {
                  const r = await accion(t.id);
                  if (r?.mensaje) setMensaje(r.mensaje);
                })
              }
            >
              Hacerla en vivo
            </button>
          </li>
        ))}
      </ul>
      {mensaje && (
        <p className="aulas__mensaje" role="status">
          {mensaje}
        </p>
      )}
    </section>
  );
}
