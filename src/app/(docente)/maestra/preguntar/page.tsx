import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { listarAulas } from '@/datos/aulas';
import { iaConfigurada } from '@/lib/ia/openai';
import { claveSecretaConfigurada } from '@/lib/supabase/admin';
import Asistente from '@/pantallas/maestra/Asistente';

/* /maestra/preguntar · "Preguntale al Pasteur": el asistente para la clase (solo maestras activas). */
export const metadata: Metadata = { title: 'Preguntale al Pasteur', robots: { index: false } };
export const maxDuration = 30;

export default async function Page() {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  // Sus clases (no archivadas), para elegir de cuál es la pregunta: así queda en el cuaderno de esa clase
  const aulas = (await listarAulas().catch(() => [])).filter((a) => !a.archivada_en).map((a) => ({ id: a.id, nombre: a.nombre }));
  return <Asistente cuenta={docente.nombre || docente.email || 'Maestra'} lista={iaConfigurada() && claveSecretaConfigurada} aulas={aulas} />;
}
