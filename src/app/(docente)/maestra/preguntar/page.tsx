import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { iaConfigurada } from '@/lib/ia/openai';
import { claveSecretaConfigurada } from '@/lib/supabase/admin';
import Asistente from '@/pantallas/maestra/Asistente';

/* /maestra/preguntar · "Preguntale al Pasteur": el asistente para la clase (solo maestras activas). */
export const metadata: Metadata = { title: 'Preguntale al Pasteur', robots: { index: false } };
export const maxDuration = 30;

export default async function Page() {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  return <Asistente cuenta={docente.nombre || docente.email || 'Maestra'} lista={iaConfigurada() && claveSecretaConfigurada} />;
}
