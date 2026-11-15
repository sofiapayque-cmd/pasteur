import { ViewTransition, type ReactNode } from 'react';

/*
  CAMBIO SUAVE de una parte de la página (panel del equipo, 14/11).
  Cuando cambia `clave` (por ejemplo, la pestaña elegida en una lista), lo que
  había se desvanece rápido y lo nuevo aparece subiendo apenas, en vez de
  cambiar de golpe. Usa las transiciones de vista del navegador a través de
  <ViewTransition> de React; las animaciones (.eq-lista) están en equipo.css.
  En navegadores sin soporte, cambia como antes, sin animación.
*/
export default function CambioSuave({ clave, children }: { clave: string; children: ReactNode }) {
  return (
    <ViewTransition key={clave} enter="eq-lista" exit="eq-lista" default="none">
      {children}
    </ViewTransition>
  );
}
