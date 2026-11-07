'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
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
*/
export default function MandarActividad({
  aula,
  cuenta,
  accion,
}: {
  aula: { id: string; nombre: string };
  cuenta: string;
  accion: (previo: EstadoTareaForm, datos: FormData) => Promise<EstadoTareaForm>;
}) {
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
      <Cabecera volverA={`/maestra/aulas/${aula.id}`} miga={`Inicio › Mis aulas › ${aula.nombre} › Mandar una actividad`} derecha={<CuentaDocente nombre={cuenta} />} />
      <form className="aulas__cuerpo" onSubmit={enviar}>
        <div>
          <h1>Mandar una actividad</h1>
          <p className="aulas__bajada">Aparece en el laboratorio de cada chico de {aula.nombre}. Su avance se guarda solo, y vos ves cómo va cada uno.</p>
        </div>

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
                Lo habilito yo después (desde la tarea)
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
            {mandando ? 'Mandando…' : 'Mandar al aula'}
          </button>
        </div>
      </form>
    </main>
  );
}
