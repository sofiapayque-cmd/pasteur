'use client';

import { useState } from 'react';
import Forma from './Forma';

/*
  Decisión de una validadora (sirve para fichas y para publicaciones).
  Lleva escondida la huella de lo que está viendo: la base solo acepta la
  decisión si el texto no cambió desde que se cargó la página.
*/
type Estado = { mensaje: string; ok?: boolean };

export default function Revisar({
  accion,
  huella,
  propia,
  que = 'ficha',
}: {
  accion: (p: Estado, d: FormData) => Promise<Estado>;
  huella: string;
  propia: boolean;
  que?: 'ficha' | 'publicacion';
}) {
  const [decision, setDecision] = useState<'aprobar' | 'pedir_cambios' | 'rechazar'>('aprobar');
  const texto = {
    aprobar: que === 'ficha' ? 'Aprobar y publicar' : 'Aprobar como fuente',
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
      {propia && decision === 'aprobar' && <p className="eq-ayuda">La agregaste o escribiste vos: queda registrado que la misma persona la aprobó.</p>}
    </Forma>
  );
}
