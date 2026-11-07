import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { exigirMiembro, nombreDe } from '@/datos/equipo';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import Barra from '@/pantallas/equipo/Barra';
import { solicitudesPendientes } from '@/datos/solicitudes';
import '@/pantallas/equipo/equipo.css';

export const metadata: Metadata = { title: 'Panel del equipo · La ciencia sin límites', robots: { index: false, follow: false } };

/*
  Todas las pantallas del panel del equipo. Sin el interruptor
  NEXT_PUBLIC_ASISTENTE=1 → 404; sin un miembro activo → /equipo/entrar.
  (Además lo verifican proxy.ts, cada Server Action y las reglas RLS.)
*/
export default async function LayoutEquipo({ children }: { children: ReactNode }) {
  const yo = await exigirMiembro();
  let pendientes = 0;
  let respuestas = 0;
  const solicitudes = yo.rol === 'admin' ? await solicitudesPendientes().catch(() => 0) : 0;
  if (yo.rol === 'validador') {
    const db = await crearClienteServidor();
    const [v, p] = await Promise.all([
      db!.from('ficha_versiones').select('id', { count: 'exact', head: true }).eq('estado', 'en_revision'),
      db!.from('publicaciones').select('id', { count: 'exact', head: true }).eq('estado', 'en_revision'),
    ]);
    pendientes = (v.count ?? 0) + (p.count ?? 0);
    respuestas = v.count ?? 0;
  }
  return (
    <div className="eq">
      <Barra nombre={nombreDe(yo)} rol={yo.rol} pendientes={pendientes} respuestas={respuestas} solicitudes={solicitudes} />
      {children}
    </div>
  );
}
