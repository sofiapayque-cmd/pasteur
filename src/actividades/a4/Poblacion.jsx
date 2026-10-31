import { useEffect, useRef, useState } from 'react';
import GloboMoli from '../../components/GloboMoli';
import { ORIGINAL, copiar } from './modelo';
import { VirusSVG } from './virus';
import Receta from './Receta';

/*
  Etapa 1 · Un virus se copia.
  El niño toca "Copiar" y ve cómo la receta se lee letra por letra.
  Las dos primeras copias salen iguales; la tercera trae un error que cambia
  las espículas; la cuarta tiene un error en las instrucciones y no funciona.
  Después, los errores salen al azar.
*/
const GUION = [
  { cambios: [] },
  { cambios: [] },
  { cambios: [1], valor: 1 }, // punta de espícula: redonda → doble
  { cambios: [5], valor: 2 }, // instrucciones: la copia no funciona
];

function hacerCopia(n) {
  const g = GUION[n];
  if (g) {
    const genoma = ORIGINAL.slice();
    g.cambios.forEach((i) => (genoma[i] = g.valor));
    return { genoma, cambios: g.cambios, rota: g.cambios.some((i) => i >= 4) };
  }
  return copiar(ORIGINAL, 0.6);
}

const QUE_CAMBIO = ['¡Otro color!', '¡Otra punta!', '¡Otras espículas!', '¡Otra cápsula!'];

const MOLI = [
  'Este virus guarda su receta en 8 letras. Tocá Copiar.',
  '¡Una copia igualita! Hacé otra.',
  'Otra igual. ¿Saldrán siempre iguales?',
  '¡Una letra salió distinta! Mirá sus espículas.',
  'Ese error cayó en las instrucciones: esa copia no funciona.',
  'Los errores aparecen al azar. Nadie los elige.',
];

export default function Poblacion({ progreso, reducido }) {
  const [copias, setCopias] = useState([]);
  const [copiando, setCopiando] = useState(null); // { copia, leidas }
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const copiarUna = () => {
    if (copiando) return;
    const copia = hacerCopia(copias.length);
    if (reducido) {
      setCopias((c) => [...c, copia].slice(-6));
      return;
    }
    setCopiando({ copia, leidas: 0 });
    for (let i = 1; i <= 8; i++) {
      timers.current.push(setTimeout(() => setCopiando((c) => c && { ...c, leidas: i }), i * 150));
    }
    timers.current.push(
      setTimeout(() => setCopiando((c) => c && { ...c, leidas: 8, saliendo: true }), 8 * 150 + 100),
      setTimeout(() => {
        setCopiando(null);
        setCopias((c) => [...c, copia].slice(-6));
      }, 8 * 150 + 900)
    );
  };

  const hechas = copias.length;
  const ultima = copiando?.copia || copias[copias.length - 1];
  const leidas = copiando ? copiando.leidas : ultima ? 8 : 0;
  const texto = copiando ? 'Leyendo la receta, letra por letra…' : MOLI[Math.min(hechas, MOLI.length - 1)];
  const animo = hechas === 3 && !copiando ? 'eureka' : hechas === 4 && !copiando ? 'duda' : copiando ? 'piensa' : 'feliz';

  return (
    <section className="a4-etapa a4-poblacion">
      <div className="a4-poblacion__escena">
        <div className="a4-celula" aria-hidden="true">
          <span className="a4-celula__etiqueta etiqueta">Célula</span>
        </div>
        <div className={`a4-poblacion__madre ${copiando ? 'is-copiando' : ''}`}>
          <VirusSVG genoma={ORIGINAL} tamano={230} titulo="Virus original, con espículas de punta redonda" className="a4-respira" />
        </div>
        {copiando && (
          <div className={`a4-poblacion__hija ${copiando.saliendo ? 'is-sale' : ''} ${copiando.copia.cambios.length ? 'is-mutante' : ''}`}>
            <VirusSVG genoma={copiando.copia.genoma} roto={copiando.copia.rota} tamano={150} />
          </div>
        )}
        <div className="a4-poblacion__recetas">
          <div className="a4-poblacion__fila">
            <span className="etiqueta">Receta original</span>
            <Receta genoma={ORIGINAL} leyendo={copiando ? copiando.leidas - 1 : -1} compacta etiqueta="Receta original" />
          </div>
          <div className="a4-poblacion__fila">
            <span className="etiqueta">{copiando ? 'Copia' : 'Última copia'}</span>
            {ultima ? (
              <Receta genoma={ultima.genoma} cambios={ultima.cambios} hasta={leidas} compacta etiqueta="Copia" />
            ) : (
              <span className="a4-poblacion__vacia">Todavía no copiaste</span>
            )}
          </div>
        </div>
      </div>

      <div className="a4-poblacion__panel">
        <span className="etiqueta">Evolución experimental de virus</span>
        <h1>¿Cómo cambia un virus?</h1>
        <p className="a4-instruccion">
          Un virus no se copia solo: entra a una <b>célula</b> y la usa como fábrica. Tocá <b>Copiar</b> y mirá su receta.
        </p>
        <button className="btn btn--experimentar btn--grande" onClick={copiarUna} disabled={Boolean(copiando)}>
          Copiar el virus
        </button>

        <div className="a4-estante" aria-live="polite">
          <span className="etiqueta">Tus copias · {hechas}</span>
          <ul>
            {Array.from({ length: 6 }, (_, i) => {
              const c = copias[i];
              if (!c) return <li key={i} className="a4-estante__hueco" aria-hidden="true" />;
              const tipo = c.rota ? 'rota' : c.cambios.length ? 'cambio' : 'igual';
              return (
                <li key={i} className={`a4-estante__copia is-${tipo} anim-crecer`}>
                  <VirusSVG genoma={c.genoma} roto={c.rota} tamano={64} />
                  <span>{tipo === 'rota' ? 'No funciona' : tipo === 'cambio' ? QUE_CAMBIO[c.cambios.find((x) => x < 4)] || '¡Cambió!' : 'Igual'}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {hechas >= 4 && !copiando && (
          <button className="btn btn--primario btn--grande anim-crecer" onClick={() => progreso.ir('fidelidad', { copias: hechas })}>
            Seguir: muchos virus
          </button>
        )}
      </div>
      <GloboMoli texto={texto} animo={animo} />
    </section>
  );
}
