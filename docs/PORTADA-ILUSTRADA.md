# Portada ilustrada (hero editorial)

Rama `frontend/hero-ilustrado`, que sale de `main`. Sin merge ni producción hasta que Sofia lo autorice.

Link de prueba (siempre la última versión de la rama): https://pasteur-git-frontend-hero-ilustrado-pasteur2.vercel.app

| Etapa | Qué | Estado |
| --- | --- | --- |
| A · Diagnóstico | Código, trabajo de Cursor y dibujos | Hecha (10/11) |
| B · Composición estática | Escena con las ilustraciones reales, sin movimiento | Aprobada (11/11) |
| C · Movimiento orgánico | Células que recorren toda la pantalla, movimientos sutiles de los científicos | Hecha (11/11; las células viajan por toda la pantalla desde el segundo pedido del 11/11), **espera la revisión de Sofia** |
| D · Lupa interactiva | Reposo, hover y aumento real sincronizado (1,7; con el mouse encima, 2,3) | Hecha (11/11), **espera la revisión de Sofia** |
| E · Optimización | Accesibilidad, rendimiento, pruebas y capturas finales | Pruebas y rendimiento hechos; falta la revisión final |

## Cómo está armada

Todo está en `src/components/hero/`:

| Archivo | Qué hace |
| --- | --- |
| `escena.ts` | **Única fuente de datos**: medidas de la escena, lupa, células y científicos. También `enLaLente()`, que calcula dónde se ve cada célula dentro de la lupa en reposo. |
| `movimiento.ts` | Las cuentas de la lupa, sin tocar la página: dónde queda el centro óptico y dónde y de qué tamaño se ve cada copia ampliada. Acá están los valores de la lupa en reposo y activa (giro, escala y aumento). |
| `deriva.ts` | Cómo viajan las células por toda la pantalla, sin tocar la página: destinos, curvas, distancia entre ellas, textos, bordes y el "turno de la lupa". |
| `animarPortada.ts` | Pone la escena en movimiento con GSAP. |
| `HeroEditorial.tsx` | Arma la escena, la ordena en capas y arranca el movimiento. |
| `HeroTitle.tsx` | Título y «Comenzá a experimentar» (el enlace para entrar). |
| `FloatingCells.tsx` | Células de afuera. Las grandes pasan por delante de las chicas. |
| `HeroScientists.tsx` | Los tres científicos y su sombra en el piso. |
| `InteractiveMagnifier.tsx` | La lupa, en una sola pieza: la ilustración entera; el vidrio con la copia ampliada y los brillos; y otra vez la ilustración recortada al aro, encima del vidrio. |
| `hero.css` | Estilos aislados: todas las clases empiezan con `hero`. |

- **Medidas.** La escena mide 1920 × 1080 unidades, como la referencia 1. En pantalla, cada unidad vale `--u`, así la composición entra entera y centrada en cualquier compu. A 1920 × 1080, una unidad es un píxel; a 1440 × 900, tres cuartos de píxel.
- **Capas**, de atrás hacia adelante: células, lupa (mango, vidrio, aro), científicos, textos.
- **Nadie sostiene la lupa** (decidido por Sofia el 10/11). Está entera detrás de los científicos y se mueve sola. Los científicos van en el orden de las referencias: pelirroja, rulos y rodete.
- **Para entrar:** «Comenzá a experimentar» y la lupa llevan a "¿Quién explora hoy?" (`/rol`).
- **Se conserva** "Pedí acceso" (solo con el sistema de aulas prendido). **Sin logo del Institut Pasteur**: se sacó de toda la web el 11/11, por pedido de Sofia.

## Movimiento

### Una sola fuente de posiciones

- Cada célula tiene un **estado**: cuánto se corrió de su lugar, cuánto giró y su tamaño relativo. La lupa y cada científico tienen el suyo.
- **GSAP solo cambia esos números.**
- Una sola función (`dibujar`, en `animarPortada.ts`) corre una vez por cuadro y mueve las imágenes desde el estado. La célula de afuera y su copia ampliada salen del mismo estado en el mismo cuadro: no pueden desfasarse.
- React no se vuelve a dibujar en ningún cuadro.

### La lupa: aumento real

- Una lupa agranda respecto de su centro óptico: un punto P se ve en `centro + aumento × (P − centro)`. Eso se calcula con la posición **actual** de la lupa, incluso mientras sube.
- Dentro del vidrio hay una copia de todas las células, recortada por el círculo:
  - La copia se mueve igual que la célula de afuera.
  - Cuando la célula sale del círculo, deja de verse agrandada.
  - Una célula a medio entrar se ve normal afuera y agrandada adentro.
- El vidrio tiene el mismo marfil que el fondo, así la célula de atrás no se ve dos veces. Encima va un tinte azul muy leve y los brillos (`lupa-reflejos`).
- Lo que se ve por el vidrio no gira cuando gira la lupa, como en una lupa real.
- **Aumento:** 1,7 en reposo. Con el mouse encima, 2,3 (pedido de Sofia, 11/11): se agranda en 1 s, sin rebote, mientras la lupa sube.
- Solo se ve agrandada la célula que pasa **de verdad** por debajo del vidrio. Una que pasa cerca del borde, por afuera, no.

### La lupa: reposo y activa

| Estado | Qué hace |
| --- | --- |
| **Reposo** | Un vaivén casi imperceptible (0,35°). |
| **Activa** (mouse encima) | Gira 3,8° y crece un 10 % desde la punta del mango, escondida detrás de los científicos. El centro sube casi en vertical: 53 px a 1920 × 1080 y 41 px a 1440 × 900. Rebote suave: `elastic.out(1, 0.9)`, 1,3 s. |
| **Vuelta** (mouse afuera) | Vuelve a su lugar en 0,85 s, sin rebote. |

- **Sin temblar:** para soltarla, el mouse tiene que salir de la lupa levantada **y** del lugar donde estaba en reposo. Si el mouse queda en el borde, la lupa no sube y baja sin parar.
- **Clic:** el enlace acompaña al vidrio, así se puede hacer clic donde está la lupa ahora.
- **Teclado:** al llegar con Tab a «Comenzá a experimentar», la lupa se levanta.

### Células

Arrancan en la composición aprobada y **recorren toda la pantalla** (pedido de Sofia, 11/11). Todo está en `deriva.ts`:

- **Destinos:** cada célula elige adónde ir entre 10 lugares al azar, el más lejos de las otras células y de adonde van las otras. Además, todas se apartan un poco entre sí (más las grandes, que son más rápidas). Así se reparten por toda la pantalla y no se amontonan alrededor de la lupa.
- **Curvas:** gira de a poco hacia su destino, con una ondulación lenta. Nunca dobla de golpe.
- **Profundidad:** las chicas (más lejos) van más lento (11 unidades por segundo) que las grandes (26). Las de tamaños muy distintos se pueden cruzar: la grande pasa por delante.
- **Por la lupa:** una de cada ocho veces, el destino es la lupa. Pasa por el medio del vidrio y sigue de largo.
- **Turno de la lupa:** si nadie pasa por el vidrio durante 3 s, va la que llegaría primero, un poco más rápido. Con el mouse encima, van una detrás de otra (sin llenar el vidrio), y debajo del vidrio pasan más despacio: se las ve más rato y más grandes.
- **Textos libres:** esquivan el título, el subtítulo y "Pedí acceso" antes de llegar, y nunca se acercan a menos de 12 unidades.
  - Esos textos están marcados con `data-hero-evitar`, y se miden de nuevo cuando cambia el tamaño de la ventana.
  - Si una célula queda debajo de un texto (por ejemplo, al achicar la ventana o en la Ceibal), sale de a poco, sin saltar.
- **Bordes:** se pueden asomar un poco, pero no se van de la pantalla.
- Además giran apenas: ±4 a 9°, y una de cada cuatro ±14 a 22°. También "respiran" (±2,5 % de tamaño).

En 10 minutos simulados, cada célula recorre de 900 a 1750 unidades de ancho; la distancia media a la vecina más cercana queda en unas 235 unidades (en la composición aprobada, 272), y en promedio hay células en 8 o 9 de 12 zonas de la pantalla. En el navegador, el vidrio está vacío un 10 % del tiempo.

### Científicos

- Se balancean apenas (±0,45 a 0,75°) **desde los pies**, y respiran (0,7 % de alto). No flotan: los pies no se despegan del piso.
- Cuando la lupa se levanta, se inclinan hacia ella (1,1° a 2,1°), uno después del otro. El más cercano, más.
- No se animan brazos ni cabezas, porque las ilustraciones son de una sola pieza.

### Reducir movimiento

Con `prefers-reduced-motion` no se mueve nada: queda la composición quieta, con la lupa agrandando igual. Si alguna célula queda debajo de un texto, se corre lo justo.

### Valores para ajustar

| Qué | Dónde |
| --- | --- |
| Cuánto sube y crece la lupa | `LUPA_ACTIVA` en `movimiento.ts` (giro y escala). La prueba `test:portada` avisa si sale de 40–60 de subida u 8–12 % de crecimiento. |
| Aumento | En reposo: `LENTE.aumento` en `escena.ts`. Con el mouse encima: `LUPA_ACTIVA.aumento` en `movimiento.ts`. |
| Rebote y tiempos de la lupa | `activar()` y `desactivar()` en `animarPortada.ts` |
| Velocidad, curvas, separación, cada cuánto pasan por la lupa | `DERIVA` en `deriva.ts` (cada valor está explicado ahí) |
| Inclinación de los científicos | `REACCION` en `animarPortada.ts` |
| Tinte del vidrio | `.hero-lente::before` en `hero.css` |

## Pruebas

**`npm run test:portada`** (sin navegador)
- La copia ampliada queda donde la vería una lupa real y del tamaño justo, en 400 posiciones al azar de células y lupa, con aumentos al azar.
- La lupa activa sube entre 40 y 60, crece entre 8 y 12 % y agranda más.
- Una célula que cruza la lupa se ve ampliada solo mientras pasa por el vidrio.
- 12 minutos de viaje simulado: cada célula recorre la pantalla de punta a punta, todas pasan por la lupa, el vidrio no queda vacío más de 30 s (con el mouse encima, se ve alguna más del 75 % del tiempo), ninguna tapa un texto, van lento y no se van de la pantalla.
- Si el vidrio está vacío, va la que llega primero, y sigue de largo.
- Una célula que arranca debajo de un texto sale de a poco, sin saltar.

**`npm run test:portada-navegador`** (con Playwright, en modo desarrollo: usa un acceso de prueba que no existe en producción)
- Cuadro por cuadro, la copia ampliada está a menos de 1,5 px de donde la vería una lupa real, y agrandada lo justo: con las células moviéndose, con la lupa quieta y levantada.
- Tres células (chica, mediana, grande) por tres caminos distintos.
- Las células recorren la pantalla y pasan seguido por la lupa (unos 3 minutos acelerados).
- Hover con mouse y con teclado, sin temblar en el borde, con aumento 2,3.
- Ninguna célula toca los textos a 1920 × 1080, 1440 × 900 y 1024 × 600.
- Con "reducir movimiento" no se mueve nada.
- La lupa lleva a `/rol`.
- No hay errores en la consola.

## Rendimiento

Medido con la versión de producción, simulando un procesador 4 y 6 veces más lento:

| Tamaño | Procesador | Cuadros por segundo |
| --- | --- | --- |
| 1024 × 600 | 6 veces más lento | 60, en reposo y con la lupa subiendo |
| 1366 × 768 | 4 veces más lento | 60 |

- Con el procesador 6 veces más lento, el hilo principal está ocupado entre un 28 y un 40 % según la medición (antes del viaje por toda la pantalla, 24–31 %: ahora hay más copias ampliadas a la vista). Las cuentas del viaje son un 5–7 %. Nunca se recalcula el diseño de la página: solo se mueven imágenes, cada una en su propia capa.
- Si la pestaña no se ve, el movimiento se detiene solo.
- Falta probarla en una Ceibal real, porque su placa de video es más débil que la de la simulación.

## Ilustraciones

En `public/illustrations/hero/`:

| Archivo | Uso |
| --- | --- |
| `cells/celula.webp` | La célula, recortada a su borde y achicada a 640 px (106 KB; el PNG original pesa 1,8 MB). |
| `scientists/*-mira.webp` | Cada científico en la vista de tres cuartos mirando hacia arriba, recortado de su hoja de rotación con un margen transparente, sin cortes. |
| `magnifier/lupa-marco.webp` | La lupa de Sofia (aro, conector y mango, con el vidrio transparente). Se escala para que el aro mida lo mismo que en la referencia 1; el centro de su vidrio es el centro óptico, y la punta de su mango, el punto desde el que gira. |
| `magnifier/lupa-reflejos.webp` | Los brillos del vidrio, de Sofia. Se agrandan hasta que el borde de su disco coincide con el del vidrio. |

- Los PNG originales siguen en la carpeta, sin usar.
- Los recortes `*-mira.png` de Cursor cortaban codos y pelo en el borde: por eso se rehicieron.
- `cells/Translucent Teal Cell with Pink Nucleus.png` es idéntico a `cells/cell.png`.
- `lupa-marco` mide 628 × 723 px: en una pantalla común se ve nítida; en pantallas de alta densidad (Mac con Retina) se ve apenas suave. Una versión al doble de tamaño lo resolvería.

## La pelirroja que sostiene el mango (descartado)

- `scientists/pelirroja-sostiene.png` (10/11) tenía la pose correcta, pero agarraba un mango unas cuatro veces más finito que el de la lupa gigante: puesta en la escena, se veía un mango chico adelante del grande.
- Sofia decidió que nadie sostenga la lupa. El archivo queda guardado, sin usar.
- Para que igual se sienta que la levantan, la lupa gira desde la punta del mango (detrás del grupo) y los científicos se inclinan hacia ella.

## Ilustraciones opcionales

- Cabeza y cuerpo de cada científico en archivos aparte, con el mismo encuadre: permitiría que muevan la cabeza. Sin eso, el movimiento se limita a inclinar apenas el cuerpo entero.
- `lupa-marco` al doble de tamaño, para que se vea nítida en pantallas Retina.

## Al unir con `ia/asistente`

`ia/asistente` suma el pie "Accesos institucionales" (`PieInstitucional`) al inicio. Al juntar las ramas hay que agregarlo en `src/pantallas/Inicio.jsx`, debajo de la portada. La escena deja libre la franja de abajo.
