'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { refresh } from 'next/cache';
import { aulasReales } from '@/lib/supabase/config';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { miembroCon } from '@/datos/equipo';
import { ipDelPedido } from '@/datos/ip';
import { leerSolicitud } from '@/lib/aulas/acceso';

/*
  PEDIR ACCESO E INVITAR MAESTRAS (bloque 4 del plan de entrega).
  · Cualquiera puede pedir acceso desde el inicio. El pedido lo guarda solo
    el servidor (migración 20), con controles contra el spam: campo trampa,
    3 por hora por conexión, 20 por hora en total y un pedido pendiente por
    mail. De la conexión se guarda solo una huella (no la IP).
  · La admin del equipo ve los pedidos y, con un clic, invita: se crea la
    cuenta de maestra y se genera un link de un solo uso para mandarle (hasta
    que haya un servidor de mail propio, se copia y se manda a mano). También
    puede invitar a una maestra directo, sin pedido.
*/
export type EstadoAcceso = { mensaje: string; ok?: boolean; campo?: string };
export type EstadoInvitacion = { mensaje: string; ok?: boolean; link?: string; email?: string; nombre?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

async function origen() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
}

/** Huella de la conexión: SHA-256 de la IP con una clave del servidor (no se puede volver a la IP). */
async function huellaDeRed(): Promise<string | null> {
  const ip = await ipDelPedido();
  const sal = process.env.ACCESO_SAL || process.env.SUPABASE_SECRET_KEY || '';
  if (!ip || !sal) return null;
  return createHash('sha256').update(`${sal}:${ip}`).digest('hex');
}

// ---------------------------------------------------------------------
// Público: pedir acceso
// ---------------------------------------------------------------------
export async function pedirAcceso(_previo: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  if (!aulasReales) return { mensaje: 'Todavía no estamos recibiendo pedidos. Escribinos al Institut Pasteur de Montevideo.' };
  const leido = leerSolicitud(datos);
  // Un robot llenó el campo escondido: se le dice que salió bien y no se guarda nada
  if (!leido.ok && leido.mensaje === 'trampa') return { ok: true, mensaje: '¡Listo! Recibimos tu pedido.' };
  if (!leido.ok) return { mensaje: leido.mensaje, campo: leido.campo };
  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'No pudimos recibir el pedido ahora. Probá en un rato.' };
  const s = leido.solicitud;
  const { data, error } = await admin.rpc('registrar_solicitud_acceso', {
    p_nombre: s.nombre,
    p_email: s.email,
    p_escuela: s.escuela,
    p_departamento: s.departamento,
    p_cargo: s.cargo,
    p_grados: s.grados,
    p_mensaje: s.mensaje,
    p_huella_red: await huellaDeRed(),
  });
  if (error) {
    console.error('[acceso] pedido:', error.code);
    return { mensaje: 'No pudimos recibir el pedido ahora. Probá en un rato.' };
  }
  if (data === 'muchos') return { mensaje: 'Recibimos muchos pedidos seguidos desde esta conexión. Probá en una hora.' };
  if (data === 'ya_pendiente') return { ok: true, mensaje: 'Ya tenemos un pedido con ese mail: te vamos a escribir ahí.' };
  console.info('[acceso] pedido nuevo');
  return { ok: true, mensaje: '¡Listo! Recibimos tu pedido. Te vamos a escribir a tu mail con el acceso.' };
}

// ---------------------------------------------------------------------
// Equipo (admin): invitar o descartar
// ---------------------------------------------------------------------
async function linkDeMaestra(email: string, nombre: string, pedidoPor: string): Promise<{ link?: string; error?: string }> {
  const admin = crearClienteAdmin();
  if (!admin) return { error: 'Falta la clave secreta en el servidor (SUPABASE_SECRET_KEY).' };
  console.info(`[acceso] link de invitación de maestra pedido por ${pedidoPor}`);
  // El link vuelve al inicio: LinkDeMail (layout raíz) lo lee y sigue a /maestra/clave para elegir la contraseña.
  // El nombre va en los datos de la cuenta: con eso la base crea la ficha de la maestra (docentes.nombre).
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${await origen()}/`, data: nombre ? { nombre } : undefined },
  });
  if (error || !data?.properties?.action_link) {
    if (error?.code === 'email_exists' || /already been registered/i.test(error?.message ?? '')) {
      return { error: 'Ese mail ya tiene una cuenta. Puede entrar en /maestra/entrar o recuperar su contraseña desde ahí.' };
    }
    console.error('[acceso] invitar:', error?.code);
    return { error: 'No se pudo generar el link. Probá de nuevo.' };
  }
  return { link: data.properties.action_link };
}

export async function invitarDesdeSolicitud(solicitudId: string): Promise<EstadoInvitacion> {
  const yo = await miembroCon('admin');
  if (!yo || !UUID.test(solicitudId)) return { mensaje: 'No tenés permiso para hacer eso.' };
  const db = (await crearClienteServidor())!;
  const { data: s } = await db.from('solicitudes_acceso').select('id, nombre, email, estado').eq('id', solicitudId).maybeSingle();
  if (!s) return { mensaje: 'No encontramos ese pedido.' };
  if (s.estado !== 'pendiente') return { mensaje: 'Ese pedido ya está resuelto.' };
  const r = await linkDeMaestra(s.email, s.nombre, yo.id);
  if (!r.link) return { mensaje: r.error ?? 'No se pudo invitar.' };
  const { error } = await db.from('solicitudes_acceso').update({ estado: 'invitada', resuelta_en: new Date().toISOString(), resuelta_por: yo.id }).eq('id', s.id);
  if (error) console.error('[acceso] marcar invitada:', error.code);
  refresh();
  return { ok: true, link: r.link, email: s.email, nombre: s.nombre, mensaje: 'Cuenta creada. Mandale este link: sirve una sola vez.' };
}

export async function invitarMaestra(_previo: EstadoInvitacion, datos: FormData): Promise<EstadoInvitacion> {
  const yo = await miembroCon('admin');
  if (!yo) return { mensaje: 'No tenés permiso para hacer eso.' };
  const email = String(datos.get('email') ?? '').trim().toLowerCase();
  const nombre = String(datos.get('nombre') ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!MAIL.test(email) || email.endsWith('@alumnos.invalid')) return { mensaje: 'Revisá el mail.' };
  const r = await linkDeMaestra(email, nombre, yo.id);
  if (!r.link) return { mensaje: r.error ?? 'No se pudo invitar.' };
  return { ok: true, link: r.link, email, nombre, mensaje: 'Cuenta creada. Mandale este link: sirve una sola vez.' };
}

export async function descartarSolicitud(solicitudId: string): Promise<void> {
  const yo = await miembroCon('admin');
  if (!yo || !UUID.test(solicitudId)) return;
  const db = (await crearClienteServidor())!;
  await db.from('solicitudes_acceso').update({ estado: 'descartada', resuelta_en: new Date().toISOString(), resuelta_por: yo.id }).eq('id', solicitudId).eq('estado', 'pendiente');
  refresh();
}
