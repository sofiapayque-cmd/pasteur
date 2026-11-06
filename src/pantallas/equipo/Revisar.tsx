'use client';

import { useState } from 'react';
import Forma from './Forma';

/*
  Decisión de una validadora (sirve para fichas y para publicaciones).
  Lleva escondida la huella de lo que está viendo: la base solo acepta la
  decisión si el texto no cambió desde que se cargó la página. Si la ficha
  cita artículos que también esperan revisión, lleva sus huellas y al
  aprobar se aprueban juntos (migración 15).
*/
type Estado = { mensaje: string; ok?: boolean };

export default function Revisar({
  accion,
  huella,
  propia,
  que = 'ficha',
  articulos = {},
  volver,
}: {
  accion: (p: Estado, d: FormData) => Promise<Estado>;
  huella: string;
  propia: boolean;
  que?: 'ficha' | 'publicacion';
  articulos?: Record<string, string>;
  volver?: string;
}) {
  const [decision, setDecision] = useState<'aprobar' | 'pedir_cambios' | 'rechazar'>('aprobar');
  const n = Object.keys(articulos).length;
  const texto = {
    aprobar: que === 'ficha' ? (n ? `Aprobar la ficha y ${n === 1 ? 'su artículo' : `sus ${n} artículos`}` : 'Aprobar y publicar') : 'Aprobar como fuente',
    pedir_cambios: 'Pedir cambios',
    rechazar: 'Rechazar',
  }[decision];
  return (
    <Forma
      accion={accion}
      boton={texto}
      enviando="Guardando decisión…"
      variante={decision === 'aprobar' ? 'primario' : 'secundario'}
      confirmar={decision === 'rechazar' ? '¿Rechazar? Queda registrado y no se puede deshacer.' : undefined}
    >
      <input type="hidden" name="huella" value={huella} />
      {que === 'ficha' && <input type="hidden" name="articulos" value={JSON.stringify(articulos)} />}
      {volver && <input type="hidden" name="volver" value={volver} />}
      <fieldset className="eq-form" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="solo-lector">Decisión</legend>
        <label className="eq-check">
          <input type="radio" name="decision" value="aprobar" checked={decision === 'aprobar'} onChange={() => setDecision('aprobar')} />
          {que === 'ficha' ? 'Aprobar: es correcta y clara para chicos de 10 a 12 años' : 'Aprobar: es una fuente confiable para citar'}
        </label>
        <label className="eq-check">
          <input type="radio" name="decision" value="pedir_cambios" checked={decision === 'pedir_cambios'} onChange={() => setDecision('pedir_cambios')} />
          Pedir cambios (vuelve a {que === 'ficha' ? 'borrador' : 'candidata'})
        </label>
        <label className="eq-check">
          <input type="radio" name="decision" value="rechazar" checked={decision === 'rechazar'} onChange={() => setDecision('rechazar')} />
          Rechazar
        </label>
      </fieldset>
      <label className="campo">
        <span className="campo__nombre">Comentario {decision === 'aprobar' ? '(opcional)' : '(obligatorio)'}</span>
        <textarea className="campo__entrada" name="comentario" rows={3} maxLength={2000} required={decision !== 'aprobar'} />
      </label>
      {n > 0 && decision === 'aprobar' && (
        <p className="eq-ayuda">
          {n === 1 ? 'El artículo que cita todavía no está aprobado como fuente: se aprueba' : `Los ${n} artículos que cita todavía no están aprobados como fuente: se aprueban`} junto con la
          ficha. Revisá que sean confiables (título, revista, año) en la lista de fuentes.
        </p>
      )}
      {propia && decision === 'aprobar' && <p className="eq-ayuda">La agregaste o escribiste vos: queda registrado que la misma persona la aprobó.</p>}
    </Forma>
  );
}
