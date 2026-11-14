import { exigirMiembro } from '@/datos/equipo';
import { listarTemas } from '@/datos/fichas';
import { crearFicha } from '@/acciones/fichas';
import { ACTIVIDADES, ACTIVIDADES_A_ELEGIR } from '@/lib/equipo/comun';
import Forma from '@/pantallas/equipo/Forma';

/* /equipo/fichas/nueva · Empezar una ficha (después se completa en su página) */
export default async function Page({ searchParams }: { searchParams: Promise<{ formato?: string; tema?: string }> }) {
  await exigirMiembro();
  const temas = await listarTemas();
  // Desde Curiosidades se llega con ?formato=dato&tema=… (etapa 4)
  const sp = await searchParams;
  const esDato = sp.formato === 'dato';
  const temaElegido = temas.some((t) => t.id === sp.tema) ? sp.tema! : '';
  return (
    <main className="eq-cuerpo eq-cuerpo--angosto">
      <div>
        <h1>Nueva ficha</h1>
        <p className="eq-bajada">
          Una <strong>pregunta</strong> es lo que un chico podría preguntar, con su respuesta: si coincide, el asistente la muestra tal cual, con el sello del Instituto. Un{' '}
          <strong>dato</strong> es una afirmación breve que el asistente usa como contexto y para las curiosidades; nunca se muestra solo con el sello.
        </p>
      </div>
      <section className="eq-caja">
        <Forma accion={crearFicha} boton="Crear y seguir" enviando="Creando…">
          <fieldset className="eq-fila" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="campo__nombre">Formato</legend>
            <label className="eq-check">
              <input type="radio" name="formato" value="pregunta" defaultChecked={!esDato} /> Pregunta
            </label>
            <label className="eq-check">
              <input type="radio" name="formato" value="dato" defaultChecked={esDato} /> Dato
            </label>
          </fieldset>
          <label className="campo">
            <span className="campo__nombre">La pregunta (o de qué trata el dato)</span>
            <input className="campo__entrada" name="titulo" required minLength={3} maxLength={300} placeholder="¿Por qué las células se dividen?" />
          </label>
          <div className="eq-fila">
            <label className="campo">
              <span className="campo__nombre">Actividad</span>
              <select className="campo__entrada" name="actividad" defaultValue="">
                <option value="">Ninguna en particular</option>
                {ACTIVIDADES_A_ELEGIR.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span className="campo__nombre">Tema</span>
              <select className="campo__entrada" name="tema" defaultValue={temaElegido}>
                <option value="">Sin tema todavía</option>
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Forma>
      </section>
    </main>
  );
}
