import { timingSafeEqual } from 'node:crypto';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { limpiarCuriosidades } from '@/datos/curiosidades';

/*
  /api/latido · Mantiene despierta la base en el plan gratis de Supabase.

  Supabase pausa los proyectos gratis después de 7 días con poca actividad
  (por ejemplo, en vacaciones: la escuela entraría y no andaría). Una vez por
  día, Vercel llama a esta dirección (vercel.json → crons) y acá se hacen unas
  lecturas mínimas a la base, sin datos de nadie.

  Solo responde a Vercel: Vercel manda "Authorization: Bearer <CRON_SECRET>"
  y se compara con la variable CRON_SECRET (Sensitive, solo en Vercel). Sin
  esa variable no hace nada. Con el plan pago de Supabase deja de hacer falta.
  Además borra los conteos viejos de las curiosidades (migración 22).
*/
export const dynamic = 'force-dynamic';

function autorizado(cabecera: string | null) {
  const secreto = process.env.CRON_SECRET ?? '';
  if (secreto.length < 16 || !cabecera) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(cabecera);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

export async function GET(request: Request) {
  if (!autorizado(request.headers.get('authorization'))) return new Response('No', { status: 401 });
  const admin = crearClienteAdmin();
  if (!admin) return Response.json({ ok: false, motivo: 'sin clave secreta' }, { status: 503 });
  // Tres lecturas chiquitas de tablas sin datos personales
  const pedidos = await Promise.all([
    admin.from('proveedores_cientificos').select('id', { head: true, count: 'exact' }),
    admin.from('licencias').select('codigo', { head: true, count: 'exact' }),
    admin.from('tipos_identificador').select('id', { head: true, count: 'exact' }),
  ]);
  // De paso, la limpieza diaria de las curiosidades (conteos de más de 90 días, vistas de aulas de más de 30)
  await limpiarCuriosidades(admin).catch(() => undefined);
  const errores = pedidos.filter((r) => r.error).length;
  if (errores) console.error('[latido] lecturas con error:', errores);
  return Response.json({ ok: errores === 0, cuando: new Date().toISOString() });
}
