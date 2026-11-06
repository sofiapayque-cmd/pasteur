import type { Cita, Version } from '@/datos/fichas';
import { NOMBRE_ESTADO, palabras, type Formato } from '@/lib/equipo/comun';

/* Una versión de ficha tal como la va a leer la validadora (o como quedó publicada). Solo lectura. */
export default function VistaVersion({ v, formato, citas, autor }: { v: Version; formato: Formato; citas?: Cita[]; autor?: string }) {
  return (
    <div className="eq-form">
      <div className="eq-meta">
        <span className={`eq-estado eq-estado--${v.estado}`}>{NOMBRE_ESTADO[v.estado]}</span>
        <span>Versión {v.numero}</span>
        {autor && <span>Escribió: {autor}</span>}
        <span>
          {v.grado_min}° a {v.grado_max}° año
        </span>
        {v.asistida_por_ia && <span>Borrador asistido por IA</span>}
      </div>
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
                <strong>{c.publicaciones ? c.publicaciones.titulo : c.fuentes?.cita}</strong>
                {c.publicaciones && (
                  <span className="eq-meta">
                    <span>{[c.publicaciones.revista, c.publicaciones.anio].filter(Boolean).join(', ')}</span>
                    <span className={`eq-estado eq-estado--${c.publicaciones.estado}`}>{NOMBRE_ESTADO[c.publicaciones.estado]}</span>
                    <span>Licencia: {c.publicaciones.licencia_codigo ?? 'sin verificar'}</span>
                  </span>
                )}
                {c.pasaje && <blockquote>{c.pasaje_textual ? `“${c.pasaje}”` : c.pasaje}</blockquote>}
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
