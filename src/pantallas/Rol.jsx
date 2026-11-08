'use client';

import { useNavigate } from '@/navegacion';
import Cabecera from '../components/Cabecera';
import PieInstitucional from '../components/PieInstitucional';
import { equipoReal } from '@/lib/supabase/config';

/* 02 · ¿QUIÉN EXPLORA? — fondo de textura celular (después va la imagen del Frame 2). */
export default function Rol() {
  const navegar = useNavigate();
  return (
    <main className="pantalla rol anim-entrar">
      <Cabecera volverA="/" />
      <div className="rol__cartel">
        <h1>¿Quién explora hoy?</h1>
        <p>Elegí cómo querés entrar a la experiencia.</p>
      </div>
      <div className="rol__opciones">
        <button className="rol__celula" onClick={() => navegar('/maestra')}>
          <span className="rol__celula-titulo">Soy maestra/o</span>
          <span className="rol__celula-texto">Preparo y guío la clase</span>
        </button>
        <button className="rol__celula rol__celula--nino" onClick={() => navegar('/clase')}>
          <span className="rol__celula-titulo">Soy niña o niño</span>
          <span className="rol__celula-texto">Entro con el código de mi clase</span>
        </button>
      </div>
      {/* Acceso del equipo científico (8/11): junto a maestras y chicos, pero más chico */}
      {equipoReal && (
        <a className="rol__equipo" href="/equipo/entrar">
          ¿Sos investigadora o investigador del Pasteur? <b>Acceso investigadores</b>
        </a>
      )}
      <span className="rol__vertical">Institut Pasteur de Montevideo</span>
      <PieInstitucional />
    </main>
  );
}
