import { useEffect, useRef, useState } from 'react';
import { dibujar, barraEscala } from './motor';

/*
  Campo: el círculo del ocular. Dibuja una vista de la muestra con Canvas 2D.
  Se usa en vivo (microscopio) y para las fotos (se vuelven a dibujar desde sus metadatos).
  Solo redibuja cuando cambia la vista o cuando `version` cambia (fotoblanqueo).
*/
const UNO = () => [1, 1, 1];
let ruido = null;
function texturaRuido() {
  if (ruido !== null) return ruido;
  try {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ruido = c.toDataURL('image/png');
  } catch {
    ruido = '';
  }
  return ruido;
}

export default function Campo({
  escena,
  vista,
  tam,
  blanqueo,
  desenfoque = 0,
  lechosa = false,
  version = 0,
  onStats,
  escala = true,
  className = '',
  children,
  ...resto
}) {
  const nRef = useRef(null);
  const fRef = useRef(null);
  const statsRef = useRef(onStats);
  const blanqueoRef = useRef(blanqueo);
  statsRef.current = onStats;
  blanqueoRef.current = blanqueo;
  const [grano, setGrano] = useState('');

  useEffect(() => {
    setGrano(texturaRuido());
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const n = nRef.current;
      const f = fRef.current;
      if (!n || !f) return;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const R = Math.round(tam * dpr);
      for (const c of [n, f]) {
        if (c.width !== R) {
          c.width = R;
          c.height = R;
        }
      }
      const s = dibujar(n.getContext('2d'), f.getContext('2d'), R, escena, vista, blanqueoRef.current || UNO);
      statsRef.current?.(s);
    });
    return () => cancelAnimationFrame(id);
  }, [escena, vista.x, vista.y, vista.a, vista.z, vista.l, tam, version]);

  const fluo = vista.l && vista.l !== 'w';
  const escalaPx = tam / 540;
  const filtros = [];
  if (lechosa) filtros.push('contrast(0.5)', 'brightness(1.2)', 'saturate(0.6)');
  const b = desenfoque * escalaPx + (lechosa ? 1.6 * escalaPx : 0);
  if (b > 0.15) filtros.push(`blur(${b.toFixed(2)}px)`);
  const barra = barraEscala(vista.a, tam);

  return (
    <div className={`a3-campo ${fluo ? 'a3-campo--fluo' : vista.l ? 'a3-campo--claro' : 'a3-campo--apagado'} ${className}`} style={{ width: tam, height: tam }} {...resto}>
      <div className="a3-campo__lente" style={{ filter: filtros.join(' ') || undefined }}>
        <canvas ref={nRef} className="a3-campo__lienzo" />
        <canvas ref={fRef} className="a3-campo__lienzo a3-campo__fantasma" style={{ filter: `blur(${Math.max(2, tam / 80).toFixed(1)}px)` }} />
      </div>
      {grano && <div className="a3-campo__grano" style={{ backgroundImage: `url(${grano})` }} />}
      <div className="a3-campo__vineta" />
      {escala && vista.l && (
        <div className="a3-campo__escala" aria-hidden="true">
          <span style={{ width: barra.px }} />
          <em>{barra.um} µm</em>
        </div>
      )}
      {children}
    </div>
  );
}
