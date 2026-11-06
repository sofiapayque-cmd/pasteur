import Link from 'next/link';
import type { Alumno } from '@/datos/alumno';
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
export default function Laboratorio({ alumno }: { alumno: Alumno }) {
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

      <section className="lab__caja" aria-labelledby="apodo-titulo">
        <h2 id="apodo-titulo">{alumno.apodo ? 'Tu apodo científico' : 'Elegí tu apodo científico'}</h2>
        <p>No hace falta tu nombre: con el apodo alcanza.</p>
        <ElegirApodo actual={alumno.apodo} colorActual={alumno.color} semilla={alumno.numero} />
      </section>

      <section className="lab__caja" aria-labelledby="actividades-titulo">
        <h2 id="actividades-titulo">Actividades</h2>
        <p>Tu maestra todavía no te mandó ninguna. Mientras tanto, podés explorar las cuatro.</p>
        <Link className="btn btn--primario" href="/explorar">
          Explorar las actividades
        </Link>
      </section>
    </main>
  );
}
