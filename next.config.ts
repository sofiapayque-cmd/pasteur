import type { NextConfig } from 'next';

/*
  Configuración de Next.js.
  - Sin `output: 'export'`: la plataforma va a necesitar funciones de servidor
    (cuentas docentes, aulas, Supabase).
  - reactStrictMode: en desarrollo monta dos veces los componentes para
    detectar efectos mal limpiados (igual que el React.StrictMode que teníamos).
*/
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
