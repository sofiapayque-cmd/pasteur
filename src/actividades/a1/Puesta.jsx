import './a1.css';
import { AMBIENTES } from './datos';
import { ANTIBIOTICOS, TEMPERATURAS, puntajeResistencia } from './laboratorio';
import Placa from './piezas/Placa';
import { Disco } from './piezas/Instrumentos';

/*
  Puesta en común de A1 (pantalla de la maestra, para proyectar).
  - Placas de toda la clase agrupadas por ambiente, con cuánto creció en cada temperatura.
  - Qué antibiótico tuvo más bacterias resistentes.
*/
export default function PuestaA1({ sala }) {
  const alumnos = sala?.alumnos || [];
  const habil = sala?.opciones?.ambientes?.length ? AMBIENTES.filter((a) => sala.opciones.ambientes.includes(a.id)) : AMBIENTES;
  const placas = alumnos.flatMap((al) => (al.datos?.cultivos || []).map((c) => ({ ...c, alumno: al.apodo, color: al.color, clave: `${al.id}-${c.id}` })));
  const pruebas = alumnos.flatMap((al) => {
    const lista = al.datos?.antibioticos || [];
    return lista.length ? [lista[lista.length - 1]] : [];
  });
  const contaminadas = placas.filter((p) => p.contaminada).length;

  // Antibióticos: total de colonias resistentes y placas sin halo
  const totales = ANTIBIOTICOS.map((ab) => {
    let resistentes = 0;
    let sinHalo = 0;
    let puntaje = 0;
    pruebas.forEach((pr) => {
      const r = (pr.resultados || []).find((x) => x.id === ab.id);
      if (!r) return;
      resistentes += r.resistentes || 0;
      if (r.halo === 'nada') sinHalo += 1;
      puntaje += puntajeResistencia(r);
    });
    return { ...ab, resistentes, sinHalo, puntaje };
  });
  const maxPuntaje = Math.max(1, ...totales.map((t) => t.puntaje));
  const ganador = pruebas.length ? [...totales].sort((a, b) => b.puntaje - a.puntaje)[0] : null;

  return (
    <div className="a1-puesta">
      <section className="tarjeta a1-puesta__bloque">
        <header className="a1-puesta__cabeza">
          <span className="etiqueta etiqueta--oscura">Placas de la clase · {placas.length}</span>
          <h2>¿Qué creció en cada lugar?</h2>
          {contaminadas > 0 && (
            <p className="a1-puesta__nota">
              <i className="a1-puesta__hongo" aria-hidden="true" /> {contaminadas} {contaminadas === 1 ? 'placa se contaminó' : 'placas se contaminaron'}: ¿qué pasó con el asa?
            </p>
          )}
        </header>
        <div className="a1-puesta__ambientes">
          {habil.map((amb) => {
            const suyas = placas.filter((p) => p.ambiente === amb.id);
            const limpias = suyas.filter((p) => !p.contaminada);
            const promedios = TEMPERATURAS.map((t) => {
              const de = limpias.filter((p) => p.temp === t.id);
              return { ...t, n: de.length, prom: de.length ? de.reduce((s, p) => s + (p.colonias || 0), 0) / de.length : 0 };
            });
            const maxProm = Math.max(1, ...promedios.map((p) => p.prom));
            return (
              <article key={amb.id} className="a1-puesta__ambiente">
                <h3>
                  <i style={{ background: amb.color }} aria-hidden="true" />
                  {amb.nombre}
                  <small>{suyas.length} {suyas.length === 1 ? 'placa' : 'placas'}</small>
                </h3>
                {suyas.length ? (
                  <ul className="a1-puesta__placas">
                    {suyas.slice(0, 12).map((p) => (
                      <li key={p.clave} title={`${p.alumno} · ${p.temp}`}>
                        <Placa placa={p} tamano={84} etiqueta={`Placa de ${p.alumno}`} />
                        <span className="a1-puesta__temp" style={{ background: TEMPERATURAS.find((t) => t.id === p.temp)?.color }} />
                      </li>
                    ))}
                    {suyas.length > 12 && <li className="a1-puesta__mas">+{suyas.length - 12}</li>}
                  </ul>
                ) : (
                  <p className="texto-suave">Nadie cultivó todavía.</p>
                )}
                <div className="a1-puesta__barras" aria-label={`Colonias promedio por temperatura en ${amb.nombre}`}>
                  {promedios.map((p) => (
                    <div key={p.id} className="a1-puesta__barra">
                      <span className="a1-puesta__barra-nombre">{p.nombre}</span>
                      <span className="a1-puesta__barra-fondo">
                        <span style={{ transform: `scaleX(${p.prom / maxProm})`, background: p.color }} />
                      </span>
                      <span className="a1-puesta__barra-valor">{p.n ? Math.round(p.prom) : '—'}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <p className="a1-puesta__leyenda">
          Barras: colonias promedio por placa (sin contar las contaminadas).
          {TEMPERATURAS.map((t) => (
            <span key={t.id}>
              <i style={{ background: t.color }} /> {t.nombre}
            </span>
          ))}
        </p>
      </section>

      <section className="tarjeta a1-puesta__bloque">
        <header className="a1-puesta__cabeza">
          <span className="etiqueta etiqueta--oscura">Antibióticos · {pruebas.length} {pruebas.length === 1 ? 'prueba' : 'pruebas'}</span>
          <h2>{ganador ? `Con el ${ganador.nombre} resistieron más bacterias` : '¿Algunas bacterias resisten?'}</h2>
        </header>
        {pruebas.length ? (
          <ul className="a1-puesta__antibioticos">
            {totales.map((t) => (
              <li key={t.id} className={ganador?.id === t.id ? 'a1-puesta__ab--mas' : ''}>
                <Disco letra={t.id} color={t.color} tam={56} />
                <div>
                  <b>{t.nombre}</b>
                  <span className="a1-puesta__barra-fondo a1-puesta__barra-fondo--grande">
                    <span style={{ transform: `scaleX(${t.puntaje / maxPuntaje})`, background: t.color }} />
                  </span>
                  <small>
                    {t.resistentes} {t.resistentes === 1 ? 'colonia resistente' : 'colonias resistentes'}
                    {t.sinHalo > 0 && ` · ${t.sinHalo} ${t.sinHalo === 1 ? 'placa' : 'placas'} sin halo`}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="texto-suave a1-puesta__vacio">Todavía nadie probó antibióticos. Cuando los habilites, acá aparece qué antibiótico tuvo más bacterias resistentes.</p>
        )}
      </section>
    </div>
  );
}
