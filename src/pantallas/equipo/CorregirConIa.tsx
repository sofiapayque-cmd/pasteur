'use client';

import { useActionState } from 'react';
import { completarTodasConIa, corregirConIa, corregirTodasConIa, type EstadoPedido } from '@/acciones/respuestas';

/*
  Corregir y completar con la IA (15/11, pedido de Sofia: "cuando clickeo
  corregir debería hacerse con IA, porque yo no tengo idea qué debería
  poner"; y "si lo básico no lo dicen los artículos, habría que buscarlo en
  otro lado"). La IA usa los artículos que ya tenía la respuesta y busca
  otros nuevos para lo que pidió la validadora o lo que faltó.
  · BotonCorregir: una sola (en la tarjeta de Revisar).
  · CorregirTodas: las que tienen cambios pedidos.
  · CompletarTodas: las que esperan revisión pero quedaron incompletas.
*/
const INICIAL: EstadoPedido = { mensaje: '' };

export function BotonCorregir({ versionId, completar = false }: { versionId: string; completar?: boolean }) {
  const [estado, accion, corrigiendo] = useActionState<EstadoPedido, FormData>(corregirConIa.bind(null, versionId), INICIAL);
  return (
    <form action={accion} className="eq-corregir">
      <button className={`btn btn--chico ${completar ? 'btn--claro' : 'btn--primario'}`} disabled={corrigiendo}>
        {corrigiendo ? `${completar ? 'Completando' : 'Corrigiendo'}… (tarda un par de minutos)` : completar ? 'Completar con la IA' : 'Corregir con la IA'}
      </button>
      {!corrigiendo && estado.mensaje && (
        <span className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </span>
      )}
    </form>
  );
}

function Lote({
  id,
  titulo,
  bajada,
  boton,
  enCurso,
  cantidad,
  hacer,
}: {
  id: string;
  titulo: string;
  bajada: string;
  boton: string;
  enCurso: string;
  cantidad: number;
  hacer: () => Promise<EstadoPedido>;
}) {
  const [estado, accion, corriendo] = useActionState<EstadoPedido, FormData>(hacer, INICIAL);
  return (
    <section className="eq-caja eq-form" aria-labelledby={id}>
      <div>
        <h2 id={id}>{titulo}</h2>
        <p className="eq-bajada">{bajada}</p>
      </div>
      <form action={accion}>
        <button className="btn btn--primario" disabled={corriendo}>
          {corriendo ? `${enCurso}… (puede tardar ${cantidad > 2 ? 'unos minutos' : 'un par de minutos'})` : boton}
        </button>
      </form>
      {!corriendo && estado.mensaje && (
        <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </p>
      )}
      {!corriendo && estado.resultados && estado.resultados.some((r) => !r.enRevision) && (
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

// De a 4 por vez (cada una busca artículos y redacta): el botón dice cuántas hace ahora
const AHORA = 4;

export function CorregirTodas({ cantidad }: { cantidad: number }) {
  const ahora = Math.min(cantidad, AHORA);
  return (
    <Lote
      id="corregir-titulo"
      titulo={cantidad === 1 ? 'Hay 1 respuesta con cambios pedidos' : `Hay ${cantidad} respuestas con cambios pedidos`}
      bajada="La IA las reescribe siguiendo lo que pidió la validadora. Usa los artículos que ya tenían y busca otros nuevos para lo que pidió, y las vuelve a mandar a revisión."
      boton={cantidad === 1 ? 'Corregirla con la IA' : cantidad > AHORA ? `Corregir ${ahora} con la IA` : `Corregir las ${cantidad} con la IA`}
      enCurso="Corrigiendo"
      cantidad={ahora}
      hacer={corregirTodasConIa}
    />
  );
}

export function CompletarTodas({ cantidad }: { cantidad: number }) {
  const ahora = Math.min(cantidad, AHORA);
  return (
    <Lote
      id="completar-titulo"
      titulo={cantidad === 1 ? 'Hay 1 respuesta incompleta' : `Hay ${cantidad} respuestas incompletas`}
      bajada="Esperan revisión, pero les faltó algo porque no estaba en sus artículos. La IA busca artículos nuevos para eso y las completa. Se hace una sola vez por respuesta; después decide la validadora."
      boton={cantidad === 1 ? 'Completarla con la IA' : cantidad > AHORA ? `Completar ${ahora} con la IA` : `Completar las ${cantidad} con la IA`}
      enCurso="Completando"
      cantidad={ahora}
      hacer={completarTodasConIa}
    />
  );
}
