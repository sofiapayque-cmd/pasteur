'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { salirEquipo } from '@/acciones/equipo';
import { NOMBRE_ROL, type Rol } from '@/lib/equipo/comun';
import ConGota from '@/components/ConGota';

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
  /** Curiosidades esperando revisión (solo se muestra a la validadora) */
  pendientes: number;
  /** Respuestas esperando revisión (solo se muestra a la validadora) */
  respuestas: number;
  solicitudes?: number;
}) {
  const ruta = usePathname();
  // Desde el 15/11 (pedido de Sofia y Eugenia): Revisar junta Respuestas,
  // Fichas y Para revisar. Biblioteca, todas las fichas y la prueba del
  // asistente quedan como herramientas de la admin, en Inicio.
  // (`tambien`: otras páginas que cuentan como esa sección, para que la gota quede ahí)
  const secciones: { href: string; texto: string; exacto?: boolean; cuenta?: number; tambien?: string[] }[] = [
    { href: '/equipo', texto: 'Inicio', exacto: true, tambien: ['/equipo/biblioteca', '/equipo/asistente'] },
    { href: '/equipo/revisar', texto: 'Revisar', cuenta: rol === 'validador' ? respuestas : 0, tambien: ['/equipo/fichas', '/equipo/respuestas'] },
    { href: '/equipo/curiosidades', texto: 'Curiosidades', cuenta: rol === 'validador' ? pendientes : 0 },
    ...(rol === 'admin' ? [{ href: '/equipo/maestras', texto: 'Maestras', cuenta: solicitudes }, { href: '/equipo/miembros', texto: 'Equipo' }] : []),
  ];
  // Hacia qué lado queda cada sección respecto de la actual: el contenido de
  // la página nueva entra deslizándose desde ese lado (ver template.tsx)
  const esActual = (s: (typeof secciones)[number]) =>
    (s.exacto ? ruta === s.href : ruta.startsWith(s.href)) || Boolean(s.tambien?.some((t) => ruta.startsWith(t)));
  const aca = secciones.findIndex(esActual);
  const lado = (i: number) => (aca < 0 || i === aca ? undefined : [i > aca ? 'eq-derecha' : 'eq-izquierda']);
  return (
    // La barra queda quieta durante la transición entre páginas (equipo.css)
    <header className="eq-barra" style={{ viewTransitionName: 'eq-barra' }}>
      <Link className="eq-barra__marca" href="/equipo" transitionTypes={lado(0)}>
        La ciencia sin límites
        <small>PANEL DEL EQUIPO · INSTITUT PASTEUR</small>
      </Link>
      <ConGota className="eq-nav" etiqueta="Secciones del panel">
        {secciones.map((s, i) => {
          const actual = esActual(s);
          return (
            <Link key={s.href} href={s.href} aria-current={actual ? 'page' : undefined} transitionTypes={lado(i)}>
              {s.texto}
              {s.cuenta ? <span className="eq-nav__cuenta">{s.cuenta}</span> : null}
            </Link>
          );
        })}
      </ConGota>
      <form action={salirEquipo} className="eq-barra__yo">
        <span>
          {nombre}
          <small>{NOMBRE_ROL[rol]}</small>
        </span>
        <button className="btn btn--claro btn--chico" type="submit">
          Salir
        </button>
      </form>
    </header>
  );
}
