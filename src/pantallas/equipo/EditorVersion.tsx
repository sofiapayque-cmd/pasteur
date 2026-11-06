'use client';

import Forma from './Forma';
import ContadorPalabras from './ContadorPalabras';
import { guardarVersion } from '@/acciones/fichas';
import { LIMITE_PALABRAS, type Formato } from '@/lib/equipo/comun';

/* Texto de la versión abierta de una ficha (borrador, o en revisión para quien puede corregir). */
export type VersionEditable = {
  id: string;
  pregunta: string;
  variantes: string[];
  explicacion_cientifica: string;
  version_infantil: string;
  grado_min: number;
  grado_max: number;
  asistida_por_ia: boolean;
  nota_interna: string;
};

const GRADOS = [1, 2, 3, 4, 5, 6];

export default function EditorVersion({ v, formato, enRevision }: { v: VersionEditable; formato: Formato; enRevision: boolean }) {
  return (
    <Forma accion={guardarVersion.bind(null, v.id)} boton={enRevision ? 'Guardar corrección' : 'Guardar'}>
      {formato === 'pregunta' && (
        <>
          <label className="campo">
            <span className="campo__nombre">Pregunta principal</span>
            <input className="campo__entrada" name="pregunta" maxLength={300} defaultValue={v.pregunta} />
          </label>
          <label className="campo">
            <span className="campo__nombre">Otras formas de preguntarlo (una por renglón)</span>
            <textarea className="campo__entrada" name="variantes" rows={3} defaultValue={v.variantes.join('\n')} />
            <span className="eq-ayuda">Como lo preguntaría un chico: ayudan a que el asistente encuentre esta ficha.</span>
          </label>
          <label className="campo">
            <span className="campo__nombre">Explicación científica (para el equipo y las maestras)</span>
            <textarea className="campo__entrada" name="explicacion" rows={6} maxLength={4000} defaultValue={v.explicacion_cientifica} />
          </label>
        </>
      )}
      <label className="campo">
        <span className="campo__nombre">{formato === 'pregunta' ? 'Respuesta para chicos de 10 a 12 años' : 'El dato, para chicos de 10 a 12 años'}</span>
        <ContadorPalabras name="infantil" defaultValue={v.version_infantil} limite={LIMITE_PALABRAS[formato]} maxLength={1000} filas={formato === 'pregunta' ? 5 : 3} />
        <span className="eq-ayuda">Frases cortas, palabras de todos los días y, si sirve, una comparación. Es lo que se muestra tal cual con el sello.</span>
      </label>
      <div className="eq-fila">
        <label className="campo">
          <span className="campo__nombre">Desde</span>
          <select className="campo__entrada" name="grado_min" defaultValue={v.grado_min}>
            {GRADOS.map((g) => (
              <option key={g} value={g}>
                {g}° año
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span className="campo__nombre">Hasta</span>
          <select className="campo__entrada" name="grado_max" defaultValue={v.grado_max}>
            {GRADOS.map((g) => (
              <option key={g} value={g}>
                {g}° año
              </option>
            ))}
          </select>
        </label>
      </div>
      {v.asistida_por_ia ? (
        <p className="eq-ayuda">Redactada con IA: esta marca queda siempre, aunque la corrijas.</p>
      ) : (
        <label className="eq-check">
          <input type="checkbox" name="asistida_por_ia" /> Usé inteligencia artificial para escribir un primer borrador (después no se puede desmarcar)
        </label>
      )}
      <label className="campo">
        <span className="campo__nombre">Nota interna (solo la ve el equipo)</span>
        <textarea className="campo__entrada" name="nota" rows={2} maxLength={2000} defaultValue={v.nota_interna} />
      </label>
    </Forma>
  );
}
