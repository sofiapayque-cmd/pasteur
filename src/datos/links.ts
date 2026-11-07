import 'server-only';
import { headers } from 'next/headers';

/** La dirección de esta web (la del pedido: preview, producción o local). */
export async function origenDelPedido() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`;
}

/**
 * Link de un solo uso hacia /auth/confirmar (botón "Entrar"). Se arma con el
 * token_hash que devuelve Supabase al generar el link, en vez del link de
 * Supabase, que se gasta apenas alguien (o una vista previa) lo abre.
 */
export async function linkDeUnSoloUso(tokenHash: string, tipo: string) {
  const q = new URLSearchParams({ token_hash: tokenHash, type: tipo });
  return `${await origenDelPedido()}/auth/confirmar?${q.toString()}`;
}
