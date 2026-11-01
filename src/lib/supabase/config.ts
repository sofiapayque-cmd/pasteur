/*
  Configuración de Supabase (etapa 5 de la migración).

  Las dos variables se cargan en Vercel (Settings → Environment Variables) y,
  para probar en tu computadora, en un archivo .env.local (ver .env.example).
  Son PÚBLICAS a propósito: van dentro de la web. La seguridad la dan las
  reglas RLS de la base, no esconder estas claves.
  NUNCA poner acá la secret key (sb_secret_…) ni la contraseña de la base.

  Mientras no estén cargadas, la web funciona igual que antes (sala de prueba
  en el navegador) y todo lo de Supabase se saltea.
*/
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/*
  Interruptor del sistema real de aulas (maestras con cuenta, aulas, alumnos
  con tarjeta). Se prende con NEXT_PUBLIC_AULAS_REALES=1 SOLO en desarrollo y
  en los links de prueba de Vercel hasta que esté aprobado. Apagado, la web
  funciona igual que el prototipo (sala de prueba en el navegador).
*/
export const aulasReales = supabaseConfigurado && process.env.NEXT_PUBLIC_AULAS_REALES === '1';
