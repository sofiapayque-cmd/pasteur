import Link from 'next/link';
import { exigirMiembro, nombreDe } from '@/datos/equipo';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { actualizarPerfil } from '@/acciones/equipo';
import { NOMBRE_ROL } from '@/lib/equipo/comun';
import Forma from '@/pantallas/equipo/Forma';

/* /equipo · Inicio del panel: qué hay para hacer y cómo funciona */
export default async function Page() {
  const yo = await exigirMiembro();
  const db = (await crearClienteServidor())!;
  const contar = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [misBorradores, enRevision, publicadas, candidatas, aprobadas] = await Promise.all([
    contar(db.from('ficha_versiones').select('id', { count: 'exact', head: true }).eq('estado', 'borrador').eq('autor_id', yo.id)),
    contar(db.from('ficha_versiones').select('id', { count: 'exact', head: true }).eq('estado', 'en_revision')),
    contar(db.from('fichas').select('id', { count: 'exact', head: true }).eq('estado', 'publicada')),
    contar(db.from('publicaciones').select('id', { count: 'exact', head: true }).in('estado', ['candidata', 'en_revision'])),
    contar(db.from('publicaciones').select('id', { count: 'exact', head: true }).eq('estado', 'aprobada')),
  ]);

  return (
    <main className="eq-cuerpo">
      <div>
        <span className="etiqueta">{NOMBRE_ROL[yo.rol]}</span>
        <h1>Hola, {nombreDe(yo)}</h1>
        <p className="eq-bajada">
          Acá se escriben y se validan las respuestas del asistente. Solo lo que aprueba una validadora del Instituto llega a los chicos, y tal cual quedó aprobado.
        </p>
      </div>

      <div className="eq-grilla">
        <Link className="eq-caja" href="/equipo/fichas?estado=borrador">
          <div className="eq-numero">{misBorradores}</div>
          <h3>Mis borradores</h3>
        </Link>
        <Link className="eq-caja" href={yo.rol === 'validador' ? '/equipo/revisar' : '/equipo/fichas?estado=en_revision'}>
          <div className="eq-numero">{enRevision}</div>
          <h3>Fichas en revisión</h3>
        </Link>
        <Link className="eq-caja" href="/equipo/fichas?estado=publicada">
          <div className="eq-numero">{publicadas}</div>
          <h3>Fichas publicadas</h3>
        </Link>
        <Link className="eq-caja" href="/equipo/biblioteca">
          <div className="eq-numero">{aprobadas}</div>
          <h3>Fuentes aprobadas</h3>
          <span className="eq-tabla__chico">{candidatas} esperando decisión</span>
        </Link>
      </div>

      <div className="eq-dos">
        <section className="eq-caja">
          <h2>Cómo funciona</h2>
          <ol className="eq-bajada">
            <li>
              <strong>Fuentes.</strong> En <Link href="/equipo/biblioteca">Biblioteca</Link> se buscan artículos en PubMed, OpenAlex y Europe PMC y se agregan. Una validadora los aprueba como
              fuente confiable.
            </li>
            <li>
              <strong>Fichas.</strong> En <Link href="/equipo/fichas">Fichas</Link> se escribe la explicación científica y la versión para chicos de 10 a 12 años, con el pasaje
              del artículo que la respalda. Después se manda a revisión.
            </li>
            <li>
              <strong>Revisión.</strong> Una validadora la lee, la puede corregir y la aprueba, pide cambios o la rechaza. Si cambia algo mientras alguien la revisa, hay que volver
              a cargarla antes de aprobar.
            </li>
          </ol>
          <div className="eq-botones">
            <Link className="btn btn--primario btn--chico" href="/equipo/fichas/nueva">
              Nueva ficha
            </Link>
            <Link className="btn btn--secundario btn--chico" href="/equipo/biblioteca">
              Buscar artículos
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
    </main>
  );
}
