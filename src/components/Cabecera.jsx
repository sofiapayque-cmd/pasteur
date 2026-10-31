import { useNavigate } from 'react-router-dom';

/* Barra de arriba: botón Volver, miga de pan y lugar para el logo del instituto. */
export default function Cabecera({ volverA, miga, derecha }) {
  const navegar = useNavigate();
  return (
    <header className="cabecera">
      <div className="cabecera__izq">
        {volverA && (
          <button className="btn btn--claro cabecera__volver" onClick={() => navegar(volverA)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver
          </button>
        )}
        {miga && <span className="etiqueta cabecera__miga">{miga}</span>}
      </div>
      {derecha || <div className="logo-pendiente">[Logo Institut Pasteur]</div>}
    </header>
  );
}
