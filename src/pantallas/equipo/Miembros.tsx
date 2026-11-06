'use client';

import { useActionState, useState, useTransition } from 'react';
import { cambiarEstado, cambiarRol, invitarMiembro, linkNuevo, type Estado } from '@/acciones/equipo';
import { NOMBRE_ESTADO, NOMBRE_ROL, fecha, type Rol } from '@/lib/equipo/comun';

/*
  Equipo (solo la admin): invitar, cambiar rol, suspender y dar un link nuevo.
  Las invitaciones son un LINK que la admin copia y le manda a la persona
  (por WhatsApp o su mail): el servidor de mail de Supabase no le escribe a
  gente de afuera de la organización. El link vale una vez y vence.
*/
type MiembroFila = { id: string; nombre_visible: string; laboratorio: string; rol: Rol; estado: 'activa' | 'suspendida'; creado_en: string };
type InvitacionFila = { id: string; email: string; rol: Rol; nombre_visible: string; creada_en: string; usada_en: string | null };

function LinkParaCopiar({ estado }: { estado: Estado }) {
  const [copiado, setCopiado] = useState(false);
  if (!estado.link) return null;
  return (
    <div className="eq-caja eq-caja--ok eq-form">
      <strong>{estado.mensaje}</strong>
      <p className="eq-ayuda">
        Mandáselo a {estado.email} ahora: vale una sola vez y vence (por defecto, en 1 hora). Al abrirlo elige su contraseña. No lo compartas con nadie más: es como una llave.
      </p>
      <p className="eq-link">{estado.link}</p>
      <div className="eq-botones">
        <button
          className="btn btn--primario btn--chico"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(estado.link!);
            setCopiado(true);
          }}
        >
          {copiado ? 'Copiado' : 'Copiar link'}
        </button>
      </div>
    </div>
  );
}

function FilaMiembro({ m, yo }: { m: MiembroFila; yo: string }) {
  const [estadoRol, accionRol, cambiando] = useActionState<Estado, FormData>(cambiarRol.bind(null, m.id), { mensaje: '' });
  const [aviso, setAviso] = useState<Estado>({ mensaje: '' });
  const [pendiente, empezar] = useTransition();
  const soyYo = m.id === yo;
  return (
    <tr>
      <td>
        <strong>{m.nombre_visible || 'Sin nombre'}</strong>
        {soyYo && ' (vos)'}
        <span className="eq-tabla__chico">
          {m.laboratorio || '—'} · desde {fecha(m.creado_en)}
        </span>
        {(aviso.mensaje || estadoRol.mensaje) && !aviso.link && <span className="eq-tabla__chico">{aviso.mensaje || estadoRol.mensaje}</span>}
        <LinkParaCopiar estado={aviso} />
      </td>
      <td>
        {soyYo ? (
          NOMBRE_ROL[m.rol]
        ) : (
          <form action={accionRol} className="eq-botones">
            <select className="campo__entrada" name="rol" defaultValue={m.rol} aria-label="Rol">
              {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
                <option key={r} value={r}>
                  {NOMBRE_ROL[r]}
                </option>
              ))}
            </select>
            <button className="btn btn--claro btn--chico" type="submit" disabled={cambiando}>
              Cambiar
            </button>
          </form>
        )}
      </td>
      <td>
        <span className={`eq-estado eq-estado--${m.estado}`}>{NOMBRE_ESTADO[m.estado]}</span>
      </td>
      <td>
        {!soyYo && (
          <div className="eq-botones">
            <button className="btn btn--claro btn--chico" type="button" disabled={pendiente} onClick={() => empezar(async () => setAviso(await linkNuevo(m.id)))}>
              Link nuevo
            </button>
            <button
              className="btn btn--claro btn--chico"
              type="button"
              disabled={pendiente}
              onClick={() => {
                const nuevo = m.estado === 'activa' ? 'suspendida' : 'activa';
                if (nuevo === 'suspendida' && !window.confirm('¿Suspender? Deja de poder entrar en el momento. Lo que ya aprobó sigue valiendo.')) return;
                empezar(async () => setAviso(await cambiarEstado(m.id, nuevo)));
              }}
            >
              {m.estado === 'activa' ? 'Suspender' : 'Reactivar'}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Miembros({ miembros, invitaciones, yo }: { miembros: MiembroFila[]; invitaciones: InvitacionFila[]; yo: string }) {
  const [estado, invitar, invitando] = useActionState<Estado, FormData>(invitarMiembro, { mensaje: '' });
  const pendientes = invitaciones.filter((i) => !i.usada_en);
  return (
    <>
      <section className="eq-caja">
        <h2>Invitar</h2>
        <p className="eq-ayuda">
          Se genera un link para que la persona entre y elija su contraseña. Una cuenta del equipo no puede ser también de maestra: si ya usa su mail como maestra, invitala con
          otro (por ejemplo, el mismo con <code>+equipo</code> antes de la @).
        </p>
        <form action={invitar} className="eq-form">
          <div className="eq-fila">
            <label className="campo">
              <span className="campo__nombre">Mail</span>
              <input className="campo__entrada" type="email" name="email" required maxLength={254} defaultValue={estado.ok ? '' : estado.email} />
            </label>
            <label className="campo">
              <span className="campo__nombre">Rol</span>
              <select className="campo__entrada" name="rol" defaultValue="validador">
                <option value="validador">Validadora (científica: revisa y aprueba)</option>
                <option value="redactor">Redactora (escribe y manda a revisión)</option>
                <option value="admin">Admin (invita y administra; no aprueba)</option>
              </select>
            </label>
          </div>
          <div className="eq-fila">
            <label className="campo">
              <span className="campo__nombre">Nombre (opcional)</span>
              <input className="campo__entrada" name="nombre" maxLength={120} />
            </label>
            <label className="campo">
              <span className="campo__nombre">Laboratorio o área (opcional)</span>
              <input className="campo__entrada" name="laboratorio" maxLength={160} />
            </label>
          </div>
          <div className="eq-botones">
            <button className="btn btn--primario btn--chico" type="submit" disabled={invitando}>
              {invitando ? 'Generando link…' : 'Generar link de invitación'}
            </button>
            {estado.mensaje && !estado.link && <p className="eq-mensaje eq-mensaje--error">{estado.mensaje}</p>}
          </div>
        </form>
        <LinkParaCopiar estado={estado} />
      </section>

      <section className="eq-caja">
        <h2>Equipo ({miembros.length})</h2>
        <table className="eq-tabla">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => (
              <FilaMiembro key={m.id} m={m} yo={yo} />
            ))}
          </tbody>
        </table>
        <p className="eq-ayuda">“Link nuevo” sirve si alguien olvidó la contraseña o se le venció la invitación.</p>
      </section>

      {pendientes.length > 0 && (
        <section className="eq-caja">
          <h2>Invitaciones sin usar</h2>
          <ul className="eq-lista">
            {pendientes.map((i) => (
              <li key={i.id} className="eq-tabla__chico">
                {i.email} · {NOMBRE_ROL[i.rol]} · {fecha(i.creada_en)} · para generar el link otra vez, invitala de nuevo con el mismo mail.
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
