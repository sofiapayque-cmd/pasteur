'use client';

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from 'react';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import type { EstadoTareaForm } from '@/acciones/tareas';
import { ACTIVIDADES_DISPONIBLES, desbloqueosDe, opcionesDe } from '@/lib/aulas/tareas';
import './aulas.css';

/*
  /maestra/aulas/[id]/mandar · Elegir una actividad y sus opciones (las mismas
  de "Preparar la clase") y mandarla al aula. Queda abierta hasta que la
  maestra la cierre; cada chico la ve en su laboratorio.
  Con modo="clase" es el mismo formulario para abrir una clase en vivo
  (/maestra/aulas/[id]/en-vivo): la actividad queda también como tarea.
*/
const TEXTOS = {
  tarea: {
    titulo: 'Mandar una actividad',
    bajada: (aula: string) => `Aparece en el laboratorio de cada chico de ${aula}. Su avance se guarda solo, y vos ves cómo va cada uno.`,
    despues: 'Lo habilito yo después (desde la tarea)',
    boton: 'Mandar al aula',
    enviando: 'Mandando…',
  },
  clase: {
    titulo: 'Empezar una clase en vivo',
    bajada: (aula: string) =>
      `Los chicos de ${aula} entran con su tarjeta, cada uno desde su Ceibal, y la hacen juntos. Vos la guiás desde esta compu: los ves en el tablero, pausás para mirar el pizarrón, habilitás lo que sigue y hacen la puesta en común. Lo de cada uno queda guardado.`,
    despues: 'Lo habilito yo durante la clase',
    boton: 'Abrir la clase',
    enviando: 'Abriendo…',
  },
};
export default function MandarActividad({
  aula,
  cuenta,
  accion,
  modo = 'tarea',
  extra,
}: {
  aula: { id: string; nombre: string };
  cuenta: string;
  accion: (previo: EstadoTareaForm, datos: FormData) => Promise<EstadoTareaForm>;
  modo?: 'tarea' | 'clase';
  extra?: ReactNode;
}) {
  const t = TEXTOS[modo];
  const [estado, mandar, mandando] = useActionState(accion, { mensaje: '' });
  const [act, setAct] = useState(ACTIVIDADES_DISPONIBLES[0]?.id ?? 'a1');

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => mandar(datos));
  }

  return (
    <main className="pantalla aulas">
      <FondoVivo semilla={9} />
      <Cabecera volverA={`/maestra/aulas/${aula.id}`} miga={`Inicio › Mis aulas › ${aula.nombre} › ${t.titulo}`} derecha={<CuentaDocente nombre={cuenta} />} />
      <form className="aulas__cuerpo" onSubmit={enviar}>
        <div>
          <h1>{t.titulo}</h1>
          <p className="aulas__bajada">{t.bajada(aula.nombre)}</p>
        </div>
        {extra}

        <fieldset className="aulas__bloque mandar__grupo">
          <legend>Actividad</legend>
          <div className="mandar__actividades">
            {ACTIVIDADES_DISPONIBLES.map((a) => (
              <label key={a.id} className="mandar__actividad">
                <input type="radio" name="actividad" value={a.id} checked={act === a.id} onChange={() => setAct(a.id)} />
                <span className="aula__placa" style={{ background: a.placa }} aria-hidden="true" />
                <strong>
                  {a.numero} · {a.nombre}
                </strong>
                <small>{a.bajada}</small>
              </label>
            ))}
          </div>
        </fieldset>

        {/* key: al cambiar de actividad, las opciones vuelven a "todas marcadas" */}
        <div key={act} className="aulas__bloque mandar__grupo">
          {opcionesDe(act).map((o) => (
            <fieldset key={o.clave} className="mandar__grupo">
              <legend>{o.etiqueta}</legend>
              <div className="mandar__items">
                {o.items.map((i) => (
                  <label key={i.id} className="mandar__item" title={i.detalle}>
                    <input type="checkbox" name={`op:${o.clave}`} value={i.id} defaultChecked />
                    {i.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {desbloqueosDe(act).map((d) => (
            <fieldset key={d.clave} className="mandar__grupo">
              <legend>{d.etiqueta}</legend>
              <label className="mandar__item">
                <input type="radio" name={`des:${d.clave}`} value="inicio" defaultChecked />
                Disponible desde el principio
              </label>
              <label className="mandar__item">
                <input type="radio" name={`des:${d.clave}`} value="despues" />
                {t.despues}
              </label>
            </fieldset>
          ))}
          {opcionesDe(act).length === 0 && desbloqueosDe(act).length === 0 && <p className="aulas__bajada">Esta actividad no tiene opciones para elegir.</p>}
        </div>

        <p className={`aulas__mensaje ${estado.ok ? 'aulas__mensaje--ok' : ''}`} role="status" aria-live="polite">
          {mandando ? '' : estado.mensaje}
        </p>
        <div>
          <button className="btn btn--primario" type="submit" disabled={mandando}>
            {mandando ? t.enviando : t.boton}
          </button>
        </div>
      </form>
    </main>
  );
}
