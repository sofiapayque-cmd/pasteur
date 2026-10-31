import Moli from './Moli';

export default function Cargando() {
  return (
    <div className="cargando" role="status">
      <Moli animo="piensa" tamano={160} />
      <span className="etiqueta etiqueta--oscura">Preparando el laboratorio…</span>
    </div>
  );
}
