import { useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import { ambientePorId } from '../datos';
import { temperaturaPorId } from '../laboratorio';
import { Cabeza, AvisoCapa } from '../piezas/comunes';
import Placa from '../piezas/Placa';
import { firma } from '../colonias';

const OBSERVACIONES = [
  { id: 'colores', nombre: 'Colores distintos' },
  { id: 'formas', nombre: 'Formas distintas' },
  { id: 'tamanos', nombre: 'Colonias más grandes en una' },
  { id: 'raro', nombre: 'Algo raro (¿contaminación?)' },
  { id: 'iguales', nombre: 'Se ven casi iguales' },
];

function quienTieneMas(a, b) {
  if (Math.abs(a.colonias - b.colonias) <= 2) return 'parecidas';
  return a.colonias > b.colonias ? 'a' : 'b';
}

/* Comentario de Moli según QUÉ cambió entre las dos placas (una variable por vez). */
function comentario(a, b) {
  const ambA = ambientePorId(a.ambiente);
  const ambB = ambientePorId(b.ambiente);
  const partes = [];
  if (a.contaminada || b.contaminada) partes.push('Ojo: una placa está contaminada, así que tiene cosas que no venían de la muestra.');
  if (a.ambiente === b.ambiente && a.temp !== b.temp)
    partes.push(`Las dos son de ${ambA.nombre.toLowerCase()}: lo único que cambió fue la temperatura. Por eso podemos decir que la temperatura cambió lo que creció.`);
  else if (a.ambiente !== b.ambiente && a.temp === b.temp)
    partes.push(
      `Misma temperatura, distinto lugar: en ${ambA.nombre.toLowerCase()} y en ${ambB.nombre.toLowerCase()} viven microorganismos distintos.`,
      firma(a.ambiente)[0].id === firma(b.ambiente)[0].id
        ? `Mirá las colonias: en los dos lugares la más común es ${firma(a.ambiente)[0].nombre}. Fijate si aparece alguna distinta.`
        : `Mirá las colonias: en ${ambA.nombre.toLowerCase()} la más común es ${firma(a.ambiente)[0].nombre}; en ${ambB.nombre.toLowerCase()}, ${firma(b.ambiente)[0].nombre}.`,
    );
  else if (a.ambiente !== b.ambiente)
    partes.push('Cambiaron dos cosas a la vez: el lugar y la temperatura. Para saber cuál causó la diferencia, los científicos cambian una sola cosa por vez.');
  else partes.push('Mismo lugar y misma temperatura: por eso se parecen. ¡Repetir un experimento también es ciencia!');
  return partes.join(' ');
}

function Tarjeta({ p, letra, mas }) {
  const amb = ambientePorId(p.ambiente);
  const t = temperaturaPorId(p.temp);
  return (
    <figure className={`a1-comparar__placa ${mas === letra ? 'a1-comparar__placa--marcada' : ''}`}>
      <span className="a1-comparar__letra">{letra.toUpperCase()}</span>
      <Placa placa={p} tamano={250} etiqueta={`Placa ${letra.toUpperCase()}: ${amb?.nombre}, ${t.nombre}`} />
      <figcaption>
        <span className="a1-chip">
          <i style={{ background: amb?.color }} aria-hidden="true" />
          {amb?.nombre}
        </span>
        <span className="a1-chip a1-chip--temp">
          <i style={{ background: t.color }} aria-hidden="true" />
          {t.nombre}
        </span>
        {p.contaminada && <span className="a1-chip a1-chip--alerta">Contaminada</span>}
        {mas && <b className="a1-comparar__cuenta anim-crecer">{p.colonias} colonias</b>}
      </figcaption>
    </figure>
  );
}


/* 6 · COMPARAR: dos placas lado a lado, preguntas guía y observaciones. */
export default function Comparar({ progreso }) {
  const cultivos = progreso.datos.cultivos || [];
  const [sel, setSel] = useState(() => cultivos.slice(-2).map((c) => c.id));
  const [mas, setMas] = useState(null);
  const [obs, setObs] = useState([]);
  const [fin, setFin] = useState(false);

  if (cultivos.length < 2) {
    return (
      <section className="a1-comparar">
        <Cabeza etiqueta="Comparar" titulo="Necesitás dos placas">
          Cultivá otra muestra (u otra temperatura) y volvé.
        </Cabeza>
        <button className="btn btn--primario" onClick={() => progreso.ir('mesa')}>
          Volver a la mesa
        </button>
        <GloboMoli texto="Para comparar hacen falta dos cosas, ¿no?" animo="duda" />
      </section>
    );
  }

  const a = cultivos.find((c) => c.id === sel[0]) || cultivos[0];
  const b = cultivos.find((c) => c.id === sel[1]) || cultivos[1];
  const correcta = quienTieneMas(a, b);
  const acerto = mas && mas === correcta;

  function elegir(id) {
    setMas(null);
    setObs([]);
    if (sel.includes(id)) return;
    setSel([sel[1], id]);
  }

  function anotar() {
    const lista = progreso.datos.comparaciones || [];
    progreso.guardar({ comparaciones: [...lista, { a: a.id, b: b.id, mas, obs }].slice(-6) });
    setFin(true);
  }

  let moli = 'Mirá bien las dos placas. ¿Qué diferencias encontrás?';
  let animo = 'piensa';
  if (mas && !acerto) {
    moli = 'Mmm, mirá de nuevo: contá los puntitos de cada una.';
    animo = 'duda';
  } else if (acerto) {
    moli = '¡Bien contado! ¿Qué más notás?';
    animo = 'alegria';
  }

  return (
    <section className="a1-comparar">
      <Cabeza
        etiqueta="Comparar"
        titulo="Compará dos placas"
        extra={
          <>
            {cultivos.length > 2 && (
        <div className="a1-comparar__selector" role="group" aria-label="Elegí dos placas">
          <span className="etiqueta etiqueta--oscura">Elegí dos placas</span>
          <ul>
            {cultivos.map((c) => {
              const amb = ambientePorId(c.ambiente);
              const i = sel.indexOf(c.id);
              return (
                <li key={c.id}>
                  <button className={`a1-miniplaca ${i >= 0 ? 'a1-miniplaca--sel' : ''}`} onClick={() => elegir(c.id)} aria-pressed={i >= 0} aria-label={`${amb?.nombre}, ${temperaturaPorId(c.temp).nombre}`}>
                    <Placa placa={c} tamano={64} />
                    {i >= 0 && <span className="a1-miniplaca__letra">{i ? 'B' : 'A'}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
            )}
            <button className="btn btn--claro" onClick={() => progreso.ir('mesa')}>
              Volver a la mesa
            </button>
          </>
        }
      >
        Mirá las dos placas y respondé las preguntas.
      </Cabeza>

      <div className="a1-comparar__cuerpo">
        <Tarjeta p={a} letra="a" mas={mas} />
        <Tarjeta p={b} letra="b" mas={mas} />

        <div className="a1-preguntas">
          <fieldset className="a1-pregunta">
            <legend>¿En cuál crecieron más colonias?</legend>
            <div className="a1-opciones">
              {[
                ['a', 'Placa A'],
                ['b', 'Placa B'],
                ['parecidas', 'Parecidas'],
              ].map(([id, nombre]) => (
                <button key={id} className={`a1-opcion ${mas === id ? (acerto ? 'a1-opcion--bien' : 'a1-opcion--mal') : ''}`} aria-pressed={mas === id} onClick={() => setMas(id)}>
                  {nombre}
                </button>
              ))}
            </div>
          </fieldset>

          {acerto && (
            <fieldset className="a1-pregunta anim-crecer">
              <legend>¿Qué más ves? Marcá todo lo que notes</legend>
              <div className="a1-opciones a1-opciones--chips">
                {OBSERVACIONES.map((o) => (
                  <button
                    key={o.id}
                    className={`a1-opcion a1-opcion--chip ${obs.includes(o.id) ? 'a1-opcion--sel' : ''}`}
                    aria-pressed={obs.includes(o.id)}
                    onClick={() => setObs(obs.includes(o.id) ? obs.filter((x) => x !== o.id) : [...obs, o.id])}
                  >
                    {o.nombre}
                  </button>
                ))}
              </div>
              <button className="btn btn--experimentar" disabled={!obs.length} onClick={anotar}>
                Anotar en mi cuaderno
              </button>
            </fieldset>
          )}
        </div>
      </div>

      {fin && (
        <AvisoCapa tipo="dato" titulo="Lo que descubriste" accion="Volver a la mesa" onAccion={() => progreso.ir('mesa')} secundaria={cultivos.length > 2 ? 'Comparar otras' : undefined} onSecundaria={() => { setFin(false); setMas(null); setObs([]); }}>
          {comentario(a, b)}
        </AvisoCapa>
      )}

      {!fin && <GloboMoli texto={moli} animo={animo} />}
    </section>
  );
}
