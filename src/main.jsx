import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
// Letra del cuaderno de laboratorio, incluida en la web (no depende de internet)
import '@fontsource/the-girl-next-door/400.css';
// Titulares: Bricolage Grotesque (variable), también incluida en la web
import '@fontsource-variable/bricolage-grotesque';
import './styles/tokens.css';
import './styles/base.css';
import './styles/pantallas.css';

// HashRouter usa direcciones con # (ej. .../#/maestra). Así la web funciona
// en cualquier servidor sin configuración extra.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
