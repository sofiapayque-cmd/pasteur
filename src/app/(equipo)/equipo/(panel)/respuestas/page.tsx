import { redirect } from 'next/navigation';

/* /equipo/respuestas · Desde el 15/11 el tablero se llama "Revisar": lleva ahí, con los mismos filtros. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string' && v) q.set(k, v);
  const resto = q.toString();
  redirect(resto ? `/equipo/revisar?${resto}` : '/equipo/revisar');
}
