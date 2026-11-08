'use client';

import Link from 'next/link';
import { startTransition, useActionState, type FormEvent } from 'react';
import { pedirAcceso, type EstadoAcceso } from '@/acciones/acceso';
import { CARGOS, DEPARTAMENTOS, GRADOS } from '@/lib/aulas/acceso';
import MarcoAcceso from './MarcoAcceso';

/*
  /pedir-acceso · Una escuela o maestra que encontró la plataforma pide entrar
  (pedido de Sofia, 6/11). El equipo del Pasteur lo ve en su panel y le crea
  la cuenta. Se envía con onSubmit para que React no borre lo escrito si hay
  que corregir algo.
*/
export default function PedirAcceso() {
  const [estado, pedir, enviando] = useActionState<EstadoAcceso, FormData>(pedirAcceso, { mensaje: '' });
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => pedir(datos));
  };

  if (estado.ok) {
    return (
      <MarcoAcceso etiqueta="Escuelas y maestras" titulo="¡Gracias!">
        <p className="acceso__listo" role="status">
          {estado.mensaje}
        </p>
        <Link className="btn btn--secundario" href="/">
          Volver al inicio
        </Link>
      </MarcoAcceso>
    );
  }

  return (
    <MarcoAcceso
      etiqueta="Escuelas y maestras"
      titulo="Pedí acceso"
      bajada="Para usar La ciencia sin límites con tu clase (4°, 5° y 6°). El equipo del Institut Pasteur de Montevideo te crea la cuenta y te escribe."
    >
      <form className="acceso__form pedir" onSubmit={enviar} noValidate>
        <label className="campo">
          <span className="campo__nombre">Tu nombre</span>
          <input className="campo__entrada" name="nombre" autoComplete="name" required maxLength={120} aria-invalid={estado.campo === 'nombre'} />
        </label>
        <label className="campo">
          <span className="campo__nombre">Mail (ahí te mandamos el acceso)</span>
          <input className="campo__entrada" type="email" name="email" autoComplete="email" required maxLength={254} aria-invalid={estado.campo === 'email'} />
        </label>
        <label className="campo">
          <span className="campo__nombre">Escuela (nombre o número)</span>
          <input className="campo__entrada" name="escuela" autoComplete="organization" required maxLength={160} aria-invalid={estado.campo === 'escuela'} />
        </label>
        <label className="campo">
          <span className="campo__nombre">Departamento</span>
          <select className="campo__entrada" name="departamento" defaultValue="" required aria-invalid={estado.campo === 'departamento'}>
            <option value="" disabled>
              Elegí…
            </option>
            {DEPARTAMENTOS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <fieldset className="pedir__grupo" aria-invalid={estado.campo === 'cargo'}>
          <legend className="campo__nombre">En la escuela sos…</legend>
          {CARGOS.map((c, i) => (
            <label key={c.id} className="pedir__opcion">
              <input type="radio" name="cargo" value={c.id} defaultChecked={i === 0} /> {c.nombre}
            </label>
          ))}
        </fieldset>
        <fieldset className="pedir__grupo">
          <legend className="campo__nombre">Con qué clases (opcional)</legend>
          <div className="pedir__fila">
            {GRADOS.map((g) => (
              <label key={g} className="pedir__opcion">
                <input type="checkbox" name="grados" value={g} /> {g}°
              </label>
            ))}
          </div>
        </fieldset>
        <label className="campo">
          <span className="campo__nombre">¿Algo más que nos quieras contar? (opcional)</span>
          <textarea className="campo__entrada pedir__mensaje" name="mensaje" rows={3} maxLength={1000} />
        </label>
        {/* Campo trampa para robots: las personas no lo ven */}
        <label className="pedir__trampa" aria-hidden="true">
          Sitio web
          <input name="sitio" tabIndex={-1} autoComplete="off" />
        </label>
        <p className="acceso__aviso">Usamos estos datos solo para responderte y darte acceso. No los compartimos con nadie.</p>
        <p className="acceso__mensaje" role="alert" aria-live="polite">
          {estado.mensaje}
        </p>
        <button className="btn btn--primario btn--grande" type="submit" disabled={enviando}>
          {enviando ? 'Mandando…' : 'Pedir acceso'}
        </button>
        <a className="enlace" href="/maestra/entrar">
          Ya tengo cuenta: entrar
        </a>
      </form>
    </MarcoAcceso>
  );
}
