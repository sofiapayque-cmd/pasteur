'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ordenParaProyectar, resumenPuesta, type AlumnoPuesta, type Conclusion } from '@/lib/aulas/puesta';
import './puesta.css';

/*
  PUESTA EN COMÚN · datos, resumen automático y conclusiones (pedido de Sofia, 8/11).
  · Datos de la clase: lo que registraron los chicos, tal cual.
  · Comparar experimentos: el gráfico propio de la actividad (A1) o tablas.
  · Resumen automático: frases fijas armadas con esos números. Sin IA.
  · Conclusiones: salen del cuaderno de cada chico, sin nombres. La maestra
    elige cuáles mostrar y las proyecta en pantalla completa.
  La cuenta se hace en lib/aulas/puesta.ts (npm run test:puesta).
*/
export default function ResumenClase({ actividad, alumnos, grafico }: { actividad: string; alumnos: AlumnoPuesta[]; grafico?: ReactNode }) {
  const r = useMemo(() => resumenPuesta(actividad, alumnos), [actividad, alumnos]);
  const [elegidas, setElegidas] = useState<Set<string>>(() => new Set());
  const [proyectando, setProyectando] = useState(false);
  const cerrar = useCallback(() => setProyectando(false), []);
  // La pantalla completa se pide en el mismo toque (el navegador no la deja pedir después)
  const proyectar = () => {
    setProyectando(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const vigentes = r.conclusiones.filter((c) => elegidas.has(c.id));

  const alternar = (id: string) =>
    setElegidas((e) => {
      const n = new Set(e);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <section className="tarjeta resumen-clase" aria-labelledby="rc-datos">
        <header className="resumen-clase__cabeza">
          <h2 id="rc-datos" className="etiqueta etiqueta--oscura">
            Datos de la clase
          </h2>
          <p>Lo que registraron los chicos en la simulación, tal cual.</p>
        </header>
        {r.datos.length > 0 && (
          <dl className="resumen-clase__datos">
            {r.datos.map((d) => (
              <div key={d.etiqueta}>
                <dt>{d.etiqueta}</dt>
                <dd>{d.valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {grafico ??
        (r.comparaciones.length > 0 && (
          <section className="tarjeta resumen-clase" aria-labelledby="rc-comparar">
            <header className="resumen-clase__cabeza">
              <h2 id="rc-comparar" className="etiqueta etiqueta--oscura">
                Comparar experimentos
              </h2>
            </header>
            {r.comparaciones.map((c) => (
              <div key={c.titulo} className="resumen-clase__tabla">
                <h3 aria-hidden="true">{c.titulo}</h3>
                <div className="resumen-clase__desliza">
                  <table>
                    <caption className="solo-lector">{c.titulo}</caption>
                    <thead>
                      <tr>
                        <td />
                        {c.columnas.map((col) => (
                          <th key={col} scope="col">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.filas.map((f) => (
                        <tr key={f.nombre}>
                          <th scope="row">{f.nombre}</th>
                          {f.valores.map((v, i) => (
                            <td key={i}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {c.nota && <p className="resumen-clase__nota">{c.nota}</p>}
              </div>
            ))}
          </section>
        ))}

      <section className="tarjeta resumen-clase resumen-clase--auto" aria-labelledby="rc-auto">
        <header className="resumen-clase__cabeza">
          <h2 id="rc-auto" className="etiqueta etiqueta--oscura">
            Resumen automático
          </h2>
          <p>Frases armadas solo con los números de arriba, con reglas fijas. No usa IA y no explica por qué pasó: eso se conversa.</p>
        </header>
        {r.automatico.length ? (
          <ul className="resumen-clase__frases">
            {r.automatico.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : (
          <p className="resumen-clase__vacio">Todavía no hay datos suficientes para armar un resumen.</p>
        )}
      </section>

      <section className="tarjeta resumen-clase" aria-labelledby="rc-conclusiones">
        <header className="resumen-clase__cabeza">
          <h2 id="rc-conclusiones" className="etiqueta etiqueta--oscura">
            Conclusiones de los chicos
          </h2>
          <p>
            {r.sinConclusiones ??
              'Salen de lo que anotó cada chico en su cuaderno. No llevan nombres: elegí las que quieras mostrar y proyectalas.'}
          </p>
        </header>
        {r.conclusiones.length > 0 ? (
          <>
            <div className="resumen-clase__acciones">
              <button className="btn btn--primario" type="button" disabled={!vigentes.length} onClick={proyectar}>
                {vigentes.length ? `Proyectar ${vigentes.length === 1 ? '1 conclusión' : `${vigentes.length} conclusiones`}` : 'Proyectar'}
              </button>
              <button className="btn btn--claro" type="button" onClick={() => setElegidas(new Set(r.conclusiones.map((c) => c.id)))}>
                Elegir todas
              </button>
              {vigentes.length > 0 && (
                <button className="btn btn--claro" type="button" onClick={() => setElegidas(new Set())}>
                  Ninguna
                </button>
              )}
            </div>
            <ul className="resumen-clase__conclusiones">
              {r.conclusiones.map((c) => (
                <li key={c.id}>
                  <label className={elegidas.has(c.id) ? 'resumen-clase__elegida' : ''}>
                    <input type="checkbox" checked={elegidas.has(c.id)} onChange={() => alternar(c.id)} />
                    <span>{c.texto}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : (
          !r.sinConclusiones && <p className="resumen-clase__vacio">Todavía nadie llegó a anotar conclusiones.</p>
        )}
      </section>

      {proyectando && <Proyeccion conclusiones={ordenParaProyectar(r.conclusiones, elegidas)} onCerrar={cerrar} />}
    </>
  );
}

/* Pantalla completa para el proyector: solo las frases, letra grande, sin nombres. */
function Proyeccion({ conclusiones, onCerrar }: { conclusiones: Conclusion[]; onCerrar: () => void }) {
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    boton.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    // Si la maestra sale de pantalla completa (Esc o F11), también se cierra la proyección
    const cambio = () => {
      if (!document.fullscreenElement) onCerrar();
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('fullscreenchange', cambio);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('fullscreenchange', cambio);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onCerrar]);

  return (
    <div className={`proyeccion ${conclusiones.length > 4 ? 'proyeccion--muchas' : ''}`} role="dialog" aria-modal="true" aria-labelledby="proyeccion-titulo">
      <header className="proyeccion__cabeza">
        <h2 id="proyeccion-titulo">Lo que concluyó la clase</h2>
        <button ref={boton} className="btn btn--claro" type="button" onClick={onCerrar}>
          Cerrar
        </button>
      </header>
      <ul className="proyeccion__lista">
        {conclusiones.map((c) => (
          <li key={c.id}>{c.texto}</li>
        ))}
      </ul>
    </div>
  );
}
