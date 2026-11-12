# Pantalla 02 · ¿Cómo querés explorar? (con Moli 3D)

Rama `frontend/rol-moli`, que sale de `frontend/hero-ilustrado` porque usa las células de la portada. Sin merge ni producción hasta que Sofia lo autorice.

## Etapas

| Etapa | Qué | Estado |
| --- | --- | --- |
| 1 · Diagnóstico | Código actual y archivo `moli.blend` | Hecha (12/11) |
| 2 · Composición quieta | Título, dos placas, células, Moli 3D sentada en «Soy maestra» | Hecha (12/11) |
| 3 · Reposo y saludo | Células que viajan; Moli respira, balancea las piernitas, parpadea y mira; saludo de «Soy maestra» | Hecha (12/11), **espera la revisión de Sofia** |
| 4 · El salto | «Soy alumno»: se para, salta en arco, aterriza con rebote, saluda; navegación | Hecha (12/11), **espera la revisión de Sofia** |
| 5 · Verificación | Rendimiento, accesibilidad, coherencia con la portada | Hecha en el navegador de pruebas; falta una Ceibal real |

## Decisiones de Sofia (12/11)

- **Opción B:** Moli con piernitas. Son dos trazos finos en negro mate, como las "patas" del Moli 2D (`src/components/Moli.jsx`). El resto del modelo queda tal cual.
- **Se estira y se aplasta un poco, sin exagerar:** como mucho un 10 %, siempre desde los pies y sin cambiar el volumen.
- Textos: «Soy maestra» y «Soy alumno». Las rutas son las que ya existen: `/maestra` y `/clase`.
- Sin el texto vertical «Institut Pasteur de Montevideo» que tenía la pantalla anterior.

## El modelo

- Original: `moli.blend` de Sofia. No se toca.
- `docs/moli/preparar_moli_web.py` arma una **copia**, `docs/moli/moli-web.blend`, y exporta `public/models/moli.glb`. Corre con Blender 4.2 o más, o con el módulo `bpy`:
  - **Boca:** queda una sola salida de material, para todos los motores. Antes había dos, y la del Principled era solo para EEVEE: en la web la boca salía blanca.
  - **Piernitas:** bisel de 0,036, con el material de la boca y el origen en la cadera.
  - **Jerarquía:** `MOLI` (piso) › `Cuerpo` (centro del oxígeno) › oxígeno, cara y `Hombro` izquierdo/derecho › hidrógeno; `MOLI` › `Cadera` izquierda/derecha › piernita.
  - Borra los materiales sin usar.
- No hace falta rig: Moli son piezas rígidas. Moverla es girar o correr piezas enteras; la malla nunca se deforma.
- `docs/moli/render_respaldo.py` hace la imagen de respaldo (`public/illustrations/rol/moli-sentada.webp`): Moli sentada, renderizada con Cycles desde la copia.

## Cómo se mueve

Todo lo de Moli vive en un solo objeto (`EstadoMoli`, en `moli.ts`). GSAP cambia esos números (`coreografia.ts`) y en cada cuadro se pasan al 3D. React no se vuelve a dibujar.

- **Reposo:**
  - respira (el cuerpo crece de 1 a 1,025, en unos 5 s);
  - balancea las piernitas (una adelante y la otra atrás, a veces descansa);
  - se ladea apenas y parpadea cada 2 a 5 s (a veces dos veces seguidas);
  - el cuerpo gira un poco hacia el puntero (hasta 12°).
- **«Soy maestra»:** sigue sentada, mira de frente, levanta un hidrógeno y saluda tres veces. La placa larga una onda. Después, `/maestra`.
- **«Soy alumno»:**
  1. Se para: las piernitas bajan debajo del cuerpo.
  2. Toma envión: se aplasta un 8 %.
  3. Despega: se estira un 6 %, levanta las manos, recoge las piernitas y se inclina hacia donde va.
  4. Vuela en arco: x pareja, y en parábola. Sube como mucho 130 unidades, así no pasa por encima del título.
  5. Aterriza: se aplasta un 10 % y vuelve con un rebote elástico. La sombra pasa a «Soy alumno» y la placa larga una onda.
  6. Saluda con el otro hidrógeno.
  7. Navega a `/clase`. En total son unos 2,7 s.
- **Una sola elección:** al tocar una placa, las dos quedan bloqueadas (`aria-disabled`) y la otra se apaga.
- **Plazo:** si la animación no termina, navega igual a los 3,4 s, medidos en el reloj de GSAP (un salto lento no se corta en el aire).
- **Reducir movimiento:** nada se mueve y navega al instante.
- **Sin 3D** (cargando o sin WebGL): la placa responde y navega a los 0,35 s.

## El código

`src/components/rol/`:

| Archivo | Qué hace |
| --- | --- |
| `escenaRol.ts` | Datos: rutas, tamaño de las placas, células de esta pantalla, medidas de Moli y del respaldo. |
| `EscenaRol.tsx` | La pantalla: células, título, placas y Moli. Elegir, bloquear, ondas, sombras y navegar. |
| `Placa.tsx` | Cada opción: un `<button>` con forma de placa de Petri (brillo, colonias, sombra de Moli). |
| `MoliEnEscena.tsx` | Moli 3D (React Three Fiber): luz, lienzo, calidad, y el control para saludar o saltar. Se carga aparte. |
| `moli.ts` | Partes del modelo, el estado de Moli y cómo se pasa al 3D. |
| `coreografia.ts` | Reposo, saludo y salto (GSAP). |
| `rol.css` | Estilos (`rol-moli…`, `rol-placa…`). |

Compartido con la portada (`src/components/hero/`):

- `FloatingCells` (las mismas células) y `celulas.css`.
- `animarCelulas.ts`: el viaje de las células sin lupa. Usa el mismo `deriva.ts` de la portada, al que se le hizo opcional la lupa; para la portada no cambió nada y sus pruebas siguen pasando.

**Escena:** como en la portada, en unidades (`--u`).

- Horizontal: 1920 × 1080.
- Celular parado: 1080 × 1920, con las placas igual lado a lado (para que el salto sea el mismo).
- Las células van en otra capa de 1920 × 1080 que **cubre** la pantalla.

**Moli en 3D:**

- **Lienzo:** cubre solo por donde puede andar Moli (las dos placas y el salto), no toda la pantalla.
- **Cámara ortográfica:** 1 unidad = 1 píxel. Moli se ubica midiendo las placas reales.
- **Luz:** la del archivo. Las dos luces de área en disco del `.blend`, con su tamaño, potencia y posición, y el fondo gris 0,05, usadas como entorno (PMREM), con tono AgX. Contra el render de Cycles, la diferencia media es de unos 12 niveles sobre 255. Falta la sombra de contacto entre el cuerpo y los hidrógenos.
- **Calidad que se adapta:**
  - Arranca con bordes suaves (antialiasing) y hasta ×1,5 de resolución.
  - Si en reposo el promedio de los cuadros pasa de 40 ms (menos de 25 por segundo), sigue sin antialiasing y a ×1, que es lo que más pesa en una compu lenta.
  - Si igual no anda, queda la imagen.
  - En reposo dibuja a 30 cuadros por segundo; saludando o saltando, a 60.
- **Clics:** el lienzo los deja pasar a las placas (`pointer-events: none`).

**Solo en desarrollo** (no existen en producción):

- `localStorage.moliCalidad = 'alta'` deja la calidad fija.
- `localStorage.moliVelocidad = '0.5'` pone todo en cámara lenta (para grabar videos).
- `window.__moliLuz` sirve para igualar la luz.

## Peso

- La página aparece enseguida, con Moli en imagen (14 KB).
- El 3D llega después: unos 234 KB de JS comprimido (three + fiber) y 291 KB de modelo (comprimido por el servidor). Con un procesador normal, Moli 3D está lista en ~1,8 s.

## Rendimiento (12/11)

En este entorno no hay placa de video: Chrome dibuja el 3D por software (SwiftShader), que es mucho más lento que cualquier placa real.

- Sin el 3D (células, placas, título): 60 cuadros por segundo con el procesador 4 veces más lento; el hilo principal está ocupado un 30 %.
- Con el 3D por software, en calidad alta: ~18 cuadros por segundo de promedio. Por eso la calidad se adapta sola: sin antialiasing, unos 44.
- **Falta probar en una Ceibal real.** Si ahí no llega a 25 cuadros por segundo, baja la calidad o queda la imagen, sin que nadie tenga que hacer nada.

## Pruebas

`npm run test:rol-navegador`, con la página corriendo:

```
E2E_URL=http://localhost:3000 NODE_PATH=$(npm root -g) npm run test:rol-navegador
```

Revisa:

1. Moli sentada en el borde de «Soy maestra», sin errores.
2. Las células se mueven y no tapan el título.
3. «Soy maestra» saluda y navega una sola vez, aunque se haga un segundo clic.
4. «Soy alumno» aterriza en su placa y navega a `/clase`.
5. El orden con el teclado.
6. Reducir movimiento: todo quieto y navega al instante.

Pasa contra la versión de producción (12/11). La portada sigue igual (`npm run test:portada`: 14 de 14).
