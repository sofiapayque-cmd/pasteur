'use client';

import { conDesde, useNavigate } from '@/navegacion';
import Cabecera from '../../components/Cabecera';
import Moli from '../../components/Moli';
import FondoVivo from '../../components/FondoVivo';
import { ACTIVIDADES } from '../../data/contenido';
import CuentaDocente from '../../components/CuentaDocente';
import { aulasReales } from '@/lib/supabase/config';
import Curiosidades from '../../components/Curiosidades';

/* 03 · PANEL DE LA MAESTRA — las actividades aparecen como colonias que crecen.
   cuenta: nombre de la maestra con sesión (sistema de aulas), o null en el prototipo. */
/** @param {{ cuenta?: string | null, curiosidades?: import('@/datos/curiosidades').CuriosidadVisible[] }} props */
export default function Panel({ cuenta = null, curiosidades = [] }) {
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
      {/* "Preguntale al Pasteur" a la vista (8/11): antes era solo un botón chico arriba a la derecha */}
      {cuenta && (
        <section className="tarjeta panel__asistente" aria-labelledby="panel-asistente">
          <div>
            <span className="etiqueta">Para la clase</span>
            <h2 id="panel-asistente">Preguntale al Pasteur</h2>
            <p>Escribí una pregunta que haya hecho la clase y mostrales la respuesta que aprobó una investigadora del Instituto.</p>
          </div>
          <a className="btn btn--primario" href="/maestra/preguntar">
            Hacer una pregunta
          </a>
        </section>
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
