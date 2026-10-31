import { HashRouter } from 'react-router-dom';
import App from './App';

/*
  Punto de entrada de la app anterior dentro de Next.js (reemplaza a main.jsx).
  HashRouter usa direcciones con # (ej. .../#/maestra); en la etapa 3 se
  reemplaza por el App Router de Next.js.
*/
export default function AppCliente() {
  return (
    <HashRouter>
      <App />
    </HashRouter>
  );
}
