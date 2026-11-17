# La ciencia sin límites · web

Plataforma educativa del Institut Pasteur de Montevideo para niñas y niños de 10 a 12 años.
Proyecto integrador · Licenciatura en Diseño Multimedia · Universidad ORT Uruguay.

Esta versión tiene el recorrido de la maestra, la clase en vivo, las aulas con tareas, el panel del equipo del Institut Pasteur y tres actividades: Genómica Microbiana, Simulaciones Biomoleculares y Bioimagenología.

## Cómo abrirla en tu computadora

1. Instalá **Node.js** (versión 22 o más nueva) desde https://nodejs.org. Solo se hace una vez.
2. Abrí la carpeta del proyecto en VS Code y abrí la terminal (menú Terminal › Nueva terminal).
3. Escribí esto y apretá Enter (descarga las librerías, solo la primera vez):

   ```
   npm install
   ```

4. Para ver la web:

   ```
   npm run dev
   ```

   La Terminal muestra una dirección como `http://localhost:3000`. Abrila en el navegador.
   Mientras esté abierta, cada cambio que guardes en el código se ve al instante.

5. Para cortar, volvé a la Terminal y apretá `Ctrl + C`.

Lo que cambies en tu computadora no toca la web real: llega a www.cienciasinlimites.uy cuando se sube a GitHub y se une un PR a `main`.

## Cómo probar

- **En la web real** todo funciona con cuentas: maestras invitadas desde el panel del equipo, alumnos con su tarjeta y el equipo del Pasteur.
- **En tu computadora, sin `.env.local`**, no hay cuentas: la web usa la clase de prueba, que vive dentro del navegador (cada pestaña es un alumno distinto). Sirve para mirar las pantallas y las actividades. Para entrar con cuentas, copiá `.env.example` como `.env.local` y completalo con los datos de la base de pruebas, nunca con los de la real.
- **Pruebas automáticas:** `npm run typecheck`, `npm run lint` y los `npm run test:…` de `package.json`. Cada uno prueba una parte; los archivos están en `pruebas/`.

## Cómo está organizado

```
src/                        el código de la web
  app/                      el mapa de la web: una carpeta por dirección (Next.js lo pide así)
                            los nombres entre paréntesis agrupan sin cambiar la dirección:
                            (publico) inicio y roles · (acceso) entrar y pedir acceso
                            (docente) maestra/ · (alumno) clase/, lab/ y explorar/
                            (equipo) equipo/ · auth/ abre los links de los mails · api/ tareas automáticas
                            layout.tsx: fuentes, estilos y metadatos
  pantallas/                lo que se ve en cada dirección: inicio, rol, maestra/, nino/, equipo/
                            (no se llama pages/: Next.js reserva ese nombre)
  components/               piezas que se repiten: Moli, Ventana, Aviso, MarcoActividad, FondoVivo…
                            hero/ la portada · rol/ Moli 3D y la pantalla de roles · escenas/ paisajes de A1
  actividades/              las 3 actividades, una carpeta cada una: a1/ a2/ a3/
                            (index.jsx es la experiencia del niño; etapas.js, sus etapas y preguntas)
                            info.js las reúne · componentes.js carga cada una recién cuando se usa
  sala/                     la clase en vivo y cómo se guarda el avance de cada alumno
  datos/                    lee la base de datos (solo en el servidor)
  acciones/                 guarda en la base lo que hace cada botón o formulario
  lib/                      herramientas de todo el proyecto:
                            contenido.js: actividades, apodos, colores y textos generales
                            actividad.ts: los tipos de las actividades
                            navegacion.tsx: moverse entre pantallas · navegador.ts: leer el navegador
                            supabase/ conexión con la base · ia/ la redactora y el asistente
                            ciencia/ PubMed, Europe PMC y OpenAlex · aulas/ curiosidades/ acceso/ equipo/
  styles/                   tokens.css (colores, tipografías y espacios), relieve.css, base.css, pantallas.css
  proxy.ts                  renueva la sesión antes de cada página (Next.js lo busca con ese nombre)
  instrumentation-client.ts arregla los links viejos con # (Next.js lo busca con ese nombre)
public/                     imágenes de Moli y de la portada, y el modelo 3D de Moli (models/moli.glb)
supabase/
  migrations/               cada cambio de la base, en orden. No se borran: con ellas se arma la base desde cero
  pruebas/                  pruebas de seguridad de la base
pruebas/                    pruebas automáticas de la web (npm run test:…)
docs/                       cómo funciona cada parte (base, asistente, panel, producción, actividades…)
  historial/                planes y propuestas que ya se cerraron
  ilustraciones-originales/ y moli/   archivos fuente: ilustraciones en PNG y Moli en Blender
```

**Archivos sueltos de la raíz** (cada herramienta busca el suyo ahí, por eso no se pueden mover):

| Archivo | Para qué |
| --- | --- |
| `package.json` | las librerías que usa la web y los comandos (`npm run dev`, `npm run test:…`) |
| `package-lock.json` | las versiones exactas de cada librería (lo escribe npm solo) |
| `next.config.ts` | la configuración de Next.js |
| `tsconfig.json` | la configuración de TypeScript, y el atajo `@/` = `src/` |
| `eslint.config.mjs` | las reglas que revisan el código (`npm run lint`) |
| `vercel.json` | Vercel: la región (São Paulo) y una tarea diaria |
| `.env.example` | el modelo de las variables (se copia como `.env.local`) |
| `.gitignore` | lo que nunca se sube a GitHub |
| `AGENTS.md` | una nota para asistentes de IA; Next.js la vuelve a escribir solo |
| `.vscode/settings.json` | oculta en VS Code las carpetas que se generan solas |

**Lo que se genera solo** (está en tu computadora pero no en GitHub, y VS Code lo oculta): `node_modules/` (las librerías, las baja `npm install`), `.next/` (lo que arma `npm run dev`), `next-env.d.ts` y `tsconfig.tsbuildinfo`. Si se borran, se vuelven a crear.

**Para cambiar un texto:** buscalo en `lib/contenido.js`, en el `etapas.js` de la actividad o en su `index.jsx`.
**Para cambiar un color:** cambialo en `styles/tokens.css` y se actualiza en toda la web.
**Para sumar una actividad nueva:** copiá la estructura de una carpeta `aN/`, sumala en `actividades/info.js`, `actividades/componentes.js` y `lib/contenido.js`.

## Qué falta

| Parte | Estado |
| --- | --- |
| Prueba con una maestra y chicos en sus Ceibal | Pendiente |
| Logo del instituto, QR, guías docentes en PDF dentro de la web | Lugares marcados, faltan los archivos |
| Textos entre corchetes [ ] y comentarios `// VALIDAR:` | A revisar con el Institut Pasteur |

## Tecnologías

- **Next.js 16 (App Router) + TypeScript**: el marco de la web. `npm run dev` la levanta en tu computadora, `npm run build` la prepara y `npm start` la sirve como en producción (Vercel).
- **React 19**: arma la interfaz en componentes (cada pantalla y cada pieza es un archivo).
- **Direcciones**: sin # (`/maestra`, `/clase/K7RM`...), con el App Router de Next.js. Los links viejos con # siguen andando. Mapa completo en `docs/historial/MIGRACION.md`.
- **Supabase**: la base de datos y las cuentas (maestras, alumnos y equipo del Pasteur), y el tiempo real de la clase en vivo. Los cambios de la base están en `supabase/migrations/`.
- **Moli 3D**: el modelo está hecho en Blender. En la pantalla de roles se mueve en tiempo real con Three.js y GSAP; en el resto de la web se usan imágenes del mismo modelo, animadas con CSS.
- La versión anterior con Vite quedó guardada en la rama `version-vite`.
- Las animaciones de las actividades son CSS y Canvas, pensadas para que anden en las Ceibal.
