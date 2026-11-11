'use client';

import { aulasReales } from '@/lib/supabase/config';
import HeroEditorial from '@/components/hero/HeroEditorial';

/*
  01 · INICIO
  Portada ilustrada (src/components/hero). «Comenzá a experimentar» y la lupa
  llevan a "¿Quién explora hoy?" (/rol).
  Se conserva "Pedí acceso". Sin logo del Institut Pasteur (pedido de Sofia, 11/11).
*/
export default function Inicio() {
  return (
    <main className="pantalla inicio">
      <HeroEditorial />
      {/* Para escuelas o maestras que nos encuentran (pedido de Sofia, 6/11).
          data-hero-evitar: las células de la portada no pasan por debajo */}
      {aulasReales && (
        <a className="inicio__acceso" href="/pedir-acceso" data-hero-evitar>
          ¿Sos maestra o trabajás en una escuela? <b>Pedí acceso</b>
        </a>
      )}
    </main>
  );
}
