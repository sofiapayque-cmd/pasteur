import type { Metadata, Viewport } from 'next';
import LinkDeMail from '@/components/LinkDeMail';

// Fuentes incluidas en la web (no dependen de internet: sirven en las Ceibal sin conexión)
import '@fontsource-variable/lexend'; // interfaz
import '@fontsource/ibm-plex-mono/400.css'; // etiquetas
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/the-girl-next-door/400.css'; // notas del cuaderno
import '@fontsource-variable/bricolage-grotesque'; // titulares

// Estilos globales del sistema visual (mismo orden que tenía main.jsx)
import '@/styles/tokens.css';
import '@/styles/base.css';
// Estilos de cada pantalla. Cada archivo vive en la carpeta de su pantalla,
// pero se cargan todos acá y en este orden: si se cambia el orden, algunas
// reglas se pisan distinto y la web se ve diferente.
import '@/styles/compartido.css';
import '@/pantallas/Inicio/inicio.css';
import '@/pantallas/maestra/Panel/panel.css';
import '@/pantallas/maestra/Preparar/preparar.css';
import '@/pantallas/maestra/SalaEspera/sala-espera.css';
import '@/pantallas/maestra/Tablero/tablero.css';
import '@/pantallas/maestra/Puesta/puesta.css';
import '@/pantallas/nino/Entrar/entrar.css';
import '@/pantallas/nino/Apodo/apodo.css';
import '@/pantallas/nino/Espera/espera.css';
import '@/pantallas/nino/EnClase/en-clase.css';
import '@/styles/pantallas-angostas.css';
import '@/styles/base-actividades.css';
import '@/components/VolverMaestra.css';
import '@/pantallas/maestra/acceso/acceso.css';
import '@/components/MarcoActividad.css';
import '@/pantallas/maestra/aulas/clase-en-vivo.css';
import '@/components/PreguntasDelPasteur.css';
import '@/pantallas/nino/Explorar/ficha.css';
import '@/components/PieInstitucional.css';
import '@/components/Curiosidades.css';
import '@/styles/relieve.css'; // profundidad y esquinas redondeadas (14/11)

export const metadata: Metadata = {
  title: 'La ciencia sin límites · Institut Pasteur de Montevideo',
  description: 'Ecosistema digital de ciencia para niñas y niños de 10 a 12 años, con experiencias de los laboratorios del Institut Pasteur de Montevideo.',
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
        <LinkDeMail />
      </body>
    </html>
  );
}
