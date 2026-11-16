import Link from 'next/link';
import { salirAlumno } from '@/acciones/alumno';
import '../cuadernos.css';

/* Lo de arriba del laboratorio del chico: el aula, Salir y las dos pestañas (Mis actividades · Mi cuaderno). */
export function CabeceraLab({ aula }: { aula: string }) {
  return (
    <header className="lab__cabecera">
      <span className="etiqueta">La ciencia sin límites · {aula}</span>
      <form action={salirAlumno}>
        <button className="btn btn--claro" type="submit">
          Salir
        </button>
      </form>
    </header>
  );
}

export function PestanasLab({ activa }: { activa: 'actividades' | 'cuaderno' }) {
  return (
    <nav className="lab__pestanas" aria-label="Tu laboratorio">
      <Link href="/lab" aria-current={activa === 'actividades' ? 'page' : undefined}>
        Mis actividades
      </Link>
      <Link href="/lab/cuaderno" aria-current={activa === 'cuaderno' ? 'page' : undefined}>
        Mi cuaderno
      </Link>
    </nav>
  );
}
