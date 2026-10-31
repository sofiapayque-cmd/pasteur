import { ClientOnly } from './client';

/*
  ETAPA 1 de la migración: una sola página que atrapa todas las rutas
  y monta la aplicación anterior entera del lado del cliente (como SPA).
  En la etapa 3 cada pantalla pasa a tener su propia carpeta en app/.
*/
export default function Page() {
  return <ClientOnly />;
}
