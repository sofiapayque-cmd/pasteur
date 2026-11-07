'use client';

import { startTransition, useActionState, useState, useTransition, type FormEvent } from 'react';
import { descartarSolicitud, invitarDesdeSolicitud, invitarMaestra, type EstadoInvitacion } from '@/acciones/acceso';
import type { SolicitudAcceso } from '@/datos/solicitudes';
import { CARGOS } from '@/lib/aulas/acceso';

/*
  /equipo/maestras · Pedidos de acceso y maestras invitadas (solo la admin).
  Invitar crea la cuenta y muestra un link de un solo uso para mandarle a la
  maestra (con un mensaje listo para copiar), hasta que haya mail propio.
*/
const fecha = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' });
const nombreCargo = (c: string) => CARGOS.find((x) => x.id === c)?.nombre ?? c;

function mensajeParaMandar(nombre: string | undefined, link: string) {
  return `Hola${nombre ? ` ${nombre.split(' ')[0]}` : ''}:\n\nYa tenés tu cuenta en La ciencia sin límites (Institut Pasteur de Montevideo). Entrá con este link para elegir tu contraseña:\n\n${link}\n\nEl link sirve una sola vez. Después entrás siempre desde la página con tu mail y tu contraseña.\n\n¡Bienvenida!`;
}

function LinkListo({ estado }: { estado: EstadoInvitacion }) {
  const [copiado, setCopiado] = useState('');
  if (!estado.link) return null;
  const texto = mensajeParaMandar(estado.nombre, estado.link);
  const copiar = async (t: string, que: string) => {
    try {
      await navigator.clipboard.writeText(t);
      setCopiado(que);
    } catch {
      setCopiado('');
    }
  };
  return (
    <div className="eq-caja eq-caja--ok eq-form">
      <p style={{ margin: 0 }}>
        <strong>{estado.mensaje}</strong> Para {estado.email}. Se muestra una sola vez: copialo ahora.
      </p>
      <textarea className="campo__entrada" readOnly rows={8} value={texto} style={{ height: 'auto', fontSize: 14 }} />
      <div className="eq-botones">
        <button className="btn btn--primario btn--chico" type="button" onClick={() => copiar(texto, 'mensaje')}>
          {copiado === 'mensaje' ? 'Mensaje copiado' : 'Copiar el mensaje'}
        </button>
        <button className="btn btn--secundario btn--chico" type="button" onClick={() => copiar(estado.link!, 'link')}>
          {copiado === 'link' ? 'Link copiado' : 'Copiar solo el link'}
        </button>
      </div>
    </div>
  );
}

function Pedido({ s }: { s: SolicitudAcceso }) {
  const [estado, setEstado] = useState<EstadoInvitacion>({ mensaje: '' });
  const [pendiente, hacer] = useTransition();
  return (
    <li className="eq-caja eq-form">
      <div className="eq-fila" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ margin: 0 }}>{s.nombre}</h3>
        <span className="eq-ayuda">{fecha.format(new Date(s.creada_en))}</span>
      </div>
      <p className="eq-meta">
        <span>{nombreCargo(s.cargo)}</span>
        <span>{s.escuela}</span>
        <span>{s.departamento}</span>
        {s.grados && <span>{s.grados}°</span>}
        <span>{s.email}</span>
      </p>
      {s.mensaje && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>“{s.mensaje}”</p>}
      {estado.link ? (
        <LinkListo estado={estado} />
      ) : (
        <div className="eq-botones">
          <button className="btn btn--primario btn--chico" type="button" disabled={pendiente} onClick={() => hacer(async () => setEstado(await invitarDesdeSolicitud(s.id)))}>
            {pendiente ? 'Creando la cuenta…' : 'Invitar'}
          </button>
          <button className="btn btn--claro btn--chico" type="button" disabled={pendiente} onClick={() => hacer(() => descartarSolicitud(s.id))}>
            Descartar
          </button>
        </div>
      )}
      {estado.mensaje && !estado.link && <p className="eq-mensaje eq-mensaje--error">{estado.mensaje}</p>}
    </li>
  );
}

export default function Solicitudes({ pendientes, resueltas }: { pendientes: SolicitudAcceso[]; resueltas: SolicitudAcceso[] }) {
  const [estado, invitar, invitando] = useActionState<EstadoInvitacion, FormData>(invitarMaestra, { mensaje: '' });
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => invitar(datos));
  };
  return (
    <>
      <section className="eq-form" aria-labelledby="pedidos">
        <h2 id="pedidos">Pedidos de acceso ({pendientes.length})</h2>
        {pendientes.length === 0 ? (
          <p className="eq-caja eq-bajada">No hay pedidos esperando. Llegan desde el botón “Pedir acceso” del inicio.</p>
        ) : (
          <ul className="eq-lista">
            {pendientes.map((s) => (
              <Pedido key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>

      <section className="eq-caja eq-form" aria-labelledby="invitar">
        <div>
          <h2 id="invitar">Invitar a una maestra</h2>
          <p className="eq-bajada">Para una maestra que no pasó por el formulario. Se crea su cuenta y te damos el link para mandarle.</p>
        </div>
        <form className="eq-form" onSubmit={enviar}>
          <div className="eq-fila">
            <label className="campo" style={{ flex: '1 1 240px' }}>
              <span className="campo__nombre">Mail</span>
              <input className="campo__entrada" name="email" type="email" required autoComplete="off" />
            </label>
            <label className="campo" style={{ flex: '1 1 240px' }}>
              <span className="campo__nombre">Nombre (para el mensaje)</span>
              <input className="campo__entrada" name="nombre" maxLength={120} autoComplete="off" />
            </label>
          </div>
          <div>
            <button className="btn btn--primario btn--chico" type="submit" disabled={invitando}>
              {invitando ? 'Creando la cuenta…' : 'Crear cuenta e invitar'}
            </button>
          </div>
          {estado.link ? <LinkListo estado={estado} /> : estado.mensaje && <p className="eq-mensaje eq-mensaje--error">{estado.mensaje}</p>}
        </form>
      </section>

      {resueltas.length > 0 && (
        <details className="eq-caja eq-detalles">
          <summary>Últimos pedidos resueltos</summary>
          <ul className="eq-lista" style={{ marginTop: 12 }}>
            {resueltas.map((s) => (
              <li key={s.id} className="eq-tabla__chico">
                {s.nombre} · {s.escuela} ({s.departamento}) · {s.estado === 'invitada' ? 'invitada' : 'descartado'}
                {s.resuelta_en ? ` el ${fecha.format(new Date(s.resuelta_en))}` : ''}
              </li>
            ))}
          </ul>
          <p className="eq-ayuda">Los pedidos resueltos se borran solos a los 180 días.</p>
        </details>
      )}
    </>
  );
}
