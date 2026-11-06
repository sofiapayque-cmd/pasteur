import Link from 'next/link';
import type { Cita, Version } from '@/datos/fichas';
import { NOMBRE_ESTADO, palabras, type Formato } from '@/lib/equipo/comun';

/*
  Una versión de ficha tal como la va a leer la validadora (o como quedó
  publicada). Solo lectura. "evidencia": para las citas que no copian el
  pasaje (por la licencia), la oración del resumen guardado, para que la
  validadora la compare sin salir de la página (es interno del equipo).
*/
export default function VistaVersion({
  v,
  formato,
  citas,
  autor,
  evidencia = {},
}: {
  v: Version;
  formato: Formato;
  citas?: Cita[];
  autor?: string;
  evidencia?: Record<string, string>;
}) {
  return (
    <div className="eq-form">
      <div className="eq-meta">
        <span className={`eq-estado eq-estado--${v.estado}`}>{NOMBRE_ESTADO[v.estado]}</span>
        <span>Versión {v.numero}</span>
        {autor && <span>Escribió: {autor}</span>}
        <span>
          {v.grado_min}° a {v.grado_max}° año
        </span>
        {v.asistida_por_ia && <span className="eq-ia">Redactada con IA</span>}
      </div>
      {v.asistida_por_ia && v.estado === 'en_revision' && (
        <p className="eq-caja eq-caja--aviso" style={{ margin: 0 }}>
          La escribió la IA a partir de los artículos de abajo. Revisá que cada idea esté en la oración que la respalda y que no falte ni sobre nada.
        </p>
      )}
      {formato === 'pregunta' && (
        <>
          <h3>{v.pregunta || 'Sin pregunta todavía'}</h3>
          {v.variantes.length > 0 && <p className="eq-ayuda">También: {v.variantes.join(' · ')}</p>}
        </>
      )}
      <div>
        <span className="campo__nombre">{formato === 'pregunta' ? 'Lo que ven los chicos' : 'El dato'}</span>
        <p className="eq-texto-infantil">{v.version_infantil || '—'}</p>
        <span className="eq-contador">{palabras(v.version_infantil)} palabras</span>
      </div>
      {formato === 'pregunta' && (
        <div>
          <span className="campo__nombre">Explicación científica</span>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.55 }}>{v.explicacion_cientifica || '—'}</p>
        </div>
      )}
      {v.nota_interna && <p className="eq-ayuda">Nota interna: {v.nota_interna}</p>}
      {citas && (
        <div>
          <span className="campo__nombre">Fuentes</span>
          <ul className="eq-lista">
            {citas.map((c) => (
              <li key={c.id} className="eq-cita">
                <strong>
                  {c.publicaciones ? (
                    <Link href={`/equipo/biblioteca/${c.publicaciones.id}`} target="_blank">
                      {c.publicaciones.titulo}
                    </Link>
                  ) : (
                    c.fuentes?.cita
                  )}
                </strong>
                {c.publicaciones && (
                  <span className="eq-meta">
                    <span>{[c.publicaciones.revista, c.publicaciones.anio].filter(Boolean).join(', ')}</span>
                    <span className={`eq-estado eq-estado--${c.publicaciones.estado}`}>{NOMBRE_ESTADO[c.publicaciones.estado]}</span>
                    <span>Licencia: {c.publicaciones.licencia_codigo ?? 'sin verificar'}</span>
                  </span>
                )}
                {c.pasaje && <blockquote>{c.pasaje_textual ? `“${c.pasaje}”` : c.pasaje}</blockquote>}
                {!c.pasaje && evidencia[c.id] && (
                  <blockquote>
                    “{evidencia[c.id]}” <span className="eq-ayuda">(del resumen; por la licencia no se copia en la ficha)</span>
                  </blockquote>
                )}
                {c.parafrasis && <span>Paráfrasis: {c.parafrasis}</span>}
                {c.ubicacion && <span className="eq-meta">Dónde está: {c.ubicacion}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
