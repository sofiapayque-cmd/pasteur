/*
  QUIÉN ENTRA A QUÉ (tabla única, sin servidor ni base: se puede probar sola).
  La usan las páginas y acciones a través de src/datos/acceso.ts. Es una capa
  más: la frontera real de los datos siguen siendo las reglas RLS de la base.

  Tipos de persona:
    · visitante → sin sesión, o con una cuenta que no está activa
    · alumno    → entró con su tarjeta (cuenta de alumno activa, aula vigente)
    · docente   → maestra con cuenta activa
    · equipo    → integrante activo del equipo del Pasteur (cualquier rol)

  Áreas:
    · fichas    → la información pública de las actividades (/explorar sin sesión)
    · actividad → hacer una actividad por su cuenta (/explorar/aN)
    · tarea     → tareas y clase en vivo del alumno (/lab, /clase/[código])
    · docente   → panel de la maestra, aulas y asistente (/maestra/...)
    · equipo    → panel del equipo científico (/equipo/...)

  Pedido de Sofia (8/11): las actividades dejan de ser públicas; los alumnos
  con cuenta y el equipo también pueden hacerlas por su cuenta.
*/
export type TipoPersona = 'visitante' | 'alumno' | 'docente' | 'equipo';
export type Area = 'fichas' | 'actividad' | 'tarea' | 'docente' | 'equipo';

export const TIPOS_PERSONA: readonly TipoPersona[] = ['visitante', 'alumno', 'docente', 'equipo'];
export const AREAS: readonly Area[] = ['fichas', 'actividad', 'tarea', 'docente', 'equipo'];

const TABLA: Record<Area, readonly TipoPersona[]> = {
  fichas: ['visitante', 'alumno', 'docente', 'equipo'],
  actividad: ['alumno', 'docente', 'equipo'],
  tarea: ['alumno'],
  docente: ['docente'],
  equipo: ['equipo'],
};

export function puedeEntrar(tipo: TipoPersona, area: Area): boolean {
  return TABLA[area]?.includes(tipo) ?? false;
}

/** Dónde se entra a cada área cuando no hay permiso (la página de ingreso de cada una). */
export const INGRESO: Record<Exclude<Area, 'fichas'>, string> = {
  actividad: '/explorar',
  tarea: '/clase',
  docente: '/maestra/entrar',
  equipo: '/equipo/entrar',
};
