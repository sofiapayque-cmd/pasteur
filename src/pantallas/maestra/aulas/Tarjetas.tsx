'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { AulaResumen } from '@/acciones/aulas';
import type { Tarjeta } from '@/datos/cuentas-alumnos';
import './aulas.css';

/*
  Tarjetas de acceso de los alumnos. Las claves llegan del servidor UNA vez
  (al crear cuentas o al pedir claves nuevas) y viven solo en la memoria de
  esta pantalla: no se guardan en el navegador ni en la base. Al salir o
  recargar, desaparecen. Por eso: aviso, imprimir y confirmar antes de cerrar.
*/

const sinSuscripcion = () => () => {};

function detalleAula(aula: AulaResumen) {
  return [aula.nombre, aula.grado ? `${aula.grado}° año` : null, aula.anio_lectivo].filter(Boolean).join(' · ');
}

function TarjetaAcceso({ aula, tarjeta, entrada }: { aula: AulaResumen; tarjeta: Tarjeta; entrada: string }) {
  return (
    <article className="tarjeta-acceso" aria-label={`Tarjeta de ${tarjeta.usuario}`}>
      <div className="tarjeta-acceso__marca">
        <span>La ciencia sin límites</span>
        <span>{detalleAula(aula)}</span>
      </div>
      <dl className="tarjeta-acceso__datos">
        <div>
          <dt>Código del aula</dt>
          <dd>{aula.codigo}</dd>
        </div>
        <div>
          <dt>Tu número</dt>
          <dd>{String(tarjeta.numero).padStart(2, '0')}</dd>
        </div>
        <div className="tarjeta-acceso__fila-clave">
          <dt>Tu clave</dt>
          <dd className="tarjeta-acceso__clave">{tarjeta.clave}</dd>
        </div>
      </dl>
      <p className="tarjeta-acceso__entrar">
        Entrá en <strong>{entrada}</strong>
      </p>
      <p className="tarjeta-acceso__nombre">Nombre:</p>
    </article>
  );
}

export default function Tarjetas({
  aula,
  tarjetas,
  mensaje,
  onListo,
}: {
  aula: AulaResumen;
  tarjetas: Tarjeta[];
  mensaje?: string;
  onListo: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  // true solo en el navegador (el portal para imprimir necesita document.body)
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const entrada = enNavegador ? `${window.location.host}/clase` : '/clase';

  // Si la maestra intenta cerrar o recargar la pestaña, el navegador pregunta antes.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, []);

  const grilla = (
    <div className="tarjetas__grilla">
      {tarjetas.map((t) => (
        <TarjetaAcceso key={t.usuario} aula={aula} tarjeta={t} entrada={entrada} />
      ))}
    </div>
  );

  return (
    <section className="tarjetas" aria-labelledby="titulo-tarjetas">
      <h2 id="titulo-tarjetas">Tarjetas de acceso · {detalleAula(aula)}</h2>
      {mensaje && <p className="aulas__mensaje aulas__mensaje--ok" role="status">{mensaje}</p>}
      <p className="tarjetas__aviso">
        Estas claves se muestran una sola vez. Imprimilas o anotalas ahora: después no se pueden volver a ver. Si un alumno pierde
        la suya, le generás una nueva desde el aula.
      </p>
      <div className="tarjetas__botones">
        <button type="button" className="btn btn--primario" onClick={() => window.print()}>
          Imprimir tarjetas
        </button>
        {confirmando ? (
          <>
            <button type="button" className="btn btn--secundario" onClick={onListo}>
              Sí, ya las guardé
            </button>
            <button type="button" className="btn btn--claro" onClick={() => setConfirmando(false)}>
              Todavía no
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--claro" onClick={() => setConfirmando(true)}>
            Listo, ya las imprimí
          </button>
        )}
      </div>
      {grilla}
      {enNavegador && createPortal(<div className="hoja-impresion">{grilla}</div>, document.body)}
    </section>
  );
}
