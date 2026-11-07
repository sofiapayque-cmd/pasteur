'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import MarcoActividad from '@/components/MarcoActividad';
import Cargando from '@/components/Cargando';
import FondoVivo from '@/components/FondoVivo';
import Moli from '@/components/Moli';
import { EXPERIENCIAS } from '@/actividades/componentes';
import { useProgresoTarea } from '@/sala/progresoTarea';
import { useClaseAlumno } from '@/sala/claseEnVivo';
import { desbloqueosDeClase, type SesionFila } from '@/lib/aulas/clase';

/*
  NIÑO · LA CLASE EN VIVO (etapa 5, parte 2).
  · Esperando: "¡Ya estás adentro!" hasta que la maestra empieza; entonces la
    actividad se abre sola.
  · En curso: la actividad de siempre, con el avance guardado en la base
    (como en las tareas). Si la maestra pausa o va a la puesta en común,
    aparece "Mirá el pizarrón"; lo que habilita llega en el momento.
  · Cerrada: se lo dice, y si la actividad sigue abierta, puede seguir en su laboratorio.
  Todo llega en tiempo real (y, si la red no lo deja, preguntando cada pocos segundos).
*/
type Props = {
  sesion: SesionFila;
  tarea: { id: string; actividad: 'a1' | 'a2' | 'a3' | 'a4'; opciones: Record<string, string[]>; desbloqueos: Record<string, boolean>; abierta: boolean };
  inicial: { etapa: string; datos: Record<string, unknown> };
  alumno: { apodo: string | null; numero: number; color: string | null };
};

export default function ClaseAlumno({ sesion: inicialSesion, tarea, inicial, alumno }: Props) {
  const { sesion } = useClaseAlumno(inicialSesion);
  const desbloqueos = desbloqueosDeClase(tarea.desbloqueos, sesion.desbloqueos);
  const nombre = alumno.apodo ?? `número ${alumno.numero}`;
  // Siempre se llama (aunque todavía esté esperando): las reglas de los hooks de React
  const base = useProgresoTarea({ tareaId: tarea.id, inicial, opciones: tarea.opciones, desbloqueos, apodo: alumno.apodo });
  const progreso = {
    ...base,
    enClase: true,
    pausada: sesion.pausada || sesion.estado === 'puesta',
    sala: { estado: sesion.estado },
    desbloqueado: (clave: string) => desbloqueos[clave] !== false,
  };
  const Experiencia = EXPERIENCIAS[tarea.actividad];

  if (sesion.estado === 'esperando') {
    return (
      <main className="pantalla espera">
        <FondoVivo semilla={8} cantidad={16} />
        <section className="espera__texto">
          <h1>¡Ya estás adentro, {nombre}!</h1>
          <p>Tu maestra está por empezar. Cuando lo haga, la actividad se abre sola.</p>
          <div className="puntos-espera" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </section>
        <section className="espera__moli">
          <div className="espera__fondo" aria-hidden="true" />
          <Moli tamano={340} />
          <span className="chip espera__chip">
            <i style={{ background: alumno.color ?? 'var(--coral)' }} aria-hidden="true" />
            {nombre}
          </span>
        </section>
      </main>
    );
  }

  if (sesion.estado === 'cerrada') {
    return (
      <main className="pantalla lab">
        <section className="lab__saludo">
          <div aria-hidden="true">
            <Moli animo="feliz" tamano={160} />
          </div>
          <div>
            <h1>¡La clase terminó!</h1>
            <p>Lo que hiciste quedó guardado.{tarea.abierta ? ' Si querés, podés seguir desde tu laboratorio.' : ''}</p>
            <p style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {tarea.abierta && (
                <Link className="btn btn--primario" href={`/lab/tarea/${tarea.id}`}>
                  Seguir con la actividad
                </Link>
              )}
              <Link className={`btn ${tarea.abierta ? 'btn--secundario' : 'btn--primario'}`} href="/lab">
                Ir a mi laboratorio
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <MarcoActividad actividadId={tarea.actividad} progreso={progreso}>
      <Suspense fallback={<Cargando />}>
        <Experiencia progreso={progreso} />
      </Suspense>
    </MarcoActividad>
  );
}
