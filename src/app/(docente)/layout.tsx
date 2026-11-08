import type { ReactNode } from 'react';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';

/*
  Todas las pantallas de la maestra. Con el sistema de aulas prendido, sin una
  maestra activa se va a /maestra/entrar. (Además lo verifican proxy.ts, cada
  Server Action y las reglas RLS de la base.) Apagado, es el prototipo de siempre.
*/
export default async function LayoutDocente({ children }: { children: ReactNode }) {
  if (aulasReales) await exigirDocenteActiva();
  return children;
}
