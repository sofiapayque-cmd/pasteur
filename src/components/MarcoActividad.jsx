'use client';

import { useDesde, useNavigate } from '@/navegacion';
import VolverMaestra from './VolverMaestra';
import Moli from './Moli';
import FondoVivo from './FondoVivo';
import { ACTIVIDADES } from '../data/contenido';
import { INFO_ACTIVIDADES } from '../actividades/info';

/*
  Marco común de todas las actividades: fondo vivo, cabecera, progreso
  y la pantalla de pausa cuando la maestra pide mirar el pizarrón.
  Cada actividad dibuja su contenido adentro.
*/
/* En una tarea, el avance se guarda solo: un cartelito cuenta cómo va. */
function EstadoGuardado({ estado }) {
  const texto = {
    listo: 'Guardado',
    guardando: 'Guardando…',
    error: 'Sin conexión: se guarda cuando vuelva',
    cerrada: 'Tu maestra cerró esta actividad',
  }[estado];
  return (
    <span className={`guardado guardado--${estado}`} role="status" aria-live="polite">
      {texto}
    </span>
  );
}

export default function MarcoActividad({ actividadId, progreso, children }) {
  const navegar = useNavigate();
  const desde = useDesde(); // ej. la maestra probando la actividad desde "Preparar la clase" (?desde=…)
  const act = ACTIVIDADES.find((a) => a.id === actividadId);
  const etapas = INFO_ACTIVIDADES[actividadId]?.ETAPAS || [];
  const i = Math.max(0, etapas.findIndex((e) => e.id === progreso.etapa));

  return (
    <main className="pantalla actividad" style={{ background: act?.fondo, '--fondo-actividad': act?.fondo }}>
      <FondoVivo semilla={actividadId.charCodeAt(1) * 7} cantidad={10} opacidad={0.35} />
      <header className="cabecera actividad__cabecera">
        <div className="cabecera__izq">
          {!progreso.enClase && (
            <button className="btn btn--claro cabecera__volver" onClick={() => navegar(progreso.tarea ? '/lab' : desde || '/explorar')}>
              {progreso.tarea ? 'Mi laboratorio' : desde === '/maestra' ? 'Volver a mi panel' : desde ? 'Volver a preparar la clase' : 'Salir'}
            </button>
          )}
          <span className="etiqueta etiqueta--oscura">
            {act?.numero} · {act?.nombre} · {progreso.enClase || progreso.tarea ? progreso.alumno?.apodo || 'tu tarea' : 'modo individual'}
          </span>
          {progreso.tarea && <EstadoGuardado estado={progreso.guardado} />}
        </div>
        <div className="cabecera__der">
          {!progreso.enClase && !progreso.tarea && (
            <button className="enlace" onClick={progreso.reiniciar}>
              Empezar de nuevo
            </button>
          )}
          {!progreso.tarea && <VolverMaestra destino={!progreso.enClase && desde ? desde : undefined} />}
        </div>
      </header>

      {etapas.length > 1 && (
        <ol className="actividad__progreso" aria-label={`Etapa ${i + 1} de ${etapas.length}: ${etapas[i]?.nombre}`}>
          {etapas.map((e, n) => (
            <li key={e.id} className={n < i ? 'hecha' : n === i ? 'actual' : ''} title={e.nombre}>
              <span className="solo-lector">{e.nombre}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="actividad__contenido">{children}</div>

      {progreso.pausada && (
        <div className="pausa" role="dialog" aria-modal="true" aria-labelledby="pausa-titulo">
          <div className="pausa__tarjeta">
            <Moli animo="escucha" tamano={260} />
            <div>
              <span className="etiqueta">{progreso.sala.estado === 'puesta' ? 'Puesta en común' : 'Pausa'}</span>
              <h2 id="pausa-titulo">Mirá el pizarrón</h2>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
