'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { elegirApodo, type EstadoApodo } from '@/acciones/alumno';
import { APODOS, COLORES_ALUMNO } from '@/data/contenido';

/*
  Apodo científico y color del alumno. Se eligen (no se escriben): así nadie
  pone su nombre real. Muestra 6 apodos (los primeros dependen del número
  del alumno, así no son iguales para toda la clase); "Ver otros" trae 6 más.
*/
type Color = { id: string; nombre: string; valor: string };

function seisPrimeros(semilla: number, sin: string | null): string[] {
  const lista = (APODOS as string[]).filter((a) => a !== sin);
  const desde = (semilla * 7) % lista.length;
  const rotada = [...lista.slice(desde), ...lista.slice(0, desde)];
  // El apodo que ya tiene va primero, para que se vea elegido
  return sin ? [sin, ...rotada.slice(0, 5)] : rotada.slice(0, 6);
}

function seisAlAzar(sin?: string | null): string[] {
  const lista = (APODOS as string[]).filter((a) => a !== sin);
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista.slice(0, 6);
}

export default function ElegirApodo({ actual, colorActual, semilla }: { actual: string | null; colorActual: string | null; semilla: number }) {
  const [estado, guardar, guardando] = useActionState<EstadoApodo, FormData>(elegirApodo, { mensaje: '' });
  const [opciones, setOpciones] = useState<string[]>(() => seisPrimeros(semilla, actual));
  const [apodo, setApodo] = useState<string | null>(actual);
  const [color, setColor] = useState<string>(colorActual ?? (COLORES_ALUMNO as Color[])[3].valor);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => guardar(datos));
  }

  return (
    <form className="lab__apodo" onSubmit={enviar}>
      <input type="hidden" name="apodo" value={apodo ?? ''} />
      <input type="hidden" name="color" value={color} />
      <div className="apodo__opciones" role="group" aria-label="Apodos">
        {opciones.map((a) => (
          <button
            key={a}
            type="button"
            className={`apodo__opcion ${apodo === a ? 'apodo__opcion--elegida' : ''}`}
            aria-pressed={apodo === a}
            onClick={() => setApodo(a)}
          >
            {a}
          </button>
        ))}
      </div>
      <button type="button" className="enlace" onClick={() => setOpciones(seisAlAzar(apodo))}>
        ↻ Ver otros apodos
      </button>
      <span className="etiqueta apodo__titulo-color">Tu color</span>
      <div className="apodo__colores" role="group" aria-label="Colores">
        {(COLORES_ALUMNO as Color[]).map((c) => (
          <button
            key={c.id}
            type="button"
            className={`apodo__color ${color === c.valor ? 'apodo__color--elegido' : ''}`}
            style={{ background: c.valor }}
            aria-label={c.nombre}
            aria-pressed={color === c.valor}
            onClick={() => setColor(c.valor)}
          />
        ))}
      </div>
      <div className="lab__fila">
        <button className="btn btn--primario" type="submit" disabled={!apodo || guardando}>
          {guardando ? 'Guardando…' : 'Listo'}
        </button>
        {estado.mensaje && !guardando && (
          <p className={estado.ok ? 'lab__ok' : 'entrar__error'} role="status">
            {estado.mensaje}
          </p>
        )}
      </div>
    </form>
  );
}
