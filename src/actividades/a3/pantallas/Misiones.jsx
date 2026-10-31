import { useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';

/* ETAPA 2 · Elegir un caso: una pregunta y pistas, nunca la respuesta */
export default function Misiones({ progreso, muestra }) {
  const [abierta, setAbierta] = useState(null);
  const datos = progreso.datos;
  const resueltas = new Set((datos.logros || []).filter((l) => l.m === muestra.id).map((l) => l.mi));
  const caso = muestra.misiones.find((m) => m.id === abierta);

  const empezar = () => {
    const pistas = { ...(datos.pistas || {}) };
    if (!pistas[caso.id]) pistas[caso.id] = 1;
    const preparado = (datos.preparado || []).includes(muestra.id);
    progreso.ir(preparado ? 'microscopio' : 'preparar', { mision: caso.id, pistas });
  };

  if (caso) {
    const n = muestra.misiones.indexOf(caso) + 1;
    return (
      <section className="a3-pantalla">
        <article className="a3-expediente anim-entrar" aria-labelledby="a3-caso-titulo">
          <span className="etiqueta">
            Caso 0{n} · {muestra.nombre}
          </span>
          <h1 id="a3-caso-titulo">{caso.titulo}</h1>
          <p className="a3-expediente__pregunta">{caso.pregunta}</p>
          <div className="a3-pista">
            <span className="etiqueta">Pista 1</span>
            <p>{caso.pistas[0]}</p>
          </div>
          <p className="texto-suave">Las otras pistas las podés pedir en el microscopio.</p>
          <div className="a3-acciones">
            <button className="btn btn--primario btn--grande" onClick={empezar}>
              Ir al microscopio
            </button>
            <button className="btn btn--secundario" onClick={() => setAbierta(null)}>
              Elegir otro caso
            </button>
          </div>
        </article>
        <GloboMoli texto="No te voy a decir dónde está: lo vas a investigar vos." animo="piensa" />
      </section>
    );
  }

  return (
    <section className="a3-pantalla">
      <header className="a3-titular anim-entrar">
        <span className="etiqueta">{muestra.nombre}</span>
        <h1>Elegí un caso</h1>
        <p>Cada caso es una pregunta. La respuesta está escondida en la muestra.</p>
      </header>
      <ul className="a3-casos">
        {muestra.misiones.map((m, i) => (
          <li key={m.id} className="anim-crecer" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
            <button className={`a3-caso ${resueltas.has(m.id) ? 'a3-caso--resuelto' : ''}`} onClick={() => setAbierta(m.id)}>
              <span className="etiqueta">Caso 0{i + 1}</span>
              <span className="a3-caso__titulo">{m.titulo}</span>
              <span className="a3-caso__pregunta">{m.pregunta}</span>
              {resueltas.has(m.id) && <span className="a3-sello">Resuelto</span>}
            </button>
          </li>
        ))}
      </ul>
      <button className="enlace a3-volver" onClick={() => progreso.ir('muestra')}>
        Cambiar de muestra
      </button>
      <GloboMoli texto="¿Qué querés investigar primero?" animo="escucha" />
    </section>
  );
}
