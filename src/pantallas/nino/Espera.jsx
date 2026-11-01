'use client';

import { useEffect } from 'react';
import { Navigate, useNavigate } from '@/navegacion';
import Moli from '../../components/Moli';
import FondoVivo from '../../components/FondoVivo';
import { useSala, yo } from '../../sala/sala';
import VolverMaestra from '../../components/VolverMaestra';

/* NIÑO · ESPERA — hasta que la maestra toca "Empezar"; entonces la actividad se abre sola. */
export default function Espera() {
  const sala = useSala();
  const navegar = useNavigate();
  const mio = yo(sala);

  useEffect(() => {
    if (sala.estado === 'en-curso') navegar('/clase/actividad');
  }, [sala.estado, navegar]);

  if (!mio) return <Navigate to="/clase" replace />;

  return (
    <main className="pantalla espera">
      <FondoVivo semilla={8} cantidad={16} />
      <VolverMaestra className="volver-maestra--esquina" />
      <span className="etiqueta espera__sala">
        Sala {sala.codigo} · {sala.alumnos.length} en la sala
      </span>
      <section className="espera__texto">
        <h1>¡Ya estás adentro, {mio.apodo}!</h1>
        <p>Tu maestra está por empezar. Cuando lo haga, la actividad se abre sola.</p>
        <div className="puntos-espera" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
      <section className="espera__moli">
        <div className="espera__fondo" aria-hidden="true" />
        <Moli tamano={340} />
        <span className="chip espera__chip">
          <i style={{ background: mio.color }} aria-hidden="true" />
          {mio.apodo}
        </span>
      </section>
    </main>
  );
}
