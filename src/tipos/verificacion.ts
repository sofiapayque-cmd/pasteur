/*
  Comprobación de tipos (no se ejecuta, solo la revisa `npm run typecheck`):
  confirma que los datos reales en .js cumplen los tipos de src/tipos.
  Si alguien cambia la forma de una actividad, esto avisa.
*/
import { INFO_ACTIVIDADES } from '@/actividades/info';
import { ACTIVIDADES } from '@/data/contenido';
import type { FichaActividad, IdActividad, InfoActividad } from './actividad';

export const infoVerificada: Record<IdActividad, InfoActividad> = INFO_ACTIVIDADES;
// En .js el id se infiere como string: se convierte solo el id y se verifica todo lo demás.
export const fichasVerificadas: FichaActividad[] = ACTIVIDADES.map((a) => ({ ...a, id: a.id as IdActividad }));
