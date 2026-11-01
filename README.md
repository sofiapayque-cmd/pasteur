# La ciencia sin límites · web

Plataforma educativa del Institut Pasteur de Montevideo para niñas y niños de 7 a 11 años.
Proyecto integrador · Licenciatura en Diseño Multimedia · Universidad ORT Uruguay.

Esta versión tiene el recorrido de la maestra, la sala de clase y las cuatro actividades: Genómica Microbiana, Simulaciones Biomoleculares, Bioimagenología y Evolución de Virus.

## Cómo abrirla en tu computadora

1. Instalá **Node.js** (versión 20 o más nueva) desde https://nodejs.org. Solo se hace una vez.
2. Abrí la Terminal en la carpeta del proyecto (en Mac: clic derecho sobre la carpeta › "Nuevo terminal en la carpeta").
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

## Cómo probar

**Cada actividad sola:** Inicio › Soy niña o niño › "No tengo código: explorar sin sala" (o directo en `/explorar`). La maestra también puede probarlas desde su panel con "Probarla yo".

**La clase completa** (todavía funciona dentro de un mismo navegador; más adelante se conecta a un servicio en tiempo real para que funcione entre la computadora de la maestra y las Ceibal):

1. En una pestaña: Inicio › tocá el círculo › Soy maestra/o › elegí una actividad › Preparar la clase › Abrir sala.
2. En otra pestaña del mismo navegador: Soy niña o niño › escribí el código que aparece en la pestaña de la maestra.
3. Elegí apodo y color. Vas a aparecer en la sala de la maestra.
4. En la pestaña de la maestra tocá **Empezar**: la actividad se abre sola en la del niño.
5. Probá **Pausar**, los desbloqueos (en A1, **Habilitar antibióticos**) e **Ir a la puesta en común** y mirá qué pasa en la pestaña del niño.

Cada pestaña nueva es un niño distinto. El botón punteado "Simular un alumno" agrega alumnos de prueba sin abrir más pestañas.

## Cómo está organizado

```
src/
  data/contenido.js       actividades, apodos, colores y textos generales
  sala/sala.js            la sala de clase: todo lo que conecta maestra y niños
  sala/progreso.js        useProgreso: cómo cada actividad guarda el avance del niño
  actividades/
    info.js               reúne los datos de las 4 actividades
    componentes.js        carga cada actividad recién cuando se usa (más liviano)
    a1/ a2/ a3/ a4/       una carpeta por actividad:
      index.jsx           la experiencia del niño
      etapas.js           etapas, preguntas, guía docente, opciones de la maestra
  components/             piezas comunes: Moli, FondoVivo (organismos flotando),
                          Aviso (errores y aciertos), MarcoActividad, Micrografia...
  app/                    Next.js (App Router): el mapa de la web, una carpeta por dirección
                          (publico) · (docente) maestra/ · (alumno) clase/ y explorar/
                          layout.tsx: fuentes, estilos y metadatos
  navegacion/             navegar entre pantallas (useNavigate, useParams, Navigate) y SoloNavegador
  hooks/navegador.ts      leer el navegador sin romper el servidor (useHidratado, useMediaQuery, useOrigen)
  pantallas/              pantallas generales: inicio, rol, maestra/, nino/
                          (no se llama pages/: Next.js reserva ese nombre)
  styles/
    tokens.css            colores, tipografías, espacios: el sistema visual
    base.css              botones, etiquetas y animaciones comunes
    pantallas.css         el estilo de las pantallas generales
docs/GUIA-ACTIVIDADES.md  reglas para crear o cambiar una actividad
```

**Para cambiar un texto:** buscalo en `data/contenido.js`, en el `etapas.js` de la actividad o en su `index.jsx`.
**Para cambiar un color:** cambialo en `styles/tokens.css` y se actualiza en toda la web.
**Para sumar una actividad nueva:** copiá la estructura de una carpeta `aN/`, sumala en `actividades/info.js`, `actividades/componentes.js` y `data/contenido.js`.

## Qué es real y qué es de prueba

| Parte | Estado |
| --- | --- |
| Navegación, inicio con zoom, organismos flotando | Funciona |
| Las 4 actividades en modo individual | Funcionan |
| Sala: código, apodos, empezar, pausa, desbloqueos, tablero, puesta en común | Funciona en un mismo navegador |
| Sala entre computadoras distintas (maestra ↔ Ceibal) | Próximo paso: Supabase o Firebase |
| Logo del instituto, QR, guías docentes en PDF | Lugares marcados, faltan los archivos |
| Textos entre corchetes [ ] y comentarios `// VALIDAR:` | A revisar con el Institut Pasteur |

## Tecnologías

- **Next.js 16 (App Router) + TypeScript**: el marco de la web. `npm run dev` la levanta en tu computadora, `npm run build` la prepara y `npm start` la sirve como en producción (Vercel).
- **React 19**: arma la interfaz en componentes (cada pantalla y cada pieza es un archivo).
- **Direcciones**: sin # (`/maestra`, `/clase/K7RM`...), con el App Router de Next.js. Los links viejos con # siguen andando. Mapa completo en `docs/MIGRACION.md`.
- La versión anterior con Vite quedó guardada en la rama `version-vite` (y el tag `vite-v1`).
- Las animaciones son CSS y Canvas, pensadas para que anden en las Ceibal.
