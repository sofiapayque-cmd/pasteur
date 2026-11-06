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

Biblioteca científica (migraciones 13 y 14, aplicadas en dev el 6/11): ver `docs/BIBLIOTECA.md`. Como reemplazan `validar_para_revision` y `revisar`, las 111 pruebas de equipo y fichas hay que volver a correrlas en dev con el `4-…` regenerado.

## Pruebas

`bash supabase/pruebas/correr.sh` (Postgres 16 con pgvector, desde cero):

- `1-pruebas-seguridad.sql`: 101 OK (aulas, sin cambios).
- `3-pruebas-equipo-fichas.sql`: 111 OK (alta por invitación, roles, flujo editorial completo, corrección en revisión, autoaprobación, pedir cambios y reenviar, huella, retiro, suspendida, índice, accesos de maestra/alumno/sin sesión).
- Con cuatro reglas debilitadas a propósito (roles, texto publicado congelado, huella al aprobar, solo validadoras aprueban) fallan las pruebas que las cuidan.

En el proyecto real: `4-pruebas-equipo-fichas-real.sql` (las mismas 111, en una sola transacción que termina con un error a propósito y se deshace entera; probada en local: 111 OK y nada queda guardado). **Corrida en `ciencia-sin-limites-dev` el 5/11: 111 OK · 0 FALLAS**, y después se verificó que no quedó nada (ni el esquema `t3`, ni usuarios de prueba, ni filas en las tablas nuevas). El conector de Supabase pide confirmación antes de mandarla, porque incluye `delete` (son las pruebas de que no se puede borrar).
