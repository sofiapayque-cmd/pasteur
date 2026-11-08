# Auditoría y plan hacia la entrega del 1/12/2026

Hecha el 6/11/2026 sobre la rama `ia/asistente` (último commit 2c35eaf), antes de escribir código nuevo. Se trabaja por bloques: cada uno empieza solo cuando Sofia lo aprueba.

> **Estado actualizado al 7/11:** ver la sección "Estado al 7/11" al final. Las secciones 1 a 5 describen cómo estaba todo el 6/11; varias cosas que figuran como "falta" ya están hechas.

**Agregado por Sofia el 6/11, al aprobar el bloque 1:**
- **PubMed** como fuente principal (recomendación de Eugenia: es la más conocida y la que usan). Entra en el bloque 1, así las respuestas nuevas ya salen con artículos de PubMed.
- **Botón "Pedir acceso" en el inicio**, para que una escuela o maestra que nos encuentre pida entrar. Entra en el bloque 4, junto con invitar maestras desde el panel.

## 1. Completo y probado con cuentas reales

- **Maestras:** invitación, elegir contraseña, entrar y salir (1/11).
- **Aulas:** crear aula, cuentas de alumnos, tarjetas, clave nueva (3/11 y 5/11).
- **Alumnos:** entrar con la tarjeta, elegir el apodo una sola vez, laboratorio personal (6/11, alumno Q3V5-01).
- **Tareas:** la maestra manda una actividad y el avance del chico se guarda solo (6/11, A1 en el aula 4b).
- **Equipo del Pasteur:** cuenta de admin y de validadora, invitación por link (6/11).
- **Respuestas con IA:** la IA busca artículos y redacta con citas comprobadas; Eugenia aprueba en el tablero. Hay 2 respuestas publicadas (6/11).
- **Seguridad de la base:** 444 pruebas en local (101 + 111 + 130 + 37 + 29 + 36). Cada grupo también pasó en el Supabase de prueba, sin dejar datos.

## 2. Hecho, pero falta la prueba real

- **"Preguntale al Pasteur":** la base está aplicada; falta que lo pruebe una maestra.
- **"Preguntas de las clases" en el tablero** y su redacción con IA.
- **Índice del asistente:** debería actualizarse solo al aprobar una respuesta.
- **Tareas:**
  - habilitar o cerrar partes;
  - cerrar y reabrir la tarea;
  - terminar la actividad;
  - seguir desde otra computadora;
  - cerrar sesión y volver;
  - qué pasa sin internet.
- **Bloqueo después de 5 claves mal:** probado en la base, no en pantalla.
- **Revisión:** "pedir cambios" y "rechazar" (solo se probó aprobar).
- **Recuperar contraseña de la maestra.**
- **Clase en vivo:** existe solo como prototipo dentro de un mismo navegador (localStorage). Con las aulas reales muestra el aviso "de prueba". Las tablas `sesiones` y `progreso` ya están en la base, con tiempo real activado desde la etapa 1, pero ningún código las usa todavía.

## 3. Errores, riesgos y dependencias

### Bloqueantes para la entrega

- **Producción no está lista.**
  - `main` sigue con la versión Vite y su deploy falla (PR #1 abierto).
  - Hay que llevar `ia/asistente` a `main`, con autorización de Sofia.
  - Hay que aplicar las 17 migraciones en el Supabase real, que está vacío.
  - Faltan las variables y el dominio `cienciasinlimites.uy`.
- **Mail propio (SMTP).** Sin él, Supabase manda 2 mails por hora y solo a miembros de la organización. Así no se puede invitar maestras de verdad.
- **Pocas respuestas aprobadas.** Con 2, en clase casi todo va a dar "todavía no la tenemos". Depende del tiempo de Eugenia.
- **Validación científica de las actividades.**
  - Hay 28 puntos marcados `VALIDAR` en el código: A1 tiene 10, A2 tiene 13 y A3 tiene 5.
  - A1 (microbiología) y A2 (dengue/zika) están fuera del área de Eugenia.
  - Los ambientes "campo uruguayo" y "vaca" de A1 están sin confirmar con el Instituto.
- **Aval formal del Instituto para el sello.**

### Riesgos técnicos

- **Asistente:**
  - El umbral de "es la misma pregunta" no está calibrado.
  - Dos preguntas del mismo tema con respuestas distintas podrían confundirse ("¿Por qué las células tienen núcleo?" / "¿Las bacterias tienen núcleo?").
- **Plan gratuito de Supabase:**
  - el proyecto se pausa tras una semana sin uso;
  - el tiempo real admite 200 conexiones a la vez (unas 6 clases);
  - la protección de contraseñas filtradas está apagada.
- **Rendimiento:**
  - las funciones de Vercel corren en EE.UU. y Supabase está en São Paulo (falta la región `gru1`);
  - nada se probó en una Ceibal real, solo con su tamaño de pantalla.
- **Pruebas automáticas:** ninguna actividad tiene, así que un cambio puede romperla sin aviso.
- **Registro científico:** la tabla `resultados` existe, pero ninguna actividad la usa.

### Privacidad

- **OpenAI y menores.**
  - El asistente es "modo clase": escribe la maestra.
  - Si los chicos escriben preguntas libres, su texto va a OpenAI, y eso necesita retención cero (ZDR) y consentimiento.
  - Para el 1/12, dentro de las actividades verían solo una lista de respuestas aprobadas, sin escribir.
- **Datos de los chicos.** Falta definir:
  - cuánto tiempo se guardan;
  - qué pasa a fin de año (Ley 18.331);
  - el consentimiento de las familias.

## 4. Sistema educativo: qué falta

- **Clase en vivo con Supabase Realtime.**
  - Abrir la clase desde una tarea.
  - Sala de espera con los chicos reales.
  - Empezar, pausar y habilitar.
  - Tablero en vivo, puesta en común y cierre.
  - Reconexión si se corta.
  - El avance se guarda igual que en las tareas.
- **Cuaderno de investigación.**
  - Cada actividad ya guarda sus datos:
    - A1: muestras, cultivos y antibióticos;
    - A2: hipótesis, corridas y comparaciones;
    - A3: misión, fotos y pistas.
  - Falta ordenarlos en un formato común (hipótesis, decisiones, variables, resultados y conclusiones).
  - La maestra los vería por alumno y por clase.
  - Se puede hacer leyendo lo que ya se guarda, sin migración.
- **"Preguntas del Pasteur" dentro de cada actividad:** lista de respuestas aprobadas de esa actividad.
- **Historial anónimo.** Hoy solo se cuentan las preguntas sin respuesta. Falta contar también cuántas veces se pidió cada respuesta aprobada, para elegir fun facts y las próximas respuestas.
- **"Pedir acceso" desde el inicio** (pedido de Sofia): una escuela o maestra completa un formulario corto. El pedido llega al panel del equipo, que con un clic la invita o lo descarta. Lleva protección contra spam y un aviso de para qué se usan sus datos.
- **Invitar maestras desde el panel del equipo** (hoy se hace desde Supabase).
- **Borrar el apodo de un chico:** que la maestra pueda hacerlo.

## 5. Experiencias científicas: estado

- **A1 · Genómica Microbiana.** Es la más completa:
  - 8 etapas;
  - ilustraciones SVG con grano;
  - descenso de lo macro a lo micro;
  - placas, antibióticos y puesta en común.
- **A2 · Simulaciones Biomoleculares.**
  - Tiene un visor "3D" propio en Canvas 2D (esferas que giran) con la proteína E del dengue y del zika.
  - El chico arma una hipótesis, cambia temperatura y pH, y compara.
  - El modelo está armado a mano; podría basarse en la estructura real (base de datos PDB).
- **A3 · Bioimagenología.**
  - Es un microscopio dibujado por código: aumento, enfoque, planos, canales de fluorescencia, fotoblanqueo y misiones.
  - No usa imágenes reales.
- **A4.** En pausa.
- **Técnica.**
  - No están instalados React Three Fiber ni GSAP. `three` está instalado pero no se usa.
  - Todo es 2D a propósito: lo decidimos el 28/10 por el rendimiento de las Ceibal.
  - No hay imágenes ni videos en el proyecto: todo se dibuja con código.
- **Recomendación preliminar.** Se decide después de revisarlas juntas en el bloque 6.
  - Llevar **una sola** experiencia a calidad alta antes de tocar las otras.
  - Las candidatas son A1 (la prioritaria y la más completa) y A3 con imágenes reales de microscopía: del Instituto con permiso, o de bancos abiertos con licencia CC BY.
  - 3D con React Three Fiber, solo si una Ceibal real lo mueve bien.
  - Un visor molecular especializado (Mol*) es pesado para las Ceibal: quedaría como "ver la estructura real" para la maestra.

## 6. Prioridades hasta el 1/12 (jornadas de 4 a 6 horas)

| # | Bloque | Jornadas | Fechas |
| --- | --- | --- | --- |
| 1 | Cerrar "Preguntale al Pasteur" | 1,5 | 7–8/11 |
| 2 | Clase en vivo con Realtime | 5 | 9–13/11 |
| 3 | Cuaderno de investigación + vista de la maestra | 3 | 14–16/11 |
| 4 | "Pedir acceso" desde el inicio + invitar maestras desde el panel, preguntas en las actividades, historial, borrar apodo | 2,5 | 17–18/11 |
| 5 | Prueba piloto en el preview: una maestra, algunos chicos, una Ceibal real, y arreglos | 1,5 | 19–20/11 |
| 6 | Revisar las 3 experiencias y decidir | 1 | 21/11 |
| 7 | Una experiencia a calidad visual alta | 4 | 22–25/11 |
| 8 | Producción: `main`, migraciones, dominio, mail, región, permisos y costos | 3 | 26–28/11 |
| 9 | Pruebas finales y versión de entrega | 1,5 | 29–30/11 |

**Total: unas 24 jornadas en 24 días, sin margen** (PubMed y "Pedir acceso" suman cerca de una jornada). Si se pierde tiempo, lo primero que se achica es el bloque 7 (pulido 2D en vez de 3D).

En paralelo, sin código:

- Eugenia aprueba respuestas y revisa los `VALIDAR` de su área (14–27/11).
- Pedirle al Instituto:
  - el aval del sello;
  - imágenes de microscopía;
  - quién valida A1 y A2.
- Configurar el DNS del dominio para el mail. Conviene hacerlo temprano, porque puede tardar en activarse.

## 7. Imprescindible y deseable

- **Imprescindible:**
  - bloques 1, 2, 3, 5, 8 y 9;
  - validar los `VALIDAR` que se ven en pantalla;
  - unas 15 a 20 respuestas aprobadas;
  - aval del sello, o cambiar su texto.
- **Importante (si no hay atrasos):** bloque 4, y el bloque 7 en una sola actividad.
- **Deseable, después de la entrega:**
  - 3D con React Three Fiber, modelos GLB y Blender;
  - GSAP en todas las actividades;
  - Mol*;
  - A4;
  - preguntas libres de los chicos con IA;
  - fun facts automáticos;
  - plan pago de Supabase.

## Bloque 1 · Cerrar "Preguntale al Pasteur" (aprobado por Sofia el 6/11)

### Qué incluye

0. **PubMed** como fuente principal de la biblioteca y de la IA que redacta (con Europe PMC y OpenAlex de respaldo). Cada artículo con su enlace a PubMed.

1. **Pantalla de prueba solo para el equipo** (`/equipo/asistente`). Corre un set de preguntas contra la búsqueda real y muestra, para cada una:
   - qué respondería;
   - con qué parecido;
   - si acertó.

   Sirve también para recalibrar cuando haya más respuestas.
2. **Set de prueba:**
   - por cada respuesta aprobada, unas 8 formas de preguntarla: como lo diría un chico, sin tildes, con errores de ortografía, en voseo o muy corta;
   - unas 10 "trampas" del mismo tema con respuesta distinta;
   - preguntas de otros temas.
3. **Doble control antes de mostrar una respuesta como "la misma".**
   - Si la búsqueda la encuentra, un modelo chico de OpenAI confirma que es la misma pregunta científica.
   - Si duda, se muestra como "parecida" y la maestra elige.
   - Costo: centavos por mes.
4. **Más respuestas para la prueba:** la IA redacta 8 a 10 respuestas de A3 y Eugenia las revisa.

### Criterios de aceptación

- Ninguna "trampa" se muestra como "la misma".
- Al menos 8 de cada 10 formas de preguntar encuentran su respuesta, directa o entre las parecidas.
- No aparece ninguna respuesta sin aprobar, en revisión o retirada.
- Las fuentes que se muestran son las de la versión aprobada.
- Sofia lo prueba en el preview con su cuenta de maestra.
- La tabla de resultados queda guardada en `docs/`.

**Estimado:** 1,5 jornadas, más el tiempo de revisión de Eugenia.

## Estado al 7/11 (trabajo de la noche del 6 al 7)

| Bloque | Código | Probado | Falta |
| --- | --- | --- | --- |
| 1 · Preguntale al Pasteur + PubMed | Hecho (commits 71bdd08, 11f5094, 81876ec) | Base en dev (32 pruebas), unitarias, pantallas | Pedirle a la IA las respuestas de A3 que faltan, que Eugenia las apruebe y correr la prueba en `/equipo/asistente`. Que Sofia lo pruebe con su cuenta. |
| 2 · Clase en vivo con Realtime | Hecho (afc44d5) | Unitarias, pantallas con datos de ejemplo, publicación de tiempo real en dev | Prueba real: una maestra y 2 o 3 chicos en navegadores distintos. |
| 3 · Cuaderno + lo que encontró la clase | Hecho (8eeb062) | Unitarias, pantallas | Mirarlo con una tarea real hecha por chicos. |
| 4 · Pedir acceso, invitar, preguntas en actividades, historial, borrar apodo | Hecho (ver `ARQUITECTURA-SUPABASE.md` §18) | Migración 20 aplicada en dev; base en local y en dev (31 y 31), unitarias, pantallas | Pedir acceso de prueba e invitar desde `/equipo/maestras`. |
| 5 · Prueba piloto | — | — | Necesita una maestra y chicos reales. |
| 6 · Revisar las experiencias | Propuesta escrita (`docs/REVISION-EXPERIENCIAS.md`) | — | Decide Sofia. |
| 7 · Calidad visual (opción A, A1) | Placas y muestras hechas (ver `REVISION-EXPERIENCIAS.md` §8) | Pruebas automáticas, pantallas y fluidez | Que Sofia lo mire; validar la firma de cada ambiente. |
| 8 · Producción | Base nueva en São Paulo con las 17 migraciones (7/11, autorizado por Sofia); región y latido diario en `vercel.json`; links de un solo uso con botón "Entrar"; plantillas de mail | Migraciones idénticas (md5), seguridad idéntica a pruebas (1.476 elementos), 31 OK en producción | Pasos de Sofia en `docs/PRODUCCION.md`: mail, ingreso, variables, PR a `main`, dominio, primeras cuentas. |
| 9 · Pruebas finales | `npm run test:actividades`: cada etapa de A1, A2 y A3 en compu y Ceibal (42 pantallas OK); 54 pruebas unitarias; seguridad de la base | — | Prueba completa en producción (paso 8 de `PRODUCCION.md`) y una Ceibal real. |

## Ajustes de producto (desde el 8/11)

Plan completo, con criterios de aceptación, horas y pruebas: documento "Ajustes de producto · auditoría y plan" (https://claude.ai/artifact/HzT6TcXYJEXQeDkZajA2ZP). Se trabaja en la rama `ia/asistente`; cada etapa pasa a `main` solo con el OK de Sofia.

| Etapa | Estado | Pruebas | Falta |
| --- | --- | --- | --- |
| 1 · Actividades privadas | Hecha en la rama (8/11, commit 78c68f6) | `test:acceso` 4 OK · `test:acceso-e2e` 31 OK (desarrollo y build de producción) · `test:actividades` 42 OK · 55 unitarias anteriores | Revisión de Sofia con sesión (alumno, maestra y equipo) en la versión de prueba |
| 2 · Accesos visibles | Pendiente | — | Pregunta 3 (footer) |
| 3 · Timer y puesta en común | Pendiente | — | Preguntas 4, 5, 8 y 10 |
| 4 · Curiosidades | Pendiente | — | Temas iniciales; preguntas 7 y 11 |
| 5 · Figma y 3D | Pendiente | — | — |
