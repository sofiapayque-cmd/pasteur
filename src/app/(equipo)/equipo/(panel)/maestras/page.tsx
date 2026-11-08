import { notFound } from 'next/navigation';
import { exigirMiembro } from '@/datos/equipo';
import { listarSolicitudes } from '@/datos/solicitudes';
import Solicitudes from '@/pantallas/equipo/Solicitudes';

/* /equipo/maestras · Pedidos de acceso de escuelas y maestras, e invitaciones (solo la admin). */
export default async function Page() {
  const yo = await exigirMiembro();
  if (yo.rol !== 'admin') notFound();
  const { pendientes, resueltas } = await listarSolicitudes();
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Maestras</h1>
        <p className="eq-bajada">
          Las escuelas y maestras que encuentran la plataforma piden acceso desde el inicio. Acá los ves y, con un clic, les creás la cuenta.
        </p>
      </div>
      <Solicitudes pendientes={pendientes} resueltas={resueltas} />
    </main>
  );
}
