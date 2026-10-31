# Guía para desarrollar una actividad

Proyecto: **La ciencia sin límites**, plataforma educativa del Institut Pasteur de Montevideo para niñas y niños de 7 a 11 años. Se usa en clase: cada niño en su **Ceibal** (computadoras escolares modestas, pantalla típica 1366×768, a veces tablets) y la maestra guía desde su computadora proyectada. También hay un modo individual (sin sala).

Stack: Next.js 16 (App Router, en migración) + React 19 + React Router 6 (HashRouter, se reemplaza en la etapa 3). CSS puro con tokens. `three@0.169.0` está instalado (solo usarlo si una actividad lo necesita de verdad, y siempre con alternativa liviana). **No instales otros paquetes.**

## Qué archivos son tuyos

Cada actividad vive en `src/actividades/aN/`. Solo escribís dentro de tu carpeta (podés crear subcarpetas, CSS, componentes). **No modifiques archivos compartidos** (`src/components`, `src/sala`, `src/styles`, `src/pantallas`, `src/app`, `App.jsx`, otras actividades). Si necesitás un cambio compartido, describilo en tu informe final.

Tu carpeta debe exportar:

- `index.jsx` → `export default function ActividadAN({ progreso })`: la experiencia completa del niño. Se dibuja dentro de `MarcoActividad`, que ya pone el fondo de color, organismos flotando, la cabecera, la barra de etapas y la pantalla de pausa. Vos dibujás el contenido. Ancho disponible: toda la pantalla menos márgenes; el contenedor ya tiene padding `24px 40px 160px` (el abajo deja lugar a Moli).
- `etapas.js` con:
  - `ETAPAS`: `[{ id, nombre }]` en orden (la maestra ve una columna por etapa en el tablero en vivo). Entre 5 y 8 etapas. La última es la de cierre.
  - `PREGUNTAS`: 3 preguntas para la puesta en común.
  - `GUIA`: `{ titulo, objetivos: [3 frases] }` para la guía docente.
  - `OPCIONES` (opcional): lo que la maestra elige al preparar, `[{ clave, etiqueta, items: [{ id, nombre, detalle, color }] }]`. Se guarda en `progreso.opciones[clave]` (lista de ids habilitados). En modo individual `progreso.opciones` es `{}`: tratalo como "todo habilitado".
  - `DESBLOQUEOS` (opcional): etapas que la maestra habilita en vivo, `[{ clave, etiqueta, etapa, accion, recomendado, explicacion }]`. Consultá `progreso.desbloqueado(clave)`.
  - `simularDatos(indiceEtapa, sala)`: datos plausibles para alumnos de prueba en esa etapa.
  - `resumen(datos)`: una línea corta con lo que hizo el niño (la ve la maestra).

## El objeto `progreso`

```js
progreso.etapa            // id de la etapa actual (al empezar: ETAPAS[0].id)
progreso.datos            // objeto con lo que la actividad guardó
progreso.ir('etapa', {…}) // cambia de etapa y mezcla datos nuevos
progreso.guardar({…})     // guarda datos sin cambiar de etapa
progreso.reiniciar()      // vuelve a empezar
progreso.enClase          // true si está en una sala con su maestra
progreso.desbloqueado(k)  // la maestra habilitó k (siempre true en modo individual)
progreso.opciones         // lo que eligió la maestra ({} en modo individual)
progreso.pausada          // la maestra pausó (el marco ya tapa la pantalla)
```

Reglas: la etapa visible SIEMPRE sale de `progreso.etapa` (la maestra la ve). Los datos se guardan como JSON simple y chico (sin funciones, sin imágenes; menos de ~5 KB). El estado de interacción fino (posición de un arrastre, un slider moviéndose) va en `useState` local; los resultados que importan, en `progreso.guardar`.

## Piezas compartidas que podés usar

- `import Moli from '../../components/Moli'` → `<Moli animo="feliz|escucha|piensa|eureka|duda|alegria" fase="liquido|hielo|vapor" estilo="3d|plano" patas tamano={160} />`. Moli es el guía: una molécula de agua.
- `import GloboMoli from '../../components/GloboMoli'` → Moli fijo abajo a la derecha con un globo de texto (máx. 2 líneas): `<GloboMoli texto="…" animo="piensa" />`.
- `import Aviso from '../../components/Aviso'` → cuando el niño acierta, se equivoca o necesita pista: `<Aviso tipo="error|acierto|pista|dato" titulo="…" accion="Probar otra vez" onAccion={…}>Explicación</Aviso>`.
- `import Microvista from '../../components/Microvista'` → lente circular con organismos ilustrados: `<Microvista colores={['#93AEEB','#F4A6BD']} semilla={4} tamano={360} />`.
- `import Cargando from '../../components/Cargando'`.

Clases CSS globales: `.btn` + `.btn--primario | --secundario | --experimentar | --claro | --grande`, `.etiqueta` (+ `.etiqueta--oscura`), `.tarjeta`, `.pendiente` (caja punteada para contenido a definir), `.anim-crecer`, `.anim-entrar`, `.texto-suave`, `.enlace`, `.solo-lector`.

Tokens (en `src/styles/tokens.css`): `--agar #FBF9F1` fondo, `--vidrio #E4E7EC`, `--membrana #D4DCF7`, `--plasma #93AEEB` (marca; NUNCA texto blanco encima), `--nucleo #2F4A85` (titulares, botón primario), `--tinta #22232A` texto, `--tinta-suave #5E6070`, `--clorofila #E3EEA0` (acción de experimentar, acierto), colores vida solo para formas: `--coral #EF6F5E`, `--tincion #F4A6BD`, `--cultivo #F2B13B`, `--cilio #8ED5C3`, `--filamento #7272EE` (líneas). Fondos de actividad: `--a1-fondo`, `--a2-fondo`, `--a3-fondo`, `--a4-fondo`. Fuentes: `--font-display` (Fraunces, titulares), `--font-sans` (Lexend, todo lo demás), `--font-mono` (IBM Plex Mono, etiquetas de laboratorio en mayúsculas). Radios `--radius-sm 12px | md 24px | lg 40px | pill`. Sombras `--halo`, `--halo-cerca`. Curvas `--ease-organico` (aparecer, rebotar), `--ease-pantalla` (transiciones).

## Dirección de arte (resumen)

Concepto "límites permeables": orden afuera, vida adentro. La interfaz es calma, tipográfica, con aire; los organismos y la ciencia son vivos, con forma, color, grano y movimiento. Los organismos se construyen con el kit de 5 capas: membrana (círculo o cápsula apenas irregular), citoplasma (degradado radial), núcleo (punto denso 18–28% del diámetro), orgánulos (3 a 12 puntitos), apéndices (cilios, flagelos, espículas) que cruzan el borde. Cinco verbos de animación: **respirar, crecer, dividirse, fluir, unirse**. Superposiciones translúcidas en `mix-blend-mode: multiply`. Nada de emojis. Nada de estética cartoon escolar: lúdico pero sofisticado (referencias: portadas de Nature/Science, renders 3D suaves).

Titulares de pantalla en Fraunces (32–56px), instrucciones en Lexend 18–20px, etiquetas en mono mayúscula 12–13px. Botones de 56px de alto mínimo. Una instrucción clara por pantalla, con verbo en voseo rioplatense: "Arrastrá", "Mirá", "Probá otra vez".

## Pedagogía (lo que pidió la autora)

- **Lúdico**: se aprende haciendo (arrastrar, girar, ajustar, comparar), no leyendo. Poco texto, mucho hacer.
- **Se puede equivocar**: tiene que haber errores posibles y realistas. El error nunca castiga: Moli explica qué pasó y por qué, y se puede probar otra vez. Los errores son ciencia de verdad (ej. contaminar una placa, una foto desenfocada, una hipótesis que no se cumplió).
- **Que se vea la realidad**: procedimientos, instrumentos y palabras reales de laboratorio, explicados para chicos (ej. "asa de siembra", "incubadora", "canal de fluorescencia"), y consecuencias reales (el tiempo que tarda algo en crecer, la luz que apaga la fluorescencia).
- **No lineal** donde tenga sentido: libertad para elegir qué investigar.
- **Precisión científica**: solo ciencia general bien establecida. Nada atribuido al Institut Pasteur que no esté confirmado. Todo lo que haya que validar con el laboratorio va entre [corchetes] o en un comentario `// VALIDAR:` y lo listás en el informe.

## Accesibilidad y rendimiento

- Todo lo que se arrastra tiene alternativa con clic o teclado.
- Contraste de texto 4.5:1 (texto oscuro sobre colores claros).
- `prefers-reduced-motion`: sin animaciones grandes.
- Ceibal: preferí SVG y Canvas 2D; animá solo `transform` y `opacity`; nada de bucles pesados sin `requestAnimationFrame`; limpiá timers e intervalos al desmontar.
- Sin imágenes externas ni de internet (la red no las deja cargar): todo se dibuja con código.

## Cómo probar tu actividad

En modo individual se abre en `#/explorar/aN`. Para compilar sin pisar a otros:

```
cd /home/claude/ciencia-sin-limites
npm run build
npx next start -p 41N0 &
```

Y recorrela con Playwright en Python (`from playwright.async_api import async_playwright`, Chromium ya instalado; viewport 1366×768), sacando capturas de cada etapa y revisando errores de consola (ignorá las fuentes de Google, que la red bloquea). Si el build falla por un archivo que NO es tuyo, esperá un minuto y reintentá: otra persona lo está editando.
