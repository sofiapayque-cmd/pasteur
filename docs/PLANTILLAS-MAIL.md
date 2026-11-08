# Plantillas de mail (Supabase → Authentication → Emails)

Se pueden editar recién con el mail propio configurado (SMTP, paso 3 de `PRODUCCION.md`). Van en el proyecto de **producción**.

Los links llevan a `/auth/confirmar`, que muestra un botón **Entrar**: así las vistas previas y los filtros de mail que abren los links solos no los gastan. Al tocar Entrar, la web sabe sola si es una maestra o alguien del equipo, y la manda a elegir su contraseña.

## Invite user (invitación)

**Asunto:** `Te invitaron a La ciencia sin límites`

```html
<div style="font-family: Arial, sans-serif; color: #22232A; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #2F4A85; margin: 0 0 8px;">La ciencia sin límites</p>
  <h1 style="font-size: 24px; color: #2F4A85; margin: 0 0 16px;">{{ if .Data.nombre }}¡Hola, {{ .Data.nombre }}!{{ else }}¡Hola!{{ end }}</h1>
  <p style="font-size: 16px; line-height: 1.5;">Te invitamos a La ciencia sin límites, la plataforma de experiencias científicas de ORT Uruguay y el Institut Pasteur de Montevideo.</p>
  <p style="font-size: 16px; line-height: 1.5;">Tocá el botón para entrar y elegir tu contraseña:</p>
  <p style="margin: 24px 0;">
    <a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite"
       style="background: #2F4A85; color: #FFFFFF; text-decoration: none; padding: 14px 24px; border-radius: 999px; font-weight: bold; display: inline-block;">Aceptar la invitación</a>
  </p>
  <p style="font-size: 14px; color: #555;">El link sirve una sola vez y vence en una hora. Si venció, pedí uno nuevo a quien te invitó.</p>
  <p style="font-size: 14px; color: #555;">Si no esperabas este mail, podés ignorarlo.</p>
</div>
```

## Reset password (elegir contraseña nueva)

**Asunto:** `Tu contraseña de La ciencia sin límites`

```html
<div style="font-family: Arial, sans-serif; color: #22232A; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #2F4A85; margin: 0 0 8px;">La ciencia sin límites</p>
  <h1 style="font-size: 24px; color: #2F4A85; margin: 0 0 16px;">Elegí una contraseña nueva</h1>
  <p style="font-size: 16px; line-height: 1.5;">Pediste cambiar la contraseña de tu cuenta ({{ .Email }}). Tocá el botón para elegir una nueva:</p>
  <p style="margin: 24px 0;">
    <a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery"
       style="background: #2F4A85; color: #FFFFFF; text-decoration: none; padding: 14px 24px; border-radius: 999px; font-weight: bold; display: inline-block;">Elegir contraseña</a>
  </p>
  <p style="font-size: 14px; color: #555;">El link sirve una sola vez y vence en una hora.</p>
  <p style="font-size: 14px; color: #555;">Si no lo pediste vos, ignorá este mail: tu contraseña sigue igual.</p>
</div>
```

## Las demás plantillas

- **Confirm signup** y **Magic link:** no se usan. El registro abierto está apagado y se entra con contraseña.
- **Change email address:** no se usa por ahora.
- **Reauthentication:** no se usa por ahora.

Si algún día se usan, sus links tienen que ir también a `/auth/confirmar?token_hash={{ .TokenHash }}&type=…` (con `type` igual a `email` o `magiclink`).

## Cómo probar

1. En Supabase de producción: Authentication → Users → **Invite user**, con un mail propio.
2. Tiene que llegar desde `no-responder@mail.cienciasinlimites.uy`, en español y con el botón.
3. Tocarlo → página "¡Te damos la bienvenida!" → **Entrar** → elegir contraseña.
4. Desde `/maestra/recuperar`, pedir el link de contraseña nueva y repetir.
