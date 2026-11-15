'use client';

import { useNavigate } from '@/navegacion';
import Cabecera from '../../components/Cabecera';
import FondoVivo from '../../components/FondoVivo';
import Moli from '../../components/Moli';
import { ACTIVIDADES } from '../../data/contenido';
import PieInstitucional from '../../components/PieInstitucional';

/*
  EXPLORAR: los laboratorios.
  - Con sesión (alumno, maestra o equipo): elegir cualquier actividad para hacerla solo.
  - visitante (sin sesión, 8/11): las mismas tarjetas, para ver de qué se trata
    cada una. Cada tarjeta lleva a la ficha pública; la actividad no se puede hacer.
*/
/** @param {{ visitante?: boolean }} props */
export default function Explorar({ visitante = false }) {
  const navegar = useNavigate();
  const accion = visitante ? 'Ver de qué se trata' : 'Entrar';
  return (
    <main className="pantalla panel">
      <FondoVivo semilla={11} />
      <Cabecera volverA={visitante ? '/rol' : '/clase'} miga={visitante ? 'Los laboratorios' : 'Explorar sin sala'} />
      <div className="panel__cabeza">
        {visitante ? (
          <div className="panel__intro">
            <span className="etiqueta">Los laboratorios</span>
            <h1>¿Qué se investiga en cada uno?</h1>
            <p>Mirá de qué se trata cada laboratorio. Para hacer las actividades, entrá con tu tarjeta o con tu cuenta docente.</p>
          </div>
        ) : (
          <div className="panel__intro">
            <span className="etiqueta">Modo individual</span>
            <h1>¿Qué querés investigar?</h1>
            <p>Elegí un laboratorio. Lo que hagas queda guardado en esta pestaña.</p>
          </div>
        )}
        <div className="panel__moli">
          <p className="globo-moli__texto">
            {visitante ? 'Cada laboratorio es una investigación distinta.' : 'Podés equivocarte todas las veces que quieras: así se investiga.'}
          </p>
          <Moli animo="eureka" estilo="plano" patas tamano={110} />
        </div>
      </div>
      <ul className="panel__actividades">
        {ACTIVIDADES.filter((a) => a.disponible).map((a, i) => (
          <li key={a.id} className="panel__actividad anim-crecer" style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
            <button
              className="panel__placa panel__placa--boton"
              style={{ background: a.placa }}
              onClick={() => navegar(`/explorar/${a.id}`)}
              aria-label={`${accion}: ${a.nombre}`}
            />
            <span className="etiqueta">Laboratorio {a.numero}</span>
            <h2 className="panel__nombre">{a.nombre}</h2>
            <p className="panel__bajada">{a.bajada}</p>
            <button className={visitante ? 'btn btn--claro' : 'btn btn--experimentar'} onClick={() => navegar(`/explorar/${a.id}`)}>
              {accion}
            </button>
          </li>
        ))}
      </ul>
      {visitante && <PieInstitucional />}
    </main>
  );
}
