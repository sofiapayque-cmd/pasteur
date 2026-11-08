import PanelMaestra from '@/pantallas/maestra/Panel';
import { exigirDocenteActiva, obtenerDocente } from '@/datos/docente';
import { aulasReales } from '@/lib/supabase/config';

/* /maestra · 03 Panel de la maestra */

export default async function Page() {
  // Control en la página misma, además del layout (guía de autenticación de Next.js 16)
  const docente = aulasReales ? await exigirDocenteActiva() : await obtenerDocente();
  return <PanelMaestra cuenta={docente ? docente.nombre || docente.email || 'Maestra' : null} />;
}
