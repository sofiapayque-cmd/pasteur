import { notFound, redirect } from 'next/navigation';
import { aulasReales } from '@/lib/supabase/config';
import { exigirDocenteActiva } from '@/datos/docente';
import { obtenerAula } from '@/datos/aulas';
import { cuadernoDeLaClase } from '@/datos/cuadernos';
import { iaConfigurada } from '@/lib/ia/openai';
import { claveSecretaConfigurada } from '@/lib/supabase/admin';
import { diaUY } from '@/lib/cuadernos';
import Cabecera from '@/components/Cabecera';
import FondoVivo from '@/components/FondoVivo';
import CuentaDocente from '@/components/CuentaDocente';
import CuadernoClase from '@/pantallas/maestra/CuadernoClase/CuadernoClase';
import '@/pantallas/maestra/aulas/aulas.css';

/*
  /maestra/aulas/[id]/cuaderno · El cuaderno de una clase (migración 25):
  preguntas de los chicos, diario de clase y preguntas al Pasteur.
  Si el aula no es de la maestra: 404. "Preguntar" puede tardar unos segundos.
*/
export const maxDuration = 60;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!aulasReales) redirect('/maestra');
  const docente = await exigirDocenteActiva();
  const { id } = await params;
  const aula = await obtenerAula(id);
  if (!aula) notFound();
  const cuaderno = await cuadernoDeLaClase(aula.id, docente.id);
  return (
    <main className="pantalla aulas">
      <FondoVivo semilla={9} />
      <Cabecera volverA={`/maestra/aulas/${aula.id}`} miga={`Inicio › Mis aulas › ${aula.nombre} › Cuaderno`} derecha={<CuentaDocente nombre={docente.nombre || docente.email || 'Maestra'} />} />
      <div className="aulas__cuerpo">
        <div className="aula__cabeza">
          <div>
            <span className="etiqueta">{aula.nombre}</span>
            <h1>Cuaderno de la clase</h1>
            <p className="aulas__bajada">Lo que hicieron, cuánto duró, lo que preguntaron y las respuestas del Pasteur.</p>
          </div>
        </div>
        <CuadernoClase aulaId={aula.id} cuaderno={cuaderno} hoy={diaUY(new Date().toISOString())} puedePreguntar={iaConfigurada() && claveSecretaConfigurada} />
      </div>
    </main>
  );
}
