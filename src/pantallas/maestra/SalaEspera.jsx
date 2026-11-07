'use client';

import { Navigate, useNavigate } from '@/navegacion';
import GloboMoli from '../../components/GloboMoli';
import FondoVivo from '../../components/FondoVivo';
import { ACTIVIDADES } from '../../data/contenido';
import { useClase } from '../../sala/contexto';
import { useOrigen } from '@/hooks/navegador';
import { aulasReales } from '@/lib/supabase/config';

/*
  SALA DE ESPERA — pensada para proyectar en el pizarrón.
  (La plataforma ya no usa CREA: los chicos entran directo a la página.)
  · Clase real (Mis aulas → Clase en vivo): cada chico entra con su tarjeta
    desde su Ceibal y aparece acá apenas abre la clase.
  · Prototipo (Preparar la clase): todo en esta computadora. Con el sistema de
    aulas prendido, se avisa dónde está la clase de verdad.
*/
export default function SalaEspera() {
  const clase = useClase();
  const { sala, real } = clase;
  const navegar = useNavigate();
  const origen = useOrigen();

  if (sala.estado === 'cerrada') return real ? null : <Navigate to="/maestra" replace />;

  const act = ACTIVIDADES.find((a) => a.id === sala.actividad);
  const link = `${origen}/clase/${sala.codigo}`; // sin # desde la etapa 3

  function arrancar() {
    clase.empezar();
    if (!real) navegar(`/maestra/${sala.actividad}/tablero`);
  }
  function cancelar() {
    if (window.confirm('¿Cancelar la clase? Los chicos vuelven a su laboratorio.')) clase.cerrar();
  }

  return (
    <main className="pantalla sala">
      <FondoVivo semilla={21} opacidad={0.4} />
      <section className="sala__codigo">
        <span className="etiqueta etiqueta--oscura">
          {act?.numero} · {act?.nombre} · {real ? clase.aula?.nombre : 'Sala'}
        </span>
        <p className="sala__instruccion">
          Entrá a <b>{origen.replace(/^https?:\/\//, '')}/clase</b> {real ? 'con tu tarjeta. El código del aula es:' : 'y escribí el código:'}
        </p>
        <p className="sala__clave" aria-label={`Código: ${sala.codigo.split('').join(' ')}`}>
          {sala.codigo}
        </p>
        <div className="sala__qr">
          {!real && <div className="sala__qr-caja">[QR]</div>}
          <p>
            Link para compartir con la clase:
            <br />
            <span className="sala__link">{link}</span>
          </p>
        </div>
        {aulasReales && !real && (
          <p className="sala__aviso">
            Esta es la clase de prueba: los chicos entran desde esta misma computadora. Para que cada uno trabaje desde su Ceibal, abrí la clase desde{' '}
            <b>Mis aulas → tu aula → Clase en vivo</b>.
          </p>
        )}
        {real && clase.aviso && <p className="sala__aviso">{clase.aviso}</p>}
      </section>

      <section className="sala__lista">
        <div className="sala__lista-cabeza">
          <h1>En la sala</h1>
          <span className="etiqueta etiqueta--oscura">
            {sala.alumnos.length} {real ? (sala.alumnos.length === 1 ? 'entró' : 'entraron') : 'conectados'}
          </span>
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
          {real ? (
            <button className="btn btn--secundario" onClick={cancelar}>
              Cancelar la clase
            </button>
          ) : (
            <>
              <button className="btn btn--secundario" onClick={() => navegar(`/maestra/${sala.actividad}/preparar`)}>
                Volver a preparar
              </button>
              <button className="prototipo" onClick={clase.simularAlumno}>
                + Simular un alumno (solo prototipo)
              </button>
            </>
          )}
        </div>
      </section>

      <GloboMoli animo="escucha" texto={sala.alumnos.length ? '¡Ya casi! Esperamos a los que faltan.' : 'Compartí el código con la clase.'} />
    </main>
  );
}
