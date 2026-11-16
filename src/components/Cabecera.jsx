'use client';

import { useVolver } from '@/navegacion';

/*
  Barra de arriba: botón Volver, miga de pan y, a la derecha, lo que pase cada pantalla (por ejemplo la cuenta de la maestra). Sin logo del instituto (pedido de Sofia, 11/11).
  Volver lleva a la página de la web de donde se vino; volverA es adonde va si no hay una (ver useVolver).
*/
/** @param {{ volverA?: string, miga?: string, derecha?: import('react').ReactNode }} props */
export default function Cabecera({ volverA, miga, derecha }) {
  const volver = useVolver(volverA ?? '/');
  return (
    <header className="cabecera">
      <div className="cabecera__izq">
        {volverA && (
          <button className="btn btn--claro cabecera__volver" onClick={volver}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver
          </button>
        )}
        {miga && <span className="etiqueta cabecera__miga">{miga}</span>}
      </div>
      {derecha}
    </header>
  );
}
