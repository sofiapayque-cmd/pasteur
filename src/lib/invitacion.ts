/**
 * ¿Esta invitación reemplazó a otra? Si la cuenta ya existía sin confirmar,
 * Supabase no da error: crea un link nuevo y el anterior deja de servir.
 * Se nota porque la cuenta se creó antes que esta invitación (con una
 * invitación nueva, las dos fechas quedan a milisegundos).
 * Pruebas: npm run test:ingreso
 */
export function reemplazoOtroLink(usuario: { created_at?: string; invited_at?: string } | null | undefined) {
  const creada = Date.parse(usuario?.created_at ?? '');
  const invitada = Date.parse(usuario?.invited_at ?? '');
  return Number.isFinite(creada) && Number.isFinite(invitada) && invitada - creada > 5000;
}
