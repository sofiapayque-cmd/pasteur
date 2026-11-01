'use client';

import { useActionState, useState } from 'react';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import { agregarAlumnos, archivarAula, cambiarActivo, guardarAula, nuevaClave, nuevasClavesDelGrupo, type EstadoAula } from '@/acciones/aulas';
import type { Alumno, Aula } from '@/datos/aulas';
import Tarjetas from './Tarjetas';
import { CamposAula } from './MisAulas';
import './aulas.css';

/* /maestra/aulas/[id] · Un aula: su código, sus alumnos, agregar alumnos y claves nuevas. */

const fecha = new Intl.DateTimeFormat('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' });

// Un solo estado para todas las acciones de la pantalla: la última respuesta
// del servidor decide qué mensaje (y qué tarjetas) se muestran.
async function despachar(previo: EstadoAula, datos: FormData): Promise<EstadoAula> {
  switch (datos.get('que')) {
    case 'agregar':
      return agregarAlumnos(previo, datos);
    case 'clave':
      return nuevaClave(previo, datos);
    case 'grupo':
      return nuevasClavesDelGrupo(previo, datos);
    case 'guardar':
      return guardarAula(previo, datos);
    default:
      return previo;
  }
}

export default function AulaDetalle({ aula, alumnos, cuenta, anioActual }: { aula: Aula; alumnos: Alumno[]; cuenta: string; anioActual: number }) {
  const [estado, accion, trabajando] = useActionState<EstadoAula, FormData>(despachar, { mensaje: '' });
  const [guardadas, setGuardadas] = useState<EstadoAula | null>(null);
  const archivada = Boolean(aula.archivada_en);
  const activos = alumnos.filter((a) => a.activo).length;

  if (estado.ok && estado.aula && estado.tarjetas?.length && guardadas !== estado) {
    return (
      <main className="pantalla aulas">
        <FondoVivo semilla={9} />
        <Cabecera miga={`Inicio › Maestras › Mis aulas › ${aula.nombre}`} derecha={<CuentaDocente nombre={cuenta} />} />
        <div className="aulas__cuerpo">
          <Tarjetas aula={estado.aula} tarjetas={estado.tarjetas} mensaje={estado.mensaje} onListo={() => setGuardadas(estado)} />
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla aulas">
      <FondoVivo semilla={9} />
      <Cabecera volverA="/maestra/aulas" miga={`Inicio › Maestras › Mis aulas › ${aula.nombre}`} derecha={<CuentaDocente nombre={cuenta} />} />
      <div className="aulas__cuerpo">
        <div className="aula__cabeza">
          <div>
            <span className="etiqueta">
              {aula.grado ? `${aula.grado}° año · ` : ''}
              {aula.anio_lectivo}
              {archivada ? ' · archivada' : ''}
            </span>
            <h1>{aula.nombre}</h1>
            <p className="aulas__bajada">
              {alumnos.length} {alumnos.length === 1 ? 'alumno' : 'alumnos'} · {activos} {activos === 1 ? 'activo' : 'activos'}
            </p>
          </div>
          <div className="aula__codigo">
            <span className="etiqueta">Código del aula</span>
            <span className="codigo-aula codigo-aula--grande" data-codigo>
              {aula.codigo}
            </span>
          </div>
        </div>

        <p className={`aulas__mensaje ${estado.ok ? 'aulas__mensaje--ok' : ''}`} role="status" aria-live="polite">
          {estado.mensaje}
        </p>

        <section className="aulas__bloque" aria-labelledby="titulo-alumnos">
          <h2 id="titulo-alumnos">Alumnos</h2>
          {alumnos.length === 0 ? (
            <p className="aulas__vacio">Esta aula todavía no tiene alumnos.</p>
          ) : (
            <div className="aula__tabla-marco">
              <table className="aula__tabla">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Usuario</th>
                    <th>Apodo</th>
                    <th>Último ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((a) => (
                    <tr key={a.id} className={a.activo ? '' : 'aula__inactivo'} data-usuario={a.usuario}>
                      <td>{String(a.numero).padStart(2, '0')}</td>
                      <td className="codigo-aula">{a.usuario}</td>
                      <td>{a.apodo ?? '—'}</td>
                      <td>{a.ultimo_ingreso ? fecha.format(new Date(a.ultimo_ingreso)) : 'Nunca'}</td>
                      <td>
                        <div className="aula__acciones">
                          {a.activo && !archivada && (
                            <form action={accion}>
                              <input type="hidden" name="que" value="clave" />
                              <input type="hidden" name="alumno" value={a.id} />
                              <button className="btn btn--secundario btn--chico" type="submit" disabled={trabajando}>
                                Nueva clave
                              </button>
                            </form>
                          )}
                          {!archivada && (
                            <form action={cambiarActivo}>
                              <input type="hidden" name="alumno" value={a.id} />
                              <input type="hidden" name="activo" value={a.activo ? 'no' : 'si'} />
                              <button className="btn btn--claro btn--chico" type="submit">
                                {a.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!archivada && (
          <section className="aulas__bloque" aria-labelledby="titulo-agregar">
            <h2 id="titulo-agregar">Agregar alumnos</h2>
            <form action={accion} className="aulas__fila aulas__fila--corta">
              <input type="hidden" name="que" value="agregar" />
              <input type="hidden" name="aula" value={aula.id} />
              <label className="campo">
                <span className="campo__nombre">Cuántos</span>
                <input className="campo__entrada" name="cantidad" type="number" min={1} max={40} defaultValue={1} required />
              </label>
              <button className="btn btn--primario" type="submit" disabled={trabajando}>
                {trabajando ? 'Creando…' : 'Agregar'}
              </button>
            </form>
          </section>
        )}

        {!archivada && activos > 0 && (
          <details className="aulas__bloque aula__detalles">
            <summary>Claves nuevas para todo el grupo</summary>
            <form action={accion} className="acceso__form">
              <input type="hidden" name="que" value="grupo" />
              <input type="hidden" name="aula" value={aula.id} />
              <label className="aula__confirmar">
                <input type="checkbox" name="confirmo" value="si" required />
                <span>
                  Entiendo que las {activos} tarjetas que ya repartí dejan de servir y que tengo que imprimir tarjetas nuevas para todos.
                </span>
              </label>
              <button className="btn btn--secundario" type="submit" disabled={trabajando}>
                Generar claves nuevas
              </button>
            </form>
          </details>
        )}

        <details className="aulas__bloque aula__detalles">
          <summary>Datos del aula</summary>
          <form action={accion} className="aulas__fila">
            <input type="hidden" name="que" value="guardar" />
            <input type="hidden" name="aula" value={aula.id} />
            <CamposAula valores={{ nombre: aula.nombre, grado: aula.grado ? String(aula.grado) : '', anio: String(aula.anio_lectivo) }} anioActual={anioActual} />
            <button className="btn btn--secundario" type="submit" disabled={trabajando}>
              Guardar
            </button>
          </form>
          <form action={archivarAula}>
            <input type="hidden" name="aula" value={aula.id} />
            <input type="hidden" name="archivar" value={archivada ? 'no' : 'si'} />
            <p className="aulas__bajada">
              {archivada
                ? 'El aula está archivada: sus alumnos no pueden trabajar. Reactivala si la necesitás de nuevo.'
                : 'Al terminar el año, archivá el aula: no se borra nada, pero los alumnos ya no pueden empezar actividades.'}
            </p>
            <button className="btn btn--claro" type="submit">
              {archivada ? 'Reactivar aula' : 'Archivar aula'}
            </button>
          </form>
        </details>
      </div>
    </main>
  );
}
