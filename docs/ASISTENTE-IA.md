# Asistente científico y fichas validadas — estado

Diseño completo: documento "Asistente científico · diseño del módulo de IA" (claude.ai) y `claude/asistente-ia.md` del proyecto.
Rama: `ia/asistente` (sale de `supabase/aulas`).

## Etapa IA-1 · Base de datos (en revisión)

**Aplicadas el 5/11 en `ciencia-sin-limites-dev` (las dos, idénticas byte a byte a los archivos: mismo md5). Producción (`ciencia-sin-limites`) no se tocó.** Las advertencias de seguridad de Supabase no marcan nada nuevo.

| Migración | Qué crea |
| --- | --- |
| `20261106120000_equipo.sql` (8) | `equipo` (redactora, validadora, admin), `invitaciones_equipo`, funciones `privado.es_equipo()`, `es_validador()`, `es_admin_equipo()`. Ajusta el trigger de alta: un mail invitado entra al equipo y no se vuelve maestra. |
| `20261106120100_fichas.sql` (9) | `temas`, `fuentes`, `fichas` (pregunta o dato), `ficha_versiones`, `version_fuentes` (cita con pasaje, ubicación y paráfrasis), `revisiones`, `eventos_editoriales`, `fragmentos` (índice del asistente, con pgvector) y la vista `fichas_validadas`. |

Reglas que impone la base (ajustadas el 5/11 con Sofia):

- Roles: **redactora** escribe y envía (nunca aprueba); **validadora** (científica del Pasteur) corrige, aprueba, pide cambios o rechaza; **admin** invita, cambia roles y puede redactar, pero no aprueba. Nadie cambia su propio rol.
- Solo una validadora activa aprueba. Puede aprobar su propio texto: queda marcado como `autoaprobada` en la revisión, en el registro y en `fichas_validadas`.
- En revisión se puede corregir: la autora y cualquier validadora. Cada cambio (también en las citas) recalcula la huella SHA-256, y aprobar exige la huella del texto que se está viendo. La autora puede retirar su envío y volver a borrador.
- Pedir cambios devuelve la MISMA versión a borrador; no hace falta empezar de nuevo.
- Publicada, reemplazada o rechazada ya no cambia (ni el dueño de la base). Para cambiar una ficha publicada se abre una versión nueva (copia); los chicos siguen viendo la anterior hasta que se apruebe.
- Para estar en revisión: versión infantil de hasta 90 palabras (pregunta) o 60 (dato) —son máximos, no mínimos—, al menos una fuente, cada artículo con su pasaje y ubicación, y paráfrasis si el pasaje no es textual.
- Retirar exige motivo y lo hace una validadora o la admin.
- `revisiones` y `eventos_editoriales` solo admiten agregar filas: son la prueba que respalda el sello.
- El índice `fragmentos` solo acepta la versión publicada vigente, y lo escribe el servidor.
- Maestras, alumnos y visitantes no ven ninguna tabla editorial.

Biblioteca científica (migraciones 13 y 14, aplicadas en dev el 6/11): ver `docs/BIBLIOTECA.md`. Como reemplazan `validar_para_revision` y `revisar`, las 111 pruebas de equipo y fichas se volvieron a correr en dev con el `4-…` regenerado: 111 OK.

## Etapa IA-2 · Panel del equipo (6/11, en la rama, sin probar con cuentas reales)

Ver `docs/PANEL-EQUIPO.md`: ingreso del equipo, fichas, revisión, biblioteca con búsqueda en vivo (B-1) e invitaciones por link.

Respuestas redactadas con IA y tablero `/equipo/respuestas` (pedido de Sofia, 6/11): la IA busca artículos, redacta con citas comprobadas y manda a revisión; la validadora aprueba ficha y artículos juntos. Necesita la **migración 15** (`20261106140000_respuestas_ia.sql`), **aplicada en dev el 6/11** (37 OK también en dev, sin dejar datos). Detalle en `docs/PANEL-EQUIPO.md`. Probado el 6/11 con la cuenta real de la validadora: aprobó dos respuestas y quedaron publicadas.

## Etapa IA-3 · "Preguntale al Pasteur" (asistente para la clase, 6/11, en la rama)

La maestra entra a `/maestra/preguntar` (botón arriba a la derecha en todas sus pantallas), escribe la pregunta que hizo la clase y el asistente:

1. Verifica que es una maestra activa y descuenta su cupo del día (40 preguntas).
2. Limpia la pregunta: mails, links, teléfonos y números largos se cambian por `[…]`. La pantalla avisa que no hacen falta nombres de chicos.
3. Pasa la pregunta por la moderación de OpenAI (gratis). Si toca algo delicado, no busca ni guarda nada, y sugiere conversarlo en clase.
4. Busca **solo entre respuestas aprobadas** (embeddings `text-embedding-3-small` de la pregunta, sus variantes y la versión infantil; función `buscar_fragmentos`).
   - Si es la misma pregunta (parecido ≥ 0,84, ajustable con `ASISTENTE_UMBRAL`): muestra la respuesta tal cual, con el sello "Revisado por una investigadora del Institut Pasteur de Montevideo", sus artículos y el botón **Mostrar en grande** (para proyectar; Esc cierra).
   - Si hay parecidas (≥ 0,68): las ofrece para elegir.
   - Si no hay nada: dice que todavía no la tenemos.
5. Si no fue "la misma", la pregunta se anota para el equipo **sin maestra, sin aula y sin hora** (`preguntas_sin_respuesta`: texto, actividad, cuántas veces y fechas). Las repetidas suman. Se borran solas a los 90 días salvo las que el equipo pidió.

**Nunca se inventa una respuesta en clase**: la IA solo redacta en el tablero del equipo, y eso pasa por la validadora antes de llegar al aula.

En el tablero `/equipo/respuestas` aparece "Preguntas de las clases" (si hay): el equipo elige hasta 4 y la IA las redacta y las manda a revisión (quedan "pedidas" y unidas a su ficha), o las descarta. Al aprobar una respuesta, se agrega sola al índice del asistente (y si algo falla ahí, el asistente completa el índice la próxima vez que alguien pregunta).

Necesita la **migración 17** (`20261106160000_asistente_clase.sql`): `buscar_fragmentos`, `cupos_asistente` + `usar_cupo_asistente`, `preguntas_sin_respuesta` + `anotar_pregunta_sin_respuesta`. Todas las funciones son solo del servidor (clave secreta); el equipo ve y marca las preguntas por RLS. **Aplicada en dev el 6/11** con el OK de Sofia (idéntica al archivo: mismo md5). Advertencias de Supabase: solo el aviso informativo de `cupos_asistente` sin reglas, que es a propósito (solo el servidor la usa, igual que `intentos_ingreso`).

Pruebas: `11-pruebas-asistente.sql` (36 OK en local) y `12-pruebas-asistente-real.sql` (las mismas, en una transacción que se deshace: **36 OK en dev el 6/11**, sin dejar datos); `npm run test:asistente` (limpieza y decisión, 6 OK).

Por calibrar con datos reales: los dos umbrales de parecido.

## Pruebas

`bash supabase/pruebas/correr.sh` (Postgres 16 con pgvector, desde cero):

- `1-pruebas-seguridad.sql`: 101 OK (aulas, sin cambios).
- `7-pruebas-respuestas-ia.sql`: 37 OK (migración 15).
- `9-pruebas-ingreso-alumnos.sql`: 29 OK (migración 16).
- `11-pruebas-asistente.sql`: 36 OK (migración 17).
- `3-pruebas-equipo-fichas.sql`: 111 OK (alta por invitación, roles, flujo editorial completo, corrección en revisión, autoaprobación, pedir cambios y reenviar, huella, retiro, suspendida, índice, accesos de maestra/alumno/sin sesión).
- Con cuatro reglas debilitadas a propósito (roles, texto publicado congelado, huella al aprobar, solo validadoras aprueban) fallan las pruebas que las cuidan.

En el proyecto real: `4-pruebas-equipo-fichas-real.sql` (las mismas 111, en una sola transacción que termina con un error a propósito y se deshace entera; probada en local: 111 OK y nada queda guardado). **Corrida en `ciencia-sin-limites-dev` el 5/11: 111 OK · 0 FALLAS**, y después se verificó que no quedó nada (ni el esquema `t3`, ni usuarios de prueba, ni filas en las tablas nuevas). El conector de Supabase pide confirmación antes de mandarla, porque incluye `delete` (son las pruebas de que no se puede borrar).
