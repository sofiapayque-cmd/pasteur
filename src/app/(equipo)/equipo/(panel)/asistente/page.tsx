import { exigirMiembro } from '@/datos/equipo';
import { nombresDelEquipo } from '@/datos/fichas';
import { chequeos, respuestasConocidas, ultimaCorrida } from '@/datos/pruebaAsistente';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { iaConfigurada } from '@/lib/ia/openai';
import { casos, faltantes } from '@/lib/ia/pruebaAsistente';
import VistaPruebaAsistente from '@/pantallas/equipo/VistaPruebaAsistente';

/*
  /equipo/asistente · Prueba de calidad de "Preguntale al Pasteur".
  Arriba, los chequeos de que el asistente solo puede mostrar respuestas
  aprobadas con sus fuentes. Después, correr el set de preguntas (formas de
  preguntar de los chicos, trampas y otros temas) contra la búsqueda real y
  ver, caso por caso, qué habría visto la maestra.
  La clave secreta se usa solo después de exigirMiembro(), y solo para leer.
  Correr la prueba tarda (embeddings + control por cada caso): maxDuration.
*/
export const maxDuration = 300;

export default async function Page() {
  await exigirMiembro();
  const admin = crearClienteAdmin();
  if (!admin) {
    return (
      <main className="eq-cuerpo">
        <h1>Prueba del asistente</h1>
        <p className="eq-caja eq-caja--aviso">Falta la clave secreta de Supabase en el servidor (SUPABASE_SECRET_KEY).</p>
      </main>
    );
  }
  const [lista, conocidas, ultima, nombres] = await Promise.all([chequeos(admin), respuestasConocidas(admin), ultimaCorrida().catch(() => null), nombresDelEquipo()]);
  return (
    <VistaPruebaAsistente
      lista={lista}
      faltan={faltantes(conocidas.existentes)}
      total={casos().length}
      aprobadas={conocidas.publicadas.length}
      iaLista={iaConfigurada()}
      ultima={ultima}
      nombres={nombres}
      pregunta={new Map([...conocidas.existentes, ...conocidas.publicadas].map((p) => [p.fichaId, p.pregunta]))}
    />
  );
}
