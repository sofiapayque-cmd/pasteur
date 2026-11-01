'use client';

import { useState } from 'react';
import { Navigate, useNavigate, useParams, conDesde } from '@/navegacion';
import Cabecera from '../../components/Cabecera';
import FondoVivo from '../../components/FondoVivo';
import { ACTIVIDADES } from '../../data/contenido';
import { INFO_ACTIVIDADES } from '../../actividades/info';
import { abrirSala } from '../../sala/sala';

/*
  PREPARAR LA CLASE (cualquier actividad)
  Las opciones salen de OPCIONES y DESBLOQUEOS en actividades/aN/etapas.js.
*/
export default function Preparar() {
  const { act } = useParams();
  const navegar = useNavigate();
  const actividad = ACTIVIDADES.find((a) => a.id === act);
  const info = INFO_ACTIVIDADES[act] || {};
  const opcionesDef = info.OPCIONES || [];
  const desbloqueosDef = info.DESBLOQUEOS || [];

  const [opciones, setOpciones] = useState(() => Object.fromEntries(opcionesDef.map((o) => [o.clave, o.items.map((i) => i.id)])));
  // true = disponible desde el inicio; false = la maestra lo habilita en vivo
  const [desdeInicio, setDesdeInicio] = useState(() => Object.fromEntries(desbloqueosDef.map((d) => [d.clave, false])));

  if (!actividad || !actividad.disponible) return <Navigate to="/maestra" replace />;

  const vacia = opcionesDef.some((o) => opciones[o.clave].length === 0);

  function alternar(clave, id) {
    setOpciones((o) => {
      const lista = o[clave];
      return { ...o, [clave]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });
  }

  function abrir() {
    abrirSala({ actividad: act, opciones, desbloqueos: desdeInicio });
    navegar(`/maestra/${act}/sala`);
  }

  return (
    <main className="pantalla preparar">
      <FondoVivo semilla={5} opacidad={0.3} />
      <Cabecera volverA="/maestra" miga={`${actividad.numero} · ${actividad.nombre} · Preparar la clase`} />
      <div className="preparar__grilla">
        <section className="preparar__guia">
          <h1>Preparar la clase</h1>
          <p>{actividad.bajada}</p>
          <div className="preparar__guia-tarjeta">
            <span className="etiqueta etiqueta--oscura">Guía docente · {actividad.numero}</span>
            <h2>{info.GUIA?.titulo || actividad.nombre}</h2>
            <ul>
              {(info.GUIA?.objetivos || ['Objetivos: [validados con el instituto]']).map((o) => (
                <li key={o}>{o}</li>
              ))}
              <li>Duración sugerida: [00] minutos</li>
            </ul>
            <div className="preparar__guia-botones">
              <button className="btn btn--claro" onClick={() => navegar(conDesde(`/explorar/${act}`, `/maestra/${act}/preparar`))}>
                Probar la actividad
              </button>
              <button className="btn btn--claro" disabled title="La guía se suma cuando esté validada">
                Guía (PDF)
              </button>
            </div>
          </div>
        </section>

        <section className="preparar__opciones">
          {opcionesDef.map((o) => (
            <fieldset key={o.clave}>
              <legend className="etiqueta">{o.etiqueta}</legend>
              <div className="preparar__ambientes">
                {o.items.map((it) => {
                  const activo = opciones[o.clave].includes(it.id);
                  return (
                    <label key={it.id} className={`opcion ${activo ? 'opcion--activa' : ''}`}>
                      <input type="checkbox" checked={activo} onChange={() => alternar(o.clave, it.id)} />
                      {it.color && <span className="opcion__muestra" style={{ background: it.color }} aria-hidden="true" />}
                      <span>
                        <b>{it.nombre}</b>
                        {it.detalle && (
                          <>
                            <br />
                            {it.detalle}
                          </>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {desbloqueosDef.map((d) => (
            <fieldset key={d.clave}>
              <legend className="etiqueta">{d.etiqueta}</legend>
              <label className={`opcion ${!desdeInicio[d.clave] ? 'opcion--activa' : ''}`}>
                <input type="radio" name={d.clave} checked={!desdeInicio[d.clave]} onChange={() => setDesdeInicio((x) => ({ ...x, [d.clave]: false }))} />
                <span>
                  <b>{d.recomendado}</b>
                  <br />
                  <span className="texto-suave">{d.explicacion}</span>
                </span>
              </label>
              <label className={`opcion ${desdeInicio[d.clave] ? 'opcion--activa' : ''}`}>
                <input type="radio" name={d.clave} checked={desdeInicio[d.clave]} onChange={() => setDesdeInicio((x) => ({ ...x, [d.clave]: true }))} />
                <span>
                  <b>Disponible desde el inicio</b>
                </span>
              </label>
            </fieldset>
          ))}

          {opcionesDef.length === 0 && desbloqueosDef.length === 0 && (
            <p className="tarjeta">Esta actividad no necesita ajustes: abrí la sala cuando la clase esté lista.</p>
          )}

          <div className="preparar__accion">
            {vacia && <span className="aviso">Elegí al menos una opción de cada lista.</span>}
            <button className="btn btn--primario btn--grande" onClick={abrir} disabled={vacia}>
              Abrir sala
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
