/*
  PROTOCOLO: los pasos para sembrar una placa, como una hoja del cuaderno del laboratorio.
  Se ve siempre al lado de la mesa: qué hice (tachado con ✓), qué toca ahora
  (resaltado, con un "¿por qué?" corto) y qué viene después.
  Así el niño entiende el orden sin tener que adivinar.
*/
export const PASOS_SIEMBRA = [
  { id: 'llama', texto: 'Pasá el asa por la llama', porque: 'El fuego mata los microbios del aire que tiene el asa.', donde: 'mechero' },
  { id: 'enfriar', texto: 'Esperá que se enfríe', porque: 'Si el asa está caliente, mata a los microbios de tu muestra.', donde: 'asa' },
  { id: 'cargar', texto: 'Tocá tu muestra con el asa', porque: 'En la punta del asa quedan unos poquitos microbios.', donde: 'tubo' },
  { id: 'zigzag', texto: 'Dibujá un zigzag en la placa', porque: 'El agar es comida: crecen justo por donde pasa el asa.', donde: 'placa' },
  { id: 'tapar', texto: 'Tapá la placa', porque: 'Con la tapa no le caen microbios del aire.', donde: 'placa' },
  { id: 'incubar', texto: 'Llevala a la incubadora', porque: 'Ahí elegís la temperatura y esperás.', donde: 'incubadora' },
];

export default function Protocolo({ actual }) {
  return (
    <section className="a1-protocolo" aria-label="Pasos para sembrar una placa">
      <span className="cuaderno__cinta" aria-hidden="true" />
      <h3 className="a1-protocolo__titulo">Protocolo · Sembrar una placa</h3>
      <ol className="a1-protocolo__lista">
        {PASOS_SIEMBRA.map((p, i) => {
          const estado = i < actual ? 'hecho' : i === actual ? 'ahora' : 'despues';
          return (
            <li key={p.id} className={`a1-protocolo__paso a1-protocolo__paso--${estado}`} aria-current={estado === 'ahora' ? 'step' : undefined}>
              <span className="a1-protocolo__num" aria-hidden="true">
                {estado === 'hecho' ? '✓' : i + 1}
              </span>
              <span className="a1-protocolo__cuerpo">
                <span className="a1-protocolo__texto">
                  {p.texto}
                  {estado === 'hecho' && <span className="solo-lector"> (hecho)</span>}
                </span>
                {estado === 'ahora' && <span className="a1-protocolo__porque">¿Por qué? {p.porque}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
