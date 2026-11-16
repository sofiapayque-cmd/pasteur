'use client';

import { useLayoutEffect, useRef, type ComponentProps } from 'react';

/*
  VENTANA: el <dialog> del navegador, abierto con showModal(). El navegador ya
  hace lo que antes cada ventana hacía a mano: la pone arriba de todo, deja el
  fondo sin tocar (ni con el mouse ni con Tab) y la cierra con Esc.
  · onCerrar: avisa que se cerró con Esc (o con un clic en el fondo, si
    cerrarAfuera). Sin onCerrar, Esc no la cierra: la pausa la cierra la maestra.
  · Los estilos de base están en base.css (.ventana).
*/
type Props = ComponentProps<'dialog'> & { onCerrar?: () => void; cerrarAfuera?: boolean };

export default function Ventana({ onCerrar, cerrarAfuera, className = '', children, ...resto }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const antes = useRef<HTMLElement | null>(null);

  // Se abre apenas aparece, antes de pintarse (así no parpadea). Al irse, el
  // foco vuelve a donde estaba (por ejemplo, al botón que la abrió).
  useLayoutEffect(() => {
    if (!ref.current?.open) {
      antes.current = document.activeElement as HTMLElement | null;
      ref.current?.showModal();
    }
    return () => queueMicrotask(() => antes.current?.focus()); // cuando ya no está
  }, []);

  // Solo los avisos de esta ventana, no los de una ventana de adentro
  const propio = (e: { target: EventTarget; currentTarget: EventTarget }) => e.target === e.currentTarget;

  return (
    <dialog
      ref={ref}
      className={`ventana ${className}`}
      {...resto}
      onCancel={(e) => propio(e) && !onCerrar && e.preventDefault()}
      // Si el navegador la cierra igual (Esc dos veces seguidas), sin onCerrar se vuelve a abrir
      onClose={(e) => propio(e) && (onCerrar ? onCerrar() : ref.current?.showModal())}
      onClick={(e) => cerrarAfuera && propio(e) && onCerrar?.()}
    >
      {children}
    </dialog>
  );
}
