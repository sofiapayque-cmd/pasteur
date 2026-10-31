import { useSyncExternalStore } from 'react';
import { APODOS } from '../data/contenido';
import { INFO_ACTIVIDADES } from '../actividades/info';

/*
  LA SALA DE CLASE (versión de prueba)

  En la versión final, la sala vive en un servicio en tiempo real
  (Supabase o Firebase) y conecta la computadora de la maestra con
  todas las Ceibal.

  Por ahora la guardamos en el navegador (localStorage). Eso alcanza
  para probar el recorrido completo: si abrís la maestra en una pestaña
  y un niño en otra pestaña del MISMO navegador, se ven entre sí.

  Todas las pantallas usan solo las funciones de este archivo. Cuando
  conectemos el servicio real, cambiamos este archivo y nada más.

  Forma de la sala:
  {
    codigo: 'K7RM',
    actividad: 'a1',            // qué actividad se está haciendo
    estado: 'esperando' | 'en-curso' | 'puesta' | 'cerrada',
    pausada: false,
    opciones: { ... },          // lo que eligió la maestra al preparar (ej. ambientes de A1)
    desbloqueos: { ... },       // etapas que la maestra habilita en vivo (ej. antibioticos en A1)
    alumnos: [{ id, apodo, color, etapa, datos, desde }]
  }
*/

const CLAVE = 'csl-sala-v2';
const EVENTO = 'csl-sala-cambio';

const SALA_VACIA = {
  codigo: null,
  actividad: null,
  estado: 'cerrada',
  pausada: false,
  opciones: {},
  desbloqueos: {},
  alumnos: [],
};

// Id simple (crypto.randomUUID no existe en navegadores viejos ni sin https)
export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

let cache = null;
let cacheTexto = null;

function leer() {
  let texto = null;
  try {
    texto = localStorage.getItem(CLAVE);
  } catch {
    texto = cacheTexto;
  }
  if (texto === cacheTexto && cache) return cache;
  cacheTexto = texto;
  try {
    cache = texto ? { ...SALA_VACIA, ...JSON.parse(texto) } : SALA_VACIA;
  } catch {
    cache = SALA_VACIA;
  }
  return cache;
}

function guardar(cambio) {
  const actual = leer();
  const nueva = typeof cambio === 'function' ? cambio(actual) : { ...actual, ...cambio };
  const texto = JSON.stringify(nueva);
  try {
    localStorage.setItem(CLAVE, texto);
  } catch {
    // sin almacenamiento disponible: la sala solo dura en memoria
    cacheTexto = texto;
    cache = nueva;
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar) {
  // 'storage' llega cuando OTRA pestaña cambia la sala; EVENTO, cuando la cambia esta
  window.addEventListener('storage', avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener('storage', avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

/** Hook para leer la sala desde cualquier pantalla. Se actualiza solo. */
export function useSala() {
  return useSyncExternalStore(suscribir, leer, leer);
}

// Código de 4 caracteres, sin letras que se confunden (O/0, I/1)
function nuevoCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += letras[Math.floor(Math.random() * letras.length)];
  return c;
}

/* ---------- Acciones de la maestra ---------- */

export function abrirSala({ actividad, opciones = {}, desbloqueos = {} }) {
  guardar({ ...SALA_VACIA, codigo: nuevoCodigo(), actividad, estado: 'esperando', opciones, desbloqueos });
}

export const empezar = () => guardar({ estado: 'en-curso', pausada: false });
export const alternarPausa = () => guardar((s) => ({ ...s, pausada: !s.pausada }));
export const desbloquear = (clave) => guardar((s) => ({ ...s, desbloqueos: { ...s.desbloqueos, [clave]: true } }));
export const irAPuesta = () => guardar({ estado: 'puesta', pausada: false });
export const cerrarSala = () => guardar(SALA_VACIA);

/** Solo para el prototipo: suma un alumno ficticio a la sala. */
export function simularAlumno() {
  guardar((s) => {
    const info = INFO_ACTIVIDADES[s.actividad];
    const usados = new Set(s.alumnos.map((a) => a.apodo));
    const apodo = APODOS.find((a) => !usados.has(a)) || `Alumno ${s.alumnos.length + 1}`;
    const colores = ['#EF6F5E', '#F4A6BD', '#F2B13B', '#8ED5C3', '#93AEEB'];
    const etapas = info?.ETAPAS || [{ id: 'inicio' }];
    const enCurso = s.estado === 'en-curso';
    const indice = enCurso ? Math.floor(Math.random() * Math.max(1, etapas.length - 1)) : 0;
    const datos = enCurso && info?.simularDatos ? info.simularDatos(indice, s) : {};
    // algunos simulados "llevan un rato" sin avanzar, para ver el aviso de ayuda
    const desde = Date.now() - (Math.random() < 0.25 ? 6 * 60 * 1000 : 0);
    return {
      ...s,
      alumnos: [...s.alumnos, { id: nuevoId(), apodo, color: colores[s.alumnos.length % 5], etapa: etapas[indice].id, datos, desde }],
    };
  });
}

/* ---------- Acciones de cada niño ---------- */

// Cada pestaña es un niño distinto: su id vive en sessionStorage
function miId() {
  try {
    return sessionStorage.getItem('csl-alumno');
  } catch {
    return null;
  }
}

export function codigoValido(codigo) {
  const s = leer();
  return s.estado !== 'cerrada' && s.codigo === codigo.toUpperCase();
}

export function unirme({ apodo, color }) {
  const id = miId() || nuevoId();
  try {
    sessionStorage.setItem('csl-alumno', id);
  } catch {
    /* sin sessionStorage */
  }
  guardar((s) => {
    const primera = INFO_ACTIVIDADES[s.actividad]?.ETAPAS?.[0]?.id || 'inicio';
    return {
      ...s,
      alumnos: [...s.alumnos.filter((a) => a.id !== id), { id, apodo, color, etapa: primera, datos: {}, desde: Date.now() }],
    };
  });
}

export function yo(sala) {
  const id = miId();
  return sala.alumnos.find((a) => a.id === id) || null;
}

/**
 * El niño cambia de etapa y/o guarda datos de su actividad.
 * `datos` se mezcla con lo que ya tenía (no borra lo anterior).
 * Si `etapa` es null, solo guarda datos.
 */
export function actualizarAlumno(etapa, datos = {}) {
  const id = miId();
  guardar((s) => ({
    ...s,
    alumnos: s.alumnos.map((a) =>
      a.id === id
        ? { ...a, etapa: etapa || a.etapa, datos: { ...(a.datos || {}), ...datos }, desde: etapa && etapa !== a.etapa ? Date.now() : a.desde }
        : a
    ),
  }));
}

/** Apodos que nadie de la sala eligió todavía, mezclados. */
export function apodosLibres(sala, cantidad = 6) {
  const usados = new Set(sala.alumnos.map((a) => a.apodo));
  const libres = APODOS.filter((a) => !usados.has(a));
  for (let i = libres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [libres[i], libres[j]] = [libres[j], libres[i]];
  }
  return libres.slice(0, cantidad);
}
