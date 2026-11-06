'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { aulasReales, equipoReal } from '@/lib/supabase/config';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { iniciarSesion, cerrarSesion, abrirSesionConTokens, pedirLinkDeClave } from '@/datos/sesion';
import { obtenerDocente } from '@/datos/docente';

/*
  ACCIONES DE LA MAESTRA (Server Actions).
  Cada una se puede llamar con un POST directo, así que valida sus datos y
  verifica quién llama adentro, sin confiar en la página que la muestra.
  Los mensajes de error no dicen si un mail tiene cuenta o no.
*/
export type EstadoFormulario = { mensaje: string; ok?: boolean; email?: string };

const MAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const CLAVE_MIN = 10;
const CLAVE_MAX = 72;

const leer = (f: FormData, k: string) => String(f.get(k) ?? '');

export async function ingresar(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  if (!aulasReales) return { mensaje: 'El ingreso de maestras todavía no está activado.' };
  const email = leer(datos, 'email').trim().toLowerCase();
  const clave = leer(datos, 'clave');
  if (!MAIL.test(email) || clave.length < 6 || clave.length > CLAVE_MAX) {
    return { mensaje: 'Revisá el mail y la contraseña.', email };
  }
  const id = await iniciarSesion(email, clave);
  if (!id) return { mensaje: 'El mail o la contraseña no coinciden.', email };

  const docente = await obtenerDocente();
  if (!docente || docente.estado !== 'activa') {
    await cerrarSesion();
    return {
      mensaje:
        docente?.estado === 'pendiente'
          ? 'Tu cuenta está esperando la aprobación del equipo del Institut Pasteur.'
          : 'Esta cuenta no está habilitada como maestra. Escribile al equipo del Institut Pasteur.',
      email,
    };
  }
  redirect('/maestra');
}

export async function salir(): Promise<void> {
  await cerrarSesion();
  redirect('/maestra/entrar');
}

export async function recuperarClave(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  if (!aulasReales) return { mensaje: 'El ingreso de maestras todavía no está activado.' };
  const email = leer(datos, 'email').trim().toLowerCase();
  if (!MAIL.test(email)) return { mensaje: 'Revisá el mail.', email };
  const h = await headers();
  const origen = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
  // Supabase vuelve a /maestra/entrar con la sesión en el # (lo abre LinkDeMail).
  // Solo acepta direcciones de su lista "Redirect URLs".
  await pedirLinkDeClave(email, `${origen}/maestra/entrar`);
  // Mismo mensaje exista o no la cuenta
  return {
    ok: true,
    mensaje:
      'Si ese mail tiene una cuenta de maestra, te llega un mensaje con un link para elegir una contraseña nueva. Si no llega en unos minutos (mirá también en spam), probá de nuevo más tarde.',
  };
}

/**
 * Link de un mail de Supabase (invitación o recuperación): LinkDeMail lee la
 * sesión del # de la dirección y la manda acá. Se valida, se guarda en
 * cookies seguras y se sigue a elegir la contraseña.
 */
export async function abrirLinkDeMail(datos: { accessToken: unknown; refreshToken: unknown; tipo: unknown }): Promise<void> {
  if (!aulasReales && !equipoReal) redirect('/');
  const { accessToken, refreshToken, tipo } = datos;
  const valido = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
  const ingreso = equipoReal && !aulasReales ? '/equipo/entrar' : '/maestra/entrar';
  if (!valido(accessToken, 4096) || !valido(refreshToken, 512)) redirect(`${ingreso}?error=link`);
  const quien = await abrirSesionConTokens(accessToken, refreshToken);
  if (!quien) redirect(`${ingreso}?error=link`);
  const paraClave = tipo === 'invite' || tipo === 'recovery';
  // Una invitada del equipo (migración 8) no es maestra: sigue al panel del equipo
  if (quien === 'equipo' && equipoReal) redirect(paraClave ? '/equipo/clave' : '/equipo');
  if (!aulasReales) redirect('/equipo/entrar?error=link');
  redirect(paraClave ? '/maestra/clave' : '/maestra');
}

/** Elegir contraseña: al aceptar la invitación o después de recuperarla. Necesita la sesión del link. */
export async function elegirClave(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  if (!aulasReales) return { mensaje: 'El ingreso de maestras todavía no está activado.' };
  const docente = await obtenerDocente();
  if (!docente) return { mensaje: 'El link venció o ya se usó. Pedí uno nuevo.' };
  const clave = leer(datos, 'clave');
  const repetida = leer(datos, 'repetida');
  if (clave.length < CLAVE_MIN) return { mensaje: `La contraseña tiene que tener al menos ${CLAVE_MIN} caracteres.` };
  if (clave.length > CLAVE_MAX) return { mensaje: 'La contraseña es demasiado larga.' };
  if (clave !== repetida) return { mensaje: 'Las dos contraseñas no coinciden.' };
  const supabase = await crearClienteServidor();
  const { error } = (await supabase?.auth.updateUser({ password: clave })) ?? { error: true };
  if (error) return { mensaje: 'No se pudo guardar. Probá con otra contraseña.' };
  redirect(docente.estado === 'activa' ? '/maestra' : '/maestra/entrar');
}
