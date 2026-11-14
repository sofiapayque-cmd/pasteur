'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { salirEquipo } from '@/acciones/equipo';
import { NOMBRE_ROL, type Rol } from '@/lib/equipo/comun';

/* Barra de arriba del panel del equipo: secciones, quién entró y Salir. */
export default function Barra({
  nombre,
  rol,
  pendientes,
  respuestas,
  solicitudes = 0,
}: {
  nombre: string;
  rol: Rol;
  pendientes: number;
  respuestas: number;
  solicitudes?: number;
}) {
  const ruta = usePathname();
  const secciones = [
    { href: '/equipo', texto: 'Inicio', exacto: true },
    { href: '/equipo/respuestas', texto: 'Respuestas', cuenta: rol === 'validador' ? respuestas : 0 },
    { href: '/equipo/fichas', texto: 'Fichas' },
    { href: '/equipo/curiosidades', texto: 'Curiosidades' },
    ...(rol === 'validador' ? [{ href: '/equipo/revisar', texto: 'Para revisar', cuenta: pendientes }] : []),
    { href: '/equipo/biblioteca', texto: 'Biblioteca' },
    { href: '/equipo/asistente', texto: 'Prueba del asistente' },
    ...(rol === 'admin' ? [{ href: '/equipo/maestras', texto: 'Maestras', cuenta: solicitudes }, { href: '/equipo/miembros', texto: 'Equipo' }] : []),
  ];
  return (
    <header className="eq-barra">
      <Link className="eq-barra__marca" href="/equipo">
        La ciencia sin límites
        <small>PANEL DEL EQUIPO · INSTITUT PASTEUR</small>
      </Link>
      <nav className="eq-nav" aria-label="Secciones del panel">
        {secciones.map((s) => {
          const actual = s.exacto ? ruta === s.href : ruta.startsWith(s.href);
          return (
            <Link key={s.href} href={s.href} aria-current={actual ? 'page' : undefined}>
              {s.texto}
              {'cuenta' in s && s.cuenta ? <span className="eq-nav__cuenta">{s.cuenta}</span> : null}
            </Link>
          );
        })}
      </nav>
      <form action={salirEquipo} className="eq-barra__yo">
        <span>
          {nombre} · {NOMBRE_ROL[rol]}
        </span>
        <button className="btn btn--claro btn--chico" type="submit">
          Salir
        </button>
      </form>
    </header>
  );
}
