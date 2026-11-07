/*
  Para las pruebas con node --test: dentro de src/ los imports van sin
  extensión ('../ciencia/normalizar'), como los escribe Next. Node no los
  encuentra solo, así que acá se prueba agregando ".ts" (o "/index.ts").
  Solo para imports relativos que salen de un archivo .ts.
*/
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (e) {
    const relativo = especificador.startsWith('./') || especificador.startsWith('../');
    if (!relativo || !contexto.parentURL?.endsWith('.ts') || /\.[cm]?[jt]sx?$/.test(especificador)) throw e;
    for (const final of ['.ts', '/index.ts']) {
      try {
        return await siguiente(especificador + final, contexto);
      } catch {}
    }
    throw e;
  }
}
