'use client';

import { aulasReales } from '@/lib/supabase/config';
import HeroEditorial from '@/components/hero/HeroEditorial';

/*
  01 · INICIO
  Portada ilustrada (src/components/hero). «Comenzá a experimentar» y la lupa
  llevan a "¿Quién explora hoy?" (/rol).
  Se conservan el lugar del logo y "Pedí acceso".
*/
export default function Inicio() {
  return (
    <main className="pantalla inicio">
      <HeroEditorial />
      <div className="logo-pendiente inicio__logo">[Logo Institut Pasteur]</div>
      {/* Para escuelas o maestras que nos encuentran (pedido de Sofia, 6/11) */}
      {aulasReales && (
        <a className="inicio__acceso" href="/pedir-acceso">
          ¿Sos maestra o trabajás en una escuela? <b>Pedí acceso</b>
        </a>
      )}
    </main>
  );
}
