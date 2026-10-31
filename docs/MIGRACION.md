# Migración de Vite a Next.js

Rama de trabajo: `migracion/nextjs`. La versión Vite queda intacta en `version-vite` (y el tag `vite-v1`).
Plan completo y diagnóstico: documento "Migración de Vite a Next.js" del proyecto Pasteur.

## Etapas

| Etapa | Qué | Estado |
| --- | --- | --- |
| 0 | Git, rama, línea de base | Hecha |
| 1 | Next.js 16 + React 19 + TypeScript como SPA (guía oficial) | Hecha |
| 2 | ESLint de Next, tipos base, alias `@/`, arreglo de errores previos | Hecha |
| 3 | App Router: una carpeta por pantalla, se quita react-router | Pendiente |
| 4 | Navegador y Canvas: solo en cliente, sin errores de hidratación | Pendiente |
| 5 | Supabase SSR preparado (sin base completa) | Pendiente |
| 6 | Verificación final y Vercel | Pendiente |

## Comandos

- `npm run dev` — desarrollo en http://localhost:3000
- `npm run build` — compila para producción
- `npm start` — sirve lo compilado (como en Vercel)
- `npm run lint` — ESLint (configuración oficial de Next.js)
- `npm run typecheck` — TypeScript

## TypeScript

- El código nuevo va en TypeScript (`src/app`, `src/tipos`, y lo que venga).
- Los `.jsx` y `.js` existentes siguen igual (`allowJs`); se pasan a TypeScript de a poco, sin reescribir las simulaciones.
- `src/tipos/` describe la sala, el progreso y las actividades. `src/tipos/verificacion.ts` comprueba que los datos reales cumplen esos tipos: si cambia la forma de una actividad, `npm run typecheck` avisa.
- Alias `@/` = `src/` (ej. `import { ACTIVIDADES } from '@/data/contenido'`).

## Errores previos a la migración (estado)

1. Vulnerabilidades de react-router 6.30.1 — se resuelven en la etapa 3.
2. Avisos "Future Flag" de React Router — se resuelven en la etapa 3.
3. Fuentes desde Google Fonts — resuelto en la etapa 1 (fontsource, sirven sin internet).
4. 6 variables sin usar — resuelto en la etapa 2.
5. 2 avisos de dependencias de hooks — revisados en la etapa 2: son intencionales (A3 redibuja por partes de la vista; A4 usa `version` para rearmar el árbol). Quedan documentados en el código.
6. Código muerto `Microvista.jsx` — borrado en la etapa 2.
7. Link de clase con `#` — etapa 3.
8. "Preparar la clase" se rompía al pasar directo de una actividad a otra — resuelto en la etapa 2 (la pantalla se vuelve a montar al cambiar de actividad; lo mismo en modo individual).

## Avisos del React Compiler (quedan como avisos)

La configuración oficial de Next 16 trae reglas nuevas de React 19 pensadas para el React Compiler.
Marcan patrones que hoy funcionan bien pero que conviene cambiar para que el compilador pueda optimizar
(leer refs al dibujar, setState dentro de efectos, `Date.now()` al dibujar, etc.).
Casi todos están en las simulaciones, que no se reescriben en la migración. Se dejaron como avisos (no errores):

- `src/actividades/a1/pantallas/Antibioticos.jsx:54` — react-hooks/use-memo
- `src/actividades/a1/piezas/comunes.jsx:86` — react-hooks/set-state-in-effect
- `src/actividades/a2/Visor.jsx:92` — react-hooks/refs
- `src/actividades/a3/Campo.jsx:52` — react-hooks/refs
- `src/actividades/a3/Campo.jsx:53` — react-hooks/refs
- `src/actividades/a3/Campo.jsx:57` — react-hooks/set-state-in-effect
- `src/actividades/a3/index.jsx:33` — react-hooks/refs
- `src/actividades/a3/pantallas/Microscopio.jsx:29` — react-hooks/refs
- `src/actividades/a3/pantallas/Microscopio.jsx:30` — react-hooks/immutability
- `src/actividades/a3/pantallas/Microscopio.jsx:37` — react-hooks/purity
- `src/actividades/a3/pantallas/Microscopio.jsx:44` — react-hooks/immutability
- `src/actividades/a3/pantallas/Microscopio.jsx:70` — react-hooks/purity
- `src/actividades/a3/pantallas/Microscopio.jsx:141` — react-hooks/purity
- `src/actividades/a3/pantallas/Microscopio.jsx:141` — react-hooks/refs
- `src/actividades/a3/pantallas/Microscopio.jsx:201` — react-hooks/refs
- `src/actividades/a3/pantallas/comunes.jsx:70` — react-hooks/set-state-in-effect
- `src/actividades/a4/Laboratorio.jsx:47` — react-hooks/refs
- `src/actividades/a4/Laboratorio.jsx:111` — react-hooks/set-state-in-effect
- `src/actividades/a4/Placa.jsx:55` — react-hooks/refs
- `src/components/Aviso.jsx:75` — react-hooks/set-state-in-effect
- `src/pantallas/maestra/Tablero.jsx:14` — react-hooks/purity

