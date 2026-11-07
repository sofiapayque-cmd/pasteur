# Revisión de las tres experiencias (bloque 6) · 7/11/2026

**Qué es esto:** una revisión de A1, A2 y A3 tal como están en `ia/asistente`, con capturas de cada etapa, y una propuesta para el bloque 7 (llevar una experiencia a calidad visual alta).

- **Lo que es arreglo de uso**, con el diseño de siempre, ya se hizo y se explica abajo.
- **Lo que cambia cómo se ve una actividad no se tocó: lo decide Sofia.**

## 1. Cómo se revisó

- Cada etapa de las tres actividades, con datos de un chico simulado (los mismos que usa el tablero de prueba), en dos tamaños:
  - **1366×768**: compu común y proyector;
  - **1024×600**: el tamaño de pantalla más chico de las Ceibal.
- Resultado general:
  - ninguna etapa da error;
  - ninguna se desborda hacia los costados;
  - las tres se ven coherentes con la dirección de arte v1.2 (paleta, Bricolage en titulares, Moli, notas de cuaderno).
- **Falta probar en una Ceibal de verdad** (con el navegador abierto la pantalla útil es más baja todavía) y con chicos: es el bloque 5.

## 2. Lo que se arregló (uso, sin cambiar el diseño)

### 2.1 Moli tapaba botones en pantallas chicas

A 1024×600, el globo de Moli (abajo a la derecha, fijo) quedaba **encima de controles que el chico necesita**:

| Actividad | Qué tapaba |
| --- | --- |
| A1 · Antibióticos | el disco "Antibiótico B" |
| A1 · Explorar | parte del paisaje con puntos para tocar |
| A2 · Condiciones | **la perilla del pH** |
| A2 · Elegir molécula | las tarjetas de zika y lisozima |
| A3 · Preparar | **el botón "Mirar por el ocular"** |
| A3 · Microscopio | el botón "¡Lo encontré!" |

El globo deja pasar el clic, pero el chico no ve el botón.

**Arreglo** (`src/components/GloboMoli.jsx`, un solo lugar para las 21 pantallas). Solo en pantallas de hasta 1100 de ancho o 740 de alto (la Ceibal, o cualquier compu con el navegador abierto, que le quita alto a la pantalla):
- Moli es un poco más chico;
- el globo aparece cada vez que Moli dice algo nuevo, y **a los 7 segundos se guarda**;
- queda Moli con un "…": **tocándolo, el globo vuelve**. También se puede tocar para guardarlo antes.

En pantallas grandes no cambia nada. Respeta la dirección de arte: Moli sigue abajo a la derecha, con un solo globo de dos líneas.

**Medición** (busca botones, campos y lienzos tapados por el globo en cada etapa):

Etapas con algo tapado, sobre las 21 etapas de las tres actividades:

| Tamaño de la pantalla útil | Cuando aparece el globo | A los 9,5 s |
| --- | --- | --- |
| 1024×600 (Ceibal chica) | 3: tarjeta de lisozima (A2), tarjeta del yogur y "¡Lo encontré!" (A3) | **0** |
| 1366×657 (compu de 1366×768 con el navegador abierto) | 1: "Revisar" (A2) | **0** |
| 1280×720 | 0 | **0** |
| 1366×768 (pantalla completa: sin cambios) | 0 | **0** |

Antes del arreglo, a 1024×600 había al menos seis controles tapados todo el tiempo (la tabla de arriba). Lo que queda en la primera columna dura 7 segundos o hasta que el chico toca a Moli, y el clic pasa igual al botón de abajo.

### 2.2 El cuaderno de A1 cortaba el título

A 1024, "Microorganismos en todas partes" se cortaba ("Microorganisi…"): el cuaderno dejaba 390 px libres a la derecha para Moli.

**Arreglo:** de 1100 px para abajo el cuaderno usa todo el ancho, y el título se achica un poco si no entra.

## 3. Lo que funciona bien (conviene no tocar)

- **A1:**
  - el paisaje ilustrado (Antártida y campo uruguayo) y el recorrido por la escena;
  - el protocolo de sembrar como hoja de cuaderno escrita a mano;
  - el cuaderno de conclusiones.
  - Es la actividad más completa y la que Sofia priorizó.
- **A2:**
  - los controles de temperatura y pH, con ejemplos cotidianos (heladera, fiebre, limón, jabón);
  - la "computadora del laboratorio calculando", que explica qué es una simulación;
  - el informe con sello "hipótesis cumplida / no se cumplió".
- **A3:**
  - **es el simulador más rico**: enfoque por planos, profundidad de campo según el aumento, canales de fluorescencia y fotoblanqueo (la muestra se apaga si se la ilumina mucho);
  - las misiones con pistas;
  - las miniaturas de las muestras.

## 4. Problemas de uso que quedan (propuesta, no hecho)

En **1024×600 hay partes importantes debajo del borde de la pantalla**: el chico tiene que bajar para ver qué hacer.

| Pantalla | Qué queda abajo | Alto de la página |
| --- | --- | --- |
| A1 · Cultivo | el mechero, el asa y la placa (se ve solo el protocolo) | 1404 px |
| A1 · Comparar | la placa B y las preguntas | 1438 px |
| A1 · Mesa | las placas | 1138 px |
| A2 · Explorar | la lista "Tocá cada color" | 915 px |

La pantalla tiene 600 px de alto.

**Propuesta:** en pantallas bajas, pasar a dos columnas compactas, por ejemplo el protocolo al costado de la mesa y no arriba. Cambia la composición, así que **necesita el OK de Sofia**. Estimado: media jornada para las cuatro.

## 5. Calidad visual: dónde está cada una frente a lo pedido

El documento de continuación pide React Three Fiber, GSAP, modelos GLB, Blender e imágenes reales, y no reemplazar nada sin revisión.

### A1 · Genómica microbiana
- **Más flojo:**
  - **"Tomá la muestra"**: el suelo antártico es una mancha gris azulada con piedras; no se lee como suelo ni como hielo.
  - **Las placas**: las colonias son puntitos claros parecidos entre sí, y dos placas de lugares distintos se ven casi iguales. Justo es lo que el chico tiene que comparar.
- **Oportunidad:** placas con colonias de formas reales, dibujadas en 2D liviano:
  - formas: puntiformes, circulares, irregulares, filamentosas, rugosas;
  - colores: crema, amarillo, naranja, blanco;
  - **cada ambiente con su "firma"**, y halos de antibiótico con borde nítido.
  - Más textura en el suelo de cada muestra.
  - Todo en Canvas 2D: anda en las Ceibal.

### A2 · Simulaciones biomoleculares
- **Más flojo:** las moléculas son "collares" de esferas armados a mano. El código lo dice: *no son estructuras reales*. Dengue, zika y lisozima se ven parecidas y no muestran los tres dominios reales de la proteína E.
- **Oportunidad con más impacto científico:** armar los modelos **a partir de estructuras reales del Protein Data Bank**, simplificadas a una esfera cada pocos aminoácidos (unas 100 a 400 esferas). El visor actual las dibuja sin problema en una Ceibal.
  - dengue: proteína E de dengue 2, [1OAN](https://www.rcsb.org/structure/1OAN);
  - zika: proteína E, [5JHM](https://www3.rcsb.org/structure/5JHM);
  - lisozima de clara de huevo: [1LYZ](https://rcsb.org/structure/1LYZ).
  - Los datos del PDB son de dominio público ([CC0](https://www.wwpdb.org/about/usage-policies)); se pide citar a los autores.
  - **Los dominios I, II y III saldrían de la estructura de verdad.** Lo tiene que validar el laboratorio de Simulaciones Biomoleculares (A2 ya tiene 13 `VALIDAR`).
  - Para la maestra en el proyector, se podría sumar una vista 3D con React Three Fiber. `three` ya está instalado y hoy no se usa.

### A3 · Bioimagenología
- **Más flojo:** las muestras son dibujos generados (bien hechos), no imágenes de microscopio.
- **Oportunidad de bajo riesgo:** al resolver cada caso, mostrar **"así se ve en un microscopio de verdad"** con una imagen real.
  - Ideal: de la Unidad de Bioimagenología del Instituto (hay que pedirla).
  - Si no: de bancos con licencia abierta, revisando cada licencia.
  - Reemplazar todo el simulador por imágenes reales sería pesado (hacen falta varias resoluciones por aumento y por plano) y se perdería el enfoque por planos, que es lo mejor que tiene.

### Herramientas
- **GSAP:** hoy todas las animaciones son CSS y andan bien. GSAP suma peso; conviene solo si una escena necesita una línea de tiempo larga, por ejemplo el descenso de A1 de paisaje a microscopio.
- **Blender, GLB y R3F:** pesados para las Ceibal. La dirección de arte ya decidió **prerenderizado por defecto y 3D en vivo solo cuando la interacción lo exige**: se mantiene.

## 6. Propuesta para el bloque 7 (4 jornadas): decide Sofia

| Opción | Qué se hace | A favor | En contra |
| --- | --- | --- | --- |
| **A. A1: placas y muestras (recomendada)** | Colonias con formas y colores reales y firma por ambiente, halos nítidos, suelo con textura. 2D. | Es la actividad prioritaria y la que más van a usar; lo que mejora es justo lo que el chico compara. No depende de nadie de afuera. | Hay que validar con Genómica Microbiana qué crece en cada ambiente (ya hay 10 `VALIDAR`). |
| B. A2: moléculas reales del PDB | Modelos simplificados desde 1OAN, 5JHM y 1LYZ; dominios reales; opcional 3D para el proyector. | El salto científico más grande: "esto es la proteína de verdad". Datos de dominio público. | La validación es de otro laboratorio; el cambio de cómo se ve la molécula es grande y hay que mirarlo con chicos. |
| C. A3: imágenes reales al final | "Así se ve de verdad" en cada caso. | Bajo riesgo, poco trabajo, muy lindo. | Depende de que el Instituto mande imágenes, o de encontrar unas con licencia clara. |

**Recomendación:** A en el bloque 7, y C en paralelo si llegan imágenes del Instituto. B, después de la entrega.

## 7. Qué necesito de Sofia

1. Elegir la opción del bloque 7 (A, B o C).
2. OK o no a la propuesta de pantallas compactas de la sección 4.
3. Mirar el cambio de Moli en una pantalla chica (sección 2.1). Si no convence, se vuelve atrás con un solo commit.
4. Pedirle al Instituto imágenes de microscopía (para C) y quién valida A1 y A2.
