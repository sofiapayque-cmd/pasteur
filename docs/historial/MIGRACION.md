# Migración de Vite a Next.js

Rama de trabajo: `migracion/nextjs`. La versión Vite queda intacta en `version-vite` (y el tag `vite-v1`).
Plan completo y diagnóstico: documento "Migración de Vite a Next.js" del proyecto Pasteur.

## Etapas

| Etapa | Qué | Estado |
| --- | --- | --- |
| 0 | Git, rama, línea de base | Hecha |
| 1 | Next.js 16 + React 19 + TypeScript como SPA (guía oficial) | Hecha |
| 2 | ESLint de Next, tipos base, alias `@/`, arreglo de errores previos | Hecha |
| 3 | App Router: una carpeta por pantalla, se quita react-router | Hecha |
| 4 | Navegador y Canvas: solo en cliente, sin errores de hidratación | Hecha |
| 5 | Supabase SSR preparado (sin base completa) | Hecha |
| 6 | Verificación final y Vercel | Hecha |

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

## Rutas (etapa 3)

Una carpeta por pantalla en `src/app`. Los paréntesis agrupan sin cambiar la dirección
(en la etapa 5 el grupo `(docente)` va a pedir que la maestra inicie sesión).

| Dirección | Carpeta | Pantalla |
| --- | --- | --- |
| `/` | `(publico)/page.tsx` | 01 Inicio (el círculo) |
| `/rol` | `(publico)/rol` | 02 ¿Quién explora? |
| `/maestra` | `(docente)/maestra` | 03 Panel de la maestra |
| `/maestra/a1/preparar` | `(docente)/maestra/[act]/preparar` | Preparar la clase |
| `/maestra/a1/sala` | `(docente)/maestra/[act]/sala` | Sala de espera (proyectada) |
| `/maestra/a1/tablero` | `(docente)/maestra/[act]/tablero` | Tablero en vivo |
| `/maestra/a1/puesta` | `(docente)/maestra/[act]/puesta` | Puesta en común |
| `/clase` | `(alumno)/clase` | Niño · Entrar con código |
| `/clase/K7RM` | `(alumno)/clase/[codigo]` | Niño · Entrar con el código ya puesto (link de CREA / QR) |
| `/clase/apodo` · `/espera` · `/actividad` | `(alumno)/clase/…` | Niño · Apodo, Espera, Actividad de la clase |
| `/explorar` | `(alumno)/explorar` | Modo individual: elegir actividad |
| `/explorar/a1` | `(alumno)/explorar/[act]` | Modo individual: hacer una actividad |

- `[act]` se genera al compilar para a1…a4. Una actividad que no existe o está en pausa vuelve a `/explorar` o `/maestra`, como antes.
- Cualquier otra dirección vuelve al inicio (`not-found.tsx`); el servidor responde 404.
- **Links viejos con `#`** (`…/#/clase/K7RM`): `src/instrumentation-client.ts` los pasa a `/clase/K7RM` antes de que se dibuje la página.
- **Navegación:** `src/navegacion` ofrece `useNavigate`, `useParams`, `<Navigate>` con la misma forma que react-router, pero por dentro usa `next/navigation`. Las pantallas solo cambiaron el import.
- **"Volver a preparar la clase":** antes viajaba oculto (`location.state.desde`); ahora va en la dirección (`/explorar/a1?desde=/maestra/a1/preparar`), así sobrevive a recargar. Solo acepta rutas de "Preparar".
- Las actividades se siguen cargando recién cuando se usan (`React.lazy` en `actividades/componentes.js`), sin cambios.

## Servidor y navegador (etapa 4)

| Se dibuja en el servidor (llega HTML con contenido) | Solo en el navegador (`SoloNavegador` en su `page.tsx`) |
| --- | --- |
| Inicio, Rol, Panel de la maestra, Preparar la clase, Explorar, Entrar (`/clase` y `/clase/CÓDIGO`) | Sala de espera, Tablero, Puesta en común, Apodo, Espera, Actividad en clase, Actividad en modo individual |

- Las de la derecha dependen de la sala de prueba guardada en este navegador (localStorage) o dibujan en Canvas con el avance guardado en la pestaña (sessionStorage). Cuando la sala viva en Supabase, varias pueden pasar a la izquierda.
- `useSala()` tiene una "foto" para el servidor (sala vacía); el navegador la usa al hidratar y enseguida lee la sala real.
- `src/hooks/navegador.ts`: `useHidratado`, `useMediaQuery`, `useOrigen` — leen el navegador sin romper el dibujo del servidor. Usarlos en el código nuevo en vez de `window.` al dibujar.
- La sala de espera arma el link de la clase con `useOrigen()` (antes leía `window.location` al dibujar).
- `FondoVivo` redondea a milésimas las coordenadas calculadas con `Math.cos`/`Math.sin`: el servidor (Node) y el navegador difieren en el último decimal y eso daba error de hidratación en todas las pantallas con fondo. No se ve ninguna diferencia.
- `Date.now()` en el Tablero y `sessionStorage` al iniciar el avance quedan como están: esas pantallas se dibujan solo en el navegador.
- Verificación: `hidratacion.py` recorre las 19 direcciones con tres situaciones (sin sala, con sala abierta y niño unido, con avance guardado) en desarrollo y producción: 0 errores y 0 avisos.

## Supabase (etapa 5)

Preparado, **sin cambiar cómo funciona la web hoy**: la sala sigue siendo la de prueba en el navegador.

| Archivo | Qué hace |
| --- | --- |
| `.env.example` | Las dos variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Copiar como `.env.local` para probar en la computadora; en Vercel van en Settings → Environment Variables. |
| `src/lib/supabase/config.ts` | Lee las variables. `supabaseConfigurado` es false si faltan: todo lo de Supabase se saltea. |
| `src/lib/supabase/cliente.ts` | Cliente para el navegador. |
| `src/lib/supabase/servidor.ts` | Cliente para el servidor (cookies) y `obtenerDocente()` con `getClaims()`. |
| `src/lib/supabase/proxy.ts` + `src/proxy.ts` | Renuevan la sesión en cada pedido, **solo en `/maestra` y `/auth`** (los niños no inician sesión: sus pantallas siguen estáticas). `EXIGIR_SESION_DOCENTE` en false hasta que exista la pantalla de inicio de sesión. |
| `src/app/auth/confirmar/route.ts` | Adonde llega la maestra desde el mail de Supabase (link mágico). Solo redirige a rutas internas. |
| `src/sala/repositorio.ts` | El contrato de la sala (`RepositorioSala`). Hoy lo cumple `sala.js`; typecheck avisa si deja de cumplirlo. Explica cómo sumar la versión Supabase. |
| `supabase/borrador/` | Borrador del esquema SQL (sin aplicar), sus reglas RLS probadas en un Postgres local y los pasos para activarlo. |

Basado en el ejemplo oficial `with-supabase` de Next.js y en la guía de Supabase para SSR
(`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0). Proyecto de Supabase creado (región São Paulo,
tablas no expuestas por defecto, RLS automático); el esquema todavía no está aplicado.

Verificado: build, lint y typecheck; todas las pruebas sin variables y con variables cargadas sin sesión
(el proxy no cambia nada ni demora: `/maestra` responde en ~30 ms); `/auth/confirmar` con token falso o sin
token vuelve a `/rol`.

## Verificación final (etapa 6)

| Criterio de aceptación | Cómo se comprobó | Resultado |
| --- | --- | --- |
| Inicia en desarrollo | `npm run dev` + recorrido de todas las direcciones | Sí |
| `npm run build` sin errores | En la carpeta de trabajo y en una copia limpia del repo con `npm ci` (como Vercel) | Sí |
| La navegación funciona | 40 chequeos: direcciones directas, links viejos con `#`, inválidas, atrás, `?desde=`, link de clase | 40/40 |
| Todas las pantallas accesibles | Las 19 direcciones (14 pantallas) | Sí |
| Las actividades mantienen sus interacciones | Clase completa A1–A3 (maestra + niño), zoom y cultivo de A1, A2 (molécula y conclusiones), A3 (microscopio) | Todas pasan |
| Los recursos visuales cargan | Fuentes locales, SVG, estilos; 12 pantallas comparadas píxel a píxel con vite-v1 | 0,00 % de diferencia |
| Sin errores críticos de hidratación | 19 direcciones × 3 situaciones de almacenamiento, en desarrollo y producción | 0 errores, 0 avisos |
| No se pierden funcionalidades | Todas las pruebas de la versión Vite pasan sin cambios | Sí |

También: lint 0 errores (21 avisos del React Compiler, documentados abajo), typecheck sin errores,
`npm audit --omit=dev` 0 vulnerabilidades, Node ≥ 20.9 declarado en `package.json`.

## Publicar en Vercel

1. Proyecto importado desde GitHub (`sofiapayque-cmd/pasteur`), preset **Next.js**, sin cambiar comandos.
2. Variables (Production y Preview): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Cada push a una rama crea un link de prueba (*Preview*). La rama `main` es la publicada (*Production*).
4. Para publicar la versión Next.js: unir `migracion/nextjs` en `main` (pull request). La versión Vite queda en `version-vite`.
5. Después de publicar: en Supabase → Authentication → URL Configuration, poner la dirección de Vercel como *Site URL*.

## Errores previos a la migración (estado)

1. Vulnerabilidades de react-router 6.30.1 — resuelto en la etapa 3 (react-router quitado; `npm audit --omit=dev`: 0). Quedan avisos moderados de `minimatch` dentro de ESLint: es una herramienta de desarrollo, no llega a la web publicada.
2. Avisos "Future Flag" de React Router — resuelto en la etapa 3 (react-router quitado).
3. Fuentes desde Google Fonts — resuelto en la etapa 1 (fontsource, sirven sin internet).
4. 6 variables sin usar — resuelto en la etapa 2.
5. 2 avisos de dependencias de hooks — revisados en la etapa 2: son intencionales (A3 redibuja por partes de la vista; A4 usa `version` para rearmar el árbol). Quedan documentados en el código.
6. Código muerto `Microvista.jsx` — borrado en la etapa 2.
7. Link de clase con `#` — resuelto en la etapa 3: ahora es `/clase/CÓDIGO`. Los links y QR viejos con `#` siguen andando.
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

