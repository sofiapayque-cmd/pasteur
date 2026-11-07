import Link from 'next/link';
import type { Alumno } from '@/datos/alumno';
import type { Avance, Tarea } from '@/datos/tareas';
import { actividad as datosActividad, dondeVa } from '@/lib/aulas/tareas';
import { salirAlumno } from '@/acciones/alumno';
import Moli from '@/components/Moli';
import FondoVivo from '@/components/FondoVivo';
import ElegirApodo from './ElegirApodo';
import './cuenta.css';

/*
  El laboratorio del alumno (etapa 4): saludo, apodo científico y color,
  explorar las actividades y salir. Las tareas de la maestra y el avance
  guardado llegan en las etapas 5 y 7.
*/
export default function Laboratorio({ alumno, tareas }: { alumno: Alumno; tareas: (Tarea & { avance: Avance | null })[] }) {
  const aula = alumno.aula.nombre;
  const nombre = alumno.apodo ?? `número ${alumno.numero}`;
  return (
    <main className="pantalla lab">
      <FondoVivo semilla={7} opacidad={0.3} />
      <header className="lab__cabecera">
        <span className="etiqueta">La ciencia sin límites · {aula}</span>
        <form action={salirAlumno}>
          <button className="btn btn--claro" type="submit">
            Salir
          </button>
        </form>
      </header>

      <section className="lab__saludo">
        <div aria-hidden="true">
          <Moli animo="feliz" tamano={180} />
        </div>
        <div>
          <h1>
            ¡Hola,{' '}
            <span className="lab__nombre" style={alumno.color ? { textDecorationColor: alumno.color } : undefined}>
              {nombre}
            </span>
            !
          </h1>
          <p>Este es tu laboratorio. Cuando termines, tocá Salir, sobre todo si la computadora es de la escuela.</p>
        </div>
      </section>

      {/* El apodo se elige una sola vez: después ya no aparece (pedido de Sofia, 6/11) */}
      {!alumno.apodo && (
        <section className="lab__caja" aria-labelledby="apodo-titulo">
          <h2 id="apodo-titulo">Elegí tu apodo científico</h2>
          <p>No hace falta tu nombre: con el apodo alcanza. Elegilo bien, porque después no se cambia.</p>
          <ElegirApodo actual={null} colorActual={alumno.color} semilla={alumno.numero} />
        </section>
      )}

      <section className="lab__caja" aria-labelledby="actividades-titulo">
        <h2 id="actividades-titulo">Tus actividades</h2>
        {tareas.length === 0 ? (
          <p>Tu maestra todavía no te mandó ninguna. Mientras tanto, podés explorar.</p>
        ) : (
          <ul className="lab__tareas">
            {tareas.map((t) => {
              const act = datosActividad(t.actividad);
              const va = dondeVa(t.actividad, t.avance?.etapa);
              const abierta = t.estado === 'activa';
              const estado = t.avance?.completada_en ? '¡Terminada!' : t.avance ? `Vas por: ${va.nombre} (${va.indice} de ${va.total})` : 'Sin empezar';
              return (
                <li key={t.id} className={`lab__tarea ${abierta ? '' : 'lab__tarea--cerrada'}`}>
                  <span className="lab__placa" style={{ background: act?.placa }} aria-hidden="true" />
                  <div>
                    <h3>
                      {act?.numero} · {act?.nombre}
                    </h3>
                    <p>{abierta ? estado : `Cerrada por tu maestra · ${estado}`}</p>
                  </div>
                  {abierta && (
                    <Link className="btn btn--primario" href={`/lab/tarea/${t.id}`}>
                      {t.avance?.completada_en ? 'Ver' : t.avance ? 'Seguir' : 'Empezar'}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <Link className="enlace" href="/explorar">
          Explorar otras actividades por mi cuenta
        </Link>
      </section>
    </main>
  );
}
