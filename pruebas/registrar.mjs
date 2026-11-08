// Se carga con node --import ./pruebas/registrar.mjs (ver package.json)
import { register } from 'node:module';
register('./resolver.mjs', import.meta.url);
