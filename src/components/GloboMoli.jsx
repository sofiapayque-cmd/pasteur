import Moli from './Moli';

/* Moli abajo a la derecha con un globo de diálogo (máximo dos líneas). */
export default function GloboMoli({ texto, animo = 'feliz', tamano = 120 }) {
  return (
    <div className="globo-moli" aria-live="polite">
      {texto && <p className="globo-moli__texto">{texto}</p>}
      <Moli animo={animo} estilo="plano" patas tamano={tamano} />
    </div>
  );
}
