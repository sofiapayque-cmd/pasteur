# Portada ilustrada (hero editorial)

Rama `frontend/hero-ilustrado`, que sale de `main`. Se trabaja por etapas y cada una espera la revisión de Sofia.

| Etapa | Qué | Estado |
| --- | --- | --- |
| A · Diagnóstico | Código, trabajo de Cursor y dibujos | Hecha (10/11) |
| B · Composición estática | Escena con las ilustraciones reales, sin movimiento | Hecha (10/11), **espera la revisión de Sofia** |
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
| `InteractiveMagnifier.tsx` | Mango, vidrio con la copia ampliada y aro. |
| `hero.css` | Estilos aislados: todas las clases empiezan con `hero`. |

- **Medidas.** La escena mide 1920 × 1080 unidades, como la referencia 1. En pantalla, cada unidad vale `--u`, así la composición entra entera y centrada en cualquier compu.
- **Capas**, de atrás hacia adelante: células, mango, científicos, lupa, textos.
- **La lupa no es una imagen cerrada.** Dentro del vidrio hay una segunda capa con las mismas células, agrandadas 1,7 veces respecto del centro óptico y recortadas por el círculo. Por eso solo se ven ampliadas las que están cerca del centro (a menos de radio ÷ aumento), como con una lupa de verdad.
- **Para entrar:** «Comenzá a experimentar» y la lupa llevan a "¿Quién explora hoy?" (`/rol`).
- **Se conservan** el lugar del logo y "Pedí acceso" (solo con el sistema de aulas prendido).

## Ilustraciones

En `public/illustrations/hero/`:

| Archivo | Uso |
| --- | --- |
| `cells/celula.webp` | La célula, recortada a su borde y achicada a 640 px (106 KB; el PNG original pesa 1,8 MB). |
| `scientists/*-mira.webp` | Cada científico en la vista de tres cuartos mirando hacia arriba, recortado de su hoja de rotación con un margen transparente, sin cortes. |

- Los PNG originales y los recortes de Cursor siguen en la carpeta, sin usar.
- Los recortes `*-mira.png` de Cursor cortaban codos y pelo en el borde: por eso se rehicieron.
- `cells/Translucent Teal Cell with Pink Nucleus.png` es idéntico a `cells/cell.png`.

## Provisorio

| Qué | Por qué | Qué lo reemplaza |
| --- | --- | --- |
| Aro, conector y mango de la lupa | En las referencias la lupa está pegada al fondo y a las células de adentro, y los científicos tapan el mango: no se puede recortar limpia. Están dibujados con los colores medidos en la referencia 1, con grano. | `magnifier/lupa-marco.png` |
| La pelirroja no sostiene el mango | No hay una ilustración suya con esa pose. Está al lado del mango, con su pose de siempre: no se le inventó un brazo. | `scientists/pelirroja-sostiene.png` |

## Ilustraciones que faltan

1. **`magnifier/lupa-marco.png`** (imprescindible para el acabado final)
   - Aro, conector y mango, con el mismo estilo de la referencia.
   - Fondo y vidrio **100 % transparentes**: sin turquesa ni células adentro.
   - Mango hacia abajo a la izquierda, a unos 36° de la vertical.
   - El vidrio de al menos 1000 px de diámetro en el archivo.
2. **`magnifier/lupa-reflejos.png`** (recomendable)
   - Solo los brillos del vidrio, sobre fondo transparente y con el mismo encuadre que `lupa-marco.png`.
   - Va encima de las células ampliadas.
3. **`scientists/pelirroja-sostiene.png`** (imprescindible para que sostenga el mango)
   - La pelirroja de tres cuartos, mirando hacia arriba a la derecha, con las manos en el mango.
   - Mismo estilo y ropa que su hoja de rotación, fondo transparente, al menos 800 px de alto.
4. **Para la etapa C** (opcional): cabeza y cuerpo de cada científico en archivos aparte, con el mismo encuadre. Sin eso, el movimiento se limita a inclinar apenas el cuerpo entero.

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
