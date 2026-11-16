'use client';

import { useActionState } from 'react';
import { corregirConIa, corregirTodasConIa, type EstadoPedido } from '@/acciones/respuestas';

/*
  "Corregir con la IA" (15/11, pedido de Sofia: "cuando clickeo corregir
  debería hacerse con IA, porque yo no tengo idea qué debería poner").
  La IA reescribe la respuesta siguiendo el comentario de la validadora, con
  los mismos artículos, y la vuelve a mandar a revisión.
  · BotonCorregir: una sola (en la tarjeta de Revisar y en la ficha).
  · CorregirTodas: todas las que tienen cambios pedidos, de una vez.
*/
const INICIAL: EstadoPedido = { mensaje: '' };

export function BotonCorregir({ versionId }: { versionId: string }) {
  const [estado, accion, corrigiendo] = useActionState<EstadoPedido, FormData>(corregirConIa.bind(null, versionId), INICIAL);
  return (
    <form action={accion} className="eq-corregir">
      <button className="btn btn--primario btn--chico" disabled={corrigiendo}>
        {corrigiendo ? 'Corrigiendo… (tarda un minuto)' : 'Corregir con la IA'}
      </button>
      {!corrigiendo && estado.mensaje && (
        <span className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </span>
      )}
    </form>
  );
}

export function CorregirTodas({ cantidad }: { cantidad: number }) {
  const [estado, accion, corrigiendo] = useActionState<EstadoPedido, FormData>(corregirTodasConIa, INICIAL);
  return (
    <section className="eq-caja eq-form" aria-labelledby="corregir-titulo">
      <div>
        <h2 id="corregir-titulo">
          {cantidad === 1 ? 'Hay 1 respuesta con cambios pedidos' : `Hay ${cantidad} respuestas con cambios pedidos`}
        </h2>
        <p className="eq-bajada">
          La IA las reescribe siguiendo lo que pidió la validadora, con los mismos artículos, y las vuelve a mandar a revisión.
        </p>
      </div>
      <form action={accion}>
        <button className="btn btn--primario" disabled={corrigiendo}>
          {corrigiendo ? `Corrigiendo… (puede tardar ${cantidad > 4 ? 'unos minutos' : 'un minuto'})` : cantidad === 1 ? 'Corregirla con la IA' : `Corregir las ${cantidad} con la IA`}
        </button>
      </form>
      {!corrigiendo && estado.mensaje && (
        <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </p>
      )}
      {!corrigiendo && estado.resultados && estado.resultados.some((r) => !r.enRevision) && (
        <ul className="eq-lista eq-resultados">
          {estado.resultados
            .filter((r) => !r.enRevision)
            .map((r, i) => (
              <li key={i} className="eq-resultados__no">
                <strong>{r.pregunta || 'Una respuesta'}</strong> {r.mensaje}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
