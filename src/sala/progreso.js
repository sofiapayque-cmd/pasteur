import { useCallback, useState } from 'react';
import { useSala, yo, actualizarAlumno } from './sala';
import { INFO_ACTIVIDADES } from '../actividades/info';

/*
  useProgreso(actividadId): lo único que una actividad necesita para guardar su avance.

  const p = useProgreso('a2');
  p.etapa            → id de la etapa actual (ver ETAPAS en aN/etapas.js)
  p.datos            → objeto con lo que la actividad fue guardando
  p.ir('etapa', {…}) → cambia de etapa y (opcional) guarda datos
  p.guardar({…})     → guarda datos sin cambiar de etapa
  p.enClase          → true si el niño está en una sala con su maestra
  p.desbloqueado(k)  → si la maestra habilitó algo (en modo individual, siempre true)
  p.opciones         → lo que eligió la maestra al preparar la clase ({} en modo individual)

  En clase, todo se guarda en la sala (la maestra lo ve en el tablero).
  Sin sala (modo individual), se guarda en esta pestaña.
*/
// Se lee al iniciar el estado: las pantallas con actividades se dibujan solo en
// el navegador (SoloNavegador), así que nunca corre en el servidor.
function leerLocal(id) {
  try {
    const t = sessionStorage.getItem(`csl-solo-${id}`);
    if (t) return JSON.parse(t);
  } catch {
    /* sin sessionStorage */
  }
  return null;
}

function guardarLocal(id, valor) {
  try {
    sessionStorage.setItem(`csl-solo-${id}`, JSON.stringify(valor));
  } catch {
    /* sin sessionStorage */
  }
}

export function useProgreso(actividadId) {
  const sala = useSala();
  const mio = yo(sala);
  const enClase = Boolean(mio) && sala.estado !== 'cerrada' && sala.actividad === actividadId;
  const primera = INFO_ACTIVIDADES[actividadId]?.ETAPAS?.[0]?.id || 'inicio';
  const [local, setLocal] = useState(() => leerLocal(actividadId) || { etapa: primera, datos: {} });

  const ir = useCallback(
    (etapa, datos = {}) => {
      if (enClase) actualizarAlumno(etapa, datos);
      else
        setLocal((l) => {
          const nuevo = { etapa: etapa || l.etapa, datos: { ...l.datos, ...datos } };
          guardarLocal(actividadId, nuevo);
          return nuevo;
        });
    },
    [enClase, actividadId]
  );

  const guardar = useCallback((datos) => ir(null, datos), [ir]);

  const reiniciar = useCallback(() => {
    const nuevo = { etapa: primera, datos: {} };
    if (enClase) actualizarAlumno(primera, {});
    else {
      guardarLocal(actividadId, nuevo);
      setLocal(nuevo);
    }
  }, [enClase, actividadId, primera]);

  return {
    etapa: enClase ? mio.etapa : local.etapa,
    datos: enClase ? mio.datos || {} : local.datos,
    ir,
    guardar,
    reiniciar,
    enClase,
    alumno: mio,
    opciones: enClase ? sala.opciones || {} : {},
    desbloqueado: (clave) => (enClase ? Boolean(sala.desbloqueos?.[clave]) : true),
    pausada: enClase && (sala.pausada || sala.estado === 'puesta'),
    sala,
  };
}
