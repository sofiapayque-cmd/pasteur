import { redirect } from 'next/navigation';
import { exigirMiembro } from '@/datos/equipo';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import Miembros from '@/pantallas/equipo/Miembros';

/* /equipo/miembros · El equipo y sus invitaciones (solo la admin; RLS no le muestra las invitaciones a nadie más) */
export default async function Page() {
  const yo = await exigirMiembro();
  if (yo.rol !== 'admin') redirect('/equipo');
  const db = (await crearClienteServidor())!;
  const [{ data: miembros }, { data: invitaciones }] = await Promise.all([
    db.from('equipo').select('id, nombre_visible, laboratorio, rol, estado, creado_en').order('creado_en'),
    db.from('invitaciones_equipo').select('id, email, rol, nombre_visible, creada_en, usada_en').order('creada_en', { ascending: false }).limit(100),
  ]);
  return (
    <main className="eq-cuerpo">
      <div>
        <h1>Equipo</h1>
        <p className="eq-bajada">Quiénes escriben, quiénes validan y quién administra. Nadie cambia su propio rol, y la admin no aprueba contenido científico.</p>
      </div>
      <Miembros miembros={miembros ?? []} invitaciones={invitaciones ?? []} yo={yo.id} />
    </main>
  );
}
