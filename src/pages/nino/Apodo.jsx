import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { COLORES_ALUMNO } from '../../data/contenido';
import FondoVivo from '../../components/FondoVivo';
import { useSala, apodosLibres, unirme } from '../../sala/sala';
import VolverMaestra from '../../components/VolverMaestra';

/*
  NIÑO · APODO Y COLOR
  No hay campo de texto: se elige entre apodos científicos.
  Así ningún niño escribe su nombre real y no guardamos datos personales.
*/
export default function Apodo() {
  const sala = useSala();
  const navegar = useNavigate();
  const [opciones, setOpciones] = useState(() => apodosLibres(sala));
  const [apodo, setApodo] = useState(null);
  const [color, setColor] = useState(COLORES_ALUMNO[3].valor);

  if (sala.estado === 'cerrada') return <Navigate to="/clase" replace />;

  function listo() {
    unirme({ apodo, color });
    navegar('/clase/espera');
  }

  return (
    <main className="pantalla apodo">
      <VolverMaestra className="volver-maestra--esquina" />
      <FondoVivo semilla={6} opacidad={0.35} />
      <section className="apodo__eleccion">
        <span className="etiqueta">Sala {sala.codigo} · Paso 1 de 2</span>
        <h1>Elegí tu apodo científico</h1>
        <p>No hace falta tu nombre: con el apodo alcanza.</p>

        <div className="apodo__opciones" role="group" aria-label="Apodos">
          {opciones.map((a) => (
            <button key={a} className={`apodo__opcion ${apodo === a ? 'apodo__opcion--elegida' : ''}`} aria-pressed={apodo === a} onClick={() => setApodo(a)}>
              {a}
            </button>
          ))}
        </div>
        <button className="enlace" onClick={() => setOpciones(apodosLibres(sala))}>
          ↻ Ver otros apodos
        </button>

        <span className="etiqueta apodo__titulo-color">Tu color</span>
        <div className="apodo__colores" role="group" aria-label="Colores">
          {COLORES_ALUMNO.map((c) => (
            <button
              key={c.id}
              className={`apodo__color ${color === c.valor ? 'apodo__color--elegido' : ''}`}
              style={{ background: c.valor }}
              aria-label={c.nombre}
              aria-pressed={color === c.valor}
              onClick={() => setColor(c.valor)}
            />
          ))}
        </div>
      </section>

      <section className="apodo__vista">
        <span className="etiqueta">Así te va a ver la clase</span>
        <svg width="160" height="120" viewBox="0 20 160 120" role="img" aria-label="Tu organismo">
          <rect x="20" y="52" width="120" height="56" rx="28" fill={color} />
          <circle cx="68" cy="76" r="5" fill="#1A1B22" />
          <circle cx="92" cy="76" r="5" fill="#1A1B22" />
          <path d="M74 90 Q80 95 86 90" stroke="#1A1B22" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </svg>
        <p className="apodo__nombre">{apodo || 'Elegí un apodo'}</p>
        <button className="btn btn--primario btn--grande" disabled={!apodo} onClick={listo}>
          Listo
        </button>
      </section>
    </main>
  );
}
