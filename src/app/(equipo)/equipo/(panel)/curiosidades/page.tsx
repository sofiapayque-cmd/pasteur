import { exigirMiembro } from '@/datos/equipo';
import { MINIMO_POR_TEMA, panelCuriosidades } from '@/datos/curiosidadesEquipo';
import PanelCuriosidades from '@/pantallas/equipo/PanelCuriosidades';

/*
  /equipo/curiosidades · Curiosidades según lo más consultado (etapa 4 de
  "Ajustes de producto"). Pedir borradores a la IA tarda: por eso maxDuration.
*/
export const maxDuration = 300;

export default async function Page() {
  const yo = await exigirMiembro();
  const { temas, tendencia, curiosidades, sinTema } = await panelCuriosidades();
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Curiosidades</h1>
        <p className="eq-bajada">
          Los &quot;¿Sabías que…?&quot; que ven los chicos en la sala de espera, la maestra en su panel y los visitantes en las fichas de las actividades. Se eligen
          siguiendo los temas que más se consultan. Solo se muestran las aprobadas por una validadora.
        </p>
      </div>
      <PanelCuriosidades rol={yo.rol} temas={temas} tendencia={tendencia} curiosidades={curiosidades} sinTema={sinTema} minimo={MINIMO_POR_TEMA} />
    </main>
  );
}
