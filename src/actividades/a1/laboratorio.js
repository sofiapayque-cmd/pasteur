/*
  Lógica del laboratorio de A1 (sin React): temperaturas, crecimiento de
  colonias y antibiograma. Todo es determinístico a partir de una semilla,
  así la misma placa se ve igual en la mesa del niño, en el cuaderno y en la
  puesta en común de la maestra.

  IMPORTANTE: son SIMULACIONES ilustrativas de ciencia general. Los números
  (cantidad de colonias, tamaño de halos) no son datos de laboratorio.
*/
import { AMBIENTES } from './datos';
import { firma, tamanoColonia } from './colonias';

export function azar(semilla) {
  let s = Math.abs(Math.floor(semilla)) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const nuevaSemilla = () => 1 + Math.floor(Math.random() * 9000);

/* ---------- Incubadora ---------- */
// VALIDAR: rangos aproximados de incubación (frío ≈ 4–10 °C, templado ≈ 20–25 °C, tibio ≈ 37 °C).
export const TEMPERATURAS = [
  { id: 'frio', nombre: 'Frío', detalle: 'Como adentro de la heladera', color: '#93AEEB', nivel: 0.22, tiempos: ['Recién sembrada', '3 días', '7 días'] },
  { id: 'templado', nombre: 'Templado', detalle: 'Como un día de primavera', color: '#8ED5C3', nivel: 0.55, tiempos: ['Recién sembrada', '24 horas', '48 horas'] },
  { id: 'tibio', nombre: 'Tibio', detalle: 'Como adentro de tu cuerpo', color: '#F2B13B', nivel: 0.82, tiempos: ['Recién sembrada', '24 horas', '48 horas'] },
];
export const temperaturaPorId = (id) => TEMPERATURAS.find((t) => t.id === id) || TEMPERATURAS[1];

/*
  Cuánto le gusta cada temperatura a los microorganismos de cada ambiente (0 a 1).
  VALIDAR: ciencia general — los del suelo antártico suelen crecer mejor con frío
  (psicrófilos/psicrotolerantes); los del intestino de animales de sangre caliente
  (pingüino y vaca), cerca de la temperatura del cuerpo; los del suelo del campo, templado.
*/
const PREFERENCIA = {
  'antartida-suelo': { frio: 1, templado: 0.5, tibio: 0.12 },
  'antartida-pinguino': { frio: 0.22, templado: 0.55, tibio: 1 },
  'campo-suelo': { frio: 0.18, templado: 1, tibio: 0.65 },
  'campo-vaca': { frio: 0.12, templado: 0.5, tibio: 1 },
};
export const preferencia = (ambiente, temp) => PREFERENCIA[ambiente]?.[temp] ?? 0.5;
export const mejorTemperatura = (ambiente) =>
  Object.entries(PREFERENCIA[ambiente] || { templado: 1 }).sort((a, b) => b[1] - a[1])[0][0];

/* Cómo se ven las colonias de cada ambiente: ver colonias.js (la "firma", con sus fuentes). */
export const coloresColonias = (ambiente) => firma(ambiente).map((m) => m.color);

/* Trazo en zigzag por defecto (coordenadas de la placa, viewBox 400×400, centro 200,200) */
export function trazoZigzag(semilla = 1) {
  const r = azar(semilla);
  const puntos = [];
  for (let i = 0; i < 12; i++) {
    const y = 90 + i * 20;
    const ancho = Math.sqrt(Math.max(0, 150 * 150 - (y - 200) ** 2)) * 0.85;
    puntos.push([Math.round(200 + (i % 2 ? ancho : -ancho) + (r() - 0.5) * 16), Math.round(y)]);
  }
  return puntos;
}

/*
  ¿Lo que dibujó el niño es un zigzag de siembra?
  Se pide: ir y volver de un lado al otro al menos 3 veces (cada ida de 60 o más)
  mientras se avanza en la otra dirección (al menos 120 de recorrido, casi siempre hacia el mismo lado).
  Sirve tanto un zigzag de izquierda a derecha como uno de arriba a abajo.
  Así se distingue de una raya, un círculo o un garabato.
*/
export function esZigzag(trazos) {
  const pts = trazos.flat();
  if (pts.length < 6) return false;
  const prueba = (a, b) => {
    let vueltas = 0;
    let dir = 0;
    let extremo = pts[0][a];
    for (let i = 1; i < pts.length; i++) {
      const d = pts[i][a] - pts[i - 1][a];
      if (Math.abs(d) < 2) continue;
      const nd = Math.sign(d);
      if (dir !== 0 && nd !== dir) {
        if (Math.abs(pts[i - 1][a] - extremo) >= 60) vueltas++;
        extremo = pts[i - 1][a];
      }
      dir = nd;
    }
    const valores = pts.map((p) => p[b]);
    const recorrido = Math.max(...valores) - Math.min(...valores);
    let camino = 0;
    for (let i = 1; i < pts.length; i++) camino += Math.abs(pts[i][b] - pts[i - 1][b]);
    const avance = camino ? Math.abs(pts[pts.length - 1][b] - pts[0][b]) / camino : 0;
    return vueltas >= 3 && recorrido >= 120 && avance >= 0.45;
  };
  return prueba(0, 1) || prueba(1, 0);
}

/* Reduce un trazo a pocos puntos para guardarlo (datos chicos) */
export function simplificarTrazo(puntos, max = 14) {
  if (puntos.length <= max) return puntos.map(([x, y]) => [Math.round(x), Math.round(y)]);
  const paso = (puntos.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => {
    const [x, y] = puntos[Math.round(i * paso)];
    return [Math.round(x), Math.round(y)];
  });
}

/* Resultado de una placa: cuántas colonias y de cuántos tipos */
export function resultadoPlaca({ ambiente, temp, contaminada }) {
  const p = preferencia(ambiente, temp);
  const colonias = Math.round(3 + p * 15);
  const tipos = p > 0.8 ? 3 : p > 0.4 ? 2 : 1;
  return { colonias, tipos, contaminada: Boolean(contaminada), preferencia: p };
}

/*
  Lista de colonias para dibujar. Crecen a lo largo del trazo del asa
  (como en una placa real). Cada colonia tiene el momento en que aparece (1 o 2)
  y su tamaño final.
*/
export function colonias(placa) {
  const { ambiente, semilla = 1, contaminada } = placa;
  const { colonias: n, tipos } = resultadoPlaca(placa);
  const r = azar(semilla * 7 + 3);
  const tiposDeAca = firma(ambiente);
  const gusto = preferencia(ambiente, placa.temp);
  const trazo = placa.trazo?.length > 1 ? placa.trazo : trazoZigzag(semilla);
  const lista = [];
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * (trazo.length - 1));
    const t = r();
    const [x1, y1] = trazo[k];
    const [x2, y2] = trazo[k + 1];
    let x = x1 + (x2 - x1) * t + (r() - 0.5) * 22;
    let y = y1 + (y2 - y1) * t + (r() - 0.5) * 22;
    const d = Math.hypot(x - 200, y - 200);
    if (d > 158) {
      x = 200 + ((x - 200) / d) * 158;
      y = 200 + ((y - 200) / d) * 158;
    }
    const tipo = Math.floor(r() * tipos);
    const morfo = tiposDeAca[tipo];
    // Mismo orden de sorteos que antes: las placas ya guardadas quedan con las colonias en el mismo lugar
    lista.push({
      x,
      y,
      tipo,
      forma: morfo.id,
      color: morfo.color,
      tam: tamanoColonia(morfo, r(), gusto),
      aparece: r() < 0.65 ? 1 : 2,
      giro: Math.round(r() * 360),
      semilla: Math.floor(r() * 1000),
    });
  }
  if (contaminada) {
    // Hongo peludo y colonias "extrañas" que vinieron del asa sin esterilizar
    const hongos = 2 + Math.floor(r() * 2);
    for (let i = 0; i < hongos; i++) {
      const ang = r() * Math.PI * 2;
      const dist = 40 + r() * 100;
      lista.push({ x: 200 + Math.cos(ang) * dist, y: 200 + Math.sin(ang) * dist, forma: 'hongo', color: '#9DB08A', tam: 22 + r() * 16, aparece: i === 0 ? 1 : 2, giro: Math.round(r() * 360), semilla: Math.floor(r() * 1000) });
    }
    for (let i = 0; i < 4; i++) {
      const ang = r() * Math.PI * 2;
      const dist = 30 + r() * 120;
      lista.push({ x: 200 + Math.cos(ang) * dist, y: 200 + Math.sin(ang) * dist, forma: 'rara', color: i % 2 ? '#B9B07A' : '#C9C2B4', tam: 6 + r() * 7, aparece: 2, giro: 0, semilla: 0 });
    }
  }
  return lista;
}

/* ---------- Antibióticos ---------- */
// Nombres genéricos a propósito (no nombres comerciales).
export const ANTIBIOTICOS = [
  { id: 'A', nombre: 'Antibiótico A', color: '#7272EE' },
  { id: 'B', nombre: 'Antibiótico B', color: '#EF6F5E' },
  { id: 'C', nombre: 'Antibiótico C', color: '#2F4A85' },
];
export const RADIO_DISCO = 13;
export const RADIO_HALO = { grande: 66, mediano: 48, chico: 30, nada: RADIO_DISCO + 2 };
export const NOMBRE_HALO = { grande: 'Halo grande', mediano: 'Halo mediano', chico: 'Halo chico', nada: 'Sin halo' };

/*
  VALIDAR: resultados ILUSTRATIVOS. No representan la sensibilidad real de
  bacterias de esos ambientes; sirven para ver que algunas bacterias resisten.
*/
const SENSIBILIDAD = {
  'antartida-suelo': { A: ['grande', 0], B: ['mediano', 1], C: ['chico', 3] },
  'antartida-pinguino': { A: ['grande', 1], B: ['chico', 3], C: ['mediano', 0] },
  'campo-suelo': { A: ['mediano', 2], B: ['grande', 0], C: ['nada', 0] },
  'campo-vaca': { A: ['mediano', 1], B: ['grande', 0], C: ['chico', 4] },
};

export function resultadoAntibiotico(ambiente, id) {
  const [halo, resistentes] = SENSIBILIDAD[ambiente]?.[id] || ['mediano', 1];
  return { id, halo, resistentes };
}

/* ¿Los halos se van a encimar? discos: [{ id, x, y }] */
export function halosEncimados(ambiente, discos) {
  for (let i = 0; i < discos.length; i++) {
    for (let j = i + 1; j < discos.length; j++) {
      const a = discos[i];
      const b = discos[j];
      const ra = RADIO_HALO[resultadoAntibiotico(ambiente, a.id).halo];
      const rb = RADIO_HALO[resultadoAntibiotico(ambiente, b.id).halo];
      if (Math.hypot(a.x - b.x, a.y - b.y) < ra + rb + 4) return true;
    }
  }
  return false;
}

/* Puntaje de "cuánto resistieron" las bacterias a un antibiótico */
export const puntajeResistencia = (r) => (r.halo === 'nada' ? 8 : r.halo === 'chico' ? 2 : 0) + r.resistentes;

export function masResistido(resultados) {
  return [...resultados].sort((a, b) => puntajeResistencia(b) - puntajeResistencia(a))[0]?.id;
}

/* Lugares sugeridos para los discos (alternativa sin arrastrar) */
export const LUGARES_DISCOS = [
  { x: 200, y: 112 },
  { x: 122, y: 252 },
  { x: 278, y: 252 },
];

export const ambientesHabilitados = (opciones) =>
  opciones?.ambientes?.length ? AMBIENTES.filter((a) => opciones.ambientes.includes(a.id)) : AMBIENTES;
