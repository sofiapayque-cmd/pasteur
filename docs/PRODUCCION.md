# Pasar a producción · guía paso a paso (bloque 8)

Escrita el 7/11/2026. **No se ejecutó nada de esta guía.** Cada paso necesita la autorización de Sofia, y los que dicen "Sofia" los hace ella (son paneles con claves o pagos).

Producción hoy:
- `main` tiene la versión Vite y su deploy en Vercel falla.
- El Supabase de producción (`ciencia-sin-limites`, ref `wjaunybecxirzwebembp`) está **vacío** y en **Ohio, EE.UU.** (us-east-2).

Todo lo nuevo vive en la rama `ia/asistente`, probado contra el Supabase de desarrollo (São Paulo).

---

## A. Decisiones antes de empezar (Sofia)

### A1. Dónde vive la base de producción

Los chicos se conectan **directo a Supabase** desde la Ceibal en la clase en vivo, así que la distancia importa.

| Opción | Qué implica |
| --- | --- |
| **1. Base nueva en São Paulo (recomendada)** | Crear un proyecto nuevo en `sa-east-1` y dejar de usar el de Ohio (está vacío: no se pierde nada). Funciones de Vercel en `gru1` (São Paulo). Es la región más cercana a Uruguay en los dos servicios, y es la misma que la de desarrollo, que ya está probada. |
| 2. Seguir en Ohio | No hay que crear nada. Funciones de Vercel en `cle1` (Cleveland, la misma zona que Ohio). Todo queda más lejos de las escuelas. |

Borrar o pausar el proyecto de Ohio es irreversible en el sentido de que pierde su dirección: **lo decide Sofia**, aunque esté vacío.

### A2. Plan y costos por mes (precios de las páginas oficiales, noviembre 2026)

| Servicio | Plan | Costo | Por qué |
| --- | --- | --- | --- |
| Supabase | **Pro** | US$ 25 (incluye US$ 10 de cómputo, alcanza para la instancia chica) | El plan gratis **se pausa tras una semana sin uso** (en vacaciones o un fin de semana largo, la escuela entra y no anda). Pro: nunca se pausa, 500 conexiones de tiempo real en vez de 200 (unas 15 clases a la vez en vez de 6), y permite prender la protección de contraseñas filtradas. |
| Vercel | Hobby (gratis) o Pro (US$ 20 por persona) | 0 o 20 | **Hobby es solo para uso personal, no comercial.** Un proyecto de ORT y el Institut Pasteur con escuelas puede no entrar ahí: conviene consultarlo. Hobby guarda los registros del servidor 1 hora; Pro, 1 día. |
| Resend (mail) | Gratis | 0 | 3.000 mails por mes y 100 por día: alcanza para invitaciones y recuperar contraseñas. Pro: US$ 20 si algún día hace falta más. |
| OpenAI | Por uso | Pocos dólares | Redactar respuestas, buscar en el asistente y el doble control. Conviene un proyecto de OpenAI **solo para producción** con un **límite de gasto mensual**. |
| Dominio `cienciasinlimites.uy` | Anual | Según el registrador | Si todavía no está registrado, se registra en NIC Uruguay o un revendedor. |

**Total estimado: entre US$ 25 y 50 por mes**, más el dominio.

### A3. Antes de abrir a escuelas (no técnico)

- **Datos de los chicos (Ley 18.331):** cuánto tiempo se guardan, qué pasa a fin de año y el consentimiento de las familias. Tiene que estar decidido con el Instituto **antes** de que entre el primer chico real.
- **Aval del sello** del Institut Pasteur, o cambiar su texto.
- **Respuestas aprobadas:** unas 15 a 20 antes de abrir "Preguntale al Pasteur".

---

## B. Pasos (en este orden)

Cada paso dice **quién**, **dónde** y **cómo se comprueba**. Si algo falla, se para y se mira antes de seguir.

### Paso 1 · Mail propio con Resend (Sofia, 20 min + espera del DNS)

Conviene hacerlo **primero**, porque el DNS puede tardar horas.

1. Crear la cuenta en Resend y agregar el dominio `cienciasinlimites.uy`.
2. Resend muestra unos registros DNS (SPF, DKIM y MX de rebote). Cargarlos en el panel del dominio, tal cual.
3. Esperar a que Resend diga **Verified**.
4. Crear una clave de API de Resend. **No pegarla en el chat**: se escribe solo en Supabase (paso 3).

**Comprobación:** el dominio aparece como verificado en Resend.

### Paso 2 · Base de producción (Sofia crea; Claude aplica con su OK)

1. **Sofia:** si se eligió la opción 1, crear el proyecto `ciencia-sin-limites` en **South America (São Paulo)** y pasarlo a **Pro**.
2. **Claude, con el OK de Sofia:** aplicar las **17 migraciones**, en este orden, con el conector oficial. Son las mismas que están en desarrollo y ninguna borra datos.
   1. `20261101120000_aulas_y_alumnos`
   2. `20261101120100_seguridad`
   3. `20261101120200_tiempo_real`
   4. `20261101120300_funciones_privadas`
   5. `20261101120400_aulas_devolver_al_crear`
   6. `20261101120500_anio_lectivo_y_cerrar_sesiones`
   7. `20261101120600_alumnos_nunca_docentes`
   8. `20261106120000_equipo`
   9. `20261106120100_fichas`
   10. `20261106130000_biblioteca_publicaciones`
   11. `20261106130100_biblioteca_licencias`
   12. `20261106140000_respuestas_ia`
   13. `20261106150000_ingreso_alumnos`
   14. `20261106160000_asistente_clase`
   15. `20261107120000_biblioteca_pubmed`
   16. `20261107120100_asistente_pruebas`
   17. `20261107130000_acceso_e_historial`
3. **Claude:** comprobar que cada migración aplicada es idéntica al archivo (md5), igual que en desarrollo.
4. **Claude:** correr las 8 pruebas de seguridad "reales" (`2-`, `4-`, `6-`, `8-`, `10-`, `12-`, `14-` y `16-…-real.sql`). Cada una se deshace sola al final; en producción vacía no dejan nada.
5. **Claude:** revisar los asesores de seguridad y rendimiento.

**Comprobación:** las 8 pruebas en 0 fallas y los asesores sin avisos nuevos. Se esperan solo dos avisos informativos, de `cupos_asistente` e `intentos_ingreso`, que son tablas solo del servidor.

### Paso 3 · Configurar el ingreso en Supabase de producción (Sofia, 15 min)

En el panel del proyecto **de producción** (mirar el nombre arriba a la izquierda):

1. **Authentication → Sign In / Providers:**
   - *Allow new users to sign up*: **apagado**;
   - *Allow anonymous sign-ins*: apagado;
   - *Email*: prendido.
2. **Authentication → URL Configuration:**
   - *Site URL*: `https://cienciasinlimites.uy`;
   - *Redirect URLs*: `https://cienciasinlimites.uy/**` y `https://www.cienciasinlimites.uy/**`. Nada más.
3. **Authentication → SMTP (custom):**
   - los datos que muestra Resend en su pantalla de SMTP (servidor, puerto y usuario);
   - como contraseña, la clave de API de Resend;
   - remitente: `no-responder@cienciasinlimites.uy`, nombre "La ciencia sin límites".
4. **Authentication → Emails → Templates:** con SMTP propio ya se pueden editar. Claude prepara los textos en español (invitación y recuperar contraseña) con el botón hacia `/auth/confirmar`, que ya existe.
   - Ojo: algunos servicios de mail (por ejemplo, los filtros de Outlook) **abren los links solos** para revisarlos, y eso gasta el link de un solo uso antes de que la maestra lo toque.
   - Si pasa, `/auth/confirmar` tiene que mostrar una página con un botón "Confirmar" en vez de entrar directo. Es un cambio chico que Claude hace antes del paso 8 si hace falta.
5. **Authentication → Passwords:** prender *Leaked password protection* (necesita Pro).
6. **Project Settings → API Keys:** copiar la *publishable key* (pública) y la *secret key*. La secret va **solo** en Vercel (paso 4), marcada Sensitive.

**Comprobación:** Authentication → Users → *Invite user* a un mail propio: llega desde `no-responder@cienciasinlimites.uy` y en español.

### Paso 4 · Variables de Vercel para Production (Sofia, 15 min)

Vercel → proyecto `pasteur` → Settings → Environment Variables, entorno **solo Production**. Las variables de Preview (las del Supabase de desarrollo) **no se tocan**.

| Variable | Valor | Sensitive |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | la dirección del proyecto de producción | no (es pública) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la publishable de producción | no (es pública) |
| `SUPABASE_SECRET_KEY` | la secret de producción | **sí** |
| `NEXT_PUBLIC_AULAS_REALES` | `1` | no |
| `NEXT_PUBLIC_ASISTENTE` | `1` | no |
| `OPENAI_API_KEY` | clave del proyecto de OpenAI de producción (con límite de gasto) | **sí** |
| `ACCESO_SAL` | un texto largo al azar, nuevo (la huella de "Pedir acceso") | **sí** |
| `NCBI_EMAIL` | un mail de contacto del proyecto (lo pide PubMed) | no |
| `NCBI_API_KEY` | opcional: clave gratis de NCBI (más consultas por segundo) | **sí** |

Si hoy hay variables de Production que apuntan al Supabase viejo, se **reemplazan**.

**Región de las funciones:** Settings → Functions → Function Regions → **`gru1` (São Paulo)**. Con la opción 2 de A1 sería `cle1`. En Hobby se elige una sola.

**Comprobación:** la lista de variables de Production tiene las nueve, y las secretas aparecen como Sensitive.

### Paso 5 · Llevar la rama a `main` (Claude prepara, Sofia aprueba)

- `ia/asistente` ya contiene a `main` y a `migracion/nextjs`: está 48 commits adelante y 0 atrás de `main`, así que **no hay conflictos**.
- **Claude:** abre un PR `ia/asistente → main` con el resumen de todo lo que entra, y cierra el PR #1 (`migracion/nextjs → main`), que queda incluido.
- **Sofia:** lo aprueba y hace *Merge*. Conviene "Create a merge commit", no "Squash", para no perder la historia.
- Vercel despliega `main` en Production con las variables del paso 4.

**Comprobación:** el deploy de Production termina en verde y la web abre en la dirección `pasteur-….vercel.app` de Production.

### Paso 6 · Dominio (Sofia, 10 min + espera del DNS)

1. Vercel → Settings → Domains → agregar `cienciasinlimites.uy` y `www.cienciasinlimites.uy`. Elegir que `www` redirija al dominio sin `www`.
2. Cargar en el panel del dominio los registros que muestra Vercel.
3. Esperar a que Vercel diga **Valid Configuration**. El certificado HTTPS lo pone solo.

**Comprobación:** `https://cienciasinlimites.uy` abre la web con candado.

### Paso 7 · Primeras cuentas (Claude con Sofia)

1. **Claude:** carga la invitación de la admin del equipo (Sofia) en la base de producción. **Sofia:** entra con el link, en `/equipo/entrar`.
2. **Sofia, desde `/equipo`:** invita a Eugenia como validadora.
3. **Sofia, desde `/equipo/maestras`:** invita a la primera maestra del piloto.

Las respuestas aprobadas en desarrollo **no pasan solas**. Pasarlas con sus fuentes es un paso aparte, que Claude prepara si Sofia quiere.

### Paso 8 · Prueba completa en producción (Sofia + Claude, 1 hora)

- [ ] Inicio, "Pedí acceso" y las tres actividades en modo individual.
- [ ] Maestra: invitación → contraseña → crear aula → tarjetas.
- [ ] Chico: entrar con la tarjeta en otra compu → apodo → laboratorio.
- [ ] Tarea: la maestra manda A1, el chico avanza, la maestra ve el avance y el cuaderno.
- [ ] Clase en vivo: maestra y 2 chicos en compus distintas, pausar, habilitar, puesta en común, cerrar.
- [ ] Equipo: Eugenia aprueba una respuesta; aparece en "Preguntale al Pasteur" y en "Preguntas del Pasteur" de la actividad.
- [ ] Recuperar contraseña de la maestra: llega el mail en español.
- [ ] Una Ceibal real, con el wifi de una escuela si se puede.

---

## C. Si algo sale mal

- **La web nueva tiene un error grave:** Vercel → Deployments → el deploy anterior → *Instant Rollback*. Vuelve en segundos.
- **Apagar el sistema real sin volver atrás el código:** poner `NEXT_PUBLIC_AULAS_REALES` en `0` y hacer *Redeploy*. La web queda como el prototipo de siempre.
- **La base:** las migraciones solo agregan; no hay que deshacer nada para volver atrás la web. Si una migración fallara a mitad de camino, Postgres la deshace entera y se para ahí.
- **Mails que no llegan:** mirar Resend → Logs, y Supabase → Authentication → Logs.

## D. Qué queda igual en desarrollo

El Supabase de desarrollo y los previews de `ia/asistente` siguen como están, para seguir probando sin tocar producción. Después del paso 5, el trabajo nuevo se hace en ramas y entra a `main` con un PR.

## Fuentes de precios y límites

- [Supabase · precios](https://supabase.com/pricing)
- [Vercel · plan Hobby](https://vercel.com/docs/plans/hobby)
- [Vercel · regiones](https://vercel.com/docs/regions)
- [Resend · precios](https://resend.com/pricing)
