/*
  Lo que escribe un chico al entrar, ordenado antes de mandarlo (sin red;
  se prueba con npm run test:ingreso). Perdona lo que es fácil de errar en
  un teclado: minúsculas en el código, espacios en vez de guiones, tildes,
  mayúsculas en la clave, "7" en vez de "07".
*/
export const CODIGO_AULA = /^[A-HJ-NP-Z2-9]{4}$/;
export const CLAVE_ALUMNO = /^[a-z]{3,8}-[a-z]{3,8}-[1-9][0-9]$/;
export const NUMERO_MAXIMO = 60;

export const normalizarCodigo = (t: string) =>
  t
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);

export function normalizarNumero(t: string): number | null {
  const limpio = t.replace(/\D/g, '');
  if (!limpio || limpio.length > 2) return null;
  const n = Number(limpio);
  return n >= 1 && n <= NUMERO_MAXIMO ? n : null;
}

export const normalizarClave = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_.,/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    // "sapoluna42" o "sapo-luna42": separa el número del final
    .replace(/([a-z])(\d{2})$/, '$1-$2');

export type Ingreso = { usuario: string; clave: string } | { error: 'codigo' | 'numero' | 'clave' };

/** Arma el usuario ("K7RM-07") y la clave limpia, o dice qué dato está mal escrito. */
export function leerIngreso(codigo: string, numero: string, clave: string): Ingreso {
  const c = normalizarCodigo(codigo);
  if (!CODIGO_AULA.test(c)) return { error: 'codigo' };
  const n = normalizarNumero(numero);
  if (n === null) return { error: 'numero' };
  const k = normalizarClave(clave);
  if (!CLAVE_ALUMNO.test(k)) return { error: 'clave' };
  return { usuario: `${c}-${String(n).padStart(2, '0')}`, clave: k };
}
