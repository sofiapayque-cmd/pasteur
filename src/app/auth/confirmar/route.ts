import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/*
  /auth/confirmar — a donde llega la maestra desde el mail de Supabase
  (link mágico o confirmación de cuenta). Verifica el código y la manda a
  `siguiente` (por defecto, su panel).
  Basado en el ejemplo oficial with-supabase de Next.js.
  En Supabase → Authentication → Email Templates, el link tiene que apuntar a:
  {{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email&siguiente=/maestra
*/
const destinoSeguro = (valor: string | null) => (valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/maestra');

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const tipo = searchParams.get('type') as EmailOtpType | null;
  const siguiente = destinoSeguro(searchParams.get('siguiente'));

  const supabase = await crearClienteServidor();
  if (supabase && tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) redirect(siguiente);
  }
  // Link vencido, ya usado o Supabase sin configurar: vuelve al inicio de la maestra.
  redirect('/rol');
}
