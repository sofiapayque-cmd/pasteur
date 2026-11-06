/*
  Mensajes de error de la base para mostrar en el panel.
  Las reglas de las migraciones 9, 13 y 14 ya responden en castellano
  ("hace falta al menos una fuente para estar en revisión"): esos se muestran
  tal cual. Los de Postgres (en inglés) se traducen a algo entendible, sin
  mostrar nombres de tablas ni detalles internos.
*/
type ErrorBase = { message?: string; code?: string } | null | undefined;

export function mensajeDeError(error: ErrorBase, siNoSeSabe = 'No se pudo guardar. Probá de nuevo.'): string {
  const m = error?.message ?? '';
  if (!m) return siNoSeSabe;
  if (/row-level security|permission denied/i.test(m)) return 'No tenés permiso para hacer eso.';
  if (/duplicate key/i.test(m)) return 'Ya existe uno igual (por ejemplo, otra ficha con ese nombre corto).';
  if (/violates check constraint/i.test(m)) return 'Algún dato no cumple las reglas (por ejemplo, un texto demasiado largo o vacío).';
  if (/violates foreign key/i.test(m)) return 'Falta algo que se usa acá: puede que lo hayan retirado. Volvé a cargar la página.';
  if (/violates not-null/i.test(m)) return 'Falta completar un dato obligatorio.';
  if (/[a-z]/.test(m) && !/[áéíóúñ¿¡]|\b(la|el|de|que|una|un|se|no)\b/i.test(m)) return siNoSeSabe;
  return m.charAt(0).toUpperCase() + m.slice(1) + (/[.!?]$/.test(m) ? '' : '.');
}
