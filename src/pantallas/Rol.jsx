import { useNavigate } from 'react-router-dom';
import Cabecera from '../components/Cabecera';

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
      <span className="rol__vertical">Institut Pasteur de Montevideo</span>
    </main>
  );
}
