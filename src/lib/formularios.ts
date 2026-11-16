/*
  Ayudas chicas que usan casi todas las acciones del servidor (antes había
  una copia en cada archivo).
*/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Si es un id de la base (uuid). */
export const esUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

/** Un campo de un formulario, como texto y sin espacios en las puntas. */
export const leer = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/** Hace `fn` con cada elemento, de a `cuantos` a la vez, y devuelve los resultados en el mismo orden. */
export async function deA<T, R>(cuantos: number, items: T[], fn: (t: T) => Promise<R>): Promise<R[]> {
  const salida: R[] = new Array(items.length);
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: Math.min(cuantos, items.length) }, async () => {
      while (siguiente < items.length) {
        const i = siguiente++;
        salida[i] = await fn(items[i]);
      }
    }),
  );
  return salida;
}
