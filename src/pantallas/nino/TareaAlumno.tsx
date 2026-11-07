'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MarcoActividad from '@/components/MarcoActividad';
import Cargando from '@/components/Cargando';
import { EXPERIENCIAS } from '@/actividades/componentes';
import { useProgresoTarea } from '@/sala/progresoTarea';

/*
  NIÑO · UNA TAREA DE SU MAESTRA. La actividad de siempre, con el avance
  guardado en la base. Cada 30 segundos pregunta si cambió algo (por ejemplo,
  la maestra habilitó antibióticos o cerró la tarea).
*/
type Props = {
  tareaId: string;
  actividad: 'a1' | 'a2' | 'a3' | 'a4';
  inicial: { etapa: string; datos: Record<string, unknown> };
  opciones: Record<string, string[]>;
  desbloqueos: Record<string, boolean>;
  apodo: string | null;
};

export default function TareaAlumno({ tareaId, actividad, inicial, opciones, desbloqueos, apodo }: Props) {
  const router = useRouter();
  const progreso = useProgresoTarea({ tareaId, inicial, opciones, desbloqueos, apodo });
  const Experiencia = EXPERIENCIAS[actividad];

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <MarcoActividad actividadId={actividad} progreso={progreso}>
      <Suspense fallback={<Cargando />}>
        <Experiencia progreso={progreso} />
      </Suspense>
    </MarcoActividad>
  );
}
