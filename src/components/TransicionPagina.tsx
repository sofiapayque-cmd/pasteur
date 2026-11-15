import { ViewTransition, type ReactNode } from 'react';

/*
  TRANSICIÓN ENTRE PÁGINAS de toda la web (14/11, pedido de Sofia: que el
  cambio de página sea suave, como en el panel del equipo).
  Se usa como template.tsx en cada parte de la web (inicio, maestra, aulas,
  clase, laboratorio, explorar): la plantilla se vuelve a montar al pasar a
  otra página, así la vieja se desvanece rápido y la nueva aparece subiendo
  apenas. Liviana para las Ceibal: solo opacidad y un corrimiento corto (los
  estilos .pagina están en styles/relieve.css). Las transiciones de las
  pantallas internas de las actividades no pasan por acá.
  En navegadores sin soporte, cambia como antes.
*/
export default function TransicionPagina({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="pagina" exit="pagina" default="none">
      {children}
    </ViewTransition>
  );
}
