# Pasar a producción · guía paso a paso (bloque 8)

Escrita el 7/11/2026 y actualizada el mismo día con las decisiones de Sofia.

## Decisiones de Sofia (7/11)

| Tema | Decisión |
| --- | --- |
| Base de producción | **Nueva, en São Paulo.** La de Ohio (vacía) quedó pausada; se puede reactivar durante un año o borrar cuando Sofia quiera. |
| Plan de Supabase | **Gratis por ahora.** Para que no se pause en vacaciones hay un "latido" diario (ver paso 4). Pasar a Pro (US$ 25 por mes) se decide más adelante. |
| A1 | Los cambios visuales de las placas y muestras quedan. No se toca más lo estético. |

## Estado

| Paso | Quién | Estado |
| --- | --- | --- |
| 1 · Mail propio (Resend + DNS) | Sofia | **Hecho el 2/11:** `mail.cienciasinlimites.uy` verificado en Resend |
| 2 · Base de producción | Claude | **Hecho el 7/11** |
| 3 · Configurar el ingreso en Supabase | Sofia | **Hecho el 7/11** (SMTP, plantillas, Site URL y registro cerrado). Se comprueba con la primera invitación real (paso 7.2) |
| 4 · Variables de Vercel | Sofia | **Hecho el 8/11** (las 7 necesarias; `ACCESO_SAL` y las de NCBI quedaron sin cargar porque son opcionales) |
| 5 · Llevar la rama a `main` | Claude prepara, Sofia aprueba | **PR #2 abierto el 8/11**, falta que Sofia lo apruebe |
| 6 · Dominio | Sofia | **Hecho:** registrado el 2/11 en HostingMontevideo, DNS en Vercel, certificado SSL emitido. Falta solo publicar la versión nueva (paso 5) |
| 7 · Primeras cuentas | Claude + Sofia | Pendiente |
| 8 · Prueba completa | Sofia + Claude | Pendiente |

## Costos por mes (precios oficiales, noviembre 2026)

| Servicio | Plan | Costo |
| --- | --- | --- |
| Supabase | Gratis (2 proyectos activos: pruebas y producción) | 0 |
| Vercel | Hobby | 0 (**ojo:** Hobby es solo para uso personal, no comercial; conviene consultar si este proyecto entra) |
| Resend (mail) | Gratis: 3.000 mails por mes, 100 por día | 0 |
| OpenAI | Por uso, con un límite de gasto mensual | pocos dólares |
| Dominio `cienciasinlimites.uy` | Anual | según el registrador |

**Antes de abrir a escuelas (no técnico):**
- Datos de los chicos (Ley 18.331): cuánto se guardan, qué pasa a fin de año y el consentimiento de las familias.
- Aval del sello del Instituto.
- Unas 15 a 20 respuestas aprobadas.

---

## Paso 1 · Mail propio con Resend (hecho por Sofia el 2/11)

- En Resend está el subdominio **`mail.cienciasinlimites.uy`**, verificado. Los mails salen desde ahí (por ejemplo `no-responder@mail.cienciasinlimites.uy`). Es lo que recomiendan Resend y Supabase: un subdominio solo para mails automáticos cuida la reputación del dominio principal.
- Sus registros están en Vercel → Domains → `cienciasinlimites.uy` (`send.mail`, `_dmarc` y los de la firma). No hay que tocarlos.
- El plan gratis de Resend admite un solo dominio: es este.
- Falta solo la clave para Supabase (paso 3.3).

## Paso 2 · Base de producción (hecho por Claude el 7/11)

- **Proyecto:** `ciencia-sin-limites-produccion`, ref `qgijjbgfuqyylrsiyzps`, región **São Paulo** (sa-east-1), plan gratis.
- **Las 17 migraciones aplicadas en orden.** Cada una es idéntica a su archivo: se comprobó con md5, como en la base de pruebas.
- **La seguridad es idéntica a la de pruebas.** Se compararon las dos bases: permisos de tablas y columnas, reglas RLS, funciones, triggers, tiempo real y esquemas (1.476 elementos), y no hay ninguna diferencia. En la base de pruebas pasaron todas las pruebas de seguridad.
- **Prueba de punta a punta en producción** (pedir acceso, roles, historial y que la API no publique funciones peligrosas): **31 OK**. Se deshizo sola: la base quedó vacía.
- **Asesores:** solo los dos avisos informativos esperados (`cupos_asistente` e `intentos_ingreso`, tablas solo del servidor).

## Paso 3 · Configurar el ingreso en Supabase de producción (Sofia, 15 min)

En el panel del proyecto **`ciencia-sin-limites-produccion`** (mirar el nombre arriba a la izquierda):

1. **Authentication → Sign In / Providers:**
   - *Allow new users to sign up*: **apagado**;
   - *Allow anonymous sign-ins*: apagado;
   - *Email*: prendido.
2. **Authentication → URL Configuration:**
   - *Site URL*: `https://www.cienciasinlimites.uy` (la dirección principal en Vercel). Hasta que el dominio funcione, la dirección de Production de Vercel.
   - *Redirect URLs*: `https://cienciasinlimites.uy/**` y `https://www.cienciasinlimites.uy/**`.
3. **Mail propio (SMTP).** Primero, en Resend → **API keys** → *Create API key*: nombre `supabase-produccion`, permiso **Sending access**, dominio `mail.cienciasinlimites.uy`. Se muestra una sola vez: va directo a Supabase, **no al chat**.

   Después, en Supabase → Authentication → **SMTP Settings** (`supabase.com/dashboard/project/qgijjbgfuqyylrsiyzps/auth/smtp`) → *Enable custom SMTP*:

   | Campo | Valor |
   | --- | --- |
   | Sender email | `no-responder@mail.cienciasinlimites.uy` |
   | Sender name | `La ciencia sin límites` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | la clave de Resend recién creada |

   Con SMTP propio, Supabase deja mandar 30 mails por hora: alcanza para el piloto. Se cambia en Authentication → Rate Limits.
4. **Authentication → Emails → Templates:** pegar las de `docs/PLANTILLAS-MAIL.md` (invitación y contraseña nueva). Los links ya llevan a la página con el botón **Entrar**.
5. **Project Settings → API Keys:** copiar la *publishable key* (pública) y la *secret key*. La secret va **solo** en Vercel, marcada Sensitive.

**Comprobación:** Authentication → Users → *Invite user* a un mail propio. Tiene que llegar en español, desde el mail del proyecto.

## Paso 4 · Variables de Vercel para Production (Sofia, 15 min)

Vercel → proyecto `pasteur` → Settings → Environment Variables, entorno **solo Production**. Las de Preview no se tocan: siguen apuntando a la base de pruebas.

| Variable | Valor | Sensitive |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qgijjbgfuqyylrsiyzps.supabase.co` | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_sipvMPgwmi9fzqf2401l3Q_g052eINX` (pública: va en el navegador) | no |
| `SUPABASE_SECRET_KEY` | la secret de producción | **sí** |
| `NEXT_PUBLIC_AULAS_REALES` | `1` | no |
| `NEXT_PUBLIC_ASISTENTE` | `1` | no |
| `OPENAI_API_KEY` | clave de un proyecto de OpenAI solo para producción, con límite de gasto | **sí** |
| `ACCESO_SAL` | opcional: un texto largo al azar. Si falta, se usa la clave secreta de Supabase | **sí** |
| `CRON_SECRET` | otro texto largo al azar (16 caracteres o más) | **sí** |
| `NCBI_EMAIL` | opcional: un mail de contacto del proyecto (PubMed lo agradece) | no |
| `NCBI_API_KEY` | opcional: clave gratis de NCBI | **sí** |

Las variables de Production que hoy apuntan al proyecto de Ohio se **reemplazan**.

**Ya no hace falta tocar la región:** el código la fija en São Paulo (`vercel.json`, `gru1`), cerca de las dos bases.

**El latido:**
- Vercel llama una vez por día a `/api/latido`, que hace tres lecturas mínimas a la base, para que el plan gratis no la pause.
- Solo responde si viene con `CRON_SECRET`.
- Corre únicamente en Production.
- Con el plan pago de Supabase deja de hacer falta.

## Paso 5 · Llevar la rama a `main` (Claude prepara, Sofia aprueba)

- `ia/asistente` ya contiene a `main` y a `migracion/nextjs`, sin conflictos.
- **Claude:** abre un PR `ia/asistente → main` (es el **PR #2**, abierto el 8/11). El PR #1 queda incluido: GitHub lo marca como fusionado solo.
- **Sofia:** lo aprueba con **Create a merge commit**.
- Vercel despliega Production con las variables del paso 4.

## Paso 6 · Dominio (Sofia, 10 min + espera del DNS)

El dominio está registrado en **HostingMontevideo** (clientes.hostingmontevideo.com → Dominios → `cienciasinlimites.uy`).

1. Vercel → Settings → Domains → agregar `cienciasinlimites.uy`. Vercel suma `www.cienciasinlimites.uy` como **dirección principal** y el dominio sin `www` redirige ahí (308). Así quedó el 7/11: funciona igual escribiendo cualquiera de las dos.
2. En HostingMontevideo → Servidores de nombres → personalizados: `ns1.vercel-dns.com` y `ns2.vercel-dns.com`. Con eso, **todos** los registros del dominio (web y mail) se manejan desde Vercel → Domains.
3. Esperar **Valid Configuration** (hasta 24 horas). Comprobado el 7/11: los dos nombres apuntan a Vercel y los DNS del dominio son los de Vercel.
   - Ojo al comprobar: algunos servidores de `.uy` están atrasados y por un rato pueden decir que el dominio "no existe" aunque ya funcione.
4. En Supabase de producción, *Site URL*: `https://www.cienciasinlimites.uy` (paso 3.2).

Mientras no se pase la rama a `main` (paso 5), Vercel muestra "No Deployment": la última publicación de la versión vieja de `main` falló. Se resuelve sola con el paso 5.

## Paso 7 · Primeras cuentas (Claude + Sofia)

1. **Claude:** carga en producción la invitación de Sofia como admin del equipo.
2. **Sofia:** Supabase → Authentication → Users → *Invite user* con su mail. Entra con el link y elige su contraseña.
3. **Sofia, desde `/equipo`:** invita a Eugenia como validadora.
4. **Sofia, desde `/equipo/maestras`:** invita a la primera maestra del piloto.

Los links que da el panel llevan a la página con el botón **Entrar**, así que se pueden mandar por WhatsApp: la vista previa no los gasta.

**Ojo:** si se invita dos veces al mismo mail antes de que la persona entre, solo sirve el **último** link. El panel lo avisa ("ese dejó de servir").

Las respuestas aprobadas en la base de pruebas no pasan solas a producción. Es un paso aparte, si Sofia quiere.

## Paso 8 · Prueba completa en producción (Sofia + Claude, 1 hora)

- [ ] Inicio, "Pedí acceso" y las tres actividades en modo individual.
- [ ] Maestra: invitación → contraseña → crear aula → tarjetas.
- [ ] Chico: entrar con la tarjeta en otra compu → apodo → laboratorio.
- [ ] Tarea: la maestra manda A1, el chico avanza, la maestra ve el avance y el cuaderno.
- [ ] Clase en vivo: maestra y 2 chicos en compus distintas.
- [ ] Equipo: Eugenia aprueba una respuesta; aparece en "Preguntale al Pasteur" y en la actividad.
- [ ] Recuperar contraseña de la maestra.
- [ ] Una Ceibal real.
- [ ] Al día siguiente: Vercel → Logs muestra el latido con `ok: true`.

---

## Si algo sale mal

- **La web nueva tiene un error grave:** Vercel → Deployments → el anterior → *Instant Rollback*.
- **Apagar el sistema real sin volver atrás el código:** poner `NEXT_PUBLIC_AULAS_REALES` en `0` y hacer *Redeploy*.
- **La base:** las migraciones solo agregan; no hay que deshacer nada para volver atrás la web.
- **La base se pausó igual:** Supabase → el proyecto → *Resume project*. Vuelve con todos sus datos.
- **Mails que no llegan:** Resend → Logs, y Supabase → Authentication → Logs.

## Fuentes de precios y límites

- [Supabase · precios](https://supabase.com/pricing) · [proyectos gratis y pausas](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Vercel · plan Hobby](https://vercel.com/docs/plans/hobby) · [regiones](https://vercel.com/docs/functions/configuring-functions/region) · [tareas programadas](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Resend · precios](https://resend.com/pricing)
