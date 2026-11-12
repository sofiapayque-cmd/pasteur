# Pantalla 02 · ¿Cómo querés explorar? (con Moli 3D)

Rama `frontend/rol-moli`, que sale de `frontend/hero-ilustrado` porque usa las células de la portada. Sin merge ni producción hasta que Sofia lo autorice.

## Etapas

| Etapa | Qué | Estado |
| --- | --- | --- |
| 1 · Diagnóstico | Código actual y archivo `moli.blend` | Hecha (12/11) |
| 2 · Composición quieta | Título, dos placas, células, Moli 3D sentada en «Soy maestra» | Hecha (12/11), **espera la revisión de Sofia** |
| 3 · Reposo y saludo | Respirar, piernitas, parpadeo, mirada; saludo de «Soy maestra» | Pendiente |
| 4 · El salto | «Soy alumno»: se para, salta en arco, aterriza, saluda; navegación | Pendiente |
| 5 · Verificación | Rendimiento (Ceibal), accesibilidad, coherencia con la portada | Pendiente |

## Decisiones (Sofia, 12/11)

- **Opción B:** Moli con piernitas. Son dos trazos finos en negro mate, como las "patas" del Moli 2D (`src/components/Moli.jsx`). El resto del modelo queda tal cual.
- Textos: «Soy maestra» y «Soy alumno». Las rutas son las que ya existen: `/maestra` y `/clase`.
- Sin el texto vertical «Institut Pasteur de Montevideo» que tenía la pantalla anterior.
- Pendiente: si Moli puede estirarse y aplastarse un poco en el salto (escala de todo Moli, sin deformar la malla) o solo rebotar.

## El modelo

- Original: `moli.blend` de Sofia. No se toca.
- `docs/moli/preparar_moli_web.py` arma una **copia**, `docs/moli/moli-web.blend`, y exporta `public/models/moli.glb`. Corre con Blender 4.2 o más, o con el módulo `bpy`:
  - **Boca:** queda una sola salida de material, para todos los motores. Antes había dos, y la del Principled era solo para EEVEE: en la web la boca salía blanca.
  - **Piernitas:** bisel de 0,036, con el material de la boca y el origen en la cadera.
  - **Jerarquía:** `MOLI` (piso) › `Cuerpo` (centro del oxígeno) › oxígeno, cara y `Hombro` izquierdo/derecho › hidrógeno; `MOLI` › `Cadera` izquierda/derecha › piernita.
  - Borra los materiales sin usar.
- No hace falta rig: Moli son piezas rígidas. Las poses solo giran piezas enteras: los hidrógenos (manos) giran alrededor del centro del oxígeno y las piernitas, desde la cadera.
- `docs/moli/render_respaldo.py` hace la imagen de respaldo (`public/illustrations/rol/moli-sentada.webp`): Moli sentada, renderizada con Cycles desde la copia.
- Colores y rugosidades pasan exactos. El relieve de terciopelo (ruido procedural) no pasa a glTF; a este tamaño no se nota.

## El código (`src/components/rol/`)

| Archivo | Qué hace |
| --- | --- |
| `escenaRol.ts` | Datos: rutas, tamaño de las placas, células de esta pantalla, medidas de Moli y del respaldo. |
| `EscenaRol.tsx` | La pantalla: células, título, placas y Moli (respaldo + 3D). Precarga las dos rutas. |
| `Placa.tsx` | Cada opción: un `<button>` con forma de placa de Petri (brillo, colonias, sombra de Moli). |
| `MoliEnEscena.tsx` | Moli 3D (React Three Fiber). Se carga aparte, después de la página. |
| `moli.ts` | Partes del modelo y poses (sin React). |
| `rol.css` | Estilos (`rol-moli…`, `rol-placa…`). |

- **Escena:** como en la portada, en unidades (`--u`).
  - Horizontal: 1920 × 1080.
  - Celular parado: 1080 × 1920, con las placas igual lado a lado (para que el salto sea el mismo).
  - Las células van en otra capa de 1920 × 1080 que **cubre** la pantalla.
- **Células:** el mismo `FloatingCells` de la portada. Sus estilos pasaron a `hero/celulas.css`, para que los usen las dos pantallas; la portada no cambió.
- **Un solo Moli.** Primero se ve la imagen de respaldo; cuando el 3D está dibujado, aparece en el mismo lugar. Si no hay WebGL o el modelo no carga, queda la imagen.
- **Cámara ortográfica:** 1 unidad = 1 píxel del lienzo. Moli se ubica midiendo la placa real, así queda bien en cualquier pantalla. Se inclina 7° hacia la pantalla, como la cámara del render de Blender.
- **Luz:** la del archivo, no una parecida. Se arma la misma "habitación" que en Blender:
  - las dos luces de área en disco, con su tamaño, potencia y posición;
  - el fondo gris 0,05;
  - usada como entorno (PMREM), con tono AgX.
  - Comparada contra el render de Cycles, la diferencia media por píxel es de unos 12 niveles (sobre 255). La que queda es la sombra de contacto entre el cuerpo y los hidrógenos, que Cycles calcula y el tiempo real no.
- Se dibuja solo cuando algo cambia (`frameloop="demand"`), con resolución máxima ×1,5.
- El lienzo deja pasar los clics a las placas (`pointer-events: none`).

## Peso (producción)

- Página: aparece enseguida, con Moli en imagen (14 KB).
- 3D, que llega después: unos 234 KB de JS comprimido (three + fiber) y 291 KB de modelo (comprimido por el servidor).
- Moli 3D lista en ~1,7 s con un procesador normal; en la Ceibal, más. Mientras tanto se ve la imagen.

## Probado (12/11)

- 1440 × 900, 1024 × 600 (Ceibal) y 390 × 844 (celular): sin errores en la consola. Moli queda sentada en el borde de «Soy maestra».
- **Teclado:** Volver → Soy maestra → Soy alumno, con anillo de foco.
- **Navegación:**
  - Enter en «Soy maestra» lleva al acceso docente: `/maestra`, que manda a `/maestra/entrar` si no hay sesión.
  - Un clic en «Soy alumno» lleva a `/clase`.
- La portada sigue igual (14 células); `npm run test:portada`: 14 de 14.
