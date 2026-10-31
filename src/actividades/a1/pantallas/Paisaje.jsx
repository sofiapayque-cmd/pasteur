import GloboMoli from '../../../components/GloboMoli';
import Antartida from '../../../components/escenas/Antartida';
import Campo from '../../../components/escenas/Campo';
import { PAISAJES } from '../datos';
import { ambientesHabilitados } from '../laboratorio';
import { Cabeza } from '../piezas/comunes';

export const ESCENAS = { antartida: Antartida, campo: Campo };

/* 1 · PAISAJE: elegir adónde ir a investigar. */
export default function Paisaje({ progreso }) {
  const habil = ambientesHabilitados(progreso.opciones);
  const paisajes = PAISAJES.filter((p) => habil.some((a) => a.paisaje === p.id));
  const muestras = progreso.datos.muestras || [];

  return (
    <section className="a1-paisaje">
      <Cabeza
        etiqueta="Expedición científica"
        titulo="¿Adónde vamos a investigar?"
        extra={
          muestras.length > 0 && (
            <button className="btn btn--secundario" onClick={() => progreso.ir('mesa')}>
              Volver a la mesa
            </button>
          )
        }
      >
        Elegí un lugar. Vamos a buscar seres vivos que no se ven a simple vista.
      </Cabeza>

      <div className={`a1-paisaje__cartas ${paisajes.length === 1 ? 'a1-paisaje__cartas--una' : ''}`}>
        {paisajes.map((p, i) => {
          const Escena = ESCENAS[p.id];
          const lugares = habil.filter((a) => a.paisaje === p.id);
          const juntadas = muestras.filter((m) => lugares.some((l) => l.id === m.ambiente)).length;
          return (
            <button
              key={p.id}
              className="a1-carta anim-crecer"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
              onClick={() => progreso.ir('explorar', { paisaje: p.id })}
            >
              <div className="a1-carta__escena">
                <Escena />
              </div>
              <div className="a1-carta__texto">
                <span className="etiqueta">
                  {lugares.length} {lugares.length === 1 ? 'lugar' : 'lugares'} para investigar
                  {juntadas > 0 && ` · ${juntadas} ${juntadas === 1 ? 'muestra tuya' : 'muestras tuyas'}`}
                </span>
                <h2>{p.nombre}</h2>
                <p className="a1-carta__pregunta">{p.pregunta}</p>
                <span className="a1-carta__ir" aria-hidden="true">
                  Ir
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <GloboMoli
        texto={muestras.length ? '¿Otra expedición? Cuantas más muestras, más para comparar.' : '¡Hola! Hoy somos científicos. ¿Adónde vamos primero?'}
        animo="feliz"
      />
    </section>
  );
}
