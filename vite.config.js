import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' hace que la web funcione en cualquier carpeta o servidor,
// sin tener que configurar rutas absolutas.
export default defineConfig({
  plugins: [react()],
  base: './',
});
