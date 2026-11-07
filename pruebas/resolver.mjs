/*
  Para las pruebas con node --test: dentro de src/ los imports van sin
  extensión ('../ciencia/normalizar') o con el alias '@/…', como los escribe
  Next. Node no los encuentra solo, así que acá se prueba agregando ".ts",
  ".js" (o "/index.ts", "/index.js"), y '@/' se cambia por la carpeta src/.
*/
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const FINALES = ['', '.ts', '.js', '/index.ts', '/index.js'];

export async function resolve(especificador, contexto, siguiente) {
  if (especificador.startsWith('@/')) {
    const base = pathToFileURL(path.join(SRC, especificador.slice(2))).href;
    for (const final of FINALES) {
      try {
        return await siguiente(base + final, contexto);
      } catch {}
    }
  }
  try {
    return await siguiente(especificador, contexto);
  } catch (e) {
    const relativo = especificador.startsWith('./') || especificador.startsWith('../');
    if (!relativo || /\.[cm]?[jt]sx?$/.test(especificador)) throw e;
    for (const final of FINALES.slice(1)) {
      try {
        return await siguiente(especificador + final, contexto);
      } catch {}
    }
    throw e;
  }
}
