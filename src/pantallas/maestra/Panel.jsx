'use client';

import { conDesde, useNavigate } from '@/lib/navegacion';
import Cabecera from '../../components/Cabecera';
import Moli from '../../components/Moli';
import FondoVivo from '../../components/FondoVivo';
import { ACTIVIDADES } from '@/lib/contenido';
import CuentaDocente from '../../components/CuentaDocente';
import { aulasReales } from '@/lib/supabase/config';
import Curiosidades from '../../components/Curiosidades';

/* 03 · PANEL DE LA MAESTRA — las actividades aparecen como colonias que crecen.
   cuenta: nombre de la maestra con sesión (sistema de aulas), o null en el prototipo. */
/** @param {{ cuenta?: string | null, curiosidades?: import('@/datos/curiosidades').CuriosidadVisible[], avisos?: { respuestasNuevas: number, preguntasDeChicos: number } | null }} props */
export default function Panel({ cuenta = null, curiosidades = [], avisos = null }) {
  const navegar = useNavigate();
  return (
    <main className="pantalla panel">
      <FondoVivo semilla={9} />
      <Cabecera volverA="/rol" miga="Inicio › Maestras" derecha={cuenta ? <CuentaDocente nombre={cuenta} /> : undefined} />
      <div className="panel__cabeza">
        <div className="panel__intro">
          <span className="etiqueta">Recorrido docente</span>
          <h1>Elegí una actividad para tu clase</h1>
          <p>Cada niño la hace en su Ceibal y vos guiás los momentos desde tu computadora.</p>
        </div>
        <div className="panel__moli">
          <p className="globo-moli__texto">¡Hola! Soy Moli. Elegí un laboratorio para tu clase.</p>
          <Moli estilo="plano" patas tamano={110} />
        </div>
      </div>
      {/* "Preguntale al Pasteur" y "Mi cuaderno" (16/11, pedido de Sofia): dos tarjetas en relieve, una al lado de la otra,
          cada una con su placa chica como las de las actividades. Toda la tarjeta es el link.
          Mi cuaderno avisa cuando llega la respuesta a una pregunta suya y cuando los chicos escriben preguntas. */}
      {cuenta && (
        <div className="panel__accesos">
          <a className="panel__acceso" href="/maestra/preguntar">
            <span className="panel__mini panel__mini--pregunta" aria-hidden="true">
              ?
            </span>
            <span className="panel__acceso-texto">
              <span className="etiqueta">Para la clase</span>
              <strong className="panel__acceso-titulo">Preguntale al Pasteur</strong>
              <span className="panel__acceso-bajada">Escribí una pregunta de la clase y mostrales la respuesta que aprobó una investigadora.</span>
            </span>
            <Flecha />
          </a>
          {avisos && (
            <a className={`panel__acceso ${avisos.respuestasNuevas ? 'panel__acceso--nuevo' : ''}`} href="/maestra/cuaderno">
              <span className="panel__mini panel__mini--cuaderno" aria-hidden="true">
                {avisos.respuestasNuevas > 0 && <b className="panel__mini-numero">{avisos.respuestasNuevas}</b>}
              </span>
              <span className="panel__acceso-texto">
                <span className="etiqueta">Mi cuaderno</span>
                <strong className="panel__acceso-titulo">
                  {avisos.respuestasNuevas
                    ? avisos.respuestasNuevas === 1
                      ? '¡Respondimos una pregunta tuya!'
                      : `¡Respondimos ${avisos.respuestasNuevas} preguntas tuyas!`
                    : 'Tus preguntas y tus clases'}
                </strong>
                <span className="panel__acceso-bajada">
                  {avisos.preguntasDeChicos
                    ? avisos.preguntasDeChicos === 1
                      ? 'Un chico escribió una pregunta en su cuaderno.'
                      : `Tus chicos escribieron ${avisos.preguntasDeChicos} preguntas en sus cuadernos.`
                    : 'Lo que hicieron en cada clase, cuánto duró y lo que preguntaron.'}
                </span>
              </span>
              <Flecha />
            </a>
          )}
        </div>
      )}
      {/* Curiosidades aprobadas, según lo que más se consulta (etapa 4) */}
      {curiosidades.length > 0 && (
        <section className="panel__curiosidad" aria-label="Curiosidad">
          <Curiosidades curiosidades={curiosidades} cada={0} />
        </section>
      )}
      <ul className="panel__actividades">
        {ACTIVIDADES.map((a, i) => (
          <li key={a.id} className={`panel__actividad anim-crecer ${a.disponible ? '' : 'panel__actividad--pausa'}`} style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
            <span className="panel__placa" style={{ background: a.placa }} aria-hidden="true" />
            <span className="etiqueta">Actividad {a.numero}</span>
            <h2 className="panel__nombre">{a.nombre}</h2>
            <p className="panel__bajada">{a.bajada}</p>
            {a.disponible ? (
              <>
                {/* Con el sistema real de aulas, la clase se arma desde "Mis aulas" (no desde la sala de prueba del navegador) */}
                <button className="btn btn--primario" onClick={() => navegar(aulasReales ? '/maestra/aulas' : `/maestra/${a.id}/preparar`)}>
                  Preparar la clase
                </button>
                <button className="enlace enlace--centro" onClick={() => navegar(conDesde(`/explorar/${a.id}`, '/maestra'))}>
                  Probarla yo
                </button>
              </>
            ) : (
              <span className="panel__pronto">En pausa</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

/* La flecha redonda en relieve de las tarjetas de arriba */
function Flecha() {
  return (
    <span className="panel__acceso-flecha" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}
