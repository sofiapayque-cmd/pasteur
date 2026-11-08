import Link from 'next/link';
import type { Respuesta } from '@/datos/respuestas';
import { ACTIVIDADES, NOMBRE_ESTADO, haceCuanto, palabras } from '@/lib/equipo/comun';

/* Una respuesta en el tablero: estado, pregunta, lo que leen los chicos, fuentes y qué hacer. */
export default function Tarjeta({ r, nombres, validadora }: { r: Respuesta; nombres: Record<string, string>; validadora: boolean }) {
  const pendientes = r.fuentes.filter((f) => f.estado === 'en_revision').length;
  const estadoChip = { espera: 'en_revision', cambios: 'borrador', aprobada: 'publicada', rechazada: 'rechazada', borrador: 'borrador', retirada: 'retirada' }[r.grupo];
  return (
    <li className={`eq-tarjeta eq-tarjeta--${r.grupo}`}>
      <div className="eq-meta">
        <span className={`eq-estado eq-estado--${estadoChip}`}>{r.grupo === 'cambios' ? 'Cambios pedidos' : NOMBRE_ESTADO[estadoChip]}</span>
        {r.actividad && <span>{ACTIVIDADES[r.actividad]?.split(' · ')[0]}</span>}
        {r.ia && <span className="eq-ia">IA</span>}
      </div>
      <h3>{r.pregunta || 'Sin pregunta'}</h3>
      <p className="eq-tarjeta__infantil">{r.infantil || '—'}</p>
      <p className="eq-ayuda">
        {palabras(r.infantil)} palabras · {r.fuentes.length} {r.fuentes.length === 1 ? 'fuente' : 'fuentes'}
        {pendientes ? ` (${pendientes} ${pendientes === 1 ? 'artículo nuevo' : 'artículos nuevos'}, se aprueban con la respuesta)` : ''}
      </p>
      {r.fuentes.length > 0 && (
        <ul className="eq-tarjeta__fuentes">
          {r.fuentes.slice(0, 3).map((f, i) => (
            <li key={i}>{f.titulo}</li>
          ))}
          {r.fuentes.length > 3 && <li>y {r.fuentes.length - 3} más</li>}
        </ul>
      )}
      {r.grupo === 'cambios' && r.ultima?.comentario && (
        <p className="eq-tarjeta__comentario">
          <strong>{nombres[r.ultima.revisorId] ?? 'La validadora'}:</strong> {r.ultima.comentario}
        </p>
      )}
      <div className="eq-tarjeta__pie">
        <span className="eq-ayuda">
          {r.grupo === 'aprobada' && r.ultima
            ? `Aprobó ${nombres[r.ultima.revisorId] ?? '—'} ${haceCuanto(r.ultima.creadaEn)}`
            : r.grupo === 'espera'
              ? `Esperando desde ${haceCuanto(r.enviadaEn)}`
              : `${r.ia ? 'Pedida' : 'Escrita'} por ${nombres[r.autorId] ?? '—'} ${haceCuanto(r.creadaEn)}`}
        </span>
        {r.grupo === 'espera' && validadora ? (
          <Link className="btn btn--primario btn--chico" href={`/equipo/revisar/${r.versionId}?desde=respuestas`}>
            Revisar
          </Link>
        ) : (
          <Link className="btn btn--claro btn--chico" href={`/equipo/fichas/${r.fichaId}`}>
            {r.grupo === 'cambios' ? 'Corregir' : 'Ver'}
          </Link>
        )}
      </div>
    </li>
  );
}
