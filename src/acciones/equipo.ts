'use server';

import { linkDeUnSoloUso } from '@/datos/links';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { equipoReal } from '@/lib/supabase/config';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { iniciarSesion, cerrarSesion } from '@/datos/sesion';
import { obtenerMiembro, miembroCon, type Rol } from '@/datos/equipo';
import { mensajeDeError } from '@/datos/errores';

/*
  ACCIONES DEL EQUIPO DEL PASTEUR (Server Actions).
  Cada una se puede llamar con un POST hecho a mano: valida sus datos y
  verifica quién llama adentro (miembroCon), sin confiar en la pantalla.
  Escriben con la sesión del miembro, así las reglas RLS y los triggers de la
  base deciden. La clave secreta se usa solo para generar links de acceso,
  después de verificar que quien lo pide es la admin.
*/
export type Estado = { mensaje: string; ok?: boolean; link?: string; email?: string };

const MAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const CLAVE_MIN = 10;
const CLAVE_MAX = 72;
const ROLES: Rol[] = ['redactor', 'validador', 'admin'];
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const SIN_PANEL = { mensaje: 'El panel del equipo todavía no está activado.' };
const SIN_PERMISO = { mensaje: 'No tenés permiso para hacer eso.' };

async function origen() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
}

// ---------------------------------------------------------------------
// Ingreso
// ---------------------------------------------------------------------
export async function ingresarEquipo(_previo: Estado, datos: FormData): Promise<Estado> {
  if (!equipoReal) return SIN_PANEL;
  const email = leer(datos, 'email').toLowerCase();
  const clave = String(datos.get('clave') ?? '');
  if (!MAIL.test(email) || clave.length < 6 || clave.length > CLAVE_MAX) return { mensaje: 'Revisá el mail y la contraseña.', email };
  const id = await iniciarSesion(email, clave);
  if (!id) return { mensaje: 'El mail o la contraseña no coinciden.', email };
  if (!(await obtenerMiembro())) {
    await cerrarSesion();
    return { mensaje: 'Esta cuenta no está habilitada en el equipo. Si sos maestra, entrá por /maestra/entrar.', email };
  }
  redirect('/equipo');
}

export async function salirEquipo(): Promise<void> {
  await cerrarSesion();
  redirect('/equipo/entrar');
}

/** Elegir contraseña: llega con la sesión del link de invitación (o del link nuevo que genera la admin). */
export async function elegirClaveEquipo(_previo: Estado, datos: FormData): Promise<Estado> {
  if (!equipoReal) return SIN_PANEL;
  if (!(await obtenerMiembro())) return { mensaje: 'El link venció o ya se usó. Pedile uno nuevo a la admin.' };
  const clave = String(datos.get('clave') ?? '');
  if (clave.length < CLAVE_MIN) return { mensaje: `La contraseña tiene que tener al menos ${CLAVE_MIN} caracteres.` };
  if (clave.length > CLAVE_MAX) return { mensaje: 'La contraseña es demasiado larga.' };
  if (clave !== String(datos.get('repetida') ?? '')) return { mensaje: 'Las dos contraseñas no coinciden.' };
  const supabase = await crearClienteServidor();
  const { error } = (await supabase?.auth.updateUser({ password: clave })) ?? { error: true };
  if (error) return { mensaje: 'No se pudo guardar. Probá con otra contraseña.' };
  redirect('/equipo');
}

/** Cada una edita su nombre y su laboratorio (el rol y el estado no: los protege la base). */
export async function actualizarPerfil(_previo: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon();
  if (!yo) return SIN_PERMISO;
  const nombre = leer(datos, 'nombre').replace(/\s+/g, ' ');
  const laboratorio = leer(datos, 'laboratorio').replace(/\s+/g, ' ');
  if (nombre.length > 120 || laboratorio.length > 160) return { mensaje: 'El nombre o el laboratorio son demasiado largos.' };
  const supabase = await crearClienteServidor();
  const { error } = await supabase!.from('equipo').update({ nombre_visible: nombre, laboratorio }).eq('id', yo.id);
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: 'Guardado.' };
}

// ---------------------------------------------------------------------
// Miembros (solo la admin)
// ---------------------------------------------------------------------

/*
  Link de acceso SIN mandar mail: el servidor de mail de Supabase solo le
  escribe a miembros de la organización (2 por hora), así que la invitada
  no lo recibiría. La admin copia el link y se lo manda por su cuenta.
  Vale una sola vez y vence (por defecto, en 1 hora: Supabase → Authentication
  → Email → "Email OTP Expiration"). El link no se guarda en ningún lado.
*/
/*
  Ojo: quien tiene el link entra como esa persona. Por eso lo genera solo la
  admin, se muestra una vez y queda anotado en el registro del servidor
  (Vercel → Logs) quién lo pidió y para quién. Cuando haya un servidor de
  mail propio (SMTP), conviene que el link le llegue directo a la persona.
*/
async function generarLink(tipo: 'invite' | 'recovery', email: string, pedidoPor: string) {
  const admin = crearClienteAdmin();
  if (!admin) return { error: 'Falta la clave secreta en el servidor (SUPABASE_SECRET_KEY).' as const };
  console.info(`[equipo] link de ${tipo === 'invite' ? 'invitación' : 'acceso'} pedido por ${pedidoPor} para ${email}`);
  const { data, error } = await admin.auth.admin.generateLink({
    type: tipo,
    email,
    options: { redirectTo: `${await origen()}/equipo/entrar` },
  });
  if (error || !data?.properties?.hashed_token) return { error: (error?.code ?? 'sin_link') as string };
  // A /auth/confirmar (botón "Entrar"): las vistas previas de WhatsApp o del mail no gastan el link
  return { link: await linkDeUnSoloUso(data.properties.hashed_token, data.properties.verification_type) };
}

export async function invitarMiembro(_previo: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  const email = leer(datos, 'email').toLowerCase();
  const rol = leer(datos, 'rol') as Rol;
  const nombre = leer(datos, 'nombre').replace(/\s+/g, ' ');
  const laboratorio = leer(datos, 'laboratorio').replace(/\s+/g, ' ');
  if (!MAIL.test(email) || email.endsWith('@alumnos.invalid')) return { mensaje: 'Revisá el mail.', email };
  if (!ROLES.includes(rol)) return { mensaje: 'Elegí un rol.', email };
  if (nombre.length > 120 || laboratorio.length > 160) return { mensaje: 'El nombre o el laboratorio son demasiado largos.', email };

  // 1. La invitación (con la sesión de la admin: RLS). Si ya había una pendiente, se reusa.
  const supabase = await crearClienteServidor();
  const { error: errorInvitacion } = await supabase!
    .from('invitaciones_equipo')
    .insert({ email, rol, nombre_visible: nombre, laboratorio });
  if (errorInvitacion && !/duplicate key/i.test(errorInvitacion.message)) return { mensaje: mensajeDeError(errorInvitacion), email };

  // 2. La cuenta y su link. Al crearse la cuenta, el trigger de alta la pone en el equipo (no como maestra).
  const invitacion = await generarLink('invite', email, yo.id);
  if ('link' in invitacion) {
    refresh();
    return { ok: true, email, link: invitacion.link, mensaje: `Invitación lista para ${email}.` };
  }
  if (invitacion.error === 'email_exists') {
    // ¿Ya es del equipo? Entonces solo necesita un link nuevo para entrar
    const { data: usada } = await supabase!.from('invitaciones_equipo').select('id').eq('email', email).not('usada_en', 'is', null).limit(1);
    if (usada?.length) {
      const nuevo = await generarLink('recovery', email, yo.id);
      if ('link' in nuevo) return { ok: true, email, link: nuevo.link, mensaje: `${email} ya está en el equipo: este es un link nuevo para entrar.` };
    }
    return { mensaje: 'Ese mail ya tiene una cuenta (por ejemplo, de maestra). Para el equipo hace falta otro mail: puede ser el mismo con +equipo antes de la @.', email };
  }
  return { mensaje: `No se pudo generar el link (${invitacion.error}). Probá de nuevo en un rato.`, email };
}

/** Link nuevo para un miembro que no puede entrar (olvidó la contraseña o venció su invitación). */
export async function linkNuevo(id: string): Promise<Estado> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  const supabase = await crearClienteServidor();
  // Que sea del equipo (con la sesión de la admin)
  const { data: fila } = await supabase!.from('equipo').select('id').eq('id', id).maybeSingle();
  if (!fila) return { mensaje: 'Esa persona no está en el equipo.' };
  const admin = crearClienteAdmin();
  const { data } = (await admin?.auth.admin.getUserById(id)) ?? { data: null };
  const email = data?.user?.email;
  if (!email) return { mensaje: 'No se encontró su mail.' };
  const nuevo = await generarLink('recovery', email, yo.id);
  if (!('link' in nuevo)) return { mensaje: `No se pudo generar el link (${nuevo.error}).` };
  return { ok: true, email, link: nuevo.link, mensaje: `Link nuevo para ${email}.` };
}

export async function cambiarRol(id: string, _previo: Estado, datos: FormData): Promise<Estado> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  const rol = leer(datos, 'rol') as Rol;
  if (!ROLES.includes(rol)) return { mensaje: 'Elegí un rol.' };
  if (id === yo.id) return { mensaje: 'Tu propio rol no lo podés cambiar.' };
  const supabase = await crearClienteServidor();
  const { error } = await supabase!.from('equipo').update({ rol }).eq('id', id);
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: 'Rol cambiado.' };
}

export async function cambiarEstado(id: string, estado: 'activa' | 'suspendida'): Promise<Estado> {
  const yo = await miembroCon('admin');
  if (!yo) return SIN_PERMISO;
  if (id === yo.id) return { mensaje: 'No te podés suspender a vos misma.' };
  if (estado !== 'activa' && estado !== 'suspendida') return { mensaje: 'Estado desconocido.' };
  const supabase = await crearClienteServidor();
  const { error } = await supabase!.from('equipo').update({ estado }).eq('id', id);
  if (error) return { mensaje: mensajeDeError(error) };
  refresh();
  return { ok: true, mensaje: estado === 'suspendida' ? 'Suspendida: ya no puede entrar.' : 'Reactivada.' };
}
