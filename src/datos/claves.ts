import 'server-only';
import { randomInt } from 'node:crypto';

/*
  Usuarios y claves de los alumnos (solo servidor).

  · Usuario: código del aula + número de lista → "K7RM-07". No dice nada del
    niño: la maestra anota en papel qué número es cada uno.
  · Mail interno: "k7rm-07@alumnos.invalid". Supabase Auth identifica a cada
    cuenta por un mail; ".invalid" está reservado y nunca recibe nada. El
    navegador no lo ve nunca.
  · Clave: dos palabras fáciles + un número → "sapo-luna-42".
    256 × 255 × 90 ≈ 5,9 millones de combinaciones, elegidas con el generador
    seguro del sistema (crypto.randomInt). Junto con el bloqueo por intentos
    (5 fallos → 10 minutos) alcanza para este tipo de datos.
    La clave se muestra UNA vez (tarjetas) y solo queda guardada con hash en
    Supabase Auth: ninguna tabla nuestra la guarda.
*/

export const DOMINIO_INTERNO = 'alumnos.invalid';
export const MAX_ALUMNOS_POR_AULA = 40;

// Palabras cortas, sin tildes ni ñ (fáciles de escribir en cualquier teclado),
// sin palabras que puedan usarse como burla.
const PALABRAS = [
  // animales
  'sapo', 'gato', 'pato', 'oso', 'lobo', 'puma', 'tigre', 'leon', 'cebra', 'koala',
  'panda', 'zorro', 'raton', 'conejo', 'liebre', 'ciervo', 'jirafa', 'llama', 'tapir', 'nutria',
  'castor', 'mulita', 'tero', 'hornero', 'garza', 'loro', 'buho', 'colibri', 'gaviota', 'ballena',
  'delfin', 'pulpo', 'medusa', 'almeja', 'ostra', 'caracol', 'abeja', 'hormiga', 'grillo', 'lombriz',
  'rana', 'tortuga', 'iguana', 'lagarto', 'erizo', 'cisne', 'halcon', 'condor', 'tucan', 'pavo',
  'gallo', 'pollito', 'oveja', 'cabra', 'caballo', 'potro', 'yacare', 'carpa', 'bagre', 'trucha',
  'salmon', 'atun', 'morsa', 'nandu', 'tatu', 'cuis', 'vicuna', 'alpaca', 'camello',
  // naturaleza
  'luna', 'sol', 'mar', 'rio', 'lago', 'nube', 'lluvia', 'nieve', 'hielo', 'roca',
  'arena', 'monte', 'cerro', 'valle', 'isla', 'playa', 'ola', 'viento', 'rayo', 'trueno',
  'cielo', 'bosque', 'selva', 'campo', 'hoja', 'flor', 'rosa', 'pino', 'roble', 'ceibo',
  'sauce', 'palma', 'cactus', 'trigo', 'maiz', 'arroz', 'semilla', 'raiz', 'tallo', 'rama',
  'fruto', 'musgo', 'alga', 'polen', 'brote', 'pasto', 'trebol', 'girasol', 'jazmin', 'lirio',
  'duna', 'volcan', 'cueva', 'arroyo', 'laguna', 'bahia', 'costa', 'pradera', 'aurora', 'brisa',
  // comida
  'pan', 'queso', 'miel', 'pera', 'uva', 'kiwi', 'mango', 'limon', 'sandia', 'melon',
  'banana', 'durazno', 'ciruela', 'cereza', 'nuez', 'coco', 'palta', 'papa', 'tomate', 'zapallo',
  'choclo', 'arveja', 'galleta', 'tarta', 'flan', 'budin', 'pizza', 'fideo', 'manzana', 'naranja',
  'frutilla', 'pomelo', 'higo', 'oliva', 'lenteja', 'boniato', 'apio', 'lechuga', 'canela', 'avena',
  // objetos
  'lapiz', 'regla', 'libro', 'mapa', 'globo', 'cometa', 'barco', 'tren', 'bici', 'cohete',
  'avion', 'llave', 'reloj', 'faro', 'puente', 'torre', 'nido', 'taza', 'vaso', 'plato',
  'olla', 'silla', 'mesa', 'lampara', 'campana', 'tambor', 'flauta', 'piano', 'violin', 'radio',
  'dado', 'pelota', 'trompo', 'yoyo', 'robot', 'iman', 'lupa', 'brujula', 'pipeta', 'frasco',
  'probeta', 'mochila', 'cuaderno', 'tijera', 'pincel', 'tiza', 'cinta', 'boton', 'escoba', 'balde',
  'canasta', 'linterna', 'velero', 'kayak', 'remo', 'ancla', 'timon', 'globito', 'molino',
  // ciencia y espacio
  'atomo', 'celula', 'proton', 'foton', 'orbita', 'planeta', 'galaxia', 'eclipse', 'cristal', 'cuarzo',
  'prisma', 'lente', 'estrella', 'saturno', 'marte', 'venus', 'jupiter', 'neptuno', 'pluton',
  'luz', 'sonido', 'onda', 'gota', 'burbuja', 'vapor', 'espora', 'bacilo', 'enzima', 'fosil',
  // colores y formas
  'rojo', 'azul', 'verde', 'lila', 'gris', 'dorado', 'plata', 'cobre', 'ambar', 'celeste',
  'violeta', 'ocre', 'cubo', 'cono', 'esfera', 'punto', 'espiral', 'circulo', 'rombo', 'ovalo',
  // música y juego
  'nota', 'ritmo', 'canto', 'baile', 'ronda', 'rayuela', 'acorde', 'tango', 'murga',
];

// Sin repetidas, de 3 a 8 letras, solo a-z
export const LISTA = Array.from(new Set(PALABRAS.filter((p) => /^[a-z]{3,8}$/.test(p)))).slice(0, 256);

export function generarClave(): string {
  const a = randomInt(LISTA.length);
  let b = randomInt(LISTA.length - 1);
  if (b >= a) b += 1; // dos palabras distintas
  const numero = randomInt(10, 100); // 10 a 99: sin ceros adelante que confundan
  return `${LISTA[a]}-${LISTA[b]}-${numero}`;
}

export const CODIGO_AULA = /^[A-HJ-NP-Z2-9]{4}$/;

export function usuarioDe(codigo: string, numero: number): string {
  return `${codigo}-${String(numero).padStart(2, '0')}`;
}

export function mailInterno(usuario: string): string {
  return `${usuario.toLowerCase()}@${DOMINIO_INTERNO}`;
}
