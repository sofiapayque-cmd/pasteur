'use client';

import dynamic from 'next/dynamic';

// La app anterior usa localStorage, window, Canvas, etc.: se dibuja solo en el navegador.
const App = dynamic(() => import('../../AppCliente'), { ssr: false });

export function ClientOnly() {
  return <App />;
}
