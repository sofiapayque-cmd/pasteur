# Biblioteca científica (OpenAlex y Europe PMC) — estado

Diseño completo: documento "Biblioteca científica curada · OpenAlex y Europe PMC" (claude.ai) y `claude/biblioteca-cientifica.md` del proyecto.
Rama: `ia/asistente`. Complementa `docs/ASISTENTE-IA.md`.

## Etapa B-2 · Base de datos (en revisión)

**Migraciones escritas y probadas en un Postgres local. Todavía NO están aplicadas en ningún proyecto de Supabase: esperan la aprobación de Sofia.**

| Migración | Qué crea |
| --- | --- |
| `20261106130000_biblioteca_publicaciones.sql` (13) | `proveedores_cientificos`, `tipos_identificador`, `busquedas_guardadas`, `ejecuciones_busqueda`, `registros_crudos`, `publicaciones`, `publicacion_identificadores`, `publicacion_procedencias`, `publicacion_relaciones`, `publicacion_temas`, `publicacion_accesos`; la función del servidor `guardar_registro()`; la revisión de publicaciones; la clave foránea de `version_fuentes.publicacion_id`. Extensión `pg_trgm` (en `extensions`). |
| `20261106130100_biblioteca_licencias.sql` (14) | `licencias` (política de pasajes), `verificaciones_licencia`, la función del servidor `registrar_licencia()`, el control de pasajes textuales y la vista `pasajes_a_revisar`. |

Reglas que impone la base:

- Solo el equipo ve la biblioteca. Maestras, alumnos y visitantes no ven ninguna tabla.
- Una publicación entra como **candidata** (vence a los 90 días) y solo la agrega el servidor, con `guardar_registro()`. El equipo no inserta publicaciones directo.
- **Duplicados:** los identificadores (DOI, PMID, PMCID, OpenAlex, Europe PMC) se normalizan y tienen clave única: el mismo DOI que llega de OpenAlex y de Europe PMC queda en una sola publicación. Si un registro coincide con dos publicaciones distintas no se fusiona solo: queda una relación `posible_duplicado`. Un título casi igual (≥ 0,9, mismo año ±1, mismo primer autor) solo se sugiere. Un bloqueo por identificador evita que dos búsquedas simultáneas creen la misma publicación dos veces.
- **Qué fuente manda:** OpenAlex en título, año, tipo, revista, autores, temas, citas y acceso abierto; Europe PMC en resumen, MeSH y "es preprint". Retractación y "del Instituto": basta con que una fuente lo diga.
- **Revisión:** cualquiera del equipo la manda a revisión; aprueba, pide cambios (vuelve a candidata) o rechaza solo una validadora activa, con la huella de lo que está viendo. Si la agregó ella misma, queda marcada `autoaprobada`. Al rechazar se borra el resumen interno. El servidor no puede aprobar.
- **Aprobada:** título, año, tipo, revista y autores ya no cambian. Una retractación no se deshace.
- **Citas:** una ficha solo va a revisión si todas las publicaciones que cita están aprobadas. Cada artículo citado necesita su ubicación y su pasaje o su paráfrasis.
- **Licencias:** `textual` (hasta 60 palabras), `breve` (hasta 25) o `solo_ubicacion` (paráfrasis). Política inicial prudente: CC0, dominio público y CC BY/BY-SA/BY-ND textual; no comerciales, acceso abierto del editor y desconocidas en `solo_ubicacion` hasta que el Instituto confirme. La edita solo la admin y cada cambio queda en el registro editorial. Si las fuentes no coinciden, gana la más restrictiva y queda para revisar; una validadora o la admin pueden fijarla a mano y lo automático no la pisa. Las verificaciones no se editan.
- **Retiro o retractación de una publicación aprobada:** las fichas en revisión que la citan vuelven a borrador; las publicadas que la tenían como única fuente se retiran y salen del índice del asistente; las que tienen otra fuente siguen publicadas, con un aviso en el registro.
- La consulta guardada de cada búsqueda no puede contener la clave de la API.

Queda para después (B-3 a B-5): fusionar duplicados confirmados, búsqueda híbrida sobre los resúmenes, vencimiento y purga automáticos (pg_cron), búsquedas semanales y chequeo mensual de licencias.

## Pruebas

`bash supabase/pruebas/correr.sh` (Postgres 16 con pgvector, desde cero): 101 OK (aulas) · 111 OK (equipo y fichas) · **130 OK (biblioteca, `5-pruebas-biblioteca.sql`)**.

- `bash supabase/pruebas/carrera.sh`: dos altas simultáneas del mismo DOI desde dos conexiones → una sola publicación. Sin el bloqueo salen dos.
- Pruebas de mutación: con cada una de estas reglas debilitada fallan pruebas: citar solo aprobadas, el servidor no cambia estados, licencia controla las citas, retiro en cascada, huella al aprobar, retractada no se aprueba.
- Para el proyecto real: `6-pruebas-biblioteca-real.sql` (y `4-…` para equipo y fichas), generados con `python3 supabase/pruebas/a-real.py`. Corren en una sola transacción que se deshace; probados en local: 111 y 130 OK, sin dejar nada.

Cambios en lo ya aplicado en dev (migración 9): las migraciones 13 y 14 reemplazan `privado.validar_para_revision` y `privado.revisar` con CREATE OR REPLACE (mismos permisos). Por eso `3-pruebas-equipo-fichas.sql` ahora crea la publicación que cita y prueba "curiosidades: todavía no disponible" en lugar de publicaciones.
