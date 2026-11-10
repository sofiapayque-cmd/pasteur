# Portada ilustrada (hero editorial)

Rama `frontend/hero-ilustrado`, que sale de `main`. Se trabaja por etapas y cada una espera la revisión de Sofia.

| Etapa | Qué | Estado |
| --- | --- | --- |
| A · Diagnóstico | Código, trabajo de Cursor y dibujos | Hecha (10/11) |
| B · Composición estática | Escena con las ilustraciones reales, sin movimiento | Hecha (10/11), con la lupa definitiva. **Espera la revisión de Sofia** |
| C · Movimiento orgánico | Células que flotan, movimientos sutiles de los científicos | Pendiente |
| D · Lupa interactiva | Reposo, hover y ampliación sincronizada | Pendiente |
| E · Optimización | Accesibilidad, rendimiento, pruebas y capturas finales | Pendiente |

## Cómo está armada

Todo está en `src/components/hero/`:

| Archivo | Qué hace |
| --- | --- |
| `escena.ts` | **Única fuente de datos**: medidas de la escena, lupa, células y científicos. También `enLaLente()`, que calcula dónde se ve cada célula dentro de la lupa. |
| `HeroEditorial.tsx` | Arma la escena y la ordena en capas. |
| `HeroTitle.tsx` | Título y «Comenzá a experimentar» (el enlace para entrar). |
| `FloatingCells.tsx` | Células de afuera. |
| `HeroScientists.tsx` | Los tres científicos y su sombra en el piso. |
| `InteractiveMagnifier.tsx` | La lupa en tres piezas: la ilustración entera detrás de los científicos, el vidrio con la copia ampliada y los brillos, y otra vez la ilustración recortada al aro, encima del vidrio. |
| `hero.css` | Estilos aislados: todas las clases empiezan con `hero`. |

- **Medidas.** La escena mide 1920 × 1080 unidades, como la referencia 1. En pantalla, cada unidad vale `--u`, así la composición entra entera y centrada en cualquier compu.
- **Capas**, de atrás hacia adelante: células, lupa con su mango, científicos, vidrio, aro, textos.
- **La lupa no es una imagen cerrada.** Dentro del vidrio hay una segunda capa con las mismas células, agrandadas 1,7 veces respecto del centro óptico y recortadas por el círculo. Por eso solo se ven ampliadas las que están cerca del centro (a menos de radio ÷ aumento), como con una lupa de verdad.
- **Para entrar:** «Comenzá a experimentar» y la lupa llevan a "¿Quién explora hoy?" (`/rol`).
- **Se conservan** el lugar del logo y "Pedí acceso" (solo con el sistema de aulas prendido).

## Ilustraciones

En `public/illustrations/hero/`:

| Archivo | Uso |
| --- | --- |
| `cells/celula.webp` | La célula, recortada a su borde y achicada a 640 px (106 KB; el PNG original pesa 1,8 MB). |
| `scientists/*-mira.webp` | Cada científico en la vista de tres cuartos mirando hacia arriba, recortado de su hoja de rotación con un margen transparente, sin cortes. |
| `magnifier/lupa-marco.webp` | La lupa de Sofia (aro, conector y mango, con el vidrio transparente). Se escala para que el aro mida lo mismo que en la referencia 1; el centro de su vidrio es el centro óptico. |
| `magnifier/lupa-reflejos.webp` | Los brillos del vidrio, de Sofia. Se agrandan hasta que el borde de su disco coincide con el del vidrio. |

- Los PNG originales siguen en la carpeta, sin usar.
- Los recortes `*-mira.png` de Cursor cortaban codos y pelo en el borde: por eso se rehicieron.
- `cells/Translucent Teal Cell with Pink Nucleus.png` es idéntico a `cells/cell.png`.
- `lupa-marco` mide 628 × 723 px: en una pantalla común se ve nítida; en pantallas de alta densidad (Mac con Retina) se ve apenas suave. Una versión al doble de tamaño lo resolvería.

## Provisorio

**La pelirroja no sostiene el mango.** Está al lado, con su pose de siempre: no se le inventó un brazo.

`scientists/pelirroja-sostiene.png` (10/11) tiene la pose correcta, pero agarra un mango **unas cuatro veces más finito** que el de la lupa:

| | Ancho del mango, en unidades de la escena |
| --- | --- |
| La lupa, al tamaño de la referencia 1 | 47 a 61 |
| El que tiene la pelirroja en las manos, a la altura de los demás | 10 a 16 |

- Puesta en la escena, se ve un mango chico adelante del grande.
- Agrandarla no sirve: tendría que medir unas cuatro veces más que los otros dos.
- Achicar la lupa tampoco: dejaría de ser la protagonista.
- Por eso queda guardada en la carpeta, sin usar.

## Ilustración que falta

**`scientists/pelirroja-sostiene.png`, versión 2**
- La misma pose (dos manos en el mango, mirando hacia arriba), pero agarrando un mango del grosor del de `lupa-marco` a escala de la escena: más o menos **la mitad del ancho de su torso**.
- Es como en la referencia 1, donde la científica de rodete agarra el mango gigante.
- Mismo ángulo del mango: unos 35° de la vertical, subiendo hacia la derecha.
- El mango puede terminar justo arriba de sus manos: de ahí para arriba se ve el de `lupa-marco`.
- Fondo transparente, al menos 800 px de alto.

**Opcional para la etapa C:** cabeza y cuerpo de cada científico en archivos aparte, con el mismo encuadre. Sin eso, el movimiento se limita a inclinar apenas el cuerpo entero.

## Al unir con `ia/asistente`

`ia/asistente` suma el pie "Accesos institucionales" (`PieInstitucional`) al inicio. Al juntar las ramas hay que agregarlo en `src/pantallas/Inicio.jsx`, debajo de la portada. La escena deja libre la franja de abajo.

## Capturas

Etapa B, con `next build`:

| Tamaño | Resultado |
| --- | --- |
| 1920 × 1080 | Coincide con la referencia 1: título, subtítulo, lupa, células y científicos en el mismo lugar. Solo cambia la célula de arriba a la derecha, que se corrió para no quedar debajo de "Pedí acceso". |
| 1440 × 900 | Sin desbordes. |
| 1366 × 768 y 1024 × 600 (Ceibal) | Sin desbordes. |
| 390 × 844 (celular) | Sin desbordes; queda mucho espacio libre arriba y abajo. |
