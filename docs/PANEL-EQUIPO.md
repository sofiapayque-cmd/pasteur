# Panel del equipo del Pasteur (`/equipo`) — etapa IA-2 + B-1

Rama `ia/asistente`. Se prende con `NEXT_PUBLIC_ASISTENTE=1` (con Supabase configurado). Apagado, `/equipo` da 404.
Base de datos: migraciones 8, 9, 13 y 14 (ver `docs/ASISTENTE-IA.md` y `docs/BIBLIOTECA.md`).

## Pantallas

| Ruta | Quién | Qué |
| --- | --- | --- |
| `/equipo/entrar` | todas | Ingreso con mail y contraseña. Una cuenta del equipo no es de maestra (y al revés). |
| `/equipo/clave` | quien llega con un link | Elegir contraseña (invitación o link nuevo). |
| `/equipo` | todas | Inicio: números, cómo funciona, nombre y laboratorio propios. |
| `/equipo/fichas` | todas | Fichas por estado. |
| `/equipo/fichas/nueva` | todas | Pregunta o dato, actividad y tema. |
| `/equipo/fichas/[id]` | todas | Editor de la versión abierta (contador de palabras: 90 pregunta / 60 dato), fuentes con pasaje, mandar/sacar de revisión, versión nueva desde la publicada, historia, retirar (validadora o admin). |
| `/equipo/revisar` | validadoras (las demás ven qué espera) | Artículos y fichas en revisión, los más viejos primero. |
| `/equipo/revisar/[version]` | validadoras | Lectura completa con fuentes y la versión publicada al lado; aprobar, pedir cambios o rechazar. Lleva la huella del texto. |
| `/equipo/biblioteca` | todas | Búsqueda en vivo en OpenAlex + Europe PMC (sin guardar) y lista de la biblioteca. |
| `/equipo/biblioteca/[id]` | todas | Datos, resumen, enlaces, licencia (fijarla a mano: validadora o admin), duplicados, revisión como fuente, retirar. |
| `/equipo/miembros` | admin | Invitar con link, cambiar rol, suspender, link nuevo. |

## Cómo está hecho

- **Capas:** `proxy.ts` manda a `/equipo/entrar` sin sesión (comodidad) → cada página y cada Server Action vuelve a verificar con `exigirMiembro()` / `miembroCon(...)` (`src/datos/equipo.ts`) → **RLS y triggers de la base** deciden de verdad. Las acciones escriben con la sesión del miembro.
- **Clave secreta** (`SUPABASE_SECRET_KEY`), solo servidor y siempre después de verificar el rol: links de acceso (admin), `guardar_registro` y `registrar_licencia` (biblioteca), bitácora de búsquedas.
- **Invitaciones sin mail:** el servidor de mail de Supabase solo le escribe a miembros de la organización. La admin genera un link (`auth.admin.generateLink`) y se lo manda a la persona. Vale una vez y vence (por defecto 1 hora; Supabase → Authentication → Email → *Email OTP Expiration*, hasta 24 h). **Quien tiene el link entra como esa persona**: lo genera solo la admin, se muestra una vez y queda en el registro del servidor (Vercel → Logs, `[equipo] link …`). Con SMTP propio, conviene mandarlo por mail directo.
- El link vuelve a `/equipo/entrar` con la sesión en el `#`; `LinkDeMail` (layout raíz) la abre y `abrirLinkDeMail` manda a `/equipo/clave` si la cuenta es del equipo. **La dirección del preview tiene que estar en Supabase → Authentication → URL Configuration → Redirect URLs**; si no, Supabase vuelve a la *Site URL* (otra rama) y el link no sirve.
- **Biblioteca:** buscar no guarda. "Agregar" manda solo fuente + id; el servidor vuelve a pedir el registro a la fuente, lo completa con la otra por DOI y lo guarda. Conectores en `src/lib/ciencia/` (`normalizar.ts` sin red, probado con `npm run test:ciencia`; `proveedores.ts` con las consultas, 10 s máximo cada una). Nunca se pide texto completo.
- Mensajes de error: los de las reglas de la base ya están en castellano y se muestran tal cual; los de Postgres se traducen (`src/datos/errores.ts`).

## Verificación (6/11)

- `tsc`, ESLint (sin avisos en lo nuevo) y `next build` con el panel prendido y apagado.
- `npm run test:ciencia`: 8 pruebas de los conectores (HTML en títulos, resumen invertido, preprint, revisión, retractado, Instituto, enlaces que no son http, DOI igual en las dos fuentes).
- Local: `/equipo/entrar` se ve y rechaza una contraseña equivocada; sin sesión, las demás rutas mandan al ingreso. Pantallas del editor y la revisión revisadas con datos de ejemplo en ancho de computadora y de celular.
- Nombres de las relaciones que usa el panel para unir tablas, comprobados en `ciencia-sin-limites-dev`.
- **Falta probarlo con cuentas reales en el preview** (no hay acceso de red a Supabase desde donde se desarrolló).

## Para probarlo en el preview de `ia/asistente`

1. Vercel → Settings → Environment Variables, entorno *Preview*, rama `ia/asistente`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (Sensitive) del proyecto dev, y `NEXT_PUBLIC_ASISTENTE=1`. Redeploy.
2. Supabase dev → Authentication → URL Configuration → Redirect URLs: agregar la dirección del preview de la rama + `/**`.
3. Primera admin: invitación anotada en la base (`invitaciones_equipo`, rol admin) y después Supabase → Authentication → Users → *Add user* → *Create new user* con ese mail y una contraseña (*Auto Confirm*). El trigger de alta la pone en el equipo.
4. Entrar en `/equipo/entrar` → Equipo → invitar a la validadora → copiarle el link.
