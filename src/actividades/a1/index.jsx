import { useEffect } from 'react';
import './a1.css';
import Paisaje from './pantallas/Paisaje';
import Explorar from './pantallas/Explorar';
import Muestra from './pantallas/Muestra';
import Mesa from './pantallas/Mesa';
import Cultivo from './pantallas/Cultivo';
import Comparar from './pantallas/Comparar';
import Antibioticos from './pantallas/Antibioticos';
import Conclusiones from './pantallas/Conclusiones';

/*
  A1 · Genómica Microbiana
  La etapa visible SIEMPRE sale de progreso.etapa (la maestra la ve en el tablero).
  Recorrido: paisaje → explorar → muestra → mesa (centro no lineal) →
  cultivo / comparar / antibióticos → conclusiones.
*/
const PANTALLAS = {
  paisaje: Paisaje,
  explorar: Explorar,
  muestra: Muestra,
  mesa: Mesa,
  cultivo: Cultivo,
  comparar: Comparar,
  antibioticos: Antibioticos,
  conclusiones: Conclusiones,
};

export default function ActividadA1({ progreso }) {
  const Pantalla = PANTALLAS[progreso.etapa] || Paisaje;
  // Cada etapa empieza arriba de todo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [progreso.etapa]);
  return (
    <div className="a1" key={progreso.etapa}>
      <Pantalla progreso={progreso} />
    </div>
  );
}
