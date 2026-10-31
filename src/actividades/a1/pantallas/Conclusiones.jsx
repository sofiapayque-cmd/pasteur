import GloboMoli from '../../../components/GloboMoli';
import { ambientePorId } from '../datos';
import { ANTIBIOTICOS, temperaturaPorId } from '../laboratorio';
import { hoy } from '../piezas/comunes';
import Placa from '../piezas/Placa';
import { Tubo, Disco } from '../piezas/Instrumentos';
import { colorMuestra } from './Muestra';

const OBS = {
  colores: 'colores distintos',
  formas: 'formas distintas',
  tamanos: 'colonias más grandes en una',
  raro: 'algo raro (¿contaminación?)',
  iguales: 'que se veían casi iguales',
};

// Errores que enseñan: se muestran como logros, no como fallas
const APRENDIZAJES = {
  mano: 'Toqué una muestra con la mano → aprendí que nosotros también tenemos microbios.',
  instrumento: 'Usé un instrumento que no servía → aprendí a elegir la herramienta.',
  tubo: 'Casi llevo un tubo abierto → aprendí a cerrarlo siempre.',
  asa: 'Se me contaminó una placa → aprendí a esterilizar el asa en la llama.',
  tapa: 'Casi incubo una placa destapada → aprendí a taparla.',
  zigzag: 'Sembré sin zigzag → aprendí que el zigzag separa los microbios en colonias.',
  discos: 'Puse los discos muy juntos → aprendí a separarlos para poder leer.',
  incubar: 'Quise mirar sin incubar → aprendí que hay que esperar.',
};

function Tilde() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="a1-tilde">
      <path d="M4 13 Q8 16 10 19 Q14 10 21 5" stroke="#7272EE" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* 8 · CONCLUSIONES: el cuaderno de laboratorio del niño. */
export default function Conclusiones({ progreso }) {
  const d = progreso.datos;
  const muestras = d.muestras || [];
  const cultivos = d.cultivos || [];
  const comparaciones = d.comparaciones || [];
  const ab = (d.antibioticos || [])[(d.antibioticos || []).length - 1];
  const errores = Object.entries(d.errores || {}).filter(([k, n]) => n > 0 && APRENDIZAJES[k]);
  const nombre = progreso.enClase ? progreso.alumno?.apodo : null;
  const placa = (id) => cultivos.find((c) => c.id === id);

  return (
    <section className="a1-conclusiones">
      <div className="a1-conclusiones__barra">
        <span className="etiqueta etiqueta--oscura">Conclusiones · tu cuaderno</span>
        <button className="btn btn--secundario" onClick={() => progreso.ir('mesa')}>
          Volver a la mesa
        </button>
      </div>
      <div className="a1-cuaderno anim-entrar">
        <div className="a1-cuaderno__hoja a1-cuaderno__hoja--izq">
          <header className="a1-cuaderno__portada">
            <span className="etiqueta">Cuaderno de laboratorio</span>
            <h1>Microorganismos en todas partes</h1>
            <p className="a1-cuaderno__firma">
              {nombre ? `Investigó: ${nombre}` : 'Mi investigación'} · {hoy()}
            </p>
          </header>

          <h2 className="a1-cuaderno__titulo">Mis muestras</h2>
          <ul className="a1-cuaderno__tubos">
            {muestras.map((m) => {
              const a = ambientePorId(m.ambiente);
              if (!a) return null;
              return (
                <li key={m.id}>
                  <Tubo alto={86} color={colorMuestra(a)} tapa={a.color} />
                  <span>{a.nombre}</span>
                </li>
              );
            })}
          </ul>

          <h2 className="a1-cuaderno__titulo">Mis placas</h2>
          {cultivos.length ? (
            <ul className="a1-cuaderno__placas">
              {cultivos.map((c) => {
                const a = ambientePorId(c.ambiente);
                return (
                  <li key={c.id}>
                    <Placa placa={c} tamano={84} />
                    <span>
                      <b>{a?.nombre}</b>
                      {temperaturaPorId(c.temp).nombre} · {c.colonias} colonias
                      {c.contaminada && <em> · contaminada</em>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="a1-cuaderno__nota">Todavía no cultivé ninguna muestra.</p>
          )}
        </div>

        <div className="a1-cuaderno__espiral" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>

        <div className="a1-cuaderno__hoja a1-cuaderno__hoja--der">
          <h2 className="a1-cuaderno__titulo">Lo que observé</h2>
          {comparaciones.length ? (
            <ul className="a1-cuaderno__lista">
              {comparaciones.slice(-3).map((c, i) => {
                const pa = placa(c.a);
                const pb = placa(c.b);
                if (!pa || !pb) return null;
                const na = `${ambientePorId(pa.ambiente)?.nombre.toLowerCase()} (${temperaturaPorId(pa.temp).nombre.toLowerCase()})`;
                const nb = `${ambientePorId(pb.ambiente)?.nombre.toLowerCase()} (${temperaturaPorId(pb.temp).nombre.toLowerCase()})`;
                const quien = c.mas === 'a' ? `Creció más en ${na}` : c.mas === 'b' ? `Creció más en ${nb}` : `En ${na} y ${nb} creció parecido`;
                return (
                  <li key={i}>
                    {quien}. Vi {(c.obs || []).map((o) => OBS[o]).filter(Boolean).join(', ') || 'diferencias'}.
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="a1-cuaderno__nota">{cultivos.length >= 2 ? 'Puedo volver a la mesa y comparar mis placas.' : 'Con dos placas voy a poder comparar.'}</p>
          )}

          <h2 className="a1-cuaderno__titulo">Antibióticos</h2>
          {ab ? (
            <div className="a1-cuaderno__ab">
              {ab.resultados.map((r) => {
                const info = ANTIBIOTICOS.find((x) => x.id === r.id);
                return (
                  <span key={r.id} className={`a1-cuaderno__ab-item ${r.id === ab.masResistido ? 'a1-cuaderno__ab-item--mas' : ''}`}>
                    <Disco letra={r.id} color={info.color} tam={34} />
                    {r.halo === 'nada' ? 'sin halo' : `${r.resistentes} resist.`}
                  </span>
                );
              })}
              <p>Con el {ANTIBIOTICOS.find((x) => x.id === ab.masResistido)?.nombre} resistieron más bacterias.</p>
            </div>
          ) : (
            <p className="a1-cuaderno__nota">{progreso.desbloqueado('antibioticos') ? 'Puedo volver a la mesa y probar antibióticos.' : 'Mi maestra lo va a habilitar.'}</p>
          )}

          <h2 className="a1-cuaderno__titulo">Lo que aprendí</h2>
          <ul className="a1-cuaderno__aprendi">
            <li>
              <Tilde /> Hay microorganismos en el suelo y en los animales, aunque no los veamos.
            </li>
            {cultivos.length > 0 && (
              <li>
                <Tilde /> Una placa solo muestra los que pueden crecer en esas condiciones.
              </li>
            )}
            {ab && (
              <li>
                <Tilde /> Algunas bacterias resisten: los antibióticos se usan solo cuando los indica un médico.
              </li>
            )}
          </ul>

          {errores.length > 0 && (
            <>
              <h2 className="a1-cuaderno__titulo">Errores que me enseñaron algo</h2>
              <ul className="a1-cuaderno__lista a1-cuaderno__lista--errores">
                {errores.slice(0, 4).map(([k]) => (
                  <li key={k}>{APRENDIZAJES[k]}</li>
                ))}
              </ul>
            </>
          )}

          <div className="a1-cuaderno__acciones">
            <button className="btn btn--primario" onClick={() => progreso.ir('mesa')}>
              Volver a la mesa
            </button>
          </div>
        </div>
      </div>

      <GloboMoli texto="¡Qué investigación! Así trabajan los científicos de verdad." animo="alegria" />
    </section>
  );
}
