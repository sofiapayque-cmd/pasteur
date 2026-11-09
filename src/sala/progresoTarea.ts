'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { guardarAvance } from '@/acciones/tareas';

/*
  useProgresoTarea: el mismo "progreso" que usan las actividades (ver
  progreso.js), pero para una TAREA de la maestra: el avance se guarda en la
  base (tabla progreso) y se retoma desde cualquier computadora.

  · Cada cambio se guarda solo, 1 segundo después del último (si cambia de
    etapa, enseguida). Los guardados van en fila: nunca uno viejo pisa a uno nuevo.
  · Si el chico cierra la pestaña o cambia de ventana, se guarda lo pendiente.
  · "guardado" cuenta cómo va: listo, guardando, error (sin internet) o cerrada
    (la maestra cerró la tarea).
*/
type Valor = { etapa: string; datos: Record<string, unknown> };
export type EstadoGuardado = 'listo' | 'guardando' | 'error' | 'cerrada';

export function useProgresoTarea({
  tareaId,
  inicial,
  opciones,
  desbloqueos,
  apodo,
}: {
  tareaId: string;
  inicial: Valor;
  opciones: Record<string, string[]>;
  desbloqueos: Record<string, boolean>;
  apodo: string | null;
}) {
  const [valor, setValor] = useState<Valor>(inicial);
  const [guardado, setGuardado] = useState<EstadoGuardado>('listo');
  const actual = useRef<Valor>(inicial);
  const pendiente = useRef<Valor | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fila = useRef<Promise<void>>(Promise.resolve());

  const enviar = useCallback(() => {
    const v = pendiente.current;
    pendiente.current = null;
    if (!v) return;
    setGuardado('guardando');
    fila.current = fila.current.then(async () => {
      let r: Awaited<ReturnType<typeof guardarAvance>> | null = null;
      try {
        r = await guardarAvance(tareaId, v.etapa, v.datos);
      } catch {
        r = null; // sin internet o el servidor no contestó
      }
      if (r?.ok) return setGuardado(pendiente.current ? 'guardando' : 'listo');
      if (r && r.motivo === 'cerrada') return setGuardado('cerrada');
      setGuardado('error');
      // Se reintenta en 5 segundos con lo último (si mientras tanto hubo cambios, van esos)
      if (r?.motivo !== 'grande' && r?.motivo !== 'sesion') {
        pendiente.current ??= v;
        if (reloj.current) clearTimeout(reloj.current);
        reloj.current = setTimeout(() => enviarRef.current(), 5000);
      }
    });
  }, [tareaId]);
  const enviarRef = useRef(enviar);
  useEffect(() => {
    enviarRef.current = enviar;
  }, [enviar]);

  const programar = useCallback(
    (v: Valor, ya: boolean) => {
      pendiente.current = v;
      if (reloj.current) clearTimeout(reloj.current);
      reloj.current = setTimeout(enviar, ya ? 0 : 1000);
    },
    [enviar],
  );

  // Al salir de la pestaña o de la pantalla: guardar lo pendiente
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden' && pendiente.current) enviar();
    };
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      if (reloj.current) clearTimeout(reloj.current);
      if (pendiente.current) enviar();
    };
  }, [enviar]);

  const ir = useCallback(
    (etapa: string | null, datos: Record<string, unknown> = {}) => {
      const antes = actual.current;
      const nuevo = { etapa: etapa || antes.etapa, datos: { ...antes.datos, ...datos } };
      actual.current = nuevo;
      setValor(nuevo);
      programar(nuevo, Boolean(etapa) && etapa !== antes.etapa);
    },
    [programar],
  );
  const guardar = useCallback((datos: Record<string, unknown>) => ir(null, datos), [ir]);
  // Guardar ya lo que hay (al terminar el tiempo de la clase, 8/11): manda lo último aunque no haya cambios
  const guardarYa = useCallback(() => {
    pendiente.current = actual.current;
    if (reloj.current) clearTimeout(reloj.current);
    enviar();
  }, [enviar]);

  return {
    etapa: valor.etapa,
    datos: valor.datos,
    ir,
    guardar,
    guardarYa,
    reiniciar: () => {},
    enClase: false,
    tarea: true,
    guardado,
    alumno: { apodo },
    opciones,
    desbloqueado: (clave: string) => desbloqueos?.[clave] !== false,
    pausada: false,
    sala: null,
  };
}
