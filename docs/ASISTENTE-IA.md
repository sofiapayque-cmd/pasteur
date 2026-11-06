# Asistente científico y fichas validadas — estado

Diseño completo: documento "Asistente científico · diseño del módulo de IA" (claude.ai) y `claude/asistente-ia.md` del proyecto.
Rama: `ia/asistente` (sale de `supabase/aulas`).

## Etapa IA-1 · Base de datos (en revisión)

**Migraciones escritas y probadas en un Postgres local. NO están aplicadas en ningún proyecto de Supabase.**

| Migración | Qué crea |
| --- | --- |
| `20261106120000_equipo.sql` (8) | `equipo` (investigadora, validadora, admin), `invitaciones_equipo`, funciones `privado.es_equipo()`, `es_validador()`, `es_admin_equipo()`. Ajusta el trigger de alta: un mail invitado entra al equipo y no se vuelve maestra. |
| `20261106120100_fichas.sql` (9) | `temas`, `fuentes`, `fichas` (pregunta o dato), `ficha_versiones`, `version_fuentes` (cita con pasaje, ubicación y paráfrasis), `revisiones`, `eventos_editoriales`, `fragmentos` (índice del asistente, con pgvector) y la vista `fichas_validadas`. |

Reglas que impone la base:

- Nadie aprueba su propio texto; solo una validadora activa revisa.
- Una versión enviada a revisión queda congelada (ni el dueño de la base la cambia) y lleva una huella SHA-256 de su texto y sus citas. Aprobar exige la misma huella.
- Para enviar: versión infantil de hasta 90 palabras (pregunta) o 60 (dato), al menos una fuente, cada artículo con su pasaje y ubicación, y paráfrasis si el pasaje no es textual.
- Aprobar publica la versión, reemplaza la anterior y apaga su índice. Retirar exige motivo y lo hace una validadora o la admin.
- `revisiones` y `eventos_editoriales` solo admiten agregar filas.
- El índice `fragmentos` solo acepta la versión publicada vigente, y lo escribe el servidor.
- Maestras, alumnos y visitantes no ven ninguna tabla editorial.

## Pruebas

`bash supabase/pruebas/correr.sh` (Postgres 16 con pgvector, desde cero):

- `1-pruebas-seguridad.sql`: 101 OK (aulas, sin cambios).
- `3-pruebas-equipo-fichas.sql`: 92 OK (alta por invitación, roles, flujo editorial completo, huella, retiro, suspendida, índice, accesos de maestra/alumno/sin sesión).
- Con tres reglas debilitadas a propósito (roles, texto congelado, cuatro ojos) fallan las pruebas que las cuidan.

Falta antes de aplicar en `ciencia-sin-limites-dev`: la aprobación de Sofia y una versión de las pruebas nuevas para correr en el proyecto real (como `2-pruebas-supabase-real.sql`, que se deshace sola).
