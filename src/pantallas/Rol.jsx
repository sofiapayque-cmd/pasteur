'use client';

import Cabecera from '../components/Cabecera';
import EscenaRol from '../components/rol/EscenaRol';
import PieInstitucional from '../components/PieInstitucional';

/*
  02 · ¿CÓMO QUERÉS EXPLORAR? — la maestra o el alumno eligen cómo entrar.
  Moli (la mascota 3D) está sentada en «Soy maestra». Todo está en
  src/components/rol/ (ver docs/MOLI-PANTALLA-ROL.md).
  Abajo, el pie "Accesos institucionales": el acceso de investigadores vive ahí (9/11).
*/
export default function Rol() {
  return (
    <main className="pantalla rol-moli anim-entrar">
      <Cabecera volverA="/" />
      <EscenaRol />
      <PieInstitucional />
    </main>
  );
}
