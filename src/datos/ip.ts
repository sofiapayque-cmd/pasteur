import 'server-only';
import { headers } from 'next/headers';

/*
  IP real de quien hace el pedido (Vercel la pone en x-real-ip / x-forwarded-for).
  Se reenvía a Supabase (Sb-Forwarded-For) para que sus límites de intentos
  cuenten por escuela y no por el servidor de Vercel, que es el mismo para todos.
*/
export async function ipDelPedido(): Promise<string | null> {
  const h = await headers();
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}
