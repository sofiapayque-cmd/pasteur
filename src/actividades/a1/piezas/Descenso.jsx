import { useEffect, useRef, useState } from 'react';
import Cuaderno from '../../../components/Cuaderno';
import Nivel from './Niveles';
import { NIVELES } from '../zoom';
import { sinMovimiento } from './comunes';

/*
  DESCENSO: del ojo al microscopio en tres pasos (×10 cada vez, aprox.).
  En cada nivel hay cosas para tocar; el dato se escribe como nota de cuaderno.
  - zoom: datos del ambiente (../zoom.js)
  - micro: el visor del microscopio (Micrografia) que pasa el que lo usa
  - alTerminar: botones que aparecen en el último nivel
*/

function Icono({ tipo }) {
  if (tipo === 'ojo')
    return (
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <path d="M3 16 Q16 4 29 16 Q16 28 3 16Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="5" fill="currentColor" />
      </svg>
    );
  if (tipo === 'lupa')
    return (
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <circle cx="13" cy="13" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <path d="M19.5 19.5 L28 28" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <path d="M12 4 h6 v4 h-6z M13 8 h4 l2 10 h-8z" fill="currentColor" />
      <path d="M9 26 h16 M21 14 q6 4 2 12" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M15 18 v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Descenso({ ambiente, zoom, micro, alTerminar }) {
  const [nivel, setNivel] = useState(0);
  const [anterior, setAnterior] = useState(null); // nivel que se va (para la transición)
  const [sentido, setSentido] = useState('entra'); // entra (acercar) | sale (alejar)
  const [abierto, setAbierto] = useState(null);
  const [vistos, setVistos] = useState(() => new Set());
  const [notas, setNotas] = useState([]); // lo anotado en el cuaderno, en orden
  const reloj = useRef(null);

  useEffect(() => () => clearTimeout(reloj.current), []);

  const nivelInfo = NIVELES[nivel];
  const datos = zoom[nivelInfo.id];
  const total = NIVELES.reduce((s, n) => s + (zoom[n.id]?.puntos.length || 0), 0);

  function ir(n) {
    if (n === nivel || n < 0 || n >= NIVELES.length) return;
    setAbierto(null);
    setSentido(n > nivel ? 'entra' : 'sale');
    if (!sinMovimiento()) {
      setAnterior(nivel);
      clearTimeout(reloj.current);
      reloj.current = setTimeout(() => setAnterior(null), 900);
    }
    setNivel(n);
  }

  function tocar(p) {
    const clave = `${nivelInfo.id}-${p.id}`;
    setAbierto(p);
    setVistos((v) => new Set(v).add(clave));
    // Se anota una sola vez; si ya estaba, queda donde está
    setNotas((n) => (n.some((x) => x.id === clave) ? n : [...n, { id: clave, titulo: p.nombre, texto: p.dato }]));
  }

  function capa(n, clase) {
    const info = NIVELES[n];
    return (
      <div key={`${info.id}-${clase}`} className={`a1-descenso__capa a1-descenso__capa--${clase}`}>
        {info.id === 'micro' ? micro : <Nivel nivel={info.id} ambienteId={ambiente.id} zoom={zoom} etiqueta={`${ambiente.nombre} ${info.nombre.toLowerCase()} (ilustración)`} />}
      </div>
    );
  }

  const ultimo = nivel === NIVELES.length - 1;

  return (
    <div className="a1-descenso">
      <ol className="a1-descenso__escalera" aria-label="Del ojo al microscopio">
        {NIVELES.map((n, i) => (
          <li key={n.id}>
            <button
              type="button"
              className={`a1-descenso__peldano ${i === nivel ? 'a1-descenso__peldano--actual' : ''} ${i < nivel ? 'a1-descenso__peldano--hecho' : ''}`}
              onClick={() => ir(i)}
              aria-current={i === nivel ? 'step' : undefined}
            >
              <Icono tipo={n.icono} />
              <span>
                <b>{n.nombre}</b>
                <small>{n.escala}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="a1-descenso__visor">
        <div className={`a1-descenso__lente a1-descenso__lente--${nivelInfo.id}`}>
          {anterior !== null && capa(anterior, sentido === 'entra' ? 'se-agranda' : 'se-achica')}
          {capa(nivel, anterior !== null ? (sentido === 'entra' ? 'llega-chica' : 'llega-grande') : 'quieta')}
          {nivelInfo.id !== 'micro' &&
            datos.puntos.map((p, i) => (
              <button
                key={`${nivelInfo.id}-${p.id}`}
                type="button"
                className={`a1-descenso__punto ${abierto?.id === p.id ? 'a1-descenso__punto--abierto' : ''} ${vistos.has(`${nivelInfo.id}-${p.id}`) ? 'a1-descenso__punto--visto' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${0.6 + i * 0.15}s` }}
                onClick={() => tocar(p)}
               
              >
                <span className="a1-descenso__aro" aria-hidden="true" />
                <span className="a1-descenso__nombre">{p.nombre}</span>
              </button>
            ))}
        </div>
        {nivelInfo.id !== 'micro' && (
          <div className="a1-descenso__regla" aria-label={`Escala: ${nivelInfo.escala}`}>
            <span className="a1-descenso__barra" aria-hidden="true" />
            {nivelInfo.escala}
          </div>
        )}
      </div>

      <div className="a1-descenso__texto">
        <span className="etiqueta">
          {nivelInfo.nombre} · {ambiente.nombre}
        </span>
        <p className="a1-descenso__frase">{datos.frase}</p>

        {nivelInfo.id === 'micro' && (
          <div className="a1-descenso__chips" role="group" aria-label="Qué hay en la muestra">
            {datos.puntos.map((p) => (
              <button key={p.id} type="button" className={`a1-descenso__chip ${abierto?.id === p.id ? 'a1-descenso__chip--activo' : ''}`} onClick={() => tocar(p)}>
                {p.nombre}
              </button>
            ))}
          </div>
        )}

        <Cuaderno titulo={`Mi cuaderno · ${ambiente.nombre}`} entradas={notas} vacio={nivelInfo.id === 'micro' ? 'Tocá un nombre para anotarlo acá.' : 'Tocá los círculos para anotar qué es cada cosa.'} />

        <span className="a1-descenso__vistos">
          Descubriste {vistos.size} de {total}
        </span>

        <div className="a1-botones">
          {!ultimo && (
            <button type="button" className="btn btn--experimentar btn--grande" onClick={() => ir(nivel + 1)}>
              Acercar más
              <Icono tipo={NIVELES[nivel + 1].icono} />
            </button>
          )}
          {ultimo && alTerminar}
          {nivel > 0 && (
            <button type="button" className="btn btn--secundario" onClick={() => ir(nivel - 1)}>
              Alejar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
