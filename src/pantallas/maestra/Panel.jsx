'use client';

import { conDesde, useNavigate } from '@/navegacion';
import Cabecera from '../../components/Cabecera';
import Moli from '../../components/Moli';
import FondoVivo from '../../components/FondoVivo';
import { ACTIVIDADES } from '../../data/contenido';
import CuentaDocente from '../../components/CuentaDocente';

/* 03 · PANEL DE LA MAESTRA — las cuatro actividades aparecen como colonias que crecen.
   cuenta: nombre de la maestra con sesión (sistema de aulas), o null en el prototipo. */
/** @param {{ cuenta?: string | null }} props */
export default function Panel({ cuenta = null }) {
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
      <ul className="panel__actividades">
        {ACTIVIDADES.map((a, i) => (
          <li key={a.id} className={`panel__actividad anim-crecer ${a.disponible ? '' : 'panel__actividad--pausa'}`} style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
            <span className="panel__placa" style={{ background: a.placa }} aria-hidden="true" />
            <span className="etiqueta">Actividad {a.numero}</span>
            <h2 className="panel__nombre">{a.nombre}</h2>
            <p className="panel__bajada">{a.bajada}</p>
            {a.disponible ? (
              <>
                <button className="btn btn--primario" onClick={() => navegar(`/maestra/${a.id}/preparar`)}>
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
