import { useEffect, useMemo, useRef } from 'react';
import { aplanar, largo, useLetras, Escritura } from './Aviso';
import './Aviso.css';

/*
  CUADERNO DE CAMPO: una hoja que está siempre en la pantalla y no cambia de tamaño.
  Cada cosa que el niño descubre se agrega como un renglón nuevo, escrito a mano
  letra por letra (The Girl Next Door). Lo anotado antes queda en la hoja.

  Props:
  - titulo: nombre de la hoja ("Mi cuaderno · Suelo antártico")
  - entradas: [{ id, titulo, texto }] en orden; la última es la que se escribe
  - vacio: texto suave cuando todavía no hay nada anotado
*/

function Entrada({ titulo, texto, nueva }) {
  const t = useMemo(() => aplanar(`${titulo}:`), [titulo]);
  const c = useMemo(() => aplanar(texto), [texto]);
  const nT = largo(t.partes);
  const total = nT + largo(c.partes);
  const letras = useLetras(nueva ? total : 0, `${titulo}|${texto}`);
  const ver = nueva ? letras : total;
  return (
    <li className="cuaderno-campo__entrada">
      <span className="solo-lector">
        {titulo}: {texto}
      </span>
      <span aria-hidden="true">
        <b className="cuaderno-campo__nombre">
          <Escritura partes={t.partes} desde={0} hasta={nT} letras={nueva ? ver : total} />
        </b>{' '}
        <Escritura partes={c.partes} desde={nT} hasta={total} letras={nueva ? ver : total} />
      </span>
    </li>
  );
}

export default function Cuaderno({ titulo, entradas, vacio = 'Tocá algo para anotarlo acá.' }) {
  const hoja = useRef(null);
  const lista = useRef(null);
  const ultima = entradas[entradas.length - 1]?.id;

  // La hoja baja sola mientras se escribe, como si siguiera la mano de quien escribe:
  // cada vez que el texto suma un renglón, se desliza hasta el renglón nuevo.
  useEffect(() => {
    const el = hoja.current;
    const ol = lista.current;
    if (!el || !ol) return undefined;
    const bajar = () => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    bajar();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const obs = new ResizeObserver(bajar);
    obs.observe(ol);
    return () => obs.disconnect();
  }, [ultima, entradas.length]);

  return (
    <section className="cuaderno-campo" aria-label={titulo}>
      <span className="cuaderno__cinta" aria-hidden="true" />
      <h3 className="cuaderno-campo__titulo">{titulo}</h3>
      <div className="cuaderno-campo__hoja" ref={hoja} aria-live="polite">
        {entradas.length === 0 ? (
          <p className="cuaderno-campo__vacio">{vacio}</p>
        ) : (
          <ol className="cuaderno-campo__lista" ref={lista}>
            {entradas.map((e, i) => (
              <Entrada key={e.id} titulo={e.titulo} texto={e.texto} nueva={i === entradas.length - 1} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
