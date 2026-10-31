import { useNavigate } from 'react-router-dom';
import Cabecera from '../../components/Cabecera';
import FondoVivo from '../../components/FondoVivo';
import Moli from '../../components/Moli';
import { ACTIVIDADES } from '../../data/contenido';

/* EXPLORAR SIN SALA: elegir cualquier actividad para hacerla solo. */
export default function Explorar() {
  const navegar = useNavigate();
  return (
    <main className="pantalla panel">
      <FondoVivo semilla={11} />
      <Cabecera volverA="/clase" miga="Explorar sin sala" />
      <div className="panel__cabeza">
        <div className="panel__intro">
          <span className="etiqueta">Modo individual</span>
          <h1>¿Qué querés investigar?</h1>
          <p>Elegí un laboratorio. Lo que hagas queda guardado en esta pestaña.</p>
        </div>
        <div className="panel__moli">
          <p className="globo-moli__texto">Podés equivocarte todas las veces que quieras: así se investiga.</p>
          <Moli animo="eureka" estilo="plano" patas tamano={110} />
        </div>
      </div>
      <ul className="panel__actividades">
        {ACTIVIDADES.filter((a) => a.disponible).map((a, i) => (
          <li key={a.id} className="panel__actividad anim-crecer" style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
            <button className="panel__placa panel__placa--boton" style={{ background: a.placa }} onClick={() => navegar(`/explorar/${a.id}`)} aria-label={`Entrar a ${a.nombre}`} />
            <span className="etiqueta">Laboratorio {a.numero}</span>
            <h2 className="panel__nombre">{a.nombre}</h2>
            <p className="panel__bajada">{a.bajada}</p>
            <button className="btn btn--experimentar" onClick={() => navegar(`/explorar/${a.id}`)}>
              Entrar
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
