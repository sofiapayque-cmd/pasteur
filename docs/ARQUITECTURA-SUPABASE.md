# Aulas persistentes con Supabase — auditoría, esquema y modelo de seguridad

Etapa 1 (propuesta). Rama `supabase/aulas`. **Nada de esto está aplicado en Supabase todavía.**

## 1. Auditoría (1/11/2026)

| Qué | Estado |
| --- | --- |
| Migración a Next.js | Completa en `migracion/nextjs`. PR #1 abierto: `main` sigue con la versión Vite y por eso el deploy de producción en Vercel falla. El preview de `migracion/nextjs` compila y funciona. |
| Git | Ramas `main` (Vite), `version-vite` (respaldo), `migracion/nextjs`, `supabase/aulas` (esta). Árbol limpio. |
| Supabase (proyecto `ciencia-sin-limites`, São Paulo) | Sin tablas (el borrador nunca se aplicó). Auth: solo email, registro abierto con confirmación por mail, inicio anónimo desactivado. Tablas no expuestas por defecto, RLS automático. |
| Vercel | Proyecto `pasteur` (Hobby) con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en Production y Preview, ambas apuntando al mismo proyecto de Supabase. |
| Código | `src/lib/supabase` (clientes navegador/servidor, proxy), `src/sala/repositorio.ts` (contrato de la sala), sala de prueba en localStorage. |

**Límites del plan gratuito de Supabase que afectan el diseño** ([precios](https://supabase.com/pricing), [límites de Auth](https://supabase.com/docs/guides/auth/rate-limits)):

- 2 proyectos activos → alcanza justo para **desarrollo + producción**. Sin *branching*.
- **El proyecto se pausa tras 1 semana sin uso.** Para un piloto real con escuelas conviene el plan Pro.
- **Mails: 2 por hora** con el servidor de mail de Supabase → invitar maestras o recuperar contraseñas necesita un SMTP propio (ej. Resend).
- Realtime: 200 conexiones simultáneas (≈ 6 clases de 30 niños a la vez).
- Auth limita **por IP**: ingreso 150 cada 5 min (ráfagas de 30). En una escuela todos los niños salen por la misma IP. Si el ingreso pasa por el servidor de Vercel, Supabase vería la IP de Vercel para todas las escuelas: hay que reenviar la IP real del niño (`Sb-Forwarded-For`, solo con clave secreta).

## 2. Revisión del borrador anterior (`supabase/borrador/`)

El borrador modelaba **salas efímeras**: código de 4 letras por clase, niños con sesión anónima y apodo. Sirve para una clase suelta, pero no para lo que pedís ahora:

| Necesidad nueva | Problema del borrador | Cambio |
| --- | --- | --- |
| Aulas que duran todo el año | La sala se cierra y se pierde | **`aulas`** persistentes, con código fijo |
| Seguir desde otra computadora | La sesión anónima vive en un solo navegador | **Cuentas de alumno** con usuario y clave (`K7RM-07` + clave) |
| Ingreso sin nombre ni mail, del lado del servidor | Sesión anónima creada en el navegador; límite de 30 por hora por IP (una clase entera no entra) | El **servidor** crea las cuentas y hace el ingreso |
| Tareas, no solo clases en vivo | La sala mezclaba actividad y clase en vivo | **`asignaciones`** (qué actividad) + **`sesiones`** (la clase en vivo) |
| Guardar el avance y los resultados científicos | Solo `datos` dentro del alumno de la sala | **`progreso`** (para retomar) + **`resultados`** (registro que no se modifica) |

## 3. Esquema propuesto

```
auth.users ──┬── docentes ── aulas ──┬── alumnos (cuentas anónimas: K7RM-01 … K7RM-30)
             │                       ├── asignaciones (a1…a4 + opciones de la maestra)
             └── alumnos             │       ├── sesiones (clase en vivo: esperando / en curso / pausa / puesta)
                                     │       ├── progreso (1 por alumno y asignación: etapa + datos)
                                     │       └── resultados (registro científico, solo se agrega)
                                     └── intentos_ingreso (bloqueo contra adivinar claves; solo servidor)
```

| Tabla | Para qué | Datos personales |
| --- | --- | --- |
| `docentes` | Perfil de la maestra (se crea solo con un trigger) | Nombre y escuela (opcionales); el mail vive en Supabase Auth |
| `aulas` | "4° B" de la maestra; `codigo` fijo de 4 caracteres | Ninguno |
| `alumnos` | Cuenta de cada niño: aula, número de lista, usuario `K7RM-07`, apodo y color opcionales | **Ninguno**: sin nombre, sin mail, sin fecha de nacimiento. La maestra guarda en papel qué número es cada niño |
| `asignaciones` | Actividad dada a un aula, con sus opciones (lo que hoy elige en "Preparar la clase") | Ninguno |
| `sesiones` | La clase en vivo (lo que hoy es la sala). Una sola abierta por aula | Ninguno |
| `progreso` | Etapa y `datos` de cada niño en cada asignación: **lo que permite retomar** | Respuestas de la actividad |
| `resultados` | Cada placa incubada, corrida o captura, con fecha. No se modifica ni se borra | Respuestas de la actividad |
| `intentos_ingreso` | Fallos de clave por usuario, para bloquear temporalmente | Ninguno |

Reglas de integridad: claves foráneas compuestas impiden mezclar aulas o actividades (un progreso de A1 no puede colgarse de una asignación de A3 ni de otra aula); `datos` hasta 64 KB y `resultados` hasta 16 KB; códigos y usuarios con formato fijo. **Nada se borra desde la web**: las aulas se archivan, los alumnos se desactivan, las asignaciones se cierran.

Migraciones: `supabase/migrations/` (1. tablas, 2. seguridad, 3. tiempo real).

## 4. Identidad y autenticación

### Maestras
- Supabase Auth con **mail y contraseña** (no link mágico: los mails son limitados y la maestra puede entrar desde la escuela sin abrir su correo).
- **Alta por invitación** (decidido): registro abierto desactivado; el equipo invita a cada maestra desde Supabase. Al aceptar elige su contraseña en `/maestra/clave`.
- Al crearse su usuario, un trigger crea su fila en `docentes` con `estado = 'activa'`.
- **Preparado para el futuro, sin implementar:** `docentes.estado` admite `pendiente` y `suspendida`. Un "Solicitar acceso" crearía maestras `pendiente` (registro abierto + trigger que ponga `pendiente`), y un panel del equipo del Pasteur (usuarios con `app_metadata.rol = 'admin'`, puesto solo desde el servidor) las aprobaría o suspendería. Las reglas ya dejan sin acceso a toda maestra que no esté `activa`, y la maestra no puede cambiar su propio estado.

### Alumnos (sin nombre ni mail)
1. La maestra crea un aula e indica cuántos niños tiene (ej. 28).
2. **El servidor** (Server Action con la clave secreta) crea 28 usuarios de Supabase Auth:
   - usuario visible `K7RM-01` … `K7RM-28`;
   - por dentro, un mail interno `k7rm-01@alumnos.invalid`, que no existe y nunca recibe nada (`.invalid` está reservado). Es solo porque Supabase identifica a los usuarios por mail;
   - `app_metadata.rol = 'alumno'`, que el usuario no puede cambiar;
   - una clave al azar, que **solo existe con hash dentro de Supabase Auth**.
3. La maestra ve las claves **una sola vez**, para imprimir las tarjetas (usuario + clave; opcional: el QR del link de ingreso). No se guardan en ningún otro lado. Si un niño pierde la suya, la maestra genera una nueva.
4. **Formato de clave (decidido):** dos palabras fáciles + dos números (`sapo-luna-42`). Unas 6 millones de combinaciones, que con el bloqueo por intentos alcanzan para datos de este tipo.

### Ingreso del alumno, del lado del servidor
`/clase` → el niño escribe usuario y clave → **Server Action**:
1. valida el formato;
2. revisa `intentos_ingreso`: con 5 fallos seguidos, ese usuario queda bloqueado 10 minutos;
3. inicia sesión en Supabase **desde el servidor** con la clave secreta, mandando la IP real del niño (`Sb-Forwarded-For`), así el límite de Supabase cuenta por escuela y no por Vercel;
4. guarda la sesión en cookies seguras (`@supabase/ssr`) y anota `ultimo_ingreso`;
5. el navegador nunca ve el mail interno ni toca la clave secreta.

Botón **Salir** para computadoras compartidas. El niño sigue desde cualquier computadora entrando con su tarjeta.

## 5. Autorización (capas)

| Capa | Qué hace |
| --- | --- |
| `proxy.ts` | Renueva la sesión y redirige: sin sesión de maestra → `/maestra/entrar`; sin sesión de alumno → `/clase`. Es comodidad, **no** la frontera de seguridad |
| Server Actions | Cada acción vuelve a verificar quién llama (`getClaims()` + fila en `docentes`/`alumnos`) antes de hacer algo |
| **RLS en Postgres** | **La frontera real.** Aunque alguien llame a la API directo con la clave pública, solo ve y cambia lo que las reglas permiten |
| Clave secreta | Solo en Vercel (`SUPABASE_SECRET_KEY`, sin `NEXT_PUBLIC_`), en un módulo `server-only`. Se usa para 3 cosas: crear cuentas de alumnos, cambiar sus claves, ingreso con IP reenviada. Siempre después de verificar que la maestra es dueña del aula |

**Quién puede qué** (todo lo demás está negado; sin sesión, nada):

| | Maestra (su aula) | Alumno (el suyo) | Otra maestra / otro alumno |
| --- | --- | --- | --- |
| Aulas | crear, ver, renombrar, archivar | ver la suya | nada |
| Alumnos | ver, activar/desactivar, apodo | ver su fila, elegir apodo y color | nada |
| Asignaciones | crear, ver, abrir/cerrar | ver las publicadas de su aula | nada |
| Sesiones en vivo | abrir, pausar, desbloquear, cerrar | ver (pausa, puesta) | nada |
| Progreso | ver | crear y guardar el suyo, solo en asignaciones abiertas | nada |
| Resultados | ver | agregar (no cambiar ni borrar) | nada |
| Borrar cualquier cosa | no | no | no |

Las reglas comprueban pertenencia con **tablas** (`docentes`, `alumnos.activo`), no con datos del navegador: desactivar a un niño le corta el acceso en la siguiente consulta.

## 6. Entornos y aplicación de migraciones

| Entorno | Supabase | Vercel | Datos |
| --- | --- | --- | --- |
| Desarrollo | **nuevo** proyecto `ciencia-sin-limites-dev` | variables de *Preview* + `.env.local` | de prueba |
| Producción | `ciencia-sin-limites` (el actual) | variables de *Production* | reales |

- Las migraciones se aplican **primero en desarrollo**, se prueban y recién después en producción.
- Nunca `db reset` ni borrar tablas en producción. Hoy producción está vacía: no hay datos que migrar ni que perder.
- La sala de prueba en localStorage sigue funcionando sin Supabase (demo y "Probar la actividad").

## 7. Las actividades no cambian

Las actividades solo usan `useProgreso()` (`etapa`, `datos`, `ir`, `guardar`). Por debajo:
- alumno con sesión y asignación → `progreso` en Supabase (se retoma desde cualquier computadora);
- sin sesión (explorar, "Probar la actividad") → como hoy, en la pestaña.

Más adelante, `progreso.registrar(tipo, valor)` para que cada actividad sume resultados. Es opcional y se agrega de a una actividad.

## 8. Plan por etapas (cada una se verifica y se aprueba antes de seguir)

| Etapa | Qué | Tus pasos |
| --- | --- | --- |
| **1** | **Auditoría, esquema, seguridad, migraciones probadas en local** ← esta | — |
| 2 | Proyecto de desarrollo; aplicar migraciones ahí; ingreso de la maestra (`/maestra/entrar`, salir, recuperar contraseña) | crear el proyecto dev; clave secreta en Vercel |
| 3 | Aulas: crear aula, cantidad de alumnos, cuentas y tarjetas imprimibles, regenerar clave | — |
| 4 | Ingreso del alumno del lado del servidor, bloqueo por intentos, prueba de 30 ingresos simultáneos | — |
| 5 | Asignaciones y sesiones en vivo con Supabase (reemplaza la sala local de a poco) | — |
| 6 | Panel de la maestra con datos reales (tablero en tiempo real, puesta en común) | — |
| 7 | Progreso guardado y retomado desde otra computadora; resultados | — |
| 8 | Auditoría de seguridad completa (RLS, asesor de seguridad de Supabase, claves, cabeceras) | — |
| 9 | Producción: migraciones en el proyecto real, SMTP propio, variables de Production, plan | decidir plan; SMTP |

## 9. Pruebas de esta etapa

- `supabase/pruebas/correr.sh`: crea un Postgres 16 desde cero, imita lo que Supabase trae (roles, `auth.users`, `auth.uid()`), aplica las 3 migraciones y corre **71 pruebas de seguridad** (maestra, otra maestra, maestra suspendida o pendiente, alumno, compañero, alumno de otra aula, desactivado, sin sesión, servidor). Resultado: **71 OK · 0 fallas**.
- Prueba de que las pruebas detectan errores: con 3 reglas debilitadas a propósito, fallan 5 pruebas.
- Lo que la imitación **no** cubre (se prueba en la etapa 2, en el proyecto de desarrollo): el Auth real, Realtime con RLS y el asesor de seguridad de Supabase.

## 10. Decisiones

Tomadas (1/11/2026):
1. Maestras **solo por invitación**, con la estructura lista para "Solicitar acceso" y un panel del equipo más adelante.
2. Claves de los niños: **palabras + número**.
3. Migraciones: **conector oficial de Supabase, solo en el proyecto de desarrollo**. Revisar antes de aplicar, nada que borre datos, pruebas de seguridad después, y parar a preguntar ante cualquier operación destructiva o irreversible.

Pendientes:
4. Cuánto tiempo se guardan los datos de los niños y qué se hace al terminar el año (validar con el Institut Pasteur; Ley 18.331 de protección de datos personales).
5. Plan de Supabase para el piloto con escuelas (gratis se pausa a la semana sin uso).

## 11. Interruptor del sistema real

`NEXT_PUBLIC_AULAS_REALES=1` prende el sistema de aulas (ingreso de maestras y, en las etapas siguientes, aulas y alumnos). Va **solo** en `.env.local` de desarrollo y en las variables *Preview* de Vercel (apuntando al proyecto dev). Sin esa variable, la web es el prototipo de siempre: así producción no cambia hasta aprobarlo.
