'use client';

import { Navigate, useNavigate } from '@/navegacion';
import GloboMoli from '../../components/GloboMoli';
import FondoVivo from '../../components/FondoVivo';
import { ACTIVIDADES } from '../../data/contenido';
import { useSala, empezar, simularAlumno } from '../../sala/sala';
import { useOrigen } from '@/hooks/navegador';
import { aulasReales } from '@/lib/supabase/config';

/*
  SALA DE ESPERA — pensada para proyectar en el pizarrón.
  (La plataforma ya no usa CREA: los chicos entran directo a la página.)
  Con el sistema de aulas, esta clase en vivo todavía es la de prueba (todo en
  esta computadora) hasta la etapa 5, parte 2: se avisa y se ofrece mandar la
  actividad desde el aula, que sí llega a la compu de cada chico.
*/
export default function SalaEspera() {
  const sala = useSala();
  const navegar = useNavigate();
  const origen = useOrigen();

  if (sala.estado === 'cerrada') return <Navigate to="/maestra" replace />;

  const act = ACTIVIDADES.find((a) => a.id === sala.actividad);
  const link = `${origen}/clase/${sala.codigo}`; // sin # desde la etapa 3

  function arrancar() {
    empezar();
    navegar(`/maestra/${sala.actividad}/tablero`);
  }

  return (
    <main className="pantalla sala">
      <FondoVivo semilla={21} opacidad={0.4} />
      <section className="sala__codigo">
        <span className="etiqueta etiqueta--oscura">
          {act?.numero} · {act?.nombre} · Sala
        </span>
        <p className="sala__instruccion">
          Entrá a <b>{origen.replace(/^https?:\/\//, '')}/clase</b> y escribí el código:
        </p>
        <p className="sala__clave" aria-label={`Código: ${sala.codigo.split('').join(' ')}`}>
          {sala.codigo}
        </p>
        <div className="sala__qr">
          <div className="sala__qr-caja">[QR]</div>
          <p>
            Link para compartir con la clase:
            <br />
            <span className="sala__link">{link}</span>
          </p>
        </div>
        {aulasReales && (
          <p className="sala__aviso">
            Esta clase en vivo todavía es de prueba: los chicos entran desde esta misma computadora. Para que cada uno trabaje desde su Ceibal, mandá la actividad desde{' '}
            <b>Mis aulas → Mandar una actividad</b>.
          </p>
        )}
      </section>

      <section className="sala__lista">
        <div className="sala__lista-cabeza">
          <h1>En la sala</h1>
          <span className="etiqueta etiqueta--oscura">{sala.alumnos.length} conectados</span>
        </div>
        {sala.alumnos.length === 0 && <p className="texto-suave">Todavía no entró nadie.</p>}
        <ul className="chips">
          {sala.alumnos.map((a) => (
            <li key={a.id} className="chip anim-crecer">
              <i style={{ background: a.color }} aria-hidden="true" />
              {a.apodo}
            </li>
          ))}
        </ul>
        <div className="sala__acciones">
          <button className="btn btn--experimentar btn--grande" onClick={arrancar} disabled={sala.alumnos.length === 0}>
            Empezar
          </button>
          <button className="btn btn--secundario" onClick={() => navegar(`/maestra/${sala.actividad}/preparar`)}>
            Volver a preparar
          </button>
          <button className="prototipo" onClick={simularAlumno}>
            + Simular un alumno (solo prototipo)
          </button>
        </div>
      </section>

      <GloboMoli animo="escucha" texto={sala.alumnos.length ? '¡Ya casi! Esperamos a los que faltan.' : 'Compartí el código con la clase.'} />
    </main>
  );
}
