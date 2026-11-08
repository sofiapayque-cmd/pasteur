'use client';

import Link from 'next/link';
import FondoVivo from '@/components/FondoVivo';
import Moli from '@/components/Moli';
import SalaEspera from '@/pantallas/maestra/SalaEspera';
import Tablero from '@/pantallas/maestra/Tablero';
import Puesta from '@/pantallas/maestra/Puesta';
import { ProveedorClase, type Clase } from '@/sala/contexto';
import { useClaseMaestra } from '@/sala/claseEnVivo';
import type { Instantanea } from '@/lib/aulas/clase';
import { actividad as datosActividad } from '@/lib/aulas/tareas';

/*
  /maestra/aulas/[id]/en-vivo · LA CLASE EN VIVO DE VERDAD (etapa 5, parte 2).
  Las mismas pantallas del prototipo (sala de espera, tablero, puesta en
  común), alimentadas por la base en tiempo real. Qué pantalla se ve depende
  del estado de la clase, no de la dirección: si la maestra recarga o entra
  desde otra compu, vuelve al mismo punto.
*/
export default function ClaseEnVivo({ inicial }: { inicial: Instantanea }) {
  const { sala, inst, conexion, aviso, acciones } = useClaseMaestra(inicial);
  const aulaUrl = `/maestra/aulas/${inst.aula.id}`;

  const valor: Clase = {
    real: true,
    // Las pantallas usan la forma de la sala del prototipo
    sala: sala as unknown as Clase['sala'],
    empezar: () => acciones.mover('empezar'),
    alternarPausa: acciones.alternarPausa,
    desbloquear: acciones.desbloquear,
    irAPuesta: () => acciones.mover('puesta'),
    volverAlTablero: () => acciones.mover('volver'),
    cerrar: () => acciones.mover('cerrar'),
    aula: { id: inst.aula.id, nombre: inst.aula.nombre },
    conexion,
    aviso,
  };

  return (
    <ProveedorClase valor={valor}>
      {sala.estado !== 'cerrada' && (
        <Link className="clase-vivo__salir" href={aulaUrl}>
          ← Ir al aula (la clase sigue abierta)
        </Link>
      )}
      {sala.estado === 'esperando' && <SalaEspera />}
      {sala.estado === 'en-curso' && <Tablero />}
      {sala.estado === 'puesta' && <Puesta />}
      {sala.estado === 'cerrada' && <ClaseCerrada inst={inst} aulaUrl={aulaUrl} />}
    </ProveedorClase>
  );
}

export function ClaseCerrada({ inst, aulaUrl }: { inst: Instantanea; aulaUrl: string }) {
  const act = datosActividad(inst.asignacion.actividad);
  const entraron = inst.progresos.length;
  const terminaron = inst.progresos.filter((p) => p.completada_en).length;
  return (
    <main className="pantalla clase-vivo__fin">
      <FondoVivo semilla={33} opacidad={0.3} />
      <section className="clase-vivo__tarjeta">
        <div aria-hidden="true">
          <Moli animo="feliz" tamano={160} />
        </div>
        <div>
          <span className="etiqueta etiqueta--oscura">
            {act?.numero} · {act?.nombre} · {inst.aula.nombre}
          </span>
          <h1>La clase terminó</h1>
          <p>
            {entraron === 1 ? 'Entró 1 chico' : `Entraron ${entraron} chicos`} y {terminaron === 1 ? '1 terminó' : `${terminaron} terminaron`}. Lo que hizo cada uno quedó guardado.
          </p>
          <p className="texto-suave">
            La actividad sigue abierta como tarea: cada uno puede terminarla desde su laboratorio. Si preferís que no, cerrala desde la tarea.
          </p>
          <div className="clase-vivo__botones">
            <Link className="btn btn--primario" href={`${aulaUrl}/tareas/${inst.asignacion.id}`}>
              Ver cómo le fue a cada uno
            </Link>
            <Link className="btn btn--secundario" href={aulaUrl}>
              Volver al aula
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
