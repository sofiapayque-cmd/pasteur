# Borrador de la base de datos (Supabase)

**No está aplicado en ningún lado.** Es la propuesta para revisar antes de crear las tablas.

- `esquema.sql`: tablas (`docentes`, `grupos`, `salas`, `alumnos_en_sala`), reglas de seguridad (RLS),
  funciones (`unirse_a_sala`, `apodos_ocupados`) y tiempo real. Usa los mismos campos que la sala
  de prueba de hoy (`src/tipos/sala.ts`), así la web no tiene que cambiar.
- Los niños **no tienen cuenta ni dan su nombre**: entran con código y apodo, con una sesión anónima
  de Supabase que solo sirve para que las reglas sepan cuál es su fila.
- Al final de `esquema.sql` están las decisiones pendientes (cuánto se guardan los datos, cómo se
  habilita a las maestras, si hacen falta grupos).

## Cómo se creó el proyecto en Supabase

Región São Paulo · *Enable Data API* activado · *Automatically expose new tables* **desactivado**
(ninguna tabla queda accesible si `esquema.sql` no lo dice) · *Enable automatic RLS* activado.
Por eso `esquema.sql` da cada permiso de forma explícita y no le da ninguno a quien no tiene sesión.

## Qué se probó

En un Postgres 16 local, imitando lo que Supabase trae (`prueba-local/0-imitacion-supabase.sql`),
se aplicó `esquema.sql` sin errores y se corrieron las pruebas de `prueba-local/2-pruebas-reglas.sql`:

| Prueba | Resultado |
| --- | --- |
| Una maestra no ve las salas de otra ni puede crear salas a su nombre | Bloqueado |
| El niño entra con el código (en minúscula también) y ve su sala | Funciona |
| El niño guarda su etapa y sus datos | Funciona |
| El niño cambia su apodo o modifica la sala | Bloqueado |
| Código que no existe | "Ese código no existe" |
| Un niño ve las filas de otros niños | Bloqueado (solo ve los apodos ocupados) |
| Apodo repetido en la misma sala | Bloqueado |
| La maestra ve a todos sus alumnos y pausa la sala | Funciona |
| Sin sesión: leer salas o entrar | Bloqueado (sin permiso sobre las tablas) |
| Dos salas abiertas con el mismo código | Bloqueado; se puede reutilizar al cerrar |

Para repetirlo: `psql -f prueba-local/0-imitacion-supabase.sql`, después `-f esquema.sql`, después
`-f prueba-local/2-pruebas-reglas.sql`, en una base vacía.

## Cuando esté aprobado

1. En Supabase: **SQL Editor** → pegar `esquema.sql` → **Run** (o pasarlo a `supabase/migrations/`).
2. **Authentication → Sign In / Providers**: activar *Email* (maestras) y *Allow anonymous sign-ins* (niños).
3. **Authentication → Email Templates**: el link del mail apunta a
   `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email&siguiente=/maestra`.
4. **Authentication → URL Configuration**: *Site URL* = la dirección de Vercel.
5. Escribir `src/sala/repositorioSupabase.ts` siguiendo `src/sala/repositorio.ts`.
