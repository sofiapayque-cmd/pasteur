import type { ReactNode } from 'react';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import Moli from '@/components/Moli';

/* Marco común de las pantallas de acceso de la maestra (ingresar, recuperar, elegir contraseña). */
export default function MarcoAcceso({ etiqueta, titulo, bajada, children }: { etiqueta: string; titulo: string; bajada?: string; children: ReactNode }) {
  return (
    <main className="pantalla acceso">
      <FondoVivo semilla={9} />
      <Cabecera volverA="/rol" miga="Inicio › Maestras" />
      <div className="acceso__cuerpo">
        <section className="acceso__tarjeta anim-crecer">
          <span className="etiqueta">{etiqueta}</span>
          <h1>{titulo}</h1>
          {bajada && <p className="acceso__bajada">{bajada}</p>}
          {children}
        </section>
        <div className="acceso__moli" aria-hidden="true">
          <Moli estilo="plano" patas tamano={150} />
        </div>
      </div>
    </main>
  );
}
