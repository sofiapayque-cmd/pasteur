'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/navegacion';
import { TEXTO_INICIO } from '../data/contenido';
import FondoVivo from '../components/FondoVivo';
import { aulasReales } from '@/lib/supabase/config';

/*
  01 · INICIO
  Al tocar el círculo, crece hasta llenar la pantalla (zoom) y
  pasamos a elegir rol. El zoom es una transición CSS: liviana para las Ceibal.
*/
export default function Inicio() {
  const navegar = useNavigate();
  const [zoom, setZoom] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  function entrar() {
    if (zoom) return;
    setZoom(true);
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    temporizador.current = setTimeout(() => navegar('/rol'), reducido ? 50 : 950);
  }

  return (
    <main className="pantalla inicio">
      <FondoVivo semilla={2} cantidad={14} opacidad={0.55} />
      <div className={`inicio__textos ${zoom ? 'se-desvanece' : ''}`}>
        <div className="logo-pendiente inicio__logo">[Logo Institut Pasteur]</div>
        <h1 className="inicio__titulo">La ciencia sin límites</h1>
        <p className="inicio__texto">{TEXTO_INICIO}</p>
        {/* Para escuelas o maestras que nos encuentran (pedido de Sofia, 6/11) */}
        {aulasReales && (
          <a className="inicio__acceso" href="/pedir-acceso">
            ¿Sos maestra o trabajás en una escuela? <b>Pedí acceso</b>
          </a>
        )}
      </div>
      <div className="inicio__circulo-zona">
        <span className="inicio__anillo" aria-hidden="true" />
        <div className={`inicio__orbita ${zoom ? 'se-desvanece' : ''}`} aria-hidden="true">
          {['#F4A6BD', '#F2B13B', '#8ED5C3', '#EF6F5E', '#93AEEB', '#E3EEA0'].map((c, i) => (
            <i key={c} style={{ background: c, transform: `rotate(${i * 60}deg) translateX(170px)`, width: 14 + (i % 3) * 8, height: 14 + (i % 3) * 8 }} />
          ))}
        </div>
        <button className={`inicio__circulo ${zoom ? 'inicio__circulo--zoom' : ''}`} onClick={entrar} aria-label="Entrar a la experiencia">
          <span className={`etiqueta inicio__pista ${zoom ? 'se-desvanece' : ''}`}>Tocá el círculo</span>
        </button>
      </div>
    </main>
  );
}
