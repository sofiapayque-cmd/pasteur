'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { correrPruebaAsistente, type EstadoPrueba } from '@/acciones/pruebaAsistente';
import { pedirRespuestas, type EstadoPedido } from '@/acciones/respuestas';

/*
  Botones de la prueba del asistente: correrla, y pedirle a la IA las
  respuestas que la prueba necesita y todavía no existen (hasta 4 por vez,
  con los mismos cupos que "Pedir respuestas").
*/
const enviar = (accion: (datos: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const datos = new FormData(e.currentTarget);
  startTransition(() => accion(datos));
};

export function CorrerPrueba({ casos, respuestas }: { casos: number; respuestas: number }) {
  const [estado, correr, corriendo] = useActionState<EstadoPrueba, FormData>(correrPruebaAsistente, { mensaje: '' });
  return (
    <form onSubmit={enviar(correr)} className="eq-form">
      <div className="eq-fila" style={{ alignItems: 'center' }}>
        <button className="btn btn--primario btn--chico" type="submit" disabled={corriendo}>
          {corriendo ? 'Probando…' : 'Correr la prueba'}
        </button>
        <span className="eq-ayuda">
          {corriendo
            ? `Probando ${casos} preguntas contra ${respuestas === 1 ? 'la respuesta aprobada' : `las ${respuestas} respuestas aprobadas`}. Tarda alrededor de un minuto.`
            : `${casos} preguntas · tarda alrededor de un minuto · cuesta menos de un centavo de dólar.`}
        </span>
      </div>
      {estado.mensaje && (
        <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

export function PedirFaltantes({ preguntas }: { preguntas: string[] }) {
  const [estado, pedir, pidiendo] = useActionState<EstadoPedido, FormData>(pedirRespuestas, { mensaje: '' });
  const tanda = preguntas.slice(0, 4);
  return (
    <form onSubmit={enviar(pedir)} className="eq-form">
      <input type="hidden" name="actividad" value="a3" />
      <input type="hidden" name="preguntas" value={tanda.join('\n')} />
      <div className="eq-fila" style={{ alignItems: 'center' }}>
        <button className="btn btn--secundario btn--chico" type="submit" disabled={pidiendo || tanda.length === 0}>
          {pidiendo ? 'La IA está buscando y redactando…' : `Pedirle a la IA ${tanda.length === 1 ? 'esta' : `estas ${tanda.length}`}`}
        </button>
        {pidiendo && <span className="eq-ayuda">Tarda unos minutos. Después las revisa una validadora en Respuestas.</span>}
      </div>
      {estado.mensaje && (
        <p className={`eq-mensaje ${estado.ok ? 'eq-mensaje--ok' : 'eq-mensaje--error'}`} role="status">
          {estado.mensaje}
        </p>
      )}
      {estado.resultados && (
        <ul className="eq-lista">
          {estado.resultados.map((r) => (
            <li key={r.pregunta} className="eq-tabla__chico">
              <strong>{r.pregunta}</strong> — {r.mensaje}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
