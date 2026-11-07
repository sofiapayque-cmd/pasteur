# Biblioteca científica (PubMed, OpenAlex y Europe PMC) — estado

Diseño completo: documento "Biblioteca científica curada · OpenAlex y Europe PMC" (claude.ai) y `claude/biblioteca-cientifica.md` del proyecto.
Rama: `ia/asistente`. Complementa `docs/ASISTENTE-IA.md`.

## Etapa B-2 · Base de datos (en revisión)

**Aplicadas el 6/11 en `ciencia-sin-limites-dev` con la aprobación de Sofia ("aplicalas"), idénticas byte a byte a los archivos (mismo md5). Producción no se tocó.** En dev: `6-pruebas-biblioteca-real.sql` dio **130 OK · 0 FALLAS** sin dejar datos; los controles de seguridad de Supabase no marcan nada nuevo. El 6/11 también se volvió a correr ahí `4-pruebas-equipo-fichas-real.sql` con la 13 y la 14 ya aplicadas: **111 OK · 0 FALLAS**. Después de las dos tandas no quedó nada (ni esquemas `t3`/`t5`, ni usuarios de prueba, ni filas en las tablas nuevas) y la política de licencias quedó igual.

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

## PubMed (7/11, migración 18)

Pedido de Sofia, por recomendación de la validadora: PubMed es la base que usan las investigadoras del Instituto.

- **Cómo se consulta:** con las E-utilities de NCBI (`esearch` ordenado por relevancia + `efetch` en XML). Solo metadatos y resumen, nunca texto completo.
  - Sin clave: 3 pedidos por segundo. Todos los pedidos del servidor pasan por una fila que los espacia, y si NCBI contesta 429 se reintenta una vez.
  - `NCBI_API_KEY` (opcional, solo servidor) sube el límite a 10 por segundo. Nunca va a la bitácora.
  - Se identifica con `tool=ciencia-sin-limites`. `NCBI_EMAIL` es opcional.
- **Qué se lee del XML** (`dePubMed` en `src/lib/ciencia/normalizar.ts`):
  - PMID, título y resumen (los estructurados con su etiqueta: "Background: …");
  - DOI (del artículo, o de la lista de ids si el del artículo está mal escrito) y PMC;
  - revista, año (también de MedlineDate), idioma, autores con ORCID, MeSH y palabras clave;
  - si es revisión o preprint, si está retractado, y si hay autores del Institut Pasteur de Montevideo.
  - La lista de referencias se descarta antes de leer, porque trae ids de otros trabajos.
- **El mismo trabajo** que llega de varias fuentes se junta si comparte DOI, PMID o PMC (`agrupar`), aunque una de ellas no traiga DOI.
- **Qué fuente manda en cada dato** (`guardar_registro`, migración 18):
  - PubMed manda en el resumen y en los MeSH, como Europe PMC.
  - OpenAlex sigue mandando en título, año, tipo, revista, autores y citas.
  - El servidor guarda en este orden: OpenAlex → Europe PMC → PubMed. Así queda el resumen de PubMed cuando está, que es el que lee la IA que redacta.
- **Licencias:** PubMed no informa licencias. Las siguen dando OpenAlex y Europe PMC; sin ninguna, la cita va con ubicación y paráfrasis.
- **En pantalla:**
  - Búsqueda: PubMed, OpenAlex y Europe PMC a la vez, y "Ver en PubMed" en cada resultado.
  - Ficha del artículo: de qué fuente viene el resumen.
- **La IA que redacta:**
  - busca en las tres fuentes, con la primera búsqueda también solo entre revisiones;
  - le da +1 a lo que está en PubMed (revistas biomédicas indexadas), además de las revisiones;
  - usa el resumen de PubMed si está.
- **Sin probar contra la API real desde acá:** este entorno no llega a NCBI. Las pruebas usan un XML con la forma real del `PubmedArticleSet`. La primera búsqueda real es en el preview.

## Pruebas

`bash supabase/pruebas/correr.sh` (Postgres 16 con pgvector, desde cero): 101 OK (aulas) · 111 OK (equipo y fichas) · **130 OK (biblioteca, `5-pruebas-biblioteca.sql`)**.

- `bash supabase/pruebas/carrera.sh`: dos altas simultáneas del mismo DOI desde dos conexiones → una sola publicación. Sin el bloqueo salen dos.
- Pruebas de mutación: con cada una de estas reglas debilitada fallan pruebas: citar solo aprobadas, el servidor no cambia estados, licencia controla las citas, retiro en cascada, huella al aprobar, retractada no se aprueba.
- Para el proyecto real: `6-pruebas-biblioteca-real.sql` (y `4-…` para equipo y fichas), generados con `python3 supabase/pruebas/a-real.py`. Corren en una sola transacción que se deshace; probados en local: 111 y 130 OK, sin dejar nada.

Cambios en lo ya aplicado en dev (migración 9): las migraciones 13 y 14 reemplazan `privado.validar_para_revision` y `privado.revisar` con CREATE OR REPLACE (mismos permisos). Por eso `3-pruebas-equipo-fichas.sql` ahora crea la publicación que cita y prueba "curiosidades: todavía no disponible" en lugar de publicaciones.
