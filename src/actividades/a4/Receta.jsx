import { LETRAS, RASGOS } from './modelo';

/*
  La receta (información genética) del virus: 8 letras de ARN.
  Las 4 primeras deciden cómo se ve; las 4 últimas son instrucciones para copiarse.
  - cambios: posiciones que salieron distintas al copiar (destello)
  - hasta: cuántas letras se ven (para mostrar la copia letra por letra)
  - leyendo: posición que se está leyendo ahora
*/
export default function Receta({ genoma, cambios = [], hasta = 8, leyendo = -1, compacta = false, roto = false, etiqueta }) {
  const letra = (v, i) => {
    const visible = i < hasta;
    const cambio = visible && cambios.includes(i);
    const clase = [
      'a4-letra',
      `a4-letra--${LETRAS[v]}`,
      cambio ? 'is-cambio' : '',
      cambio && i >= 4 ? 'is-rota' : '',
      !visible ? 'is-vacia' : '',
      leyendo === i ? 'is-leyendo' : '',
    ].join(' ');
    return (
      <span key={i} className={clase} title={i < 4 ? RASGOS[i].nombre : 'Instrucciones para copiarse'}>
        {visible ? LETRAS[v] : ''}
      </span>
    );
  };
  const texto = genoma.map((v) => LETRAS[v]).join(' ');
  return (
    <div className={`a4-receta ${compacta ? 'a4-receta--compacta' : ''} ${roto ? 'is-rota' : ''}`} role="img" aria-label={`${etiqueta || 'Receta'}: ${texto}`}>
      <div className="a4-receta__grupo">
        <div className="a4-receta__letras">{genoma.slice(0, 4).map((v, i) => letra(v, i))}</div>
        {!compacta && <span className="a4-receta__nombre">Cómo se ve</span>}
      </div>
      <div className="a4-receta__grupo">
        <div className="a4-receta__letras">{genoma.slice(4).map((v, i) => letra(v, i + 4))}</div>
        {!compacta && <span className="a4-receta__nombre">Cómo copiarse</span>}
      </div>
    </div>
  );
}
