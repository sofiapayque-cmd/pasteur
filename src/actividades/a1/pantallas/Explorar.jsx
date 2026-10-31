import { useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import Micrografia from '../../../components/Micrografia';
import { paisajePorId, PAISAJES } from '../datos';
import { ambientesHabilitados } from '../laboratorio';
import { Cabeza, useTiempos, sinMovimiento } from '../piezas/comunes';
import { ESCENAS } from './Paisaje';
import Descenso from '../piezas/Descenso';
import { zoomDe } from '../zoom';

export const semillaMuestra = (ambiente, n = 0) => {
  let h = 7;
  for (const ch of ambiente) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h + n * 37) % 9000 + 1;
};

/* 2 · EXPLORAR: mirar el paisaje, elegir dónde investigar y hacer zoom hasta el microscopio. */
export default function Explorar({ progreso }) {
  const paisaje = paisajePorId(progreso.datos.paisaje) || PAISAJES[0];
  const Escena = ESCENAS[paisaje.id];
  const lugares = ambientesHabilitados(progreso.opciones).filter((a) => a.paisaje === paisaje.id);
  const [elegido, setElegido] = useState(null);
  const [fase, setFase] = useState('escena'); // escena | zoom | micro
  const [dato, setDato] = useState(null);
  const tiempo = useTiempos();
  const n = (progreso.datos.muestras || []).length;

  function investigar(amb) {
    setDato(null);
    setElegido(amb);
    if (sinMovimiento()) {
      setFase('micro');
      return;
    }
    setFase('zoom');
    tiempo(() => setFase('micro'), 1250);
  }

  function volver() {
    setFase('escena');
    setElegido(null);
  }

  const semilla = elegido ? semillaMuestra(elegido.id, n) : 1;

  if (fase === 'micro' && elegido) {
    return (
      <section className="a1-explorar">
        <Cabeza
          etiqueta={`${paisaje.nombre} · ${elegido.nombre}`}
          titulo="Cada vez más de cerca"
          extra={
            <button className="btn btn--claro" onClick={volver}>
              Volver al paisaje
            </button>
          }
        >
          Mirá con tus ojos, después con lupa y al final con el microscopio.
        </Cabeza>
        <div className="anim-entrar">
          <Descenso
            key={elegido.id}
            ambiente={elegido}
            zoom={zoomDe(elegido.id)}
            micro={<Micrografia colores={elegido.microbios} perfil={elegido.id} semilla={semilla} tamano={440} cantidad={26} etiqueta={`Microorganismos de ${elegido.nombre} vistos con microscopio (ilustración)`} />}
            alTerminar={
              <button className="btn btn--experimentar btn--grande" onClick={() => progreso.ir('muestra', { ambiente: elegido.id, semilla })}>
                Tomar una muestra
              </button>
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="a1-explorar">
      <Cabeza
        etiqueta={`Expedición · ${paisaje.nombre}`}
        titulo="¿Dónde buscamos?"
        extra={
          <button className="btn btn--claro" onClick={() => progreso.ir('paisaje')} disabled={fase === 'zoom'}>
            Cambiar de lugar
          </button>
        }
      >
        Tocá un punto que late para mirarlo de muy, muy cerca.
      </Cabeza>

      <div className={`a1-escena-marco ${fase === 'zoom' ? 'a1-escena-marco--zoom' : ''}`}>
        <div
          onClick={() => setDato(null)}
          className="a1-escena-marco__zoom"
          style={elegido ? { transformOrigin: `${elegido.punto.x}% ${elegido.punto.y}%`, transform: fase === 'zoom' ? 'scale(9)' : undefined } : undefined}
        >
          <Escena />
        </div>

        {fase === 'escena' &&
          lugares.map((a, i) => (
            <button
              key={a.id}
              className="a1-punto"
              style={{ left: `${a.punto.x}%`, top: `${a.punto.y}%`, animationDelay: `${0.3 + i * 0.2}s` }}
              onClick={() => investigar(a)}
            >
              <span className="a1-punto__anillo" aria-hidden="true" />
              <span className="a1-punto__anillo a1-punto__anillo--2" aria-hidden="true" />
              <span className="a1-punto__centro" aria-hidden="true" />
              <span className="a1-punto__nombre">{a.tipo === 'animal' ? `${a.nombre} (su caca)` : a.nombre}</span>
            </button>
          ))}

        {fase === 'escena' &&
          paisaje.curiosidades?.map((c) => (
            <button
              key={c.id}
              className={`a1-curioso ${dato?.id === c.id ? 'a1-curioso--abierto' : ''}`}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              onClick={() => setDato(dato?.id === c.id ? null : c)}
              aria-expanded={dato?.id === c.id}
            >
              <span className="a1-curioso__punto" aria-hidden="true" />
              <span className="solo-lector">{c.nombre}</span>
            </button>
          ))}

        {fase === 'escena' && dato && (
          <div className={`a1-dato ${dato.x > 60 ? 'a1-dato--izq' : ''} ${dato.y > 45 ? 'a1-dato--arriba' : ''}`} style={{ left: `${dato.x}%`, top: `${dato.y}%` }} role="status">
            <span className="etiqueta etiqueta--oscura">{dato.nombre}</span>
            <p>{dato.dato}</p>
          </div>
        )}

        {fase === 'zoom' && elegido && (
          <span className="a1-zoom-lente" style={{ left: `${elegido.punto.x}%`, top: `${elegido.punto.y}%` }} aria-hidden="true" />
        )}
      </div>

      <GloboMoli
        texto={
          fase === 'zoom'
            ? 'Acercándonos… más… ¡más!'
            : dato
              ? 'Interesante, ¿no? Los puntos que laten son para investigar.'
              : lugares.length > 1
                ? `Hay ${lugares.length} lugares para investigar. También podés tocar las cosas del paisaje.`
                : 'Tocá el punto que late. También podés tocar las cosas del paisaje.'
        }
        animo={fase === 'zoom' ? 'eureka' : dato ? 'escucha' : 'piensa'}
      />
    </section>
  );
}
