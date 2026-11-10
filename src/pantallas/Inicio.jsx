'use client';

import { useNavigate } from '@/navegacion';
import { aulasReales } from '@/lib/supabase/config';

const CELULA = '/illustrations/hero/cells/cell.png';

/* Posiciones en % del lienzo, pensadas para 1440×900 (referencia de composición). */
const CELULAS = [
  { id: 'a', left: '3.5%', top: '5%', w: '11.6vw', rot: -16 },
  { id: 'b', left: '9%', top: '24%', w: '5.4vw', rot: 22 },
  { id: 'c', left: '36%', top: '3.5%', w: '3.8vw', rot: 10 },
  { id: 'd', left: '63%', top: '4%', w: '6.2vw', rot: -12 },
  { id: 'e', left: '73%', top: '14%', w: '10.8vw', rot: 14 },
  { id: 'f', left: '88%', top: '6%', w: '4.6vw', rot: -26 },
  { id: 'g', left: '68%', top: '36%', w: '4.2vw', rot: 28 },
  { id: 'h', left: '85%', top: '46%', w: '9.2vw', rot: -8 },
  { id: 'i', left: '77%', top: '70%', w: '6vw', rot: 18 },
  { id: 'j', left: '89%', top: '76%', w: '10.4vw', rot: -18 },
  { id: 'k', left: '57%', top: '81%', w: '3.4vw', rot: 6 },
  { id: 'l', left: '17%', top: '76%', w: '8.4vw', rot: -14 },
  { id: 'm', left: '5%', top: '84%', w: '5vw', rot: 12 },
  { id: 'n', left: '44%', top: '46%', w: '7.6vw', rot: -6 },
  { id: 'o', left: '53%', top: '54%', w: '6.8vw', rot: 20 },
];

function CampoCelulas({ className = '' }) {
  return (
    <div className={`inicio__celulas ${className}`} aria-hidden="true">
      {CELULAS.map((c) => (
        <img
          key={c.id}
          src={CELULA}
          alt=""
          className="inicio__celula"
          style={{
            left: c.left,
            top: c.top,
            width: c.w,
            transform: `rotate(${c.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/*
  01 · INICIO
  Portada ilustrada. La lupa tiene el vidrio transparente: las células de
  debajo se ven ampliadas con una máscara circular y una copia sincronizada.
  La pelirroja usa la pose actual como placeholder; falta la ilustración
  sosteniendo el mango (no improvisar el brazo).
*/
export default function Inicio() {
  const navegar = useNavigate();

  function entrar() {
    navegar('/rol');
  }

  return (
    <main className="pantalla inicio">
      <CampoCelulas />

      <svg className="inicio-lupa__mango" viewBox="0 0 72 240" aria-hidden="true">
        <path
          fill="#1a2330"
          d="M36 4c14 6 22 22 20 48-3 38-14 72-20 118-3 24-2 48 8 62-22 4-34-18-30-52C18 120 28 78 22 42 18 22 24 8 36 4Z"
        />
        <path
          fill="rgba(255,255,255,0.14)"
          d="M40 14c8 8 12 22 11 42-2 28-8 54-13 92-1 10-2 18-2 26 6-8 8-22 10-38 4-36 8-70 2-100C46 22 44 16 40 14Z"
        />
      </svg>

      <div className="inicio__cientificos">
        <img
          src="/illustrations/hero/scientists/rodete-mira.png"
          alt=""
          className="inicio__cientifico inicio__cientifico--valentina"
        />
        <img
          src="/illustrations/hero/scientists/rulos-mira.png"
          alt=""
          className="inicio__cientifico inicio__cientifico--mateo"
        />
        {/* Placeholder: misma ilustración actual, sin brazo inventado. */}
        <img
          src="/illustrations/hero/scientists/pelirroja-mira.png"
          alt=""
          className="inicio__cientifico inicio__cientifico--sofia inicio__cientifico--placeholder"
        />
      </div>

      <div className="inicio-lupa">
        <div className="inicio-lupa__vidrio">
          <CampoCelulas className="inicio__celulas--ampliadas" />
        </div>
        <svg className="inicio-lupa__aro" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="47.2" fill="none" stroke="#1a2330" strokeWidth="5.6" />
          <circle cx="50" cy="50" r="44.1" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.9" />
        </svg>
        <button type="button" className="inicio-lupa__entrar" onClick={entrar} aria-label="Entrar a la experiencia" />
      </div>

      <div className="inicio__textos">
        <div className="logo-pendiente inicio__logo">[Logo Institut Pasteur]</div>
        <h1 className="inicio__titulo">La Ciencia sin Límites</h1>
        <p className="inicio__subtitulo">Comenzá a experimentar</p>
        {aulasReales && (
          <a className="inicio__acceso" href="/pedir-acceso">
            ¿Sos maestra o trabajás en una escuela? <b>Pedí acceso</b>
          </a>
        )}
      </div>
    </main>
  );
}
