import type { Metadata, Viewport } from 'next';

// Fuentes incluidas en la web (no dependen de internet: sirven en las Ceibal sin conexión)
import '@fontsource-variable/lexend'; // interfaz
import '@fontsource/ibm-plex-mono/400.css'; // etiquetas
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/the-girl-next-door/400.css'; // notas del cuaderno
import '@fontsource-variable/bricolage-grotesque'; // titulares

// Estilos globales del sistema visual (mismo orden que tenía main.jsx)
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/pantallas.css';

export const metadata: Metadata = {
  title: 'La ciencia sin límites · Institut Pasteur de Montevideo',
  description: 'Ecosistema digital de ciencia para niños de 7 a 11 años, con experiencias de los laboratorios del Institut Pasteur de Montevideo.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
