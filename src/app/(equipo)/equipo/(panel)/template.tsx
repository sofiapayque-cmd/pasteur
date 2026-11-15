import { ViewTransition, type ReactNode } from 'react';

/*
  Transición entre secciones del panel del equipo (14/11, pedido de Sofia:
  "que cuando cambie de página la transición sea más smooth").
  La plantilla se vuelve a montar cada vez que se pasa a otra sección, así que
  la página vieja "sale" y la nueva "entra":
  · Desde el menú de arriba (Barra) la navegación lleva el tipo eq-derecha o
    eq-izquierda, según hacia dónde quede la sección nueva: el contenido se
    desliza un poco para ese lado, como la gota del menú.
  · Cualquier otra navegación (un link dentro de la página, volver atrás)
    hace un fundido suave.
  La barra de arriba queda quieta (ver equipo.css, "Transiciones entre
  páginas"). En navegadores sin soporte, cambia como antes.
*/
const TIPOS = { 'eq-derecha': 'eq-derecha', 'eq-izquierda': 'eq-izquierda', default: 'eq-funde' };

export default function Plantilla({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={TIPOS} exit={TIPOS} default="none">
      {children}
    </ViewTransition>
  );
}
