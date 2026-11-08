import Link from 'next/link';
import { aulasReales, equipoReal } from '@/lib/supabase/config';

/*
  PIE "ACCESOS INSTITUCIONALES" (pedido de Sofia, 8/11).
  En todas las páginas públicas: inicio, elegir rol, laboratorios y fichas
  (sin sesión) y las pantallas de ingreso. Lleva a los ingresos que ya
  existen (/maestra/entrar y /equipo/entrar): no duplica nada.
  Hasta ahora la web no tenía footer: es una franja fina con los colores y
  las letras de siempre. Sin el sistema real, esos ingresos no existen y el
  pie no se muestra.
  No usa hooks: sirve igual en pantallas del servidor y del navegador.
*/
export default function PieInstitucional() {
  if (!aulasReales && !equipoReal) return null;
  return (
    <footer className="pie-inst">
      <nav className="pie-inst__nav" aria-label="Accesos institucionales">
        <span className="pie-inst__titulo">Accesos institucionales</span>
        {aulasReales && (
          <Link className="pie-inst__enlace" href="/maestra/entrar">
            Acceso docentes
          </Link>
        )}
        {equipoReal && (
          <Link className="pie-inst__enlace" href="/equipo/entrar">
            Acceso investigadores
          </Link>
        )}
      </nav>
    </footer>
  );
}
