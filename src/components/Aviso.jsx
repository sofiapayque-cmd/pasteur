import { Fragment, isValidElement, useEffect, useMemo, useState } from 'react';
import Moli from './Moli';
import './Aviso.css';

/*
  Aviso: lo que pasa cuando el niño acierta, se equivoca o necesita una pista.
  Se ve como una nota de laboratorio escrita a mano en un cuaderno
  (tipografía The Girl Next Door): el texto se va escribiendo letra por letra.
  Equivocarse es parte de investigar: los errores nunca castigan, explican qué pasó.

  Props:
  - tipo: 'error' | 'acierto' | 'pista' | 'dato'
  - titulo: frase corta ("¡Uy! Se contaminó la placa")
  - children: explicación (una o dos oraciones; puede llevar <b>)
  - accion / onAccion: botón principal (ej. "Probar otra vez")
  - secundaria / onSecundaria: botón opcional
*/
const ANIMO = { error: 'duda', acierto: 'alegria', pista: 'piensa', dato: 'eureka' };
const ENCABEZADO = { error: 'Algo salió distinto', acierto: '¡Funcionó!', pista: 'Pista', dato: 'Anoté esto' };

// Convierte el contenido en pedacitos de texto (con o sin negrita) para poder escribirlos de a uno
export function aplanar(nodo, negrita = false, salida = { partes: [], complejo: false }) {
  if (nodo == null || nodo === false || nodo === true) return salida;
  if (typeof nodo === 'string' || typeof nodo === 'number') {
    salida.partes.push({ t: String(nodo), b: negrita });
    return salida;
  }
  if (Array.isArray(nodo)) {
    nodo.forEach((n) => aplanar(n, negrita, salida));
    return salida;
  }
  if (isValidElement(nodo)) {
    const tipo = nodo.type;
    if (tipo === Fragment) return aplanar(nodo.props.children, negrita, salida);
    if (tipo === 'br') {
      salida.partes.push({ t: '\n', b: negrita });
      return salida;
    }
    if (['b', 'strong', 'em', 'i', 'span'].includes(tipo)) {
      return aplanar(nodo.props.children, negrita || tipo === 'b' || tipo === 'strong', salida);
    }
  }
  salida.complejo = true; // contenido que no es solo texto: se muestra entero
  return salida;
}

export const largo = (partes) => partes.reduce((n, p) => n + p.t.length, 0);

export function movimientoReducido() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Texto completo invisible: reserva el lugar para que el papel no crezca mientras se escribe
function Fijo({ partes, children }) {
  return (
    <span className="cuaderno__fijo">
      <span className="cuaderno__fantasma" aria-hidden="true">
        {partes.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <Fragment key={i}>{p.t}</Fragment>))}
      </span>
      <span className="cuaderno__escrito">{children}</span>
    </span>
  );
}

// Hook: cuántas letras van escritas (unas 40 por segundo, máximo ~2,6 s)
export function useLetras(total, clave) {
  const duracion = Math.min(2600, total * 25);
  const [letras, setLetras] = useState(() => (movimientoReducido() ? total : 0));
  useEffect(() => {
    if (movimientoReducido() || total === 0) {
      setLetras(total);
      return undefined;
    }
    setLetras(0);
    let cuadro;
    const inicio = performance.now();
    const paso = (ahora) => {
      const n = Math.min(total, Math.ceil(((ahora - inicio) / duracion) * total));
      setLetras(n);
      if (n < total) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [clave, total, duracion]);
  return letras;
}

// Escribe los pedacitos de a una letra, con un lápiz al final mientras escribe
export function Escritura({ partes, desde, hasta, letras }) {
  let resto = Math.max(0, Math.min(letras, hasta) - desde);
  const visibles = [];
  for (const p of partes) {
    if (resto <= 0) break;
    const t = p.t.slice(0, resto);
    resto -= t.length;
    visibles.push(p.b ? <b key={visibles.length}>{t}</b> : <Fragment key={visibles.length}>{t}</Fragment>);
  }
  const escribiendo = letras > desde && letras < hasta;
  return (
    <>
      {visibles}
      {escribiendo && <span className="cuaderno__lapiz" aria-hidden="true" />}
    </>
  );
}

export default function Aviso({ tipo = 'pista', titulo, children, accion, onAccion, secundaria, onSecundaria }) {
  const titulo_ = useMemo(() => aplanar(titulo), [titulo]);
  const cuerpo = useMemo(() => aplanar(children), [children]);
  const nTitulo = largo(titulo_.partes);
  const nCuerpo = cuerpo.complejo ? 0 : largo(cuerpo.partes);
  const total = nTitulo + nCuerpo;
  const clave = useMemo(() => [...titulo_.partes, ...cuerpo.partes].map((p) => p.t).join(''), [titulo_, cuerpo]);

  const letras = useLetras(total, clave);

  const termino = letras >= total;
  const textoCompleto = clave;

  return (
    <div className={`aviso-moli aviso-moli--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <span className="cuaderno__cinta" aria-hidden="true" />
      <span className="solo-lector">{textoCompleto}</span>
      <div className="aviso-moli__texto">
        <p className="aviso-moli__encabezado" aria-hidden="true">
          {ENCABEZADO[tipo]}
        </p>
        {titulo && (
          <p className="aviso-moli__titulo" aria-hidden={!titulo_.complejo}>
            {titulo_.complejo ? (
              titulo
            ) : (
              <Fijo partes={titulo_.partes}>
                <Escritura partes={titulo_.partes} desde={0} hasta={nTitulo} letras={letras} />
              </Fijo>
            )}
          </p>
        )}
        {children && (
          <div className="aviso-moli__cuerpo" aria-hidden={!cuerpo.complejo}>
            {cuerpo.complejo ? (
              <div className="cuaderno__aparece">{children}</div>
            ) : (
              <Fijo partes={cuerpo.partes}>
                <Escritura partes={cuerpo.partes} desde={nTitulo} hasta={total} letras={letras} />
              </Fijo>
            )}
          </div>
        )}
        {(accion || secundaria) && (
          <div className={`aviso-moli__acciones ${termino ? 'aviso-moli__acciones--listas' : ''}`}>
            {accion && (
              <button className={`btn ${tipo === 'acierto' ? 'btn--experimentar' : 'btn--primario'}`} onClick={onAccion}>
                {accion}
              </button>
            )}
            {secundaria && (
              <button className="btn btn--secundario" onClick={onSecundaria}>
                {secundaria}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="aviso-moli__cara">
        <Moli animo={ANIMO[tipo]} estilo="plano" tamano={78} />
      </div>
    </div>
  );
}
