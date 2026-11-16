import { exigirMiembro } from '@/datos/equipo';
import { MINIMO_POR_TEMA, panelCuriosidades } from '@/datos/curiosidadesEquipo';
import PanelCuriosidades from '@/pantallas/equipo/PanelCuriosidades';

/*
  /equipo/curiosidades · Curiosidades según lo más consultado (etapa 4 de
  "Ajustes de producto"; automáticas desde el 15/11). "Actualizar ahora" le
  pide a la IA: por eso maxDuration.
*/
export const maxDuration = 300;

export default async function Page() {
  const yo = await exigirMiembro();
  const { temas, tendencia, curiosidades, sinTema, automaticas, estadoAutomaticas } = await panelCuriosidades();
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Curiosidades</h1>
        <p className="eq-bajada">
          Los &quot;¿Sabías que…?&quot; que ven los chicos en la sala de espera, la maestra en su panel y los visitantes en las fichas de las actividades. Se arman
          solas con frases de respuestas ya aprobadas por una validadora, y se eligen siguiendo los temas que más se consultan.
        </p>
      </div>
      <PanelCuriosidades
        rol={yo.rol}
        temas={temas}
        tendencia={tendencia}
        curiosidades={curiosidades}
        sinTema={sinTema}
        minimo={MINIMO_POR_TEMA}
        automaticas={automaticas}
        estadoAutomaticas={estadoAutomaticas}
      />
    </main>
  );
}
