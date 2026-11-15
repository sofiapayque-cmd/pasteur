import Link from 'next/link';
import { exigirMiembro, nombreDe } from '@/datos/equipo';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { actualizarPerfil } from '@/acciones/equipo';
import { NOMBRE_ROL } from '@/lib/equipo/comun';
import Forma from '@/pantallas/equipo/Forma';
import { listarRespuestas, type Grupo } from '@/datos/respuestas';

/*
  /equipo · Inicio del panel: qué hay para revisar y cómo funciona.
  Desde el 15/11 el panel tiene una sola sección de trabajo, Revisar (antes
  Respuestas, Fichas y Para revisar). Biblioteca, todas las fichas y la
  prueba del asistente quedan acá, como herramientas de la admin.
*/
export default async function Page() {
  const yo = await exigirMiembro();
  const db = (await crearClienteServidor())!;
  const contar = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [respuestas, curiosidadesEnRevision] = await Promise.all([
    listarRespuestas(),
    contar(
      db.from('ficha_versiones').select('id, fichas!inner(formato)', { count: 'exact', head: true }).eq('estado', 'en_revision').eq('fichas.formato', 'dato'),
    ),
  ]);
  const cuenta = (g: Grupo) => respuestas.filter((r) => r.grupo === g).length;
  const admin = yo.rol === 'admin';

  return (
    <main className="eq-cuerpo">
      <div>
        <span className="etiqueta">{NOMBRE_ROL[yo.rol]}</span>
        <h1>Hola, {nombreDe(yo)}</h1>
        <p className="eq-bajada">
          Acá se validan las respuestas del asistente. Solo lo que aprueba una validadora del Instituto llega a los chicos, y tal cual quedó aprobado.
        </p>
      </div>

      <div className="eq-grilla">
        <Link className="eq-caja" href="/equipo/revisar?ver=espera">
          <div className="eq-numero">{cuenta('espera')}</div>
          <h3>Esperando revisión</h3>
        </Link>
        <Link className="eq-caja" href="/equipo/revisar?ver=cambios">
          <div className="eq-numero">{cuenta('cambios')}</div>
          <h3>Con cambios pedidos</h3>
        </Link>
        <Link className="eq-caja" href="/equipo/revisar?ver=aprobada">
          <div className="eq-numero">{cuenta('aprobada')}</div>
          <h3>Aprobadas</h3>
          <span className="eq-tabla__chico">ya las ven los chicos</span>
        </Link>
        <Link className="eq-caja" href="/equipo/curiosidades">
          <div className="eq-numero">{curiosidadesEnRevision}</div>
          <h3>Curiosidades por revisar</h3>
        </Link>
      </div>

      <div className="eq-dos">
        <section className="eq-caja">
          <h2>Cómo funciona</h2>
          <ol className="eq-bajada">
            <li>
              <strong>La IA prepara la respuesta</strong> con artículos científicos (sobre todo de PubMed) y marca la oración exacta del artículo que respalda cada idea.
            </li>
            <li>
              <strong>En Revisar, una validadora la lee</strong> y la aprueba, pide cambios o la rechaza. Al aprobarla quedan aprobados también los artículos que cita: no hace
              falta revisarlos aparte.
            </li>
            <li>
              <strong>Solo lo aprobado llega a los chicos</strong>, tal cual quedó, con el sello del Instituto.
            </li>
          </ol>
          <div className="eq-botones">
            <Link className="btn btn--primario btn--chico" href="/equipo/revisar">
              Ir a revisar
            </Link>
          </div>
        </section>

        <section className="eq-caja">
          <h2>Tus datos</h2>
          <p className="eq-ayuda">Aparecen en las fichas que escribís o aprobás. Lo ve solo el equipo.</p>
          <Forma accion={actualizarPerfil} boton="Guardar">
            <label className="campo">
              <span className="campo__nombre">Nombre</span>
              <input className="campo__entrada" name="nombre" maxLength={120} defaultValue={yo.nombre_visible} />
            </label>
            <label className="campo">
              <span className="campo__nombre">Laboratorio o área</span>
              <input className="campo__entrada" name="laboratorio" maxLength={160} defaultValue={yo.laboratorio} />
            </label>
          </Forma>
        </section>
      </div>

      {admin && (
        <section className="eq-caja">
          <h2>Herramientas</h2>
          <p className="eq-ayuda">Para la admin. La validadora no las necesita: revisa todo desde Revisar.</p>
          <ul className="eq-herramientas">
            <li>
              <Link href="/equipo/biblioteca">Biblioteca</Link>
              <span>Buscar artículos en PubMed, OpenAlex y Europe PMC y agregarlos a mano.</span>
            </li>
            <li>
              <Link href="/equipo/fichas">Todas las fichas</Link>
              <span>Cada respuesta y curiosidad con sus versiones; desde ahí se escribe una ficha a mano.</span>
            </li>
            <li>
              <Link href="/equipo/asistente">Prueba del asistente</Link>
              <span>
                Comprueba que &quot;Preguntale al Pasteur&quot; encuentra la respuesta aprobada correcta cuando una maestra pregunta con otras palabras, y que no confunde preguntas
                parecidas. Se usa para ajustarlo cuando hay respuestas nuevas.
              </span>
            </li>
          </ul>
        </section>
      )}
    </main>
  );
}
