import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAulas } from '@/datos/aulas';
import { cuadernoDeLaMaestra } from '@/datos/cuadernos';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import { PreguntaDelCuaderno } from '@/pantallas/maestra/CuadernoClase/CuadernoClase';
import '@/pantallas/maestra/aulas/aulas.css';
import '@/styles/cuadernos.css';

/*
  /maestra/cuaderno · "Mi cuaderno" de la maestra (migración 25): las
  respuestas que llegaron a sus preguntas, el cuaderno de cada clase y todas
  sus preguntas al Pasteur (de cualquier clase o de ninguna).
*/
export const metadata: Metadata = { title: 'Mi cuaderno', robots: { index: false } };

export default async function Page() {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const [aulas, cuaderno] = await Promise.all([listarAulas(), cuadernoDeLaMaestra(docente.id)]);
  const activas = aulas.filter((a) => !a.archivada_en);
  const nombreAula = new Map(aulas.map((a) => [a.id, a.nombre]));
  const nuevas = cuaderno.preguntas.filter((p) => p.nueva);
  return (
    <main className="pantalla aulas">
      <FondoVivo semilla={9} />
      <Cabecera volverA="/maestra" miga="Inicio › Maestras › Mi cuaderno" derecha={<CuentaDocente nombre={docente.nombre || docente.email || 'Maestra'} />} />
      <div className="aulas__cuerpo">
        <div className="aula__cabeza">
          <div>
            <h1>Mi cuaderno</h1>
            <p className="aulas__bajada">Tus preguntas al Pasteur con sus respuestas, y el cuaderno de cada clase.</p>
          </div>
          <Link className="btn btn--primario" href="/maestra/preguntar">
            Hacer una pregunta
          </Link>
        </div>

        {nuevas.length > 0 && (
          <section className="aulas__bloque" aria-labelledby="cuad-nuevas">
            <h2 id="cuad-nuevas">{nuevas.length === 1 ? 'Respondimos una pregunta tuya' : `Respondimos ${nuevas.length} preguntas tuyas`}</h2>
            <ul className="cuad__lista">
              {nuevas.map((p) => (
                <PreguntaDelCuaderno key={p.id} p={p} clase={p.aulaId ? nombreAula.get(p.aulaId) : undefined} />
              ))}
            </ul>
          </section>
        )}

        <section className="aulas__bloque" aria-labelledby="cuad-clases">
          <h2 id="cuad-clases">El cuaderno de cada clase</h2>
          {activas.length === 0 ? (
            <p className="cuad__vacio">
              Todavía no tenés clases. <Link href="/maestra/aulas">Creá una en Mis aulas.</Link>
            </p>
          ) : (
            <ul className="cuad__lista">
              {activas.map((a) => {
                const n = cuaderno.preguntasNuevasPorAula[a.id] ?? 0;
                return (
                  <li key={a.id} className="cuad__item">
                    <span className="cuad__acciones" style={{ justifyContent: 'space-between' }}>
                      <strong>{a.nombre}</strong>
                      <span className="cuad__acciones">
                        {n > 0 && <span className="cuad__paso cuad__paso--esperando">{n === 1 ? '1 pregunta nueva de los chicos' : `${n} preguntas nuevas de los chicos`}</span>}
                        <Link className="btn btn--secundario btn--chico" href={`/maestra/aulas/${a.id}/cuaderno`}>
                          Abrir
                        </Link>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="aulas__bloque" aria-labelledby="cuad-todas">
          <h2 id="cuad-todas">Tus preguntas al Pasteur</h2>
          {!cuaderno.disponible ? (
            <p className="cuad__vacio">Muy pronto vas a ver acá tus preguntas y sus respuestas.</p>
          ) : cuaderno.preguntas.length === 0 ? (
            <p className="cuad__vacio">Cuando hagas una pregunta en &quot;Preguntale al Pasteur&quot;, queda acá. Si todavía no tiene respuesta, te avisamos cuando una investigadora la apruebe.</p>
          ) : (
            <ul className="cuad__lista">
              {cuaderno.preguntas.map((p) => (
                <PreguntaDelCuaderno key={p.id} p={p} clase={p.aulaId ? nombreAula.get(p.aulaId) : undefined} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
