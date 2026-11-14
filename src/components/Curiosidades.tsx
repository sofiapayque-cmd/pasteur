'use client';

import { useEffect, useState } from 'react';
import Aviso from './Aviso';
import type { CuriosidadVisible } from '@/datos/curiosidades';

/*
  CURIOSIDADES · "¿Sabías que…?"
  Muestra curiosidades aprobadas por una investigadora (fichas "dato"
  publicadas; las elige el servidor según lo más consultado, ver
  src/datos/curiosidades.ts). Sin el sello: un dato no lo lleva solo
  (decisión del 5/11); sí su fuente. Usa la nota de cuaderno de siempre (Aviso, tipo
  "dato"), que se escribe letra por letra.
  Si hay más de una, cambia sola cada `cada` segundos (o con "Otra
  curiosidad"). Sin curiosidades no muestra nada.
*/
type Props = { curiosidades: CuriosidadVisible[]; cada?: number; className?: string };

/** El texto completa "¿Sabías que…": se le pone el comienzo y el signo de cierre si le falta. */
export function conPregunta(texto: string) {
  const t = texto.trim().replace(/^¿?\s*sab[ií]as\s+que\s*(\.\.\.|…)?\s*/i, '');
  return `¿Sabías que ${t.replace(/[.!?¿\s]+$/, '')}?`;
}

export default function Curiosidades({ curiosidades, cada = 25, className }: Props) {
  const [i, setI] = useState(0);
  const n = curiosidades.length;
  useEffect(() => {
    if (n < 2 || !cada) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), cada * 1000);
    return () => clearInterval(t);
  }, [n, cada, i]);
  if (!n) return null;
  const c = curiosidades[i % n];
  return (
    <div className={`curiosidad ${className ?? ''}`.trim()}>
      <Aviso
        key={c.id}
        tipo="dato"
        encabezado="Curiosidad"
        titulo={c.titulo}
        accion={undefined}
        onAccion={undefined}
        secundaria={n > 1 ? 'Otra curiosidad' : undefined}
        onSecundaria={() => setI((x) => (x + 1) % n)}
      >
        {conPregunta(c.texto)}
      </Aviso>
      {c.fuentes.length > 0 && (
        <p className="curiosidad__fuente">Fuente: {c.fuentes[0]}</p>
      )}
    </div>
  );
}
