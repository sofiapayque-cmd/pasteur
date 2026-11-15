'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/cliente';
import { aplicarProgreso, aplicarSesion, fusionar, salaDesde, ultimoCambio, type Instantanea, type Paso, type SesionFila } from '@/lib/aulas/clase';
import { estadoClaseAlumno, estadoClaseMaestra, habilitarEnClase, horaDelServidor, moverClase, moverTiempo, pausarClase } from '@/acciones/claseEnVivo';
import { calcularDesfase, type AccionTiempo } from '@/lib/aulas/tiempo';

/*
  CLASE EN VIVO EN EL NAVEGADOR (etapa 5, parte 2).

  Tiempo real con Supabase Realtime: la maestra escucha su sesión y el avance
  de cada chico; cada chico escucha solo la sesión de su aula (pausa, lo que
  se habilita, puesta en común, cierre). Las reglas RLS de la base deciden qué
  llega a cada uno: el canal no puede mostrar nada que la persona no pueda ver.

  Respaldo: si el tiempo real no conecta (algunas redes de escuela cortan
  los websockets) o se corta, se pregunta cada pocos segundos. Aunque ande,
  cada tanto se pregunta igual, por si se perdió algún aviso.
*/
export type Conexion = 'conectando' | 'en-vivo' | 'respaldo';
const CADA_EN_VIVO = 20_000;
const CADA_RESPALDO = 4_000;

/** Se suscribe a cambios de tablas con la sesión de quien mira. Devuelve el estado de la conexión. */
function useTiempoReal(
  nombre: string,
  suscripciones: { tabla: 'sesiones' | 'progreso'; filtro: string; alCambiar: (fila: Record<string, unknown>) => void }[],
): Conexion {
  const [conexion, setConexion] = useState<Conexion>('conectando');
  const ref = useRef(suscripciones);
  useEffect(() => {
    ref.current = suscripciones;
  });
  const clave = suscripciones.map((s) => `${s.tabla}:${s.filtro}`).join('|');

  useEffect(() => {
    const sb = crearClienteNavegador();
    if (!sb) {
      setConexion('respaldo');
      return;
    }
    let vivo = true;
    let canal: ReturnType<typeof sb.channel> | null = null;
    // Si en 12 segundos no conectó, se usa el respaldo (y se sigue intentando)
    const espera = setTimeout(() => vivo && setConexion((c) => (c === 'conectando' ? 'respaldo' : c)), 12_000);
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!vivo) return;
      if (data.session) sb.realtime.setAuth(data.session.access_token);
      canal = sb.channel(`${nombre}-${Math.random().toString(36).slice(2, 8)}`);
      ref.current.forEach((s, i) => {
        canal!.on('postgres_changes' as never, { event: '*', schema: 'public', table: s.tabla, filter: s.filtro } as never, (p: { new?: Record<string, unknown> }) => {
          if (p?.new && Object.keys(p.new).length) ref.current[i]?.alCambiar(p.new);
        });
      });
      canal.subscribe((estado: string) => {
        if (!vivo) return;
        if (estado === 'SUBSCRIBED') setConexion('en-vivo');
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') setConexion('respaldo');
      });
    })();
    return () => {
      vivo = false;
      clearTimeout(espera);
      if (canal) sb.removeChannel(canal);
    };
  }, [nombre, clave]);

  return conexion;
}

/** Pregunta cada tanto (más seguido si no hay tiempo real). Se detiene con la pestaña oculta. */
function useConsulta(conexion: Conexion, consultar: () => void) {
  const ref = useRef(consultar);
  useEffect(() => {
    ref.current = consultar;
  });
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') ref.current();
    }, conexion === 'en-vivo' ? CADA_EN_VIVO : CADA_RESPALDO);
    return () => clearInterval(id);
  }, [conexion]);
}

// ---------------------------------------------------------------------
// El reloj del servidor (para el timer, 8/11)
// ---------------------------------------------------------------------
const CADA_DESFASE = 5 * 60_000;

/**
 * Diferencia entre el reloj del servidor y el de esta compu. Se mide al
 * entrar y cada 5 minutos; cada respuesta del timer también la actualiza.
 */
export function useDesfase() {
  const [desfase, setDesfase] = useState(0);
  const medir = useCallback(async () => {
    const enviado = Date.now();
    try {
      const servidor = await horaDelServidor();
      setDesfase(calcularDesfase(servidor, enviado, Date.now()));
    } catch {
      /* sin internet: se queda con la última medida */
    }
  }, []);
  useEffect(() => {
    const primera = setTimeout(medir, 0);
    const cada = setInterval(medir, CADA_DESFASE);
    return () => {
      clearTimeout(primera);
      clearInterval(cada);
    };
  }, [medir]);
  return { desfase, setDesfase };
}

// ---------------------------------------------------------------------
// La maestra
// ---------------------------------------------------------------------
export function useClaseMaestra(inicial: Instantanea) {
  const [inst, setInst] = useState(inicial);
  const [aviso, setAviso] = useState('');
  const sesionId = inicial.sesion.id;
  const asignacionId = inicial.asignacion.id;
  const actual = useRef(inst);
  useEffect(() => {
    actual.current = inst;
  }, [inst]);

  const conexion = useTiempoReal(`clase-${sesionId}`, [
    { tabla: 'sesiones', filtro: `id=eq.${sesionId}`, alCambiar: (f) => setInst((i) => aplicarSesion(i, f as Partial<SesionFila>)) },
    { tabla: 'progreso', filtro: `asignacion_id=eq.${asignacionId}`, alCambiar: (f) => setInst((i) => aplicarProgreso(i, f)) },
  ]);

  const consultar = useCallback(async (todo = false) => {
    try {
      const nueva = await estadoClaseMaestra(sesionId, todo ? undefined : ultimoCambio(actual.current) || undefined);
      if (nueva) setInst((i) => fusionar(i, nueva));
    } catch {
      /* sin internet: se intenta en la próxima vuelta */
    }
  }, [sesionId]);
  useConsulta(conexion, () => consultar());
  // Apenas conecta el tiempo real, se pide todo una vez (por lo que pasó mientras conectaba)
  useEffect(() => {
    if (conexion === 'en-vivo') consultar(true);
  }, [conexion, consultar]);

  // Cada acción cambia la pantalla enseguida y después confirma con la base
  const hacer = useCallback(
    async (optimista: Partial<SesionFila>, accion: () => Promise<{ ok: true; sesion: SesionFila } | { ok: false; mensaje: string }>) => {
      setAviso('');
      setInst((i) => aplicarSesion(i, { ...optimista, id: i.sesion.id }));
      try {
        const r = await accion();
        if (r.ok) setInst((i) => aplicarSesion(i, r.sesion));
        else {
          setAviso(r.mensaje);
          consultar(true);
        }
      } catch {
        setAviso('No hay conexión: probá de nuevo en un ratito.');
        consultar(true);
      }
    },
    [consultar],
  );

  // El timer: lo cambia la base con su hora; la respuesta trae esa hora para corregir el reloj de esta compu
  const { desfase, setDesfase } = useDesfase();
  const tiempo = useCallback(
    async (accion: AccionTiempo, segundos?: number) => {
      setAviso('');
      const enviado = Date.now();
      try {
        const r = await moverTiempo(sesionId, accion, segundos);
        if (r.ok) {
          setDesfase(calcularDesfase(r.ahora, enviado, Date.now()));
          const t = r.tiempo;
          setInst((i) =>
            aplicarSesion(i, {
              id: i.sesion.id,
              tiempo_estado: t.estado,
              tiempo_duracion: t.duracion,
              tiempo_fin: t.fin,
              tiempo_restante: t.restante,
              tiempo_terminado_en: t.terminadoEn,
              cierre: t.cierre,
            }),
          );
          // El cierre definitivo también cierra la tarea: se trae todo de nuevo
          if (accion === 'definitivo') consultar(true);
        } else {
          setAviso(r.mensaje);
          consultar(true);
        }
      } catch {
        setAviso('No hay conexión: probá de nuevo en un ratito.');
        consultar(true);
      }
    },
    [consultar, sesionId, setDesfase],
  );

  const sala = useMemo(() => salaDesde(inst), [inst]);
  const acciones = useMemo(
    () => ({
      mover: (paso: Paso) => {
        const a = { empezar: 'en-curso', puesta: 'puesta', volver: 'en-curso', cerrar: 'cerrada' } as const;
        return hacer({ estado: a[paso], pausada: false }, () => moverClase(sesionId, paso));
      },
      alternarPausa: () => hacer({ pausada: !actual.current.sesion.pausada }, () => pausarClase(sesionId, !actual.current.sesion.pausada)),
      desbloquear: (clave: string) =>
        hacer({ desbloqueos: { ...(actual.current.sesion.desbloqueos ?? {}), [clave]: true } }, () => habilitarEnClase(sesionId, clave)),
    }),
    [hacer, sesionId],
  );

  return { sala, inst, conexion, aviso, acciones, tiempo, desfase };
}

// ---------------------------------------------------------------------
// El alumno
// ---------------------------------------------------------------------
export function useClaseAlumno(inicial: SesionFila) {
  const [sesion, setSesion] = useState(inicial);
  const conexion = useTiempoReal(`clase-alumno-${inicial.id}`, [
    { tabla: 'sesiones', filtro: `id=eq.${inicial.id}`, alCambiar: (f) => setSesion((s) => ({ ...s, ...(f as Partial<SesionFila>) })) },
  ]);
  const consultar = useCallback(async () => {
    try {
      const s = await estadoClaseAlumno(inicial.id);
      if (s) setSesion(s);
    } catch {
      /* sin internet */
    }
  }, [inicial.id]);
  useConsulta(conexion, consultar);
  useEffect(() => {
    if (conexion === 'en-vivo') consultar();
  }, [conexion, consultar]);
  return { sesion, conexion };
}
