'use server';

import { redirect } from 'next/navigation';
import { refresh } from 'next/cache';
import { aulasReales } from '@/lib/supabase/config';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { cerrarSesion, iniciarSesionAlumno } from '@/datos/sesion';
import { obtenerAlumno } from '@/datos/alumno';
import { mailInterno } from '@/datos/claves';
import { leerIngreso } from '@/lib/aulas/ingreso';
import { APODOS, COLORES_ALUMNO } from '@/data/contenido';

/*
  ACCIONES DEL ALUMNO (etapa 4). Ingreso del lado del servidor:
  1. ordena y valida lo que escribió (código del aula, número, clave);
  2. pide permiso para un intento (migración 16: hasta 5 seguidos por usuario,
     el 6.º bloquea 10 minutos; 30 a la vez contra el mismo usuario → pasan 5);
  3. entra a Supabase desde el servidor con la IP real del chico;
  4. si la cuenta está desactivada o el aula archivada, sale y avisa;
  5. borra la cuenta de intentos y anota el último ingreso.
  Los mensajes nunca dicen qué dato estaba mal (código, número o clave), para
  no ayudar a adivinar; sí avisan si algo está mal ESCRITO (formato).
*/
export type EstadoIngreso = { mensaje: string; campo?: 'codigo' | 'numero' | 'clave' };

const MAL_ESCRITO = {
  codigo: 'El código del aula tiene 4 letras y números. Copialo de tu tarjeta.',
  numero: 'Tu número es el que dice tu tarjeta (por ejemplo, 7).',
  clave: 'La clave son dos palabras y un número, con guiones. Por ejemplo: sapo-luna-42.',
};

export async function ingresarAlumno(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  if (!aulasReales) return { mensaje: 'Todavía no se puede entrar con tarjeta.' };
  const leido = leerIngreso(String(datos.get('codigo') ?? ''), String(datos.get('numero') ?? ''), String(datos.get('clave') ?? ''));
  if ('error' in leido) return { mensaje: MAL_ESCRITO[leido.error], campo: leido.error };

  const admin = crearClienteAdmin();
  if (!admin) return { mensaje: 'La web no está lista para entrar con tarjeta. Avisale a tu maestra.' };
  const { data: puede, error: errorIntento } = await admin.rpc('reservar_intento_ingreso', { p_usuario: leido.usuario });
  if (errorIntento) {
    console.error('[alumno] intentos:', errorIntento.code);
    return { mensaje: 'Algo no anduvo. Probá de nuevo en un ratito.' };
  }
  if (!puede) return { mensaje: 'Probaste muchas veces. Esperá 10 minutos o pedile a tu maestra una clave nueva.' };

  const ingreso = await iniciarSesionAlumno(mailInterno(leido.usuario), leido.clave);
  if ('error' in ingreso) {
    if (ingreso.error === 'limite') {
      await admin.rpc('devolver_intento_ingreso', { p_usuario: leido.usuario });
      return { mensaje: 'Están entrando muchos chicos a la vez. Esperá un minuto y probá de nuevo.' };
    }
    if (ingreso.error === 'clave') return { mensaje: 'El código, el número o la clave no coinciden. Fijate bien en tu tarjeta.' };
    return { mensaje: 'Algo no anduvo. Probá de nuevo en un ratito.' };
  }

  // Cuenta pausada por la maestra o aula archivada: no entra
  const { data: fila } = await admin.from('alumnos').select('activo, aulas(archivada_en)').eq('id', ingreso.id).maybeSingle<{
    activo: boolean;
    aulas: { archivada_en: string | null } | null;
  }>();
  if (!fila?.activo || !fila.aulas || fila.aulas.archivada_en) {
    await cerrarSesion();
    return { mensaje: 'Tu cuenta está pausada. Hablá con tu maestra.' };
  }
  await Promise.all([
    admin.from('intentos_ingreso').delete().eq('usuario', leido.usuario),
    admin.from('alumnos').update({ ultimo_ingreso: new Date().toISOString() }).eq('id', ingreso.id),
  ]);
  redirect('/lab');
}

export async function salirAlumno(): Promise<void> {
  await cerrarSesion();
  redirect('/clase');
}

/*
  Apodo y color: se eligen de listas (no se escriben), así ningún chico pone
  su nombre real. La regla RLS solo le deja cambiar su propia fila.
*/
export type EstadoApodo = { mensaje: string; ok?: boolean };

export async function elegirApodo(_previo: EstadoApodo, datos: FormData): Promise<EstadoApodo> {
  const alumno = await obtenerAlumno();
  if (!alumno) return { mensaje: 'Volvé a entrar con tu tarjeta.' };
  const apodo = String(datos.get('apodo') ?? '');
  const color = String(datos.get('color') ?? '');
  if (!APODOS.includes(apodo)) return { mensaje: 'Elegí uno de los apodos.' };
  if (!COLORES_ALUMNO.some((c: { valor: string }) => c.valor === color)) return { mensaje: 'Elegí un color.' };
  const supabase = await crearClienteServidor();
  const { error } = await supabase!.from('alumnos').update({ apodo, color }).eq('id', alumno.id);
  if (error) {
    console.error('[alumno] apodo:', error.code);
    return { mensaje: 'No se pudo guardar. Probá de nuevo.' };
  }
  refresh();
  return { ok: true, mensaje: `¡Listo, ${apodo}!` };
}
