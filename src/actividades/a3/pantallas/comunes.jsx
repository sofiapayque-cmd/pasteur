import { useCallback, useEffect, useState } from 'react';
import Campo from '../Campo';
import { escenaDe, PLANOS } from '../motor';
import { MUESTRA } from '../contenido';

/* Una foto se vuelve a dibujar desde sus metadatos (no se guardan imágenes). */
export function Foto({ foto, tam, children, ...resto }) {
  const escena = escenaDe(foto.m);
  const blanqueo = useCallback(() => foto.bl || [1, 1, 1], [foto]);
  return (
    <Campo
      escena={escena}
      vista={{ x: foto.x, y: foto.y, a: foto.a, z: foto.z, l: foto.l }}
      tam={tam}
      blanqueo={blanqueo}
      desenfoque={foto.d}
      lechosa={foto.a === 100 && !foto.ac}
      version={foto.id}
      escala={tam >= 180}
      {...resto}
    >
      {children}
    </Campo>
  );
}

const NOMBRE_COLOR = { b: 'azul', g: 'verde', r: 'rojo' };
export function describirLuz(foto) {
  const m = MUESTRA[foto.m];
  if (!foto.l) return 'Sin luz';
  if (foto.l === 'w') return 'Campo claro (luz blanca)';
  return foto.l
    .split('')
    .map((c) => `${m.canales[c]} (${NOMBRE_COLOR[c]})`)
    .join(' + ');
}

export function Metadatos({ foto, extra }) {
  return (
    <dl className="a3-meta">
      <div>
        <dt>Objetivo</dt>
        <dd>{foto.a}x{foto.a === 100 ? (foto.ac ? ' · aceite' : ' · sin aceite') : ''}</dd>
      </div>
      <div>
        <dt>Plano</dt>
        <dd>
          {foto.z + 1} de {PLANOS}
        </dd>
      </div>
      <div>
        <dt>Luz</dt>
        <dd>{describirLuz(foto)}</dd>
      </div>
      <div>
        <dt>Posición</dt>
        <dd>
          X {Math.round(foto.x)} · Y {Math.round(foto.y)} µm
        </dd>
      </div>
      {extra}
    </dl>
  );
}

/* Tarjeta chica del caso, con las pistas que el niño fue pidiendo */
export function TarjetaCaso({ mision, pistas, onPista }) {
  // Se ve una pista por vez (la última pedida); los números permiten releer las anteriores
  const [ver, setVer] = useState(pistas - 1);
  useEffect(() => setVer(pistas - 1), [pistas]);
  const actual = Math.min(ver, pistas - 1);
  return (
    <div className="a3-tcaso">
      <span className="etiqueta">Caso</span>
      <p className="a3-tcaso__titulo">{mision.titulo}</p>
      <div className="a3-tcaso__nav">
        <span className="etiqueta">Pista</span>
        {mision.pistas.slice(0, pistas).map((_, i) => (
          <button key={i} className="a3-tcaso__num" aria-pressed={i === actual} aria-label={`Ver pista ${i + 1}`} onClick={() => setVer(i)}>
            {i + 1}
          </button>
        ))}
        {onPista && pistas < mision.pistas.length && (
          <button className="a3-tcaso__mas" onClick={onPista}>
            Otra pista
          </button>
        )}
      </div>
      <p key={actual} className="a3-tcaso__pista anim-entrar" aria-live="polite">
        {mision.pistas[actual]}
      </p>
    </div>
  );
}
