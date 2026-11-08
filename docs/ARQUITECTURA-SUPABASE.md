# Aulas persistentes con Supabase — auditoría, esquema y modelo de seguridad

Etapas 1 a 4 hechas y etapa 5 parte 1 (tareas) hecha, verificadas con cuentas reales en el preview de `ia/asistente` el 6/11/2026. Empezó en la rama `supabase/aulas`; desde el 5/11 se sigue en `ia/asistente`. **Las migraciones de aulas (1 a 7 y 16) están aplicadas solo en el proyecto de desarrollo** (`ciencia-sin-limites-dev`). Producción sigue vacía y sin tocar.

## 1. Auditoría (1/11/2026)

| Qué | Estado |
| --- | --- |
| Migración a Next.js | Completa en `migracion/nextjs`. PR #1 abierto: `main` sigue con la versión Vite y por eso el deploy de producción en Vercel falla. El preview de `migracion/nextjs` compila y funciona. |
| Git | Ramas `main` (Vite), `version-vite` (respaldo), `migracion/nextjs`, `supabase/aulas` (esta). Árbol limpio. |
| Supabase producción (`ciencia-sin-limites`, ref `wjaunybecxirzwebembp`) | Sin tablas (el borrador nunca se aplicó). Auth: solo email, registro abierto con confirmación por mail, inicio anónimo desactivado. Tablas no expuestas por defecto, RLS automático. **Ojo: la región real es us-east-2 (Ohio), no São Paulo** (verificado con el conector el 31/10). |
| Supabase desarrollo (`ciencia-sin-limites-dev`, ref `zicotbjzbnofydxqmkba`, São Paulo) | Creado el 31/10 con el conector (plan gratuito, sin costo). **Expone las tablas nuevas por defecto** (les da todo a anon, authenticated y service_role): las migraciones ya no dependen de eso. Las 7 migraciones aplicadas. Ingreso de maestra y creación de aula verificados con una cuenta real (1/11). |
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

Migraciones: `supabase/migrations/` (1. tablas, 2. seguridad, 3. tiempo real, 4. funciones de ayuda en el esquema `privado`, 5. reglas de aulas que dejan recibir el aula recién creada, 6. año lectivo y cierre de sesiones de alumnos, 7. una cuenta de alumno nunca es maestra).

Las funciones `security definer` que usan las reglas (`es_docente`, `es_docente_de_aula`, `mi_aula`, `asignacion_abierta`, `generar_codigo_aula`) viven en el esquema **`privado`**, que la API de Supabase no publica: las reglas las usan, pero nadie las puede llamar como `/rest/v1/rpc/…` (recomendación del asesor de seguridad, lint 0029).

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
| Desarrollo | `ciencia-sin-limites-dev` (`zicotbjzbnofydxqmkba`, São Paulo) | variables de *Preview* de la rama `supabase/aulas` + `.env.local` | de prueba |
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
| 1 | Auditoría, esquema, seguridad, migraciones probadas en local · hecha | — |
| 2 | Proyecto de desarrollo; aplicar migraciones ahí; ingreso de la maestra (`/maestra/entrar`, salir, recuperar contraseña) · hecha | crear el proyecto dev; clave secreta en Vercel |
| 3 | Aulas: crear aula, cantidad de alumnos, cuentas y tarjetas imprimibles, regenerar clave · hecha y verificada en el Supabase real | — |
| 4 | Ingreso del alumno del lado del servidor, bloqueo por intentos, prueba de 30 ingresos simultáneos · hecha (§14) | — |
| 5 | Asignaciones y sesiones en vivo con Supabase · parte 1: tareas con avance guardado (§15, probada); parte 2: clase en vivo con tiempo real (§16, escrita el 7/11, falta probarla en el preview) | probar con 2 o 3 navegadores |
| 6 | Panel de la maestra con datos reales (tablero en tiempo real, puesta en común) | — |
| 7 | Progreso guardado y retomado desde otra computadora; resultados | — |
| 8 | Auditoría de seguridad completa (RLS, asesor de seguridad de Supabase, claves, cabeceras) | — |
| 9 | Producción: migraciones en el proyecto real, SMTP propio, variables de Production, plan | decidir plan; SMTP |

## 9. Pruebas de esta etapa

- `supabase/pruebas/correr.sh`: crea un Postgres 16 desde cero, imita lo que Supabase trae (roles, `auth.users`, `auth.uid()`, y el **peor caso**: tablas y funciones nuevas expuestas por defecto), aplica las 5 migraciones y corre **77 pruebas de seguridad** (maestra, otra maestra, maestra suspendida o pendiente, alumno, compañero, alumno de otra aula, desactivado, sin sesión, servidor, usuario anónimo, funciones fuera de la API). Resultado: **77 OK · 0 fallas**.
- Prueba de que las pruebas detectan errores: con 3 reglas debilitadas a propósito fallan 5 pruebas; sin los arreglos del 31/10 (service_role, usuario anónimo, migración 4) fallan las 4 pruebas nuevas; sin la migración 5 fallan las 2 de crear/editar aula pidiendo la fila de vuelta.
- `supabase/pruebas/2-pruebas-supabase-real.sql`: las mismas pruebas + 10 extra (permisos de la API), para correr **en el proyecto dev real** como una sola consulta (conector o SQL Editor). Todo pasa en una transacción y el último paso lanza un error a propósito con el resultado: eso deshace todo. 1/11: **87 OK · 0 fallas** (77 + 10 extra); la base de prueba no conserva nada de la corrida.
- **Verificación con cuentas reales (dev, 1/11):**
  - Ingreso de maestra por la web (`/maestra/entrar`): funciona. Supabase registró el ingreso por contraseña hecho desde el servidor de Vercel con la clave secreta y el encabezado `Sb-Forwarded-For` con la IP real de la maestra.
  - Invitación: el mail de fábrica llega y el link funciona; la primera vez volvió a `localhost:3000` porque la *Site URL* no estaba configurada (paso 2 de la sección 12).
  - Crear aula con la cuenta real de la maestra y sus permisos (SQL con su identidad, deshecho al final): **falló** con "new row violates row-level security policy". Causa: `supabase-js` pide la fila de vuelta (`INSERT … RETURNING`) y la regla de lectura buscaba el aula en la tabla, donde dentro de la misma sentencia todavía no se ve. Lo arregla la **migración 5** (`ALTER POLICY`, sin borrar nada). Después: el aula se crea y devuelve su código, otra maestra no la ve ni la edita, la dueña la archiva.
- Asesor de seguridad de Supabase (dev, 1/11): aviso **INFO** de `intentos_ingreso` con RLS y sin reglas (a propósito: la usa solo el servidor) y **WARN** "Leaked password protection" (revisar contraseñas filtradas contra HaveIBeenPwned; es del plan Pro, entra en la decisión de plan de la etapa 9).
- Pendiente de rendimiento: las funciones de Vercel corren en Virginia (EE.UU.) y Supabase dev en São Paulo; conviene poner la región de funciones de Vercel en São Paulo (`gru1`) antes del piloto. Asesor de rendimiento: solo avisos esperables en una base vacía (índices sin usar, dos reglas de lectura por tabla, claves foráneas compuestas sin índice propio); se revisan con datos reales.
- Las versiones de las migraciones en Supabase las pone el conector al aplicarlas (`20261101023801`…), no son las de los nombres de archivo. Para producción se aplican igual, con el conector y en el mismo orden.

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

## 12. Ingreso de maestras en el proyecto dev (configuración)

Se hace una vez, en el panel de Supabase del proyecto **`ciencia-sin-limites-dev`** (mirar el nombre arriba a la izquierda antes de tocar nada) y en Vercel. La dirección de la web de prueba es la del preview de la rama: `https://pasteur-git-supabase-aulas-pasteur2.vercel.app` (comprobarla en Vercel → Deployments → el último de `supabase/aulas` → Domains; si es otra, usar esa en todos los pasos).

### Supabase → Authentication
1. **Sign In / Providers**: *Allow new users to sign up* **apagado** (solo por invitación); *Allow anonymous sign-ins* apagado; proveedor *Email* prendido.
2. **URL Configuration**: *Site URL* = la dirección del preview. *Redirect URLs*: esa dirección + `/**`, y `http://localhost:3000/**` para probar en la computadora. Nada más (cuantas menos, más seguro).
3. **Emails → Templates: no se tocan.** Sin un servidor de mail propio (SMTP), Supabase no deja editar las plantillas (aviso "Set up custom SMTP to edit templates"). La web funciona con las de fábrica: el botón del mail pasa por Supabase, que vuelve a la web con la sesión después del `#` (`#access_token=…&type=invite`). `src/components/LinkDeMail.tsx` (en el layout raíz) lo lee, lo borra de la dirección y del historial, y se lo pasa a la Server Action `abrirLinkDeMail`, que lo valida con Supabase, guarda la sesión en cookies y sigue a `/maestra/clave`. Si el link venció o ya se usó, va a `/maestra/entrar` con el aviso. La recuperación de contraseña usa el mismo camino (flujo implícito: se puede pedir en la escuela y abrir en el celular). Con SMTP propio (etapa 9) se pueden poner plantillas en español que apunten a `/auth/confirmar`, que ya está lista.
4. **Project Settings → API Keys**: copiar la *secret key* (`sb_secret_…`). Va **solo** en Vercel (paso siguiente) y en `.env.local`; nunca en el chat, en GitHub ni con `NEXT_PUBLIC_`.

### Vercel → proyecto `pasteur` → Settings → Environment Variables
Las dos que ya existen (*Production and Preview*) apuntan a producción y **no se tocan**. Se agregan cuatro, cada una con entorno **solo Preview** y rama **`supabase/aulas`**: para esa rama ganan las nuevas, y ninguna otra rama ni producción cambia.

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zicotbjzbnofydxqmkba.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_kiWWspI9BEZhWpBS_MVrFQ_hZ5eXSvD` (pública a propósito) |
| `NEXT_PUBLIC_AULAS_REALES` | `1` |
| `SUPABASE_SECRET_KEY` | la *secret key* del dev, marcada **Sensitive** |

Después hace falta un deploy nuevo de la rama (un push, o *Redeploy* del último).

### Primera maestra (prueba)
Supabase → Authentication → Users → *Add user* → *Send invitation* → tu mail. Con el servidor de mail de Supabase solo llegan mails a miembros de la organización y como máximo 2 por hora; el link vale una hora y un solo uso. El mail llega **en inglés** ("You've been invited" → *Accept invitation*). El link vuelve al inicio de la web, que pasa sola a `/maestra/clave` (contraseña de 10 caracteres o más) → panel. Después: *Salir* y volver a entrar en `/maestra/entrar` con mail y contraseña.

## 13. Etapa 3 · Aulas y cuentas de alumnos (1/11/2026)

**Pantallas** (solo con `NEXT_PUBLIC_AULAS_REALES=1`): `/maestra/aulas` (Mis aulas + Nueva aula) y `/maestra/aulas/[id]` (alumnos, nueva clave, agregar, claves nuevas para el grupo, activar/desactivar, datos, archivar). Botón "Mis aulas" en la cabecera de la maestra.

**Datos del aula:** nombre de la clase, año escolar (`grado`: 4°, 5° o 6°, pedido de Sofia el 6/11; la base admite 1 a 6), año lectivo (`anio_lectivo`, por defecto el año actual de Uruguay) y cantidad de alumnos (1 a 40 por vez; hasta 60 números por aula).

**Cuentas de alumnos** (`src/datos/cuentas-alumnos.ts`, único lugar que usa la clave secreta):
- Usuario `CÓDIGO-NN` (ej. `D2QN-07`); mail interno `d2qn-07@alumnos.invalid`; `app_metadata.rol = 'alumno'`.
- Clave `palabra-palabra-NN` con `crypto.randomInt` (256 palabras sin tildes, números 10-99: ~5,9 millones). La más larga (`frutilla-cuaderno-99`, 20 caracteres) entra en un renglón de la tarjeta.
- La clave solo queda con hash en Supabase Auth. No está en ninguna tabla (hay una prueba que lo verifica), ni en el navegador, ni en el registro del servidor.
- Si la fila en `alumnos` falla, la cuenta recién creada se deshace. Cuentas que fallan se informan por número y se completan con "Agregar alumnos".
- **Clave nueva:** cambia la clave, cierra las sesiones abiertas del alumno (`cerrar_sesiones_alumno`, solo servidor) y borra sus intentos fallidos. **Desactivar** también cierra sus sesiones.

**Autorización en cada acción** (`src/acciones/aulas.ts`): maestra activa → se busca el aula o el alumno **con la sesión de la maestra** (RLS: si no es suyo, no aparece) → recién ahí la clave secreta, con los datos que devolvió la base (nunca con ids del formulario).

**Tarjetas:** código del aula, número, clave, dónde entrar y un renglón para escribir el nombre a mano. Se muestran una sola vez (al crear o regenerar), con aviso; imprimir saca solo la hoja de tarjetas (A4, ~10 por hoja); el navegador avisa si se cierra la pestaña.

**Migraciones de esta etapa:** 6 (año lectivo, `cerrar_sesiones_alumno`) y 7 (una cuenta de alumno nunca es maestra: el trigger reconoce el mail interno y `es_docente()` rechaza tokens con rol alumno, por si Supabase guarda el usuario antes que su `app_metadata`).

**Pruebas:**
- Base: local **101 OK**; Supabase dev **111 OK** (deshecho). Nuevas: entre aulas y entre alumnos (ver, editar, desactivar, mover alumnos, cambiar año lectivo), quién puede cerrar sesiones, ninguna columna de contraseñas, cuenta de alumno con fila de docente igual sin permisos. Cada arreglo tiene su prueba que falla sin él.
- Navegador con Supabase simulado que imita las reglas: **36 OK** (crear, tarjetas, impresión, claves que no vuelven a aparecer, nueva clave, agregar, desactivar, grupo con confirmación, archivar, y 3 trampas de otra maestra cambiando ids ocultos: rechazadas, más 404 para aulas ajenas).
- Con el interruptor apagado la web no cambia.

**Prueba con el Supabase real (hecha):** Sofia creó un aula desde el preview el 3/11 y se verificó en la base el 5/11, solo con lecturas: todas las cuentas con `rol = 'alumno'`, ninguna figura como docente, la clave solo como hash de Supabase Auth, mail interno y usuario coinciden con el código del aula, y ninguna tabla tiene columnas de claves.

**Protección de los previews de Vercel:** Sofia la apagó el 6/11 (Vercel Authentication) para que maestras, chicos y la validadora puedan abrir el preview de `ia/asistente`.

## 14. Etapa 4 · Ingreso de los alumnos (6/11/2026, rama `ia/asistente`)

Se desarrolló en `ia/asistente` (la rama que ya tiene todo configurado en Vercel y Supabase dev).

**Pantallas** (solo con `NEXT_PUBLIC_AULAS_REALES=1`; apagado, `/clase` sigue siendo la sala de prueba):
- `/clase` y `/clase/[código]`: código del aula (4 casillas), número y clave, como dice la tarjeta. Perdona lo fácil de errar (minúsculas, espacios en vez de guiones, tildes, "7" o "07"; `src/lib/aulas/ingreso.ts`). La clave va tapada, con botón "Ver". Si ya entró, va a `/lab`.
- `/lab`: el laboratorio del alumno. Saludo, **apodo científico y color elegidos de listas** (nunca escritos: nadie pone su nombre real), "Explorar las actividades" y **Salir**. Las tareas y el avance guardado llegan en las etapas 5 y 7. Sin sesión de alumno → `/clase`.

**Ingreso del lado del servidor** (`src/acciones/alumno.ts`):
1. Ordena y valida el formato. Si algo está mal *escrito*, lo dice; si los datos no coinciden, nunca dice cuál.
2. Pide permiso para un intento (`reservar_intento_ingreso`, migración 16): hasta 5 seguidos por usuario; el 6.º bloquea 10 minutos. Se cuentan intentos (no solo fallos) con la fila bloqueada: **30 intentos a la vez contra el mismo usuario → pasan 5**.
3. Entra a Supabase con la clave secreta y la **IP real del chico** (`Sb-Forwarded-For`): el límite de Supabase cuenta por escuela. Si Supabase frena por exceso de pedidos (una clase entera a la vez), el intento se devuelve y el mensaje pide esperar un minuto.
4. Solo cuentas con `app_metadata.rol = 'alumno'`. Cuenta desactivada o aula archivada → sale y avisa "Tu cuenta está pausada".
5. Borra la cuenta de intentos y anota `ultimo_ingreso`. Sesión en cookies seguras; el proxy la renueva en `/clase` y `/lab`.

**Migración 16** (`20261106150000_ingreso_alumnos.sql`): `reservar_intento_ingreso` y `devolver_intento_ingreso`, SECURITY INVOKER, solo `service_role`. No toca nada existente.

**Pruebas:**
- `9-pruebas-ingreso-alumnos.sql`: 29 OK (quién puede usarlas, 5 intentos y bloqueo, fin del bloqueo, ventana de 10 minutos, devolver, formatos raros). Versión para el proyecto real: `10-…-real.sql`, probada en local (29 OK, nada queda).
- `carrera-ingreso.sh`: 30 conexiones a la vez → mismo usuario: pasan 5 y queda bloqueado; 30 alumnos distintos: pasan los 30. Sin el bloqueo de fila pasan 6: la prueba lo detecta.
- `npm run test:ingreso`: 4 pruebas de cómo se ordena lo que escribe el chico.
- Pantallas en 1024×600 (Ceibal), 1366×768 y celular, sin desborde; después de un error no se borra lo escrito.
- **Aplicada en `ciencia-sin-limites-dev` el 6/11** con el OK de Sofia, idéntica al archivo (mismo md5). En dev: **29 OK · 0 FALLAS**, sin dejar nada. Asesor de seguridad: nada nuevo.
- **Probado con una tarjeta real en el preview el 6/11:** el alumno `Q3V5-01` entró, eligió su apodo (una vez elegido no se puede cambiar) y llegó a su laboratorio. A los chicos no les aparece "Vista de la maestra" y no se menciona CREA.

## 15. Etapa 5, parte 1 · Tareas y avance guardado (6/11/2026, rama `ia/asistente`)

Sin migraciones: las tablas `asignaciones` y `progreso` y sus reglas RLS están desde la etapa 1.

**Maestra** (con el sistema de aulas):
- `/maestra/aulas/[id]`: nueva sección **"Actividades del aula"** (abierta/cerrada, cuántos empezaron y terminaron) y botón **"Mandar una actividad"**.
- `/maestra/aulas/[id]/mandar`: elegir la actividad (solo las disponibles) y sus opciones, las mismas de "Preparar la clase" (`OPCIONES`), y si lo que se habilita después (`DESBLOQUEOS`, por ejemplo antibióticos) está desde el principio o lo habilita ella.
- `/maestra/aulas/[id]/tareas/[tarea]`: **cómo va cada uno** (etapa con barra, terminó, último cambio), habilitar/cerrar lo pendiente, cerrar o reabrir la tarea. Se actualiza sola cada 20 s.

**Alumno:**
- `/lab`: **"Tus actividades"** con su estado (sin empezar / vas por… / ¡terminada! / cerrada por tu maestra) y Empezar/Seguir/Ver.
- `/lab/tarea/[id]`: la actividad de siempre con el **avance guardado en la base** (`useProgresoTarea`, `src/sala/progresoTarea.ts`): se guarda solo 1 s después del último cambio (al cambiar de etapa, enseguida), en fila (uno viejo nunca pisa uno nuevo), al ocultar la pestaña, y reintenta cada 5 s sin internet. Cartel "Guardado / Guardando… / Sin conexión / Tu maestra cerró esta actividad". Sin "Empezar de nuevo" ni "Vista de la maestra". Cada 30 s pregunta si la maestra habilitó o cerró algo. Al llegar a la última etapa queda **terminada** (`completada_en`).

**Seguridad:** todo con la sesión de quien llama (RLS): la maestra solo manda y ve en SUS aulas; el alumno solo ve las tareas de SU aula (no borradores) y solo guarda SU avance en tareas abiertas. El servidor limpia opciones y habilitaciones contra las de la actividad, valida que la etapa exista y limita los datos a 60 KB.

**Verificado:** tsc, ESLint, `next build` con y sin el sistema de aulas; pantallas con datos de ejemplo en compu, Ceibal (1024×600) y celular, sin desbordes. **Probado con cuentas reales en el preview el 6/11:** la maestra mandó A1 al aula "4b" y el avance del alumno quedó guardado en `progreso` (etapa "explorar").

## 16. Etapa 5, parte 2 · Clase en vivo con Supabase Realtime (7/11/2026, rama `ia/asistente`)

Sin migraciones: `sesiones` y `progreso` y sus reglas RLS están desde la etapa 1, y las dos tablas están en la publicación `supabase_realtime` (migración 3, verificado en dev).

**Maestra** (`/maestra/aulas/[id]/en-vivo`; botón "Empezar una clase en vivo" en el aula):
- **Abrir la clase.** Elige la actividad y sus opciones (el mismo formulario de "Mandar", y la actividad queda también como tarea) o hace en vivo una tarea que ya mandó. Se crea la `sesion` en "esperando". Hay una sola clase abierta por aula (índice único): si ya hay una, se va a esa.
- **Mismas pantallas del prototipo.** Sala de espera, tablero y puesta en común. Un contexto (`src/sala/contexto.tsx`) les da la sala real en vez de la del navegador; sin el contexto, el prototipo sigue igual.
  - Qué pantalla se ve depende del estado de la clase, no de la dirección: si recarga o entra desde otra compu, vuelve al mismo punto.
- **Acciones.**
  - Empezar, pausar y reanudar ("Mirá el pizarrón" en las Ceibal).
  - Habilitar lo que la actividad deja para después: queda habilitado también en la tarea.
  - Puesta en común, volver al tablero, y cerrar o cancelar.
  - Cada una cambia la pantalla enseguida y se confirma con la base. Solo se puede pasar desde el estado que corresponde (si otra compu ya la cambió, avisa).
- **Al cerrar.** Resumen (cuántos entraron y terminaron) y un enlace a cómo le fue a cada uno. La actividad sigue abierta como tarea.

**Alumno:**
- **Aviso en el laboratorio.** En `/lab` aparece "Tu maestra abrió una clase en vivo · Entrar a la clase". Si recién entró con su tarjeta, ya tiene apodo y la clase es de las últimas 4 horas, va directo.
- **En la clase** (`/lab/clase`):
  - al entrar se crea su avance, así la maestra lo ve en la sala de espera;
  - espera con Moli hasta que la maestra empieza, y la actividad se abre sola;
  - el avance se guarda como en las tareas;
  - pausa y puesta en común muestran "Mirá el pizarrón", y lo habilitado llega en el momento;
  - al cerrar, puede seguir desde su laboratorio.

**Tiempo real** (`src/sala/claseEnVivo.ts`):
- **Qué escucha cada uno.** La maestra escucha su `sesion` y el `progreso` de la actividad; cada chico, solo la `sesion` de su aula. Los canales usan la sesión de quien mira, así que las reglas RLS deciden qué llega: nadie recibe lo que no podría leer.
- **Respaldo.** Si el tiempo real no conecta en 12 s o se corta (algunas redes de escuela cortan websockets), se pregunta cada 4 s. Con tiempo real, se pregunta igual cada 20 s por si se perdió algo, y nunca con la pestaña oculta. La maestra pide solo los avances que cambiaron desde el último.
- **Orden.** Los avances que llegan tarde no pisan a los más nuevos (se comparan por `actualizado_en`).
- **En pantalla.** El tablero muestra "En vivo" o "Se actualiza cada pocos segundos".

**Verificado:**
- tsc y ESLint;
- `next build` con y sin el sistema de aulas;
- `npm run test:clase`: 7 pruebas (sala a partir de la base, cambios fuera de orden, respaldo, pasos, formulario);
- pantallas con datos de ejemplo (sala de espera, tablero, puesta, fin; espera, pausa y fin del chico) en compu, Ceibal y celular, sin desbordes;
- la publicación de tiempo real en dev.

**Falta la prueba real en el preview:** una maestra y 2 o 3 chicos en navegadores distintos (ver `docs/PLAN-ENTREGA.md`, bloque 2).

## 17. Bloque 3 · Cuaderno de investigación y lo que encontró la clase (7/11/2026)

Sin migraciones: cada actividad ya guarda lo que hace el chico en `progreso.datos`.

- **Cuaderno de investigación** (`src/actividades/cuaderno.js`). Ordena eso en el mismo formato para A1, A2 y A3: **hipótesis, decisiones, variables, resultados y conclusiones**, en frases, con los mismos textos que ven los chicos.
  - **A1:** la predicción de los antibióticos; las muestras y temperaturas elegidas; colonias por placa; halos y resistentes; comparaciones; qué antibiótico resistieron más.
  - **A2:** la hipótesis; la molécula y las partes exploradas; temperatura y pH de cada corrida; qué le pasó y qué observó; si se cumplió.
  - **A3:** la misión; la muestra; aumentos y luces; fotos y las que hay que repetir; pistas; lo que encontró, con su explicación.
  - Con datos viejos o raros devuelve el cuaderno vacío, nunca rompe la pantalla.
- **Maestra, en cada tarea** (`/maestra/aulas/[id]/tareas/[tarea]`): sección "Cuadernos de investigación", con uno desplegable por chico. "Imprimir los cuadernos" los imprime todos abiertos, sin el resto de la pantalla.
- **Lo que encontró la clase** (`…/tareas/[tarea]/puesta`): la misma pantalla de la puesta en común de la clase en vivo, armada con los avances de la tarea, para proyectar y conversar aunque no haya sido en vivo. Es solo para mirar: tiene "Volver" y no tiene botones de manejar la clase.
- **Pruebas:** `npm run test:clase` (11).
  - Cuaderno de A1 con muestras, placas (también en singular), contaminadas, comparación y antibióticos.
  - A2 y A3.
  - Datos vacíos, raros o de una actividad desconocida.
  - La sala de una tarea.

## 18. Bloque 4 · Pedir acceso, invitar maestras, preguntas en las actividades, historial y borrar apodo (7/11/2026)

Migración 20 (`20261107130000_acceso_e_historial.sql`). Solo agrega: no cambia ni borra nada existente. **Aplicada en dev el 7/11** (idéntica al archivo, comprobado con md5); producción sin tocar.

### Pedir acceso (pedido de Sofia, 6/11)

- **En el inicio**, arriba a la derecha (abajo en el celular): "¿Sos maestra o trabajás en una escuela? Pedí acceso". Solo aparece con el sistema de aulas prendido. También está en la pantalla de ingreso de la maestra.
- **Formulario** `/pedir-acceso`: nombre, mail, escuela, departamento (los 19 y "Fuera de Uruguay"), qué hace en la escuela, con qué clases y un mensaje opcional. Dice para qué se usan los datos.
- **Lo guarda solo el servidor** (`registrar_solicitud_acceso`, solo `service_role`), con controles contra el spam:
  - un campo escondido que solo llenan los robots (al robot se le dice que salió bien y no se guarda nada);
  - hasta 3 pedidos por hora desde la misma conexión y 20 por hora en total;
  - un solo pedido pendiente por mail.
- **De la conexión no se guarda la IP**, solo una huella (SHA-256 con una clave del servidor, `ACCESO_SAL` o, si no está, la clave secreta de Supabase). No se puede volver a la IP.
- **Los pedidos resueltos se borran a los 180 días** (al abrir la lista).

### Invitar maestras desde el panel del equipo

- `/equipo/maestras`, **solo la admin**. En la barra aparece "Maestras" con el número de pedidos pendientes.
- Por cada pedido: **Invitar** (crea la cuenta de maestra y genera un link de un solo uso) o **Descartar**.
- También se puede **invitar directo** a una maestra, sin pedido.
- Hasta que haya un servidor de mail propio, el panel muestra el link y un mensaje listo para **copiar y mandar a mano** (el mail de Supabase manda solo 2 por hora).

### Preguntas del Pasteur dentro de las actividades

- En cada actividad, un botón **"Preguntas del Pasteur"** abre la lista de respuestas aprobadas de esa actividad. Los chicos **eligen de la lista, no escriben**: así no hay texto libre de chicos ni moderación.
- Solo respuestas publicadas, con sus fuentes. Si todavía no hay, lo dice y sugiere preguntarle a la maestra.
- Solo aparece con el asistente prendido (`NEXT_PUBLIC_ASISTENTE=1`).

### Historial anónimo

- `vistas_respuestas`: **cuántas veces se mostró cada respuesta aprobada, por día y por lugar** (asistente de la maestra o actividad). Sin maestra, sin aula y sin chico.
- Suma una vista solo el servidor (`contar_vista_respuesta`, solo respuestas publicadas). Lo ve el equipo.
- En el tablero del equipo: **"Las más vistas (últimos 30 días)"**, para elegir próximas respuestas y curiosidades.

### Borrar apodo

- En el aula, la maestra puede **borrar el apodo** de un chico (por ejemplo, si eligió uno que no corresponde). El chico vuelve a elegir uno la próxima vez que entra.

### Pruebas

- **Base** (`15-pruebas-acceso.sql`): 31 OK en local y **31 OK en dev** (`16-pruebas-acceso-real.sql`, sin dejar datos). Revisan que:
  - nadie de afuera ni maestras ni validadoras ven ni tocan los pedidos;
  - la admin los ve y solo cambia estado, fecha y quién resolvió;
  - límites por conexión y total, un pendiente por mail, mails y datos inválidos;
  - las vistas solo se suman para respuestas publicadas y nadie de afuera las ve.
  - Una versión adrede rota de la función fue detectada por las pruebas.
- **Unitarias:** `npm run test:clase` (12; incluye leer el formulario de pedido).
- **Pantallas:** inicio, formulario y botón en la actividad, en compu (1280), Ceibal (1024) y celular (390), sin desbordes.
