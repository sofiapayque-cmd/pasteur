import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/*
  Reglas de calidad (configuración oficial de Next.js para ESLint).
  Correr con: npm run lint
*/
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // El proyecto escribe textos en español con comillas y signos: no hace falta escaparlos.
      'react/no-unescaped-entities': 'off',

      // Reglas nuevas del React Compiler (React 19). Marcan patrones que hoy funcionan bien
      // pero que conviene cambiar para que el compilador pueda optimizar: refs leídas al dibujar,
      // setState dentro de efectos, Date.now() al dibujar, etc. Casi todos están en las
      // simulaciones (A2, A3, A4), que no se reescriben durante la migración.
      // Quedan como avisos (visibles) en vez de errores; ver docs/MIGRACION.md.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'dist/**', 'next-env.d.ts']),
]);

export default eslintConfig;
