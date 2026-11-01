import 'server-only';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { generarClave, mailInterno, usuarioDe } from './claves';

/*
  CUENTAS DE ALUMNOS · lo único que usa la clave secreta (solo servidor).

  REGLA: estas funciones NO verifican permisos. Se llaman solo desde
  src/acciones/aulas.ts, DESPUÉS de que la acción comprobó con la sesión de la
  maestra (src/datos/aulas.ts, reglas RLS) que el aula o el alumno son suyos,
  y solo con datos que devolvió la base, nunca con lo que mandó el navegador.

  Las claves se devuelven una vez para las tarjetas y no se guardan en
  ningún lado nuestro: Supabase Auth las guarda con hash.
*/

export type Tarjeta = { numero: number; usuario: string; clave: string };
export type ResultadoCuentas = { tarjetas: Tarjeta[]; fallidos: number[] };

const EN_PARALELO = 5;

async function enTandas<T>(items: T[], tarea: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += EN_PARALELO) {
    await Promise.all(items.slice(i, i + EN_PARALELO).map(tarea));
  }
}

function admin() {
  const cliente = crearClienteAdmin();
  if (!cliente) throw new Error('Falta la clave secreta del servidor (SUPABASE_SECRET_KEY)');
  return cliente;
}

/** Crea las cuentas de los números indicados en un aula (ya verificada). */
export async function crearCuentas(aula: { id: string; codigo: string }, numeros: number[]): Promise<ResultadoCuentas> {
  const supabase = admin();
  const tarjetas: Tarjeta[] = [];
  const fallidos: number[] = [];

  await enTandas(numeros, async (numero) => {
    const usuario = usuarioDe(aula.codigo, numero);
    const clave = generarClave();
    const { data, error } = await supabase.auth.admin.createUser({
      email: mailInterno(usuario),
      password: clave,
      email_confirm: true,
      app_metadata: { rol: 'alumno' },
      user_metadata: {},
    });
    if (error || !data.user) {
      console.error(`[aulas] no se pudo crear la cuenta ${usuario}:`, error?.code ?? error?.message);
      fallidos.push(numero);
      return;
    }
    const { error: errorFila } = await supabase.from('alumnos').insert({ id: data.user.id, aula_id: aula.id, numero, usuario });
    if (errorFila) {
      // La cuenta recién creada quedó sin fila: se deshace para no dejar usuarios sueltos.
      console.error(`[aulas] no se pudo registrar ${usuario}:`, errorFila.code);
      await supabase.auth.admin.deleteUser(data.user.id);
      fallidos.push(numero);
      return;
    }
    tarjetas.push({ numero, usuario, clave });
  });

  tarjetas.sort((a, b) => a.numero - b.numero);
  fallidos.sort((a, b) => a - b);
  return { tarjetas, fallidos };
}

/**
 * Clave nueva para alumnos (ya verificados): la cambia en Supabase Auth,
 * cierra las sesiones que tenían abiertas y les borra los intentos fallidos.
 */
export async function regenerarClaves(alumnos: { id: string; numero: number; usuario: string }[]): Promise<ResultadoCuentas> {
  const supabase = admin();
  const tarjetas: Tarjeta[] = [];
  const fallidos: number[] = [];

  await enTandas(alumnos, async (alumno) => {
    const clave = generarClave();
    const { error } = await supabase.auth.admin.updateUserById(alumno.id, { password: clave });
    if (error) {
      console.error(`[aulas] no se pudo cambiar la clave de ${alumno.usuario}:`, error.code ?? error.message);
      fallidos.push(alumno.numero);
      return;
    }
    await supabase.rpc('cerrar_sesiones_alumno', { p_alumno: alumno.id });
    await supabase.from('intentos_ingreso').delete().eq('usuario', alumno.usuario);
    tarjetas.push({ numero: alumno.numero, usuario: alumno.usuario, clave });
  });

  tarjetas.sort((a, b) => a.numero - b.numero);
  fallidos.sort((a, b) => a - b);
  return { tarjetas, fallidos };
}
