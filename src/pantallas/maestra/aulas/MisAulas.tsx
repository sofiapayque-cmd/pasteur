'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import { crearAula, type EstadoAula } from '@/acciones/aulas';
import type { AulaConCantidad } from '@/datos/aulas';
import Tarjetas from './Tarjetas';
import './aulas.css';

/* /maestra/aulas · Mis aulas: la lista y el formulario para crear una nueva. */

const GRADOS = [1, 2, 3, 4, 5, 6];

export function CamposAula({ valores, anioActual }: { valores?: Record<string, string>; anioActual: number }) {
  return (
    <>
      <label className="campo">
        <span className="campo__nombre">Nombre de la clase</span>
        <input className="campo__entrada" name="nombre" required maxLength={80} placeholder="4° B" defaultValue={valores?.nombre} />
      </label>
      <label className="campo">
        <span className="campo__nombre">Año escolar</span>
        <select className="campo__entrada" name="grado" defaultValue={valores?.grado ?? ''}>
          <option value="">Sin indicar</option>
          {GRADOS.map((g) => (
            <option key={g} value={g}>
              {g}° año
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span className="campo__nombre">Año lectivo</span>
        <input className="campo__entrada" name="anio" type="number" min={2024} max={2100} required defaultValue={valores?.anio || anioActual} />
      </label>
    </>
  );
}

export default function MisAulas({ aulas, cuenta, anioActual }: { aulas: AulaConCantidad[]; cuenta: string; anioActual: number }) {
  const router = useRouter();
  const [estado, accion, creando] = useActionState<EstadoAula, FormData>(crearAula, { mensaje: '' });
  const activas = aulas.filter((a) => !a.archivada_en);
  const archivadas = aulas.filter((a) => a.archivada_en);

  if (estado.ok && estado.aula && estado.tarjetas?.length) {
    const aula = estado.aula;
    return (
      <main className="pantalla aulas">
        <FondoVivo semilla={9} />
        <Cabecera miga="Inicio › Maestras › Mis aulas" derecha={<CuentaDocente nombre={cuenta} />} />
        <div className="aulas__cuerpo">
          <Tarjetas aula={aula} tarjetas={estado.tarjetas} mensaje={estado.mensaje} onListo={() => router.push(`/maestra/aulas/${aula.id}`)} />
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla aulas">
      <FondoVivo semilla={9} />
      <Cabecera volverA="/maestra" miga="Inicio › Maestras › Mis aulas" derecha={<CuentaDocente nombre={cuenta} />} />
      <div className="aulas__cuerpo">
        <div>
          <span className="etiqueta">Aulas</span>
          <h1>Mis aulas</h1>
          <p className="aulas__bajada">
            Cada aula tiene un código fijo. Cada alumno entra con ese código, su número de lista y una clave: nunca con su nombre ni su mail.
          </p>
        </div>

        <section className="aulas__bloque" aria-labelledby="titulo-nueva">
          <h2 id="titulo-nueva">Nueva aula</h2>
          <form action={accion} className="aulas__fila" noValidate>
            <CamposAula valores={estado.valores} anioActual={anioActual} />
            <label className="campo">
              <span className="campo__nombre">Cantidad de alumnos</span>
              <input className="campo__entrada" name="cantidad" type="number" min={1} max={40} required defaultValue={estado.valores?.cantidad || 25} />
            </label>
            <button className="btn btn--primario" type="submit" disabled={creando}>
              {creando ? 'Creando cuentas…' : 'Crear aula'}
            </button>
          </form>
          <p className="aulas__mensaje" role="alert" aria-live="polite">
            {estado.mensaje}
          </p>
        </section>

        <section aria-labelledby="titulo-activas" className="aulas__seccion">
          <h2 id="titulo-activas" className="etiqueta etiqueta--oscura">
            Este año
          </h2>
          {activas.length === 0 ? (
            <p className="aulas__vacio">Todavía no creaste ninguna aula.</p>
          ) : (
            <ul className="aulas__lista">
              {activas.map((a) => (
                <li key={a.id}>
                  <FichaAula aula={a} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {archivadas.length > 0 && (
          <section aria-labelledby="titulo-archivadas">
            <h2 id="titulo-archivadas" className="etiqueta">
              Archivadas
            </h2>
            <ul className="aulas__lista">
              {archivadas.map((a) => (
                <li key={a.id}>
                  <FichaAula aula={a} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function FichaAula({ aula }: { aula: AulaConCantidad }) {
  return (
    <Link href={`/maestra/aulas/${aula.id}`} className={`aulas__aula ${aula.archivada_en ? 'aulas__aula--archivada' : ''}`}>
      <span className="etiqueta">
        {aula.grado ? `${aula.grado}° año · ` : ''}
        {aula.anio_lectivo}
        {aula.archivada_en ? ' · archivada' : ''}
      </span>
      <h3>{aula.nombre}</h3>
      <span className="codigo-aula codigo-aula--grande">{aula.codigo}</span>
      <span>
        {aula.alumnos} {aula.alumnos === 1 ? 'alumno' : 'alumnos'}
      </span>
    </Link>
  );
}
