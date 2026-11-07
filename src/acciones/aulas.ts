'use server';

import { revalidatePath } from 'next/cache';
import { aulasReales } from '@/lib/supabase/config';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAlumnos, obtenerAlumno, obtenerAula, type Aula } from '@/datos/aulas';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { crearCuentas, regenerarClaves, type Tarjeta } from '@/datos/cuentas-alumnos';
import { MAX_ALUMNOS_POR_AULA } from '@/datos/claves';

/*
  ACCIONES DE AULAS (Server Actions de la maestra).

  Cada una se puede llamar con un POST hecho a mano, así que:
    1. exige una maestra activa (exigirDocenteActiva);
    2. busca el aula o el alumno CON LA SESIÓN DE LA MAESTRA (reglas RLS):
       si no es suyo, la base no lo devuelve y la acción termina ahí;
    3. recién entonces usa la clave secreta (src/datos/cuentas-alumnos.ts),
       con los datos que devolvió la base, no con los del formulario.
  Las claves nuevas vuelven UNA vez en la respuesta, para las tarjetas.
*/

export type AulaResumen = Pick<Aula, 'id' | 'nombre' | 'codigo' | 'grado' | 'anio_lectivo'>;

export type EstadoAula = {
  mensaje: string;
  ok?: boolean;
  aula?: AulaResumen;
  tarjetas?: Tarjeta[];
  fallidos?: number[];
  valores?: Record<string, string>;
};

const NUMERO_MAXIMO = 60; // límite de la base (alumnos.numero)
const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const anioActual = () => Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Montevideo' }).format(new Date()));
const resumen = (a: Aula): AulaResumen => ({ id: a.id, nombre: a.nombre, codigo: a.codigo, grado: a.grado, anio_lectivo: a.anio_lectivo });

function datosDelAula(f: FormData) {
  const nombre = leer(f, 'nombre').replace(/\s+/g, ' ');
  const gradoTexto = leer(f, 'grado');
  const anioTexto = leer(f, 'anio');
  const grado = gradoTexto === '' ? null : Number(gradoTexto);
  const anio = anioTexto === '' ? anioActual() : Number(anioTexto);
  if (nombre.length < 1 || nombre.length > 80) return { error: 'Poné un nombre para la clase (hasta 80 letras), por ejemplo "4° B".' };
  // 4°, 5° o 6°: la plataforma es para chicos de 10 a 12 años (la base acepta de 1° a 6°)
  if (grado !== null && !(Number.isInteger(grado) && grado >= 4 && grado <= 6)) return { error: 'El año escolar puede ser 4°, 5° o 6°.' };
  if (!(Number.isInteger(anio) && anio >= 2024 && anio <= 2100)) return { error: 'Revisá el año lectivo.' };
  return { nombre, grado, anio };
}

function cantidadPedida(f: FormData) {
  const cantidad = Number(leer(f, 'cantidad'));
  return Number.isInteger(cantidad) && cantidad >= 1 && cantidad <= MAX_ALUMNOS_POR_AULA ? cantidad : null;
}

function mensajeCuentas(creadas: number, fallidos: number[]) {
  if (fallidos.length === 0) return `Listo: ${creadas} ${creadas === 1 ? 'cuenta nueva' : 'cuentas nuevas'}.`;
  return `Se crearon ${creadas}. No se pudieron crear ${fallidos.length} (números ${fallidos.join(', ')}): probá "Agregar alumnos" de nuevo en un rato.`;
}

/** Nueva aula + las cuentas de sus alumnos. */
export async function crearAula(_previo: EstadoAula, datos: FormData): Promise<EstadoAula> {
  if (!aulasReales) return { mensaje: 'El sistema de aulas todavía no está activado.' };
  await exigirDocenteActiva();
  const valores = { nombre: leer(datos, 'nombre'), grado: leer(datos, 'grado'), anio: leer(datos, 'anio'), cantidad: leer(datos, 'cantidad') };
  const aulaPedida = datosDelAula(datos);
  if ('error' in aulaPedida) return { mensaje: aulaPedida.error ?? '', valores };
  const cantidad = cantidadPedida(datos);
  if (!cantidad) return { mensaje: `La cantidad de alumnos va de 1 a ${MAX_ALUMNOS_POR_AULA}.`, valores };

  const supabase = await crearClienteServidor();
  const { data: aula, error } = await supabase!
    .from('aulas')
    .insert({ nombre: aulaPedida.nombre, grado: aulaPedida.grado, anio_lectivo: aulaPedida.anio })
    .select('id, nombre, grado, anio_lectivo, codigo, creada_en, archivada_en')
    .single();
  if (error || !aula) return { mensaje: 'No se pudo crear el aula. Probá de nuevo.', valores };

  const numeros = Array.from({ length: cantidad }, (_, i) => i + 1);
  const { tarjetas, fallidos } = await crearCuentas(aula as Aula, numeros);
  revalidatePath('/maestra/aulas');
  return { ok: true, aula: resumen(aula as Aula), tarjetas, fallidos, mensaje: mensajeCuentas(tarjetas.length, fallidos) };
}

/** Más alumnos en un aula existente (alguien nuevo, o completar cuentas que fallaron). */
export async function agregarAlumnos(_previo: EstadoAula, datos: FormData): Promise<EstadoAula> {
  if (!aulasReales) return { mensaje: 'El sistema de aulas todavía no está activado.' };
  const aula = await obtenerAula(datos.get('aula'));
  if (!aula) return { mensaje: 'No encontramos esa aula entre las tuyas.' };
  if (aula.archivada_en) return { mensaje: 'El aula está archivada. Reactivala para agregar alumnos.' };
  const cantidad = cantidadPedida(datos);
  if (!cantidad) return { mensaje: `Podés agregar de 1 a ${MAX_ALUMNOS_POR_AULA} alumnos por vez.` };

  const alumnos = await listarAlumnos(aula.id);
  const ultimo = alumnos.reduce((max, a) => Math.max(max, a.numero), 0);
  if (ultimo + cantidad > NUMERO_MAXIMO) return { mensaje: `Un aula puede tener hasta ${NUMERO_MAXIMO} números de lista.` };

  const numeros = Array.from({ length: cantidad }, (_, i) => ultimo + i + 1);
  const { tarjetas, fallidos } = await crearCuentas(aula, numeros);
  revalidatePath(`/maestra/aulas/${aula.id}`);
  revalidatePath('/maestra/aulas');
  return { ok: true, aula: resumen(aula), tarjetas, fallidos, mensaje: mensajeCuentas(tarjetas.length, fallidos) };
}

/** Clave nueva para un alumno (perdió o se olvidó la tarjeta). */
export async function nuevaClave(_previo: EstadoAula, datos: FormData): Promise<EstadoAula> {
  if (!aulasReales) return { mensaje: 'El sistema de aulas todavía no está activado.' };
  const alumno = await obtenerAlumno(datos.get('alumno'));
  if (!alumno) return { mensaje: 'No encontramos ese alumno entre los tuyos.' };
  const aula = await obtenerAula(alumno.aula_id);
  if (!aula) return { mensaje: 'No encontramos esa aula entre las tuyas.' };
  if (aula.archivada_en) return { mensaje: 'El aula está archivada. Reactivala para cambiar claves.' };
  if (!alumno.activo) return { mensaje: `${alumno.usuario} está desactivado. Activalo antes de darle una clave nueva.` };

  const { tarjetas, fallidos } = await regenerarClaves([alumno]);
  if (fallidos.length) return { mensaje: 'No se pudo cambiar la clave. Probá de nuevo.' };
  return { ok: true, aula: resumen(aula), tarjetas, mensaje: `Clave nueva para ${alumno.usuario}. La anterior ya no sirve.` };
}

/** Claves nuevas para todos los alumnos activos del aula (por ejemplo, si se perdieron las tarjetas). */
export async function nuevasClavesDelGrupo(_previo: EstadoAula, datos: FormData): Promise<EstadoAula> {
  if (!aulasReales) return { mensaje: 'El sistema de aulas todavía no está activado.' };
  const aula = await obtenerAula(datos.get('aula'));
  if (!aula) return { mensaje: 'No encontramos esa aula entre las tuyas.' };
  if (aula.archivada_en) return { mensaje: 'El aula está archivada. Reactivala para cambiar claves.' };
  if (leer(datos, 'confirmo') !== 'si') return { mensaje: 'Marcá la casilla para confirmar: todas las tarjetas anteriores dejan de servir.' };

  const activos = (await listarAlumnos(aula.id)).filter((a) => a.activo);
  if (activos.length === 0) return { mensaje: 'El aula no tiene alumnos activos.' };
  const { tarjetas, fallidos } = await regenerarClaves(activos);
  return {
    ok: true,
    aula: resumen(aula),
    tarjetas,
    fallidos,
    mensaje: fallidos.length ? `Claves nuevas para ${tarjetas.length}. Fallaron los números ${fallidos.join(', ')}: probá de nuevo con cada uno.` : `Claves nuevas para ${tarjetas.length} alumnos. Las anteriores ya no sirven.`,
  };
}

/** Cambiar nombre, año escolar o año lectivo. */
export async function guardarAula(_previo: EstadoAula, datos: FormData): Promise<EstadoAula> {
  if (!aulasReales) return { mensaje: 'El sistema de aulas todavía no está activado.' };
  const aula = await obtenerAula(datos.get('aula'));
  if (!aula) return { mensaje: 'No encontramos esa aula entre las tuyas.' };
  const cambios = datosDelAula(datos);
  if ('error' in cambios) return { mensaje: cambios.error ?? '' };
  const supabase = await crearClienteServidor();
  const { data } = await supabase!
    .from('aulas')
    .update({ nombre: cambios.nombre, grado: cambios.grado, anio_lectivo: cambios.anio })
    .eq('id', aula.id)
    .select('id')
    .maybeSingle();
  if (!data) return { mensaje: 'No se pudo guardar. Probá de nuevo.' };
  revalidatePath(`/maestra/aulas/${aula.id}`);
  revalidatePath('/maestra/aulas');
  return { ok: true, mensaje: 'Guardado.' };
}

/** Archivar (fin de año) o reactivar un aula. Nada se borra. */
export async function archivarAula(datos: FormData): Promise<void> {
  if (!aulasReales) return;
  const aula = await obtenerAula(datos.get('aula'));
  if (!aula) return;
  const archivar = leer(datos, 'archivar') === 'si';
  const supabase = await crearClienteServidor();
  await supabase!.from('aulas').update({ archivada_en: archivar ? new Date().toISOString() : null }).eq('id', aula.id);
  revalidatePath(`/maestra/aulas/${aula.id}`);
  revalidatePath('/maestra/aulas');
}

/** Activar o desactivar a un alumno (por ejemplo, si se cambió de escuela). Desactivado, no puede entrar. */
export async function cambiarActivo(datos: FormData): Promise<void> {
  if (!aulasReales) return;
  const alumno = await obtenerAlumno(datos.get('alumno'));
  if (!alumno) return;
  const activo = leer(datos, 'activo') === 'si';
  const supabase = await crearClienteServidor();
  await supabase!.from('alumnos').update({ activo }).eq('id', alumno.id);
  if (!activo) {
    // Desactivado: además de las reglas de la base, se cierran sus sesiones abiertas.
    await crearClienteAdmin()?.rpc('cerrar_sesiones_alumno', { p_alumno: alumno.id });
  }
  revalidatePath(`/maestra/aulas/${alumno.aula_id}`);
}


/**
 * Borrar el apodo de un alumno (por ejemplo, si eligió uno que no corresponde).
 * La próxima vez que entre, vuelve a elegir. Con la sesión de la maestra (RLS).
 */
export async function borrarApodo(datos: FormData): Promise<void> {
  if (!aulasReales) return;
  const alumno = await obtenerAlumno(datos.get('alumno'));
  if (!alumno) return;
  const supabase = await crearClienteServidor();
  await supabase!.from('alumnos').update({ apodo: null, color: null }).eq('id', alumno.id);
  revalidatePath(`/maestra/aulas/${alumno.aula_id}`);
}
