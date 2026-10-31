import { useEffect, useState } from 'react';
import Poblacion from './Poblacion';
import Fidelidad from './Fidelidad';
import Laboratorio from './Laboratorio';
import Conclusion from './Conclusion';
import './a4.css';

/*
  A4 · Evolución Experimental de Virus.
  Una población de virus se copia generación tras generación. Al copiar su receta
  (información genética) aparecen errores al azar → variantes → un árbol.
  El niño controla la fidelidad de copia y cambia el ambiente.
  Mensaje central: las mutaciones no aparecen porque se necesiten; aparecen al azar,
  y el ambiente favorece a algunas que ya estaban.
*/
const LAB = ['generaciones', 'arbol', 'ambiente', 'observar'];

function useMovimientoReducido() {
  const consulta = '(prefers-reduced-motion: reduce)';
  const [reducido, setReducido] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(consulta);
    if (!mq) return undefined;
    const cambio = () => setReducido(mq.matches);
    mq.addEventListener?.('change', cambio);
    return () => mq.removeEventListener?.('change', cambio);
  }, []);
  return Boolean(reducido);
}

export default function ActividadA4({ progreso }) {
  const reducido = useMovimientoReducido();
  const etapa = progreso.etapa;
  let contenido;
  if (etapa === 'fidelidad') contenido = <Fidelidad progreso={progreso} />;
  else if (LAB.includes(etapa)) contenido = <Laboratorio key={`lab-${progreso.datos.corrida ?? 0}`} progreso={progreso} reducido={reducido} />;
  else if (etapa === 'conclusion') contenido = <Conclusion progreso={progreso} />;
  else contenido = <Poblacion progreso={progreso} reducido={reducido} />;
  return <div className={`a4 a4--${etapa}`}>{contenido}</div>;
}
