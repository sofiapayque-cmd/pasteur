import { useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import { ambientePorId, INSTRUMENTOS } from '../datos';
import { ambientesHabilitados } from '../laboratorio';
import { Cabeza, AvisoCapa, sumarError, Pasos } from '../piezas/comunes';
import Arrastrable from '../piezas/Arrastrable';
import PrimerPlano from '../piezas/PrimerPlano';
import { Espatula, Hisopo, Mano, Tubo } from '../piezas/Instrumentos';

const PASOS = [
  { id: 'elegir', nombre: 'Tomar' },
  { id: 'cargado', nombre: 'Al tubo' },
  { id: 'tubo', nombre: 'Cerrar' },
];

// Errores con instrumento equivocado. VALIDAR con el laboratorio cómo toman las muestras.
const MAL_INSTRUMENTO = {
  suelo: {
    titulo: 'Con el hisopo casi no se junta tierra',
    texto: 'El algodón sirve para tomar un poquito de algo blando o húmedo. Para raspar tierra (¡y más si está helada!) usá la espátula.',
  },
  animal: {
    titulo: 'Mejor algo más finito',
    texto: 'Con la espátula juntarías demasiado y te podrías llevar tierra del suelo mezclada. Para la caca alcanza con un poquito en la punta de un hisopo.',
  },
};

export const colorMuestra = (amb) => (amb.tipo === 'animal' ? (amb.paisaje === 'antartida' ? '#D9A3A8' : '#6E5238') : amb.paisaje === 'antartida' ? '#5E6B85' : '#6E5238');

function Dibujo({ id, cargado, color }) {
  if (id === 'espatula') return <Espatula alto={150} cargado={cargado} color={color} />;
  if (id === 'hisopo') return <Hisopo alto={150} cargado={cargado} color={color} />;
  return <Mano alto={120} />;
}

/* 3 · MUESTRA: elegir el instrumento correcto, llevar la muestra al tubo y cerrarlo. */
export default function Muestra({ progreso }) {
  const amb = ambientePorId(progreso.datos.ambiente) || ambientesHabilitados(progreso.opciones)[0];
  const [paso, setPaso] = useState('elegir');
  const [elegido, setElegido] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(true);
  const [guardada, setGuardada] = useState(false);
  const [huella, setHuella] = useState(false);
  const [pista, setPista] = useState(null);
  const color = colorMuestra(amb);
  const lugar = amb.tipo === 'animal' ? (amb.paisaje === 'campo' ? 'la bosta' : 'la caca') : 'la tierra';

  function usar(instr) {
    if (paso !== 'elegir') return;
    setElegido(null);
    setPista(null);
    if (instr === 'mano') {
      setHuella(true);
      setError({ tipo: 'mano' });
      sumarError(progreso, 'mano');
      return;
    }
    if (instr !== amb.instrumento) {
      setError({ tipo: 'instrumento' });
      sumarError(progreso, 'instrumento');
      return;
    }
    setPaso('cargado');
  }

  function alTubo() {
    if (paso !== 'cargado') return;
    setElegido(null);
    setPaso('tubo');
  }

  function tocarZona() {
    if (paso === 'elegir') {
      if (elegido) usar(elegido);
      else setPista('Primero elegí un instrumento de la bandeja.');
    }
  }

  function tocarTubo() {
    if (paso === 'cargado') {
      if (elegido) alTubo();
      else setPista('Llevá el instrumento con la muestra hasta el tubo.');
    } else if (paso === 'tubo' && abierto) setAbierto(false);
  }

  function llevar() {
    if (abierto) {
      setError({ tipo: 'tubo' });
      sumarError(progreso, 'tubo');
      return;
    }
    setGuardada(true);
  }

  function guardar() {
    const muestras = progreso.datos.muestras || [];
    const n = muestras.reduce((max, m) => Math.max(max, Number(String(m.id).slice(1)) || 0), 0) + 1;
    progreso.ir('mesa', {
      muestras: [...muestras, { id: `m${n}`, ambiente: amb.id, semilla: progreso.datos.semilla || n * 41 }].slice(-8),
      ambiente: null,
    });
  }

  const instruccion =
    paso === 'elegir'
      ? `Elegí el instrumento correcto y arrastralo hasta ${lugar}.`
      : paso === 'cargado'
        ? '¡Bien! Ahora llevá la muestra hasta el tubo.'
        : abierto
          ? 'Ahora cerrá el tubo: tocá la tapa.'
          : 'Listo. Llevá el tubo a la mesa del laboratorio.';

  let moli = amb.tipo === 'animal' ? 'No hace falta tocar al animal: su caca tiene muchos de sus microbios.' : '¿Cuál sirve para juntar tierra? Pensalo bien.';
  let animo = 'piensa';
  if (pista) {
    moli = pista;
    animo = 'escucha';
  } else if (paso === 'cargado') {
    moli = '¡Eso es! Cuidado, no la toques con nada más.';
    animo = 'alegria';
  } else if (paso === 'tubo') {
    moli = abierto ? 'Un tubo abierto se puede volcar…' : '¡Bien cerrado!';
    animo = abierto ? 'duda' : 'feliz';
  }

  const errores = {
    mano: { titulo: '¡Uy! Contaminaste la muestra', texto: 'Tu mano tiene sus propios microbios (¡todos tenemos!). Si tocás la muestra, se mezclan con los del lugar y ya no sabés cuáles eran de acá. Por eso usamos instrumentos limpios y guantes.' },
    instrumento: MAL_INSTRUMENTO[amb.tipo],
    tubo: { titulo: '¡El tubo quedó abierto!', texto: 'Así se puede volcar en el camino o le pueden entrar microbios del aire. Cerralo bien antes de llevarlo.' },
  };

  return (
    <section className="a1-muestra">
      <Cabeza
        etiqueta={`Muestra · ${amb.nombre}`}
        titulo="Tomá la muestra"
        extra={
          paso === 'tubo' ? (
            <>
              {abierto && (
                <button className="btn btn--experimentar" onClick={() => setAbierto(false)}>
                  Cerrar el tubo
                </button>
              )}
              <button className="btn btn--primario" onClick={llevar}>
                Llevar a la mesa
              </button>
            </>
          ) : (
            <Pasos lista={PASOS} actual={paso} />
          )
        }
      >
        {instruccion}
      </Cabeza>

      <div className="a1-muestra__mesa">
        <div className="a1-bandeja" role="group" aria-label="Bandeja de instrumentos">
          <span className="etiqueta etiqueta--oscura">Instrumentos</span>
          {INSTRUMENTOS.map((ins) => {
            const correcto = ins.id === amb.instrumento;
            const cargado = correcto && paso === 'cargado';
            const activo = paso === 'elegir' || cargado;
            return (
              <Arrastrable
                key={ins.id}
                className={`a1-bandeja__item ${!activo ? 'a1-bandeja__item--apagado' : ''}`}
                disabled={!activo}
                elegido={elegido === ins.id}
                etiqueta={`${ins.nombre}: ${ins.detalle}`}
                onToque={() => {
                  setPista(null);
                  setElegido(elegido === ins.id ? null : ins.id);
                }}
                onSoltar={(d) => {
                  if (d === 'zona') usar(ins.id);
                  if (d === 'tubo' && cargado) alTubo();
                }}
              >
                <Dibujo id={ins.id} cargado={cargado} color={color} />
                <span className="a1-bandeja__nombre">{ins.nombre}</span>
              </Arrastrable>
            );
          })}
        </div>

        <button
          type="button"
          className={`a1-zona ${paso === 'elegir' ? 'a1-zona--activa' : ''} ${elegido && paso === 'elegir' ? 'a1-zona--espera' : ''}`}
          data-destino="zona"
          onClick={tocarZona}
          aria-label={`${amb.nombre}: lugar donde se toma la muestra`}
        >
          <PrimerPlano ambiente={amb} raspado={paso !== 'elegir'} huella={huella} />
          <span className="a1-zona__etiqueta etiqueta etiqueta--oscura">{amb.tipo === 'animal' ? `Caca de ${amb.nombre.toLowerCase()}` : amb.nombre}</span>
        </button>

        <div className="a1-gradilla-tubo">
          <button
            type="button"
            className={`a1-tubo-boton ${paso === 'cargado' ? 'a1-tubo-boton--espera' : ''}`}
            data-destino="tubo"
            onClick={tocarTubo}
            aria-label={paso === 'tubo' && abierto ? 'Cerrar el tubo' : 'Tubo de muestra'}
          >
            <Tubo alto={210} color={color} lleno={paso === 'tubo'} abierto={abierto} codigo={amb.codigo} tapa={amb.color} destacar={paso === 'tubo' && abierto} />
          </button>
          {paso === 'tubo' && <span className={`a1-estado ${abierto ? '' : 'a1-estado--ok'}`}>{abierto ? 'Tubo abierto' : 'Tubo cerrado'}</span>}
        </div>
      </div>

      {error && (
        <AvisoCapa
          tipo="error"
          titulo={errores[error.tipo].titulo}
          accion={error.tipo === 'tubo' ? 'Cerrar el tubo' : 'Probar otra vez'}
          onAccion={() => {
            if (error.tipo === 'tubo') setAbierto(false);
            if (error.tipo === 'mano') setHuella(false);
            setError(null);
          }}
        >
          {errores[error.tipo].texto}
        </AvisoCapa>
      )}

      {guardada && (
        <AvisoCapa tipo="acierto" titulo="¡Muestra guardada!" accion="Llevar a la mesa" onAccion={guardar}>
          Tu tubo dice <b className="a1-mono">{amb.codigo}</b>. Los científicos etiquetan cada tubo para no confundir las muestras.
          {amb.tipo === 'animal' && ' Y lo mejor: no molestamos al animal.'}
        </AvisoCapa>
      )}

      {!error && !guardada && <GloboMoli texto={moli} animo={animo} />}
    </section>
  );
}
