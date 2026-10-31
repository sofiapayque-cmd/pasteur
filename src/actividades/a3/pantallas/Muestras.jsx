import GloboMoli from '../../../components/GloboMoli';
import Campo from '../Campo';
import { MUESTRAS } from '../contenido';
import { escenaDe } from '../motor';

// Cómo se ve cada muestra en la gotita del portaobjetos
const VISTA_PREVIA = {
  celulas: { x: 330, y: 350, a: 10, z: 1, l: 'bgr' },
  hoja: { x: 230, y: 236, a: 10, z: 2, l: 'gr' },
  bacterias: { x: 190, y: 140, a: 40, z: 2, l: 'gr' },
};

/* ETAPA 1 · Elegir un portaobjetos */
export default function Muestras({ progreso }) {
  const habilitadas = progreso.opciones?.muestras?.length ? MUESTRAS.filter((m) => progreso.opciones.muestras.includes(m.id)) : MUESTRAS;
  const logros = progreso.datos.logros || [];

  return (
    <section className="a3-pantalla">
      <header className="a3-titular anim-entrar">
        <span className="etiqueta">Bioimagenología · portaobjetos</span>
        <h1>Elegí una muestra</h1>
        <p>Cada vidrio tiene algo que no se ve a simple vista.</p>
      </header>
      <ul className="a3-muestras">
        {habilitadas.map((m, i) => {
          const hechas = new Set(logros.filter((l) => l.m === m.id).map((l) => l.mi)).size;
          return (
            <li key={m.id} className="anim-crecer" style={{ animationDelay: `${0.1 + i * 0.12}s` }}>
              <button className="a3-porta" onClick={() => progreso.ir('mision', { muestra: m.id, mision: null })}>
                <span className="a3-porta__vidrio" style={{ '--tinte': m.color }}>
                  <span className="a3-porta__codigo">{m.codigo}</span>
                  <Campo escena={escenaDe(m.id)} vista={VISTA_PREVIA[m.id]} tam={104} escala={false} className="a3-porta__gota" aria-hidden="true" />
                </span>
                <span className="a3-porta__nombre">{m.nombre}</span>
                <span className="a3-porta__detalle">{m.detalle}</span>
                <span className="etiqueta">
                  {hechas}/{m.misiones.length} casos resueltos
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <GloboMoli texto="Elegí un vidrio. Lo vamos a mirar con un microscopio de fluorescencia." />
    </section>
  );
}
