'use client';

import { useState } from 'react';
import Link from 'next/link';
import Forma from './Forma';
import { actualizarCita, agregarCita, quitarCita } from '@/acciones/fichas';
import { NOMBRE_ESTADO, POLITICA_PASAJE } from '@/lib/equipo/comun';

/*
  Citas de una versión: de dónde sale lo que dice la ficha.
  · Artículo de la biblioteca: el pasaje que sirve (textual si la licencia lo
    permite), dónde está (sección, página, figura) y, si no se copia, una
    paráfrasis. Para mandar a revisión, el artículo tiene que estar aprobado.
  · Otra fuente: libro, sitio, conversación con una investigadora…
*/
export type CitaVista = {
  id: string;
  publicacion_id: string | null;
  pasaje: string;
  pasaje_textual: boolean;
  ubicacion: string;
  parafrasis: string;
  publicaciones: { id: string; titulo: string; anio: number | null; revista: string; estado: string; licencia_codigo: string | null } | null;
  fuentes: { id: string; tipo: string; cita: string; url: string | null; anio: number | null } | null;
};
type PublicacionOpcion = { id: string; titulo: string; anio: number | null; estado: string; licencia_codigo: string | null };
type FuenteOpcion = { id: string; tipo: string; cita: string };

const TIPOS_FUENTE: Record<string, string> = {
  libro: 'Libro',
  sitio: 'Sitio web',
  comunicacion: 'Comunicación de una investigadora',
  material_docente: 'Material docente',
  otro: 'Otro',
};

function CamposPasaje({ c, politica }: { c?: Partial<CitaVista>; politica?: string }) {
  return (
    <>
      <label className="campo">
        <span className="campo__nombre">Pasaje que respalda la ficha</span>
        <textarea className="campo__entrada" name="pasaje" rows={3} maxLength={600} defaultValue={c?.pasaje ?? ''} />
        <span className="eq-ayuda">Una o dos oraciones del artículo. {politica ? POLITICA_PASAJE[politica] : ''}</span>
      </label>
      <label className="eq-check">
        <input type="checkbox" name="textual" defaultChecked={c?.pasaje_textual ?? false} /> Es una cita textual (copiada tal cual)
      </label>
      <div className="eq-fila">
        <label className="campo">
          <span className="campo__nombre">Dónde está</span>
          <input className="campo__entrada" name="ubicacion" maxLength={120} defaultValue={c?.ubicacion ?? ''} placeholder="Resumen · Resultados, figura 2 · p. 14" />
        </label>
      </div>
      <label className="campo">
        <span className="campo__nombre">Paráfrasis (con tus palabras)</span>
        <textarea className="campo__entrada" name="parafrasis" rows={2} maxLength={600} defaultValue={c?.parafrasis ?? ''} />
        <span className="eq-ayuda">Obligatoria si el pasaje no es textual o si la licencia no deja copiar.</span>
      </label>
    </>
  );
}

export default function Citas({
  versionId,
  citas,
  editable,
  publicaciones,
  fuentes,
  politicas,
}: {
  versionId: string;
  citas: CitaVista[];
  editable: boolean;
  publicaciones: PublicacionOpcion[];
  fuentes: FuenteOpcion[];
  politicas: Record<string, string>;
}) {
  const [origen, setOrigen] = useState<'publicacion' | 'fuente' | 'nueva'>('publicacion');
  const [elegida, setElegida] = useState('');
  const pub = publicaciones.find((p) => p.id === elegida);
  const politicaDe = (codigo: string | null | undefined) => politicas[codigo ?? 'desconocida'] ?? 'solo_ubicacion';

  return (
    <div className="eq-form">
      {citas.length === 0 && <p className="eq-bajada">Todavía no tiene fuentes. Para mandarla a revisión hace falta al menos una.</p>}
      <ul className="eq-lista">
        {citas.map((c) => (
          <li key={c.id} className="eq-cita">
            {c.publicaciones ? (
              <>
                <strong>
                  <Link href={`/equipo/biblioteca/${c.publicaciones.id}`}>{c.publicaciones.titulo}</Link>
                </strong>
                <span className="eq-meta">
                  <span>{[c.publicaciones.revista, c.publicaciones.anio].filter(Boolean).join(', ')}</span>
                  <span className={`eq-estado eq-estado--${c.publicaciones.estado}`}>{NOMBRE_ESTADO[c.publicaciones.estado]}</span>
                  <span>Licencia: {c.publicaciones.licencia_codigo ?? 'sin verificar'}</span>
                </span>
              </>
            ) : (
              <>
                <strong>{c.fuentes?.cita}</strong>
                <span className="eq-meta">
                  <span>{TIPOS_FUENTE[c.fuentes?.tipo ?? 'otro']}</span>
                  {c.fuentes?.url && (
                    <a href={c.fuentes.url} target="_blank" rel="noreferrer noopener">
                      enlace
                    </a>
                  )}
                </span>
              </>
            )}
            {editable ? (
              <details className="eq-detalles" open={!c.ubicacion}>
                <summary>{c.pasaje ? `“${c.pasaje.slice(0, 80)}${c.pasaje.length > 80 ? '…' : ''}”` : 'Completar pasaje y ubicación'}</summary>
                <Forma accion={actualizarCita.bind(null, c.id)} boton="Guardar cita">
                  <CamposPasaje c={c} politica={c.publicaciones ? politicaDe(c.publicaciones.licencia_codigo) : undefined} />
                </Forma>
                <Forma accion={quitarCita.bind(null, c.id)} boton="Quitar esta cita" variante="claro" confirmar="¿Quitar esta cita de la ficha?" className="" />
              </details>
            ) : (
              <>
                {c.pasaje && <blockquote>{c.pasaje_textual ? `“${c.pasaje}”` : c.pasaje}</blockquote>}
                {c.parafrasis && <span>Paráfrasis: {c.parafrasis}</span>}
                {c.ubicacion && <span className="eq-meta">Dónde está: {c.ubicacion}</span>}
              </>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <details className="eq-detalles eq-caja">
          <summary>Agregar una fuente</summary>
          <fieldset className="eq-fila" style={{ border: 0, padding: 0, margin: 'var(--space-2) 0' }}>
            <legend className="solo-lector">De dónde sale</legend>
            <label className="eq-check">
              <input type="radio" checked={origen === 'publicacion'} onChange={() => setOrigen('publicacion')} /> Artículo de la biblioteca
            </label>
            <label className="eq-check">
              <input type="radio" checked={origen === 'fuente'} onChange={() => setOrigen('fuente')} /> Otra fuente ya cargada
            </label>
            <label className="eq-check">
              <input type="radio" checked={origen === 'nueva'} onChange={() => setOrigen('nueva')} /> Otra fuente nueva
            </label>
          </fieldset>
          <Forma accion={agregarCita.bind(null, versionId)} boton="Agregar fuente" enviando="Agregando…">
            <input type="hidden" name="origen" value={origen} />
            {origen === 'publicacion' && (
              <label className="campo">
                <span className="campo__nombre">Artículo</span>
                <select className="campo__entrada" name="publicacion" value={elegida} onChange={(e) => setElegida(e.target.value)} required>
                  <option value="">Elegí un artículo…</option>
                  {publicaciones.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{NOMBRE_ESTADO[p.estado]}] {p.titulo.slice(0, 110)} {p.anio ? `(${p.anio})` : ''}
                    </option>
                  ))}
                </select>
                <span className="eq-ayuda">
                  ¿No está? Agregalo desde <Link href="/equipo/biblioteca">Biblioteca</Link>. Podés citar uno que todavía no esté aprobado, pero la ficha no se puede mandar a
                  revisión hasta que lo aprueben.
                </span>
              </label>
            )}
            {origen === 'fuente' && (
              <label className="campo">
                <span className="campo__nombre">Fuente</span>
                <select className="campo__entrada" name="fuente" required defaultValue="">
                  <option value="">Elegí una fuente…</option>
                  {fuentes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {TIPOS_FUENTE[f.tipo]}: {f.cita.slice(0, 110)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {origen === 'nueva' && (
              <>
                <div className="eq-fila">
                  <label className="campo">
                    <span className="campo__nombre">Tipo</span>
                    <select className="campo__entrada" name="tipo" defaultValue="comunicacion">
                      {Object.entries(TIPOS_FUENTE).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span className="campo__nombre">Año</span>
                    <input className="campo__entrada" name="anio" inputMode="numeric" maxLength={4} />
                  </label>
                </div>
                <label className="campo">
                  <span className="campo__nombre">Cita</span>
                  <input className="campo__entrada" name="cita" maxLength={600} placeholder="Autora, título, editorial o institución, año" />
                </label>
                <label className="campo">
                  <span className="campo__nombre">Enlace (opcional)</span>
                  <input className="campo__entrada" name="url" type="url" maxLength={500} placeholder="https://…" />
                </label>
                <label className="eq-check">
                  <input type="checkbox" name="del_instituto" /> Es del Institut Pasteur de Montevideo
                </label>
              </>
            )}
            <CamposPasaje politica={origen === 'publicacion' && pub ? politicaDe(pub.licencia_codigo) : undefined} />
          </Forma>
        </details>
      )}
    </div>
  );
}
