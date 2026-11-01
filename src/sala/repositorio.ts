/*
  REPOSITORIO DE LA SALA (etapa 5 de la migración)

  El contrato de "la sala de clase": todo lo que las pantallas le piden.
  Hoy lo cumple la versión de prueba en el navegador (sala.js, localStorage).
  Mañana lo va a cumplir una versión con Supabase (tiempo real entre la
  computadora de la maestra y las Ceibal), sin cambiar las pantallas.

  Cómo sumar la versión Supabase (cuando la base esté aprobada):
  1. Crear sala/repositorioSupabase.ts que exporte un objeto con este mismo tipo.
     - useSala: suscripción en tiempo real (supabase.channel) a la fila de la sala
       y a sus alumnos.
     - abrirSala / empezar / …: updates a la tabla `salas` (solo la maestra dueña,
       por las reglas RLS del borrador en supabase/borrador/esquema.sql).
     - unirme / actualizarAlumno: los niños entran con sesión anónima de Supabase
       y la función `unirse_a_sala(codigo, apodo, color)`.
  2. En sala.js, elegir uno u otro con `supabaseConfigurado` (lib/supabase/config.ts).
  3. Volver a correr todas las pruebas (las pantallas no deberían enterarse).

  Nota: las funciones de hoy son sincrónicas porque localStorage lo es. Las de
  Supabase van a ser asíncronas: los botones que las llaman ya funcionan igual
  si la función devuelve una promesa (no esperan el resultado), pero
  `codigoValido` va a tener que pasar a `await`.
*/
import type { AlumnoEnSala, IdActividad, Sala } from '@/tipos';
import * as local from './sala';

export interface RepositorioSala {
  /** Hook: la sala actual. Se actualiza sola cuando cambia. */
  useSala(): Sala;

  // Maestra
  abrirSala(datos: { actividad: IdActividad; opciones?: Sala['opciones']; desbloqueos?: Sala['desbloqueos'] }): void;
  empezar(): void;
  alternarPausa(): void;
  desbloquear(clave: string): void;
  irAPuesta(): void;
  cerrarSala(): void;
  /** Solo para el prototipo: suma un alumno ficticio. */
  simularAlumno(): void;

  // Niño
  codigoValido(codigo: string): boolean;
  unirme(datos: { apodo: string; color: string }): void;
  /** El niño de ESTA pestaña dentro de la sala (o null). */
  yo(sala: Sala): AlumnoEnSala | null;
  actualizarAlumno(etapa: string | null, datos?: AlumnoEnSala['datos']): void;
  apodosLibres(sala: Sala, cantidad?: number): string[];
}

/*
  La versión de hoy (navegador). `satisfies` hace que `npm run typecheck`
  avise si sala.js deja de cumplir el contrato.
*/
export const repositorioLocal = {
  useSala: local.useSala as () => Sala,
  abrirSala: local.abrirSala,
  empezar: local.empezar,
  alternarPausa: local.alternarPausa,
  desbloquear: local.desbloquear,
  irAPuesta: local.irAPuesta,
  cerrarSala: local.cerrarSala,
  simularAlumno: local.simularAlumno,
  codigoValido: local.codigoValido,
  unirme: local.unirme,
  yo: local.yo as (sala: Sala) => AlumnoEnSala | null,
  actualizarAlumno: local.actualizarAlumno,
  apodosLibres: local.apodosLibres,
} satisfies RepositorioSala;
