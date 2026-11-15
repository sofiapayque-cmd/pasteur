import PanelMaestra from '@/pantallas/maestra/Panel';
import { exigirDocenteActiva, obtenerDocente } from '@/datos/docente';
import { aulasReales } from '@/lib/supabase/config';
import { curiosidadesPara } from '@/datos/curiosidades';

/* /maestra · 03 Panel de la maestra */

export default async function Page() {
  // Control en la página misma, además del layout (guía de autenticación de Next.js 16)
  const docente = aulasReales ? await exigirDocenteActiva() : await obtenerDocente();
  // Una o dos curiosidades aprobadas, siguiendo lo más consultado (sin aula: solo tendencia y variedad)
  const curiosidades = docente ? await curiosidadesPara({ cuantas: 2 }) : [];
  return <PanelMaestra cuenta={docente ? docente.nombre || docente.email || 'Maestra' : null} curiosidades={curiosidades} />;
}
