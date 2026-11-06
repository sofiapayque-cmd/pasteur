'use client';

import { startTransition, useActionState, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import Moli from '@/components/Moli';
import FondoVivo from '@/components/FondoVivo';
import { ingresarAlumno, type EstadoIngreso } from '@/acciones/alumno';
import { normalizarCodigo } from '@/lib/aulas/ingreso';
import './cuenta.css';

/*
  NIÑO · ENTRAR CON SU TARJETA (sistema de aulas, etapa 4).
  Tres datos de la tarjeta: código del aula (4 casillas grandes, como antes),
  su número y su clave. Lo revisa y lo hace el servidor (acciones/alumno.ts).
  La clave se escribe tapada, con un botón para verla (computadoras compartidas).
  Se envía con onSubmit para que React no borre lo escrito si hubo un error.
*/
export default function IngresoCuenta({ codigoInicial = '' }: { codigoInicial?: string }) {
  const [estado, entrar, entrando] = useActionState<EstadoIngreso, FormData>(ingresarAlumno, { mensaje: '' });
  const inicial = normalizarCodigo(codigoInicial).padEnd(4, ' ').split('');
  const [letras, setLetras] = useState(inicial.map((l) => l.trim()));
  const [verClave, setVerClave] = useState(false);
  const casillas = useRef<(HTMLInputElement | null)[]>([]);
  const numero = useRef<HTMLInputElement>(null);

  function escribir(i: number, valor: string) {
    const limpio = normalizarCodigo(valor);
    if (limpio.length > 1) {
      // Pegaron el código entero: se reparte en las casillas
      setLetras(limpio.padEnd(4, ' ').split('').map((l) => l.trim()));
      if (limpio.length >= 4) numero.current?.focus();
      return;
    }
    const nuevas = [...letras];
    nuevas[i] = limpio;
    setLetras(nuevas);
    if (limpio && i < 3) casillas.current[i + 1]?.focus();
    if (limpio && i === 3) numero.current?.focus();
  }

  function tecla(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !letras[i] && i > 0) casillas.current[i - 1]?.focus();
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => entrar(datos));
  }

  const error = estado.mensaje && !entrando;
  return (
    <main className="pantalla entrar entrar--cuenta">
      <FondoVivo semilla={4} />
      <div className="entrar__moli" aria-hidden="true">
        <Moli animo={error ? 'duda' : 'feliz'} tamano={260} />
      </div>
      <form className="entrar__form" onSubmit={enviar}>
        <span className="etiqueta">La ciencia sin límites</span>
        <h1>¡Hola! Entrá con tu tarjeta</h1>

        <fieldset className="entrar__grupo">
          <legend>Código del aula</legend>
          <div className="entrar__casillas">
            {letras.map((l, i) => (
              <input
                key={i}
                ref={(el) => {
                  casillas.current[i] = el;
                }}
                value={l}
                onChange={(e) => escribir(i, e.target.value)}
                onKeyDown={(e) => tecla(i, e)}
                aria-label={`Letra ${i + 1} del código del aula`}
                aria-invalid={estado.campo === 'codigo' || undefined}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="casilla casilla--chica"
              />
            ))}
          </div>
          <input type="hidden" name="codigo" value={letras.join('')} />
        </fieldset>

        <div className="entrar__fila">
          <label className="entrar__campo entrar__campo--numero">
            <span>Tu número</span>
            <input
              ref={numero}
              name="numero"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              placeholder="7"
              aria-invalid={estado.campo === 'numero' || undefined}
              required
            />
          </label>
          <label className="entrar__campo entrar__campo--clave">
            <span>Tu clave</span>
            <span className="entrar__clave">
              <input
                name="clave"
                type={verClave ? 'text' : 'password'}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="sapo-luna-42"
                maxLength={40}
                aria-invalid={estado.campo === 'clave' || undefined}
                required
              />
              <button type="button" className="entrar__ver" onClick={() => setVerClave(!verClave)} aria-pressed={verClave}>
                {verClave ? 'Tapar' : 'Ver'}
              </button>
            </span>
          </label>
        </div>

        <p className="entrar__error" role="alert" aria-live="assertive">
          {error ? estado.mensaje : ''}
        </p>
        <button className="btn btn--primario btn--grande" type="submit" disabled={entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
        <Link className="enlace" href="/explorar">
          No tengo tarjeta: explorar sin entrar
        </Link>
      </form>
    </main>
  );
}
