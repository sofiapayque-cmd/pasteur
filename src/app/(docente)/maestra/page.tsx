import PanelMaestra from '@/pantallas/maestra/Panel';
import { obtenerDocente } from '@/datos/docente';

/* /maestra · 03 Panel de la maestra */

export default async function Page() {
  const docente = await obtenerDocente();
  return <PanelMaestra cuenta={docente ? docente.nombre || docente.email || 'Maestra' : null} />;
}
