/*
  PEDIR ACCESO · validar el formulario (sin red: se prueba con npm run test:clase).
  Lo completa una maestra o alguien de una escuela que encontró la plataforma.
  Se guardan solo los datos para responderle y darle acceso.
*/
export const DEPARTAMENTOS = [
  'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo',
  'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres', 'Fuera de Uruguay',
] as const;
export const CARGOS = [
  { id: 'maestra', nombre: 'Maestra o maestro de clase' },
  { id: 'direccion', nombre: 'Dirección de la escuela' },
  { id: 'otro', nombre: 'Otro (por ejemplo, profesora de ciencias)' },
] as const;
export const GRADOS = ['4', '5', '6'] as const;

export type Solicitud = {
  nombre: string;
  email: string;
  escuela: string;
  departamento: string;
  cargo: (typeof CARGOS)[number]['id'];
  grados: string;
  mensaje: string;
};

const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const limpio = (v: unknown, max: number) =>
  String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export function leerSolicitud(datos: FormData): { ok: true; solicitud: Solicitud } | { ok: false; mensaje: string; campo?: string } {
  // Campo trampa: lo ven los robots, no las personas (está escondido). Si viene lleno, se ignora el pedido.
  if (limpio(datos.get('sitio'), 200)) return { ok: false, mensaje: 'trampa' };
  const nombre = limpio(datos.get('nombre'), 120);
  const email = limpio(datos.get('email'), 254).toLowerCase();
  const escuela = limpio(datos.get('escuela'), 160);
  const departamento = limpio(datos.get('departamento'), 60);
  const cargo = limpio(datos.get('cargo'), 20);
  const grados = datos
    .getAll('grados')
    .map(String)
    .filter((g) => (GRADOS as readonly string[]).includes(g));
  const mensaje = String(datos.get('mensaje') ?? '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, 1000);
  if (nombre.length < 2) return { ok: false, mensaje: 'Escribí tu nombre.', campo: 'nombre' };
  if (!MAIL.test(email) || email.endsWith('@alumnos.invalid')) return { ok: false, mensaje: 'Falta el mail o está mal escrito. Revisalo: ahí te mandamos el acceso.', campo: 'email' };
  if (escuela.length < 2) return { ok: false, mensaje: 'Escribí el nombre o número de la escuela.', campo: 'escuela' };
  if (!(DEPARTAMENTOS as readonly string[]).includes(departamento)) return { ok: false, mensaje: 'Elegí el departamento.', campo: 'departamento' };
  if (!CARGOS.some((c) => c.id === cargo)) return { ok: false, mensaje: 'Contanos qué hacés en la escuela.', campo: 'cargo' };
  return { ok: true, solicitud: { nombre, email, escuela, departamento, cargo: cargo as Solicitud['cargo'], grados: [...new Set(grados)].sort().join(', '), mensaje } };
}
