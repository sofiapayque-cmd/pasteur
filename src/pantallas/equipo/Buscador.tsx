'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import Forma from './Forma';
import { agregarPublicacion, buscarPublicaciones, type EstadoBusqueda } from '@/acciones/biblioteca';
import { NOMBRE_ESTADO } from '@/lib/equipo/comun';
import { NOMBRE_PROVEEDOR } from '@/lib/ciencia/normalizar';

/*
  Búsqueda en vivo en PubMed, OpenAlex y Europe PMC. Buscar no guarda nada: solo
  "Agregar" crea una candidata (el servidor vuelve a pedir el registro a la
  fuente). El mismo trabajo que aparece en las dos fuentes se muestra una vez.
*/
const TIPO: Record<string, string> = { articulo: 'Artículo', revision: 'Revisión', preprint: 'Preprint (sin revisión de pares)', otro: 'Otro' };

export default function Buscador() {
  const [estado, buscar, buscando] = useActionState<EstadoBusqueda, FormData>(buscarPublicaciones, { mensaje: '' });
  const c = estado.consulta ?? {};
  return (
    <div className="eq-form">
      <form action={buscar} className="eq-form eq-caja">
        <div className="eq-fila">
          <label className="campo" style={{ flex: '3 1 320px' }}>
            <span className="campo__nombre">Buscar artículos</span>
            <input className="campo__entrada" name="q" required minLength={3} maxLength={300} defaultValue={c.q} placeholder="dengue virus mosquito saliva" />
          </label>
          <label className="campo" style={{ flex: '0 1 110px' }}>
            <span className="campo__nombre">Desde</span>
            <input className="campo__entrada" name="desde" inputMode="numeric" maxLength={4} defaultValue={c.desde} placeholder="2015" />
          </label>
          <label className="campo" style={{ flex: '0 1 110px' }}>
            <span className="campo__nombre">Hasta</span>
            <input className="campo__entrada" name="hasta" inputMode="numeric" maxLength={4} defaultValue={c.hasta} />
          </label>
        </div>
        <div className="eq-botones">
          <label className="eq-check">
            <input type="checkbox" name="abierto" defaultChecked={c.abierto === 'on'} /> Solo acceso abierto
          </label>
          <label className="eq-check">
            <input type="checkbox" name="instituto" defaultChecked={c.instituto === 'on'} /> Solo del Institut Pasteur de Montevideo
          </label>
          <button className="btn btn--primario btn--chico" type="submit" disabled={buscando}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        <p className="eq-ayuda">Casi todo está en inglés: buscá en inglés. La búsqueda va a PubMed, OpenAlex y Europe PMC a la vez y no se guarda nada hasta que tocás “Agregar”.</p>
      </form>

      {estado.mensaje && <p className={`eq-mensaje ${estado.ok ? '' : 'eq-mensaje--error'}`}>{estado.mensaje}</p>}
      {estado.avisos?.map((a) => (
        <p key={a} className="eq-caja eq-caja--aviso">
          {a}
        </p>
      ))}
      {estado.resultados && estado.resultados.length > 0 && (
        <p className="eq-ayuda">
          {estado.resultados.length} resultados (PubMed encontró {estado.totales?.pubmed ?? 0}; OpenAlex, {estado.totales?.openalex ?? 0}; Europe PMC, {estado.totales?.europepmc ?? 0}). Se muestran los más relevantes.
        </p>
      )}
      <ul className="eq-lista">
        {estado.resultados?.map((r) => (
          <li key={r.clave} className="eq-caja eq-resultado">
            <h3>{r.titulo}</h3>
            <div className="eq-meta">
              <span>{[r.revista, r.anio].filter(Boolean).join(', ')}</span>
              <span>{TIPO[r.tipo]}</span>
              {r.abierto && <span>Acceso abierto</span>}
              {r.licencia && <span>Licencia: {r.licencia}</span>}
              {r.del_instituto && <span className="eq-estado eq-estado--aprobada">Institut Pasteur de Montevideo</span>}
              {r.retractada && <span className="eq-estado eq-estado--retirada">Retractado</span>}
              <span>Fuente: {r.fuentes.map((f) => NOMBRE_PROVEEDOR[f.proveedor]).join(' + ')}</span>
            </div>
            {r.autores && <p className="eq-ayuda">{r.autores}</p>}
            {r.resumen && (
              <details className="eq-detalles">
                <summary>Resumen</summary>
                <p>{r.resumen}{r.resumen.length >= 600 ? '…' : ''}</p>
              </details>
            )}
            <div className="eq-botones">
              {r.pmid && (
                <a className="enlace" href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`} target="_blank" rel="noreferrer noopener">
                  Ver en PubMed
                </a>
              )}
              {r.doi && (
                <a className="enlace" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer noopener">
                  Ver en la revista
                </a>
              )}
              {r.enBiblioteca ? (
                <Link className="btn btn--secundario btn--chico" href={`/equipo/biblioteca/${r.enBiblioteca.id}`}>
                  Ya está en la biblioteca ({NOMBRE_ESTADO[r.enBiblioteca.estado]})
                </Link>
              ) : r.retractada ? (
                <span className="eq-ayuda">Retractado: no se agrega.</span>
              ) : (
                <Forma accion={agregarPublicacion.bind(null, r.fuentes[0].proveedor, r.fuentes[0].id_externo)} boton="Agregar a la biblioteca" enviando="Agregando…" className="" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
