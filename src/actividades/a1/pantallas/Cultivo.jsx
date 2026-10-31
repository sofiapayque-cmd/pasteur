import { useRef, useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import Aviso from '../../../components/Aviso';
import Micrografia from '../../../components/Micrografia';
import { ambientePorId } from '../datos';
import { temperaturaPorId, resultadoPlaca, simplificarTrazo, trazoZigzag, esZigzag } from '../laboratorio';
import { Cabeza, AvisoCapa, Pasos, sumarError, useTiempos, ChipAmbiente, sinMovimiento } from '../piezas/comunes';
import Arrastrable from '../piezas/Arrastrable';
import Placa, { PlacaVidrio } from '../piezas/Placa';
import { Asa, Mechero, Tubo } from '../piezas/Instrumentos';
import Reloj from '../piezas/Reloj';
import Protocolo from '../piezas/Protocolo';
import IncubadoraReal, { REFERENCIAS, zonaDe } from '../piezas/IncubadoraReal';
import { colorMuestra } from './Muestra';

const PASOS = [
  { id: 'esterilizar', nombre: 'Esterilizar' },
  { id: 'sembrar', nombre: 'Sembrar' },
  { id: 'tapar', nombre: 'Tapar' },
  { id: 'incubadora', nombre: 'Incubar' },
  { id: 'tiempo', nombre: 'Esperar' },
  { id: 'resultado', nombre: 'Mirar' },
];
const META = 1000; // largo de trazo que alcanza para sembrar

export function Termometro({ nivel = 0.5, color = '#EF6F5E', alto = 90 }) {
  return (
    <svg viewBox="0 0 30 100" height={alto} width={alto * 0.3} aria-hidden="true">
      <rect x="10" y="4" width="10" height="74" rx="5" fill="#FBF9F1" stroke="#AEB9D0" strokeWidth="2" />
      <rect x="12.5" y={8 + 66 * (1 - nivel)} width="5" height={66 * nivel + 4} rx="2.5" fill={color} className="a1-termo__nivel" />
      <circle cx="15" cy="84" r="11" fill={color} stroke="#AEB9D0" strokeWidth="2" />
    </svg>
  );
}

export default function Cultivo({ progreso }) {
  const muestras = progreso.datos.muestras || [];
  const cultivos = progreso.datos.cultivos || [];
  const muestra = muestras.find((m) => m.id === progreso.datos.cultivando) || muestras[muestras.length - 1];
  const amb = muestra ? ambientePorId(muestra.ambiente) : null;
  const tiempo = useTiempos();

  const [paso, setPaso] = useState('esterilizar');
  const [ronda, setRonda] = useState(0);
  const [esteril, setEsteril] = useState(false);
  const [caliente, setCaliente] = useState(false);
  const [cargada, setCargada] = useState(false);
  const [elegida, setElegida] = useState(false);
  const [trazos, setTrazos] = useState([]);
  const [largo, setLargo] = useState(0);
  const [tapada, setTapada] = useState(false);
  const [grados, setGrados] = useState(null); // lo que marca la incubadora
  const temp = zonaDe(grados); // frio | templado | tibio
  const [momento, setMomento] = useState(0);
  const [error, setError] = useState(null);
  const [pista, setPista] = useState(null);
  const [filas, setFilas] = useState(0);
  const [saliendo, setSaliendo] = useState(false); // la mesa se despeja y la placa pasa al centro
  const [cursor, setCursor] = useState(null); // dónde está el asa sobre la placa
  const dibujando = useRef(false);
  const svgRef = useRef(null);
  const trazosRef = useRef([]);
  const largoRef = useRef(0);

  if (!muestra || !amb) {
    return (
      <section className="a1-cultivo">
        <Cabeza etiqueta="Cultivo" titulo="No hay muestras para cultivar">
          Primero tomá una muestra en una expedición.
        </Cabeza>
        <button className="btn btn--primario" onClick={() => progreso.ir('mesa')}>
          Volver a la mesa
        </button>
      </section>
    );
  }

  const color = colorMuestra(amb);
  const semilla = muestra.semilla * 3 + cultivos.length * 17 + ronda * 101;
  const trazoFinal = simplificarTrazo(trazos.flat());
  const placa = { ambiente: amb.id, temp: temp || 'templado', grados, semilla, contaminada: !esteril, trazo: trazoFinal.length > 1 ? trazoFinal : trazoZigzag(semilla) };
  const t = temp ? temperaturaPorId(temp) : null;

  function reiniciar() {
    setPaso('esterilizar');
    setRonda((r) => r + 1);
    setEsteril(false);
    setCaliente(false);
    setCargada(false);
    setElegida(false);
    setTrazos([]);
    setLargo(0);
    trazosRef.current = [];
    largoRef.current = 0;
    setTapada(false);
    setGrados(null);
    setMomento(0);
    setError(null);
    setPista(null);
    setFilas(0);
    setSaliendo(false);
    setCursor(null);
  }

  // ---- esterilizar y cargar ----
  function llama() {
    setElegida(false);
    if (caliente) return;
    if (cargada) {
      setCargada(false);
      setPista('¡La llama también mata los microbios de tu muestra! Volvé a tocar el tubo cuando se enfríe.');
    } else setPista(null);
    setCaliente(true);
    setEsteril(true);
    tiempo(() => setCaliente(false), 1600);
  }
  function cargar() {
    setElegida(false);
    if (caliente) {
      setPista('¡Esperá que se enfríe! Un asa caliente mata los microbios de la muestra.');
      return;
    }
    setPista(null);
    setCargada(true);
    if (sinMovimiento()) {
      tiempo(() => setPaso('sembrar'), 600);
      return;
    }
    // Transición: los instrumentos se corren y la placa viaja al centro; después aparece la siembra
    tiempo(() => setSaliendo(true), 650);
    tiempo(() => setPaso('sembrar'), 650 + 750);
  }

  // ---- sembrar ----
  function punto(e) {
    const r = svgRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 400];
  }
  function agregar(p) {
    if (Math.hypot(p[0] - 200, p[1] - 200) > 168) return;
    const ts = trazosRef.current;
    if (!ts.length) ts.push([]);
    const actual = ts[ts.length - 1];
    const ult = actual[actual.length - 1];
    if (ult) {
      const d = Math.hypot(p[0] - ult[0], p[1] - ult[1]);
      if (d < 7) return;
      largoRef.current += d;
    }
    actual.push(p);
    setTrazos(ts.map((x) => x.slice()));
    setLargo(largoRef.current);
  }
  function abajo(e) {
    if (paso !== 'sembrar' || largoRef.current >= META) return;
    dibujando.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    trazosRef.current.push([]);
    agregar(punto(e));
  }
  function mover(e) {
    if (paso === 'sembrar') setCursor(punto(e));
    if (dibujando.current) agregar(punto(e));
  }
  // Con teclado: cada Enter/Espacio pasa el asa una vez más (lo hace el niño, no la máquina)
  function teclaPlaca(e) {
    if (paso !== 'sembrar' || largoRef.current >= META) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sembrarTocando();
    }
  }
  function arriba() {
    if (!dibujando.current) return;
    dibujando.current = false;
    revisar();
  }
  function revisar() {
    if (largoRef.current < META) return;
    if (esZigzag(trazosRef.current)) tiempo(() => setPaso('tapar'), 500);
    else {
      setError('zigzag');
      sumarError(progreso, 'zigzag');
    }
  }
  // Placa nueva: se borra lo dibujado (el asa sigue cargada)
  function placaNueva() {
    trazosRef.current = [];
    largoRef.current = 0;
    setTrazos([]);
    setLargo(0);
    setFilas(0);
    setError(null);
  }
  function sembrarTocando() {
    const zig = trazoZigzag(semilla);
    const desde = filas * 4;
    const tramo = zig.slice(desde, desde + 5);
    if (tramo.length < 2) return;
    trazosRef.current.push(tramo);
    largoRef.current += META / 3 + 1;
    setTrazos(trazosRef.current.map((x) => x.slice()));
    setLargo(largoRef.current);
    setFilas((f) => f + 1);
    revisar();
  }

  // ---- tapar e incubar ----
  function aIncubadora() {
    if (!tapada) {
      setError('tapa');
      sumarError(progreso, 'tapa');
      return;
    }
    setPaso('incubadora');
  }
  function esperar() {
    const sig = momento + 1;
    setMomento(sig);
    if (sig === 2 && placa.contaminada) {
      tiempo(() => {
        setError('contaminada');
        sumarError(progreso, 'asa');
      }, 1700);
    }
  }

  function guardarPlaca(irAMesa = true) {
    const n = cultivos.reduce((max, c) => Math.max(max, Number(String(c.id).slice(1)) || 0), 0) + 1;
    const { colonias, tipos } = resultadoPlaca(placa);
    const nueva = { id: `p${n}`, muestra: muestra.id, ...placa, colonias, tipos };
    const lista = [...cultivos, nueva].slice(-8);
    if (irAMesa) progreso.ir('mesa', { cultivos: lista, cultivando: null });
    else {
      progreso.guardar({ cultivos: lista });
      reiniciar();
    }
  }

  const res = resultadoPlaca(placa);

  // ---- textos ----
  let titulo = 'Primero, esterilizá el asa';
  let instruccion = 'Seguí los pasos del protocolo, en orden. Paso 1: arrastrá el asa hasta la llama (o tocá el mechero).';
  let moli = 'El asa de siembra parece limpia… pero tiene microbios del aire. La llama los elimina.';
  let animo = 'piensa';
  if (paso === 'esterilizar' && caliente) {
    titulo = 'Esperá que se enfríe';
    instruccion = 'Paso 2: el asa está al rojo vivo. En un ratito se enfría sola.';
    moli = '¡Al rojo vivo! Esperá un poquito que se enfríe.';
    animo = 'eureka';
  } else if (paso === 'esterilizar' && esteril) {
    titulo = 'Ahora, cargá la muestra';
    instruccion = 'Paso 3: llevá el asa hasta tu tubo (o tocá el tubo) para tomar un poquito de muestra.';
    moli = '¡Asa esterilizada! Ahora sí, tocá tu muestra.';
    animo = 'feliz';
  }
  if (paso === 'esterilizar' && cargada) {
    moli = '¡Muestra cargada!';
    animo = 'alegria';
  }
  if (paso === 'sembrar') {
    titulo = 'Sembrá en la placa';
    instruccion = 'Paso 4: pasá el asa en zigzag sobre el agar (dibujá con el dedo o el mouse).';
    moli = largo >= META ? '¡Bien sembrado!' : 'El agar es comida para microbios. Pasá el asa suave, en zigzag.';
    animo = largo >= META ? 'alegria' : 'escucha';
  }
  if (paso === 'tapar') {
    titulo = 'Tapá la placa';
    instruccion = tapada ? 'Paso 6: ya está tapada, llevala a la incubadora.' : 'Paso 5: antes de llevarla a la incubadora, ponele la tapa.';
    moli = tapada ? '¡Tapada! Ya puede ir a la incubadora.' : 'Una placa destapada se seca y le cae de todo…';
    animo = tapada ? 'feliz' : 'piensa';
  }
  if (paso === 'incubadora') {
    titulo = 'Elegí la temperatura';
    instruccion = 'Paso 6: la incubadora mantiene la placa siempre a la misma temperatura. Elegí cuántos grados.';
    moli = `Tu muestra es de ${amb.nombre.toLowerCase()}. ¿Qué temperatura les gustará a esos microbios?`;
    animo = 'piensa';
  }
  if (paso === 'tiempo') {
    titulo = momento === 0 ? 'Ahora, a esperar' : momento === 1 ? '¡Algo está creciendo!' : '¡Mirá cuánto crecieron!';
    instruccion = momento < 2 ? 'Los microbios necesitan tiempo para crecer. Adelantá el reloj.' : 'Cada puntito es una colonia.';
    moli =
      momento === 0
        ? temp === 'frio'
          ? 'En frío todo crece más despacio: hay que esperar días.'
          : 'Los microbios son muy chiquitos: hay que esperar a que se multipliquen.'
        : momento === 1
          ? 'Cada puntito es una colonia: muchísimas bacterias juntas que vienen de una sola.'
          : '¡Crecieron justo por donde pasaste el asa!';
    animo = momento === 2 ? 'alegria' : momento === 1 ? 'eureka' : 'escucha';
  }
  if (paso === 'resultado') {
    moli = res.preferencia < 0.4 ? 'Creció poquito… ¿les gustaría otra temperatura?' : 'Una placa nunca muestra todo lo que hay.';
    animo = res.preferencia < 0.4 ? 'duda' : 'eureka';
  }
  if (pista) {
    moli = pista;
    animo = 'duda';
  }

  const pasoVisible = paso;

  // En qué renglón del protocolo va el niño
  let renglon = 0;
  if (paso === 'esterilizar') renglon = cargada ? 3 : caliente ? 1 : esteril ? 2 : 0;
  if (paso === 'sembrar') renglon = 3;
  if (paso === 'tapar') renglon = tapada ? 5 : 4;
  const sigue = (donde) => (paso === 'esterilizar' && ['mechero', 'asa', 'tubo'][renglon] === donde ? 'a1-banco__siguiente' : '');

  return (
    <section className="a1-cultivo">
      {paso !== 'resultado' && (
        <Cabeza etiqueta={`Cultivo · ${amb.nombre}`} titulo={titulo} extra={<Pasos lista={PASOS} actual={pasoVisible} />}>
          {instruccion}
        </Cabeza>
      )}

      {paso === 'esterilizar' && (
        <div className="a1-cultivo__fila">
        <Protocolo actual={renglon} />
        <div className={`a1-banco ${saliendo ? 'a1-banco--saliendo' : ''}`}>
          <button type="button" className={`a1-banco__mechero ${caliente ? 'a1-banco__mechero--usado' : ''} ${elegida ? 'a1-destino--espera' : ''} ${sigue('mechero')}`} data-destino="llama" onClick={llama} aria-label="Mechero: pasar el asa por la llama">
            <span className="a1-banco__num" aria-hidden="true">1</span>
            <Mechero alto={210} />
            <span className="etiqueta etiqueta--oscura">Mechero</span>
          </button>

          <div className={`a1-banco__asa ${sigue('asa')}`}>
            <span className="a1-banco__num" aria-hidden="true">2</span>
            <Arrastrable
              className={caliente ? 'a1-asa--caliente' : ''}
              etiqueta="Asa de siembra"
              elegido={elegida}
              disabled={cargada}
              onToque={() => setElegida(!elegida)}
              onSoltar={(d) => {
                if (d === 'llama') llama();
                if (d === 'tubo') cargar();
              }}
            >
              <Asa alto={196} caliente={caliente} cargado={cargada} color={color} />
            </Arrastrable>
            <span className="etiqueta etiqueta--oscura">Asa de siembra</span>
            <span className={`a1-estado ${esteril ? 'a1-estado--ok' : ''}`}>{caliente ? 'Calentando…' : esteril ? 'Esterilizada' : 'Sin esterilizar'}</span>
          </div>

          <button type="button" className={`a1-banco__tubo ${elegida ? 'a1-destino--espera' : ''} ${sigue('tubo')}`} data-destino="tubo" onClick={cargar} aria-label="Tubo con tu muestra: tocarlo con el asa">
            <span className="a1-banco__num" aria-hidden="true">3</span>
            <Tubo alto={184} color={color} tapa={amb.color} codigo={amb.codigo} abierto />
            <span className="etiqueta etiqueta--oscura">Tu muestra</span>
          </button>

          <div className="a1-banco__placa">
            <PlacaVidrio tamano={176} etiqueta="Placa de Petri con agar, sin sembrar" />
            <span className="etiqueta etiqueta--oscura">Placa con agar</span>
            <span className="a1-banco__num" aria-hidden="true">4</span>
          </div>
        </div>
        </div>
      )}

      {(paso === 'sembrar' || paso === 'tapar') && (
        <div className="a1-cultivo__fila">
        <Protocolo actual={renglon} />
        <div className="a1-siembra">
          <div className="a1-siembra__placa">
            <PlacaVidrio
              tamano={360}
              tapa={tapada}
              etiqueta="Placa para sembrar: dibujá un zigzag"
              ref={svgRef}
              className={paso === 'sembrar' ? 'a1-placa--dibujo' : ''}
              onPointerDown={abajo}
              onPointerMove={mover}
              onPointerUp={arriba}
              onPointerCancel={arriba}
              onPointerLeave={() => setCursor(null)}
              tabIndex={paso === 'sembrar' ? 0 : undefined}
              onKeyDown={teclaPlaca}
              aria-describedby="a1-ayuda-siembra"
            >
              {/* guía suave del zigzag: el niño la repasa con el asa */}
              {paso === 'sembrar' && trazos.length === 0 && (
                <polyline className="a1-siembra__guia" points={trazoZigzag(semilla).map((p) => p.join(',')).join(' ')} fill="none" stroke="#2F4A85" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" strokeLinejoin="round" opacity=".35" />
              )}
              {trazos.map((tr, i) => (
                <polyline key={i} points={tr.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
              ))}
              {/* el asa sigue al dedo o al mouse */}
              {paso === 'sembrar' && cursor && (
                <g transform={`translate(${cursor[0].toFixed(0)} ${cursor[1].toFixed(0)})`} pointerEvents="none">
                  <line x1="8" y1="-8" x2="70" y2="-70" stroke="#7B86A2" strokeWidth="5" strokeLinecap="round" />
                  <circle r="9" fill="none" stroke="#7B86A2" strokeWidth="4" />
                  <circle r="5" fill={color} opacity=".7" />
                </g>
              )}
            </PlacaVidrio>
          </div>
          <div className="a1-siembra__lado">
            {paso === 'sembrar' ? (
              <>
                <div className="a1-medidor" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round((largo / META) * 100))} aria-label="Cuánto sembraste">
                  <span style={{ transform: `scaleX(${Math.min(1, largo / META)})` }} />
                </div>
                <p className="texto-suave" id="a1-ayuda-siembra">
                  {largo >= META ? '¡Listo!' : largo > 0 ? 'Seguí pasando el asa por el agar.' : 'Apoyá el asa en la placa y repasá el zigzag punteado.'}
                  <span className="solo-lector"> Con teclado: apretá Enter sobre la placa para pasar el asa.</span>
                </p>
              </>
            ) : (
              <>
                <button className="btn btn--experimentar btn--grande" onClick={() => setTapada(true)} disabled={tapada}>
                  {tapada ? 'Placa tapada' : 'Tapar la placa'}
                </button>
                <button className="btn btn--primario" onClick={aIncubadora}>
                  Llevar a la incubadora
                </button>
              </>
            )}
          </div>
        </div>
        </div>
      )}

      {paso === 'incubadora' && (
        <div className="a1-incubar">
          <IncubadoraReal grados={grados} onCambiar={setGrados}>
            <Placa placa={placa} momento={0} tamano={150} tapa />
          </IncubadoraReal>
          <div className="a1-incubar__opciones">
            <p className="a1-incubar__ayuda">Subí o bajá el termómetro (o usá ▲ ▼). Para comparar:</p>
            <div className="a1-refs" role="group" aria-label="Temperaturas para comparar">
              {REFERENCIAS.map((r) => (
                <button key={r.grados} type="button" className={`a1-ref ${grados === r.grados ? 'a1-ref--sel' : ''}`} onClick={() => setGrados(r.grados)}>
                  <b>{r.detalle}</b>
                  <span>{r.nombre}</span>
                </button>
              ))}
            </div>
            <button className="btn btn--experimentar btn--grande" disabled={grados == null} onClick={() => setPaso('tiempo')}>
              Cerrar la puerta e incubar
            </button>
          </div>
        </div>
      )}

      {paso === 'tiempo' && (
        <div className="a1-espera">
          <IncubadoraReal grados={grados} encendida>
            <Placa placa={placa} momento={momento} tamano={260} tapa />
          </IncubadoraReal>
          <div className="a1-espera__lado">
            <Reloj vueltas={momento} />
            <ol className="a1-linea" aria-label="Tiempo en la incubadora">
              {t.tiempos.map((x, i) => (
                <li key={x} className={i <= momento ? 'hecho' : ''}>
                  <span className="a1-linea__punto" />
                  <span>{x}</span>
                </li>
              ))}
            </ol>
            {momento < 2 ? (
              <button className="btn btn--experimentar btn--grande" onClick={esperar}>
                Esperar {t.tiempos[momento + 1]}
              </button>
            ) : (
              !placa.contaminada && (
                <button className="btn btn--primario btn--grande anim-crecer" onClick={() => setPaso('resultado')}>
                  Sacar la placa y mirarla
                </button>
              )
            )}
          </div>
        </div>
      )}

      {paso === 'resultado' && (
        <div className="a1-resultado">
          <Cabeza etiqueta={`Resultado · ${amb.nombre} · ${t.nombre}`} titulo="¡En la muestra había muchos más!">
            La placa solo muestra los que pueden crecer en estas condiciones: con este alimento y a esta temperatura.
          </Cabeza>
          <div className="a1-resultado__par">
            <figure className="anim-crecer">
              <Placa placa={placa} momento={2} tamano={290} etiqueta={`Tu placa: ${res.colonias} colonias`} />
              <figcaption>
                <span className="etiqueta etiqueta--oscura">En la placa</span>
                <b>
                  {res.colonias} colonias · {res.tipos} {res.tipos === 1 ? 'tipo' : 'tipos'}
                </b>
              </figcaption>
            </figure>
            <span className="a1-resultado__vs" aria-hidden="true">vs</span>
            <figure className="anim-crecer" style={{ animationDelay: '.25s' }}>
              <Micrografia colores={amb.microbios} perfil={amb.id} semilla={muestra.semilla} tamano={290} cantidad={34} etiqueta="Tu muestra vista con microscopio (ilustración)" />
              <figcaption>
                <span className="etiqueta etiqueta--oscura">En la muestra, con microscopio</span>
                <b>Muchísimos y muy variados</b>
              </figcaption>
            </figure>
            <div className="a1-resultado__lado">
              {res.preferencia < 0.4 && (
                <Aviso tipo="pista" titulo="Creció poquito">
                  ¿Les habrá gustado esa temperatura? Podés sembrar otra placa y probar otra.
                </Aviso>
              )}
              <ChipAmbiente ambiente={amb} extra={t.nombre} />
              <button className="btn btn--primario btn--grande" onClick={() => guardarPlaca(true)}>
                Guardar en la mesa
              </button>
              <button className="btn btn--secundario" onClick={() => guardarPlaca(false)}>
                Guardar y sembrar otra
              </button>
            </div>
          </div>
        </div>
      )}

      {error === 'tapa' && (
        <AvisoCapa tipo="error" titulo="¡La placa está destapada!" accion="Taparla" onAccion={() => { setTapada(true); setError(null); }}>
          Así se seca el agar y le pueden caer microbios del aire, que se mezclarían con los tuyos. Siempre se tapa antes de incubar.
        </AvisoCapa>
      )}
      {error === 'zigzag' && (
        <AvisoCapa tipo="error" titulo="Eso no es un zigzag" accion="Usar una placa nueva" onAccion={placaNueva}>
          El zigzag va desparramando la muestra: al final quedan tan pocos microbios que cada uno crece separado y forma su propia colonia. Si no, crecen todos amontonados y no se pueden distinguir. Probá ir de un lado al otro, bajando de a poco.
        </AvisoCapa>
      )}
      {error === 'contaminada' && (
        <AvisoCapa
          tipo="error"
          titulo="¡Uy! Creció un hongo peludo"
          accion="Sembrar otra vez"
          onAccion={reiniciar}
          secundaria="Guardarla igual"
          onSecundaria={() => guardarPlaca(true)}
        >
          Y también colonias raras que no eran de tu muestra. El asa no estaba esterilizada: tenía microbios del aire y de la mesa. Por eso siempre se pasa por la llama antes de sembrar.
        </AvisoCapa>
      )}

      {!error && (pista || !['esterilizar', 'sembrar', 'tapar'].includes(paso)) && <GloboMoli texto={moli} animo={animo} />}
    </section>
  );
}
