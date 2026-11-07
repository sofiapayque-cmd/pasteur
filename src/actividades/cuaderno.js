/*
  CUADERNO DE INVESTIGACIÓN (bloque 3 del plan de entrega).

  Cada actividad ya guarda lo que hace el chico en su avance (progreso.datos).
  Acá se ordena eso en el mismo formato para las tres, como lo escribiría un
  investigador: hipótesis, decisiones, variables, resultados y conclusiones.
  Lo lee la maestra (por alumno y por clase). No guarda nada nuevo: es una
  lectura de lo que ya está, así sirve también para avances viejos.

  Sin componentes ni red: se prueba con npm run test:clase.
  Las frases salen de los mismos textos que ven los chicos en cada actividad.
*/
import { ambientePorId } from './a1/datos';
import { ANTIBIOTICOS, NOMBRE_HALO, temperaturaPorId } from './a1/laboratorio';
import { CAMBIOS_VISIBLES, NOMBRE_RESULTADO, estructura, fmtPh, textoHipotesis } from './a2/ciencia';
import { MUESTRA, buscarMision, LUCES } from './a3/contenido';

import { SECCIONES } from './secciones';

export { SECCIONES };

const lista = (v) => (Array.isArray(v) ? v : []);
const juntar = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);
const vacio = () => ({ hipotesis: [], decisiones: [], variables: [], resultados: [], conclusiones: [] });

// ---------------------------------------------------------------------
// A1 · Genómica Microbiana
// ---------------------------------------------------------------------
const PREDICCION_A1 = {
  nada: 'no va a crecer nada en toda la placa',
  halos: 'alrededor de algunos discos no van a crecer',
  igual: 'va a crecer todo igual, como si nada',
};
const OBS_A1 = {
  colores: 'colores distintos',
  formas: 'formas distintas',
  tamanos: 'colonias más grandes en una',
  raro: 'algo raro (¿contaminación?)',
  iguales: 'que se veían casi iguales',
};

function cuadernoA1(d) {
  const c = vacio();
  const muestras = lista(d.muestras);
  const cultivos = lista(d.cultivos);
  const ab = lista(d.antibioticos);
  const nombreAmb = (id) => ambientePorId(id)?.nombre ?? id;
  const placa = (id) => cultivos.find((x) => x.id === id);
  const nombrePlaca = (p) => (p ? `${nombreAmb(p.ambiente).toLowerCase()} (${temperaturaPorId(p.temp).nombre.toLowerCase()})` : 'otra placa');

  for (const a of ab) if (a.prediccion && PREDICCION_A1[a.prediccion]) c.hipotesis.push(`Antes de mirar los antibióticos: "${PREDICCION_A1[a.prediccion]}".`);

  if (muestras.length) {
    const ambientes = [...new Set(muestras.map((m) => nombreAmb(m.ambiente)))];
    c.decisiones.push(`Tomó ${muestras.length} ${muestras.length === 1 ? 'muestra' : 'muestras'}: ${juntar(ambientes)}.`);
  } else if (d.ambiente) c.decisiones.push(`Eligió investigar: ${nombreAmb(d.ambiente)}.`);
  for (const p of cultivos) c.decisiones.push(`Sembró la muestra de ${nombreAmb(p.ambiente).toLowerCase()} y la incubó en ${temperaturaPorId(p.temp).nombre.toLowerCase()}.`);

  const temps = [...new Set(cultivos.map((p) => temperaturaPorId(p.temp).nombre.toLowerCase()))];
  const ambs = [...new Set(cultivos.map((p) => nombreAmb(p.ambiente).toLowerCase()))];
  if (ambs.length > 1) c.variables.push(`Ambiente de la muestra: ${juntar(ambs)}.`);
  if (temps.length > 1) c.variables.push(`Temperatura de incubación: ${juntar(temps)}.`);
  if (cultivos.length && ambs.length <= 1 && temps.length <= 1) c.variables.push('Todavía no cambió nada entre placas: con dos distintas puede comparar.');
  if (ab.length) c.variables.push(`Antibióticos: ${juntar(ANTIBIOTICOS.map((x) => x.nombre))}.`);

  for (const p of cultivos) {
    c.resultados.push(
      p.contaminada
        ? `Placa de ${nombrePlaca(p)}: se contaminó.`
        : `Placa de ${nombrePlaca(p)}: ${p.colonias ?? 0} ${p.colonias === 1 ? 'colonia' : 'colonias'}${p.tipos ? ` de ${p.tipos} ${p.tipos === 1 ? 'tipo' : 'tipos'}` : ''}.`,
    );
  }
  for (const a of ab) {
    const partes = lista(a.resultados).map((r) => `${ANTIBIOTICOS.find((x) => x.id === r.id)?.nombre ?? r.id}: ${(NOMBRE_HALO[r.halo] ?? r.halo).toLowerCase()}${r.resistentes ? `, ${r.resistentes} ${r.resistentes === 1 ? 'resistente' : 'resistentes'}` : ''}`);
    if (partes.length) c.resultados.push(`Antibióticos en la placa de ${nombrePlaca(placa(a.placa)) || nombreAmb(a.ambiente)}: ${partes.join('; ')}.`);
  }

  for (const comp of lista(d.comparaciones).slice(-3)) {
    const quien =
      comp.mas === 'a' ? `Creció más en ${nombrePlaca(placa(comp.a))}` : comp.mas === 'b' ? `Creció más en ${nombrePlaca(placa(comp.b))}` : `En ${nombrePlaca(placa(comp.a))} y ${nombrePlaca(placa(comp.b))} creció parecido`;
    c.conclusiones.push(`${quien}. Vio ${juntar(lista(comp.obs).map((o) => OBS_A1[o]).filter(Boolean)) || 'diferencias'}.`);
  }
  const ultimo = ab.at(-1);
  if (ultimo?.masResistido) {
    c.conclusiones.push(`Con el ${ANTIBIOTICOS.find((x) => x.id === ultimo.masResistido)?.nombre ?? ultimo.masResistido} resistieron más bacterias.`);
    if (ultimo.prediccion) c.conclusiones.push(ultimo.prediccion === 'halos' ? 'Su predicción se cumplió: alrededor de algunos discos no crecieron.' : 'Su predicción no se cumplió: alrededor de algunos discos no crecieron y de otros sí.');
  }
  return c;
}

// ---------------------------------------------------------------------
// A2 · Simulaciones Biomoleculares
// ---------------------------------------------------------------------
function cuadernoA2(d) {
  const c = vacio();
  if (!d.estructura) return c;
  const e = estructura(d.estructura);
  const corridas = lista(d.corridas);
  if (d.hipotesis) c.hipotesis.push(textoHipotesis(d.hipotesis));

  c.decisiones.push(`Eligió la molécula: ${e.nombre}.`);
  const vistas = lista(d.vistas);
  if (vistas.length) {
    const nombres = vistas.map((v) => e.partes?.find((p) => p.id === v)?.nombre).filter(Boolean);
    c.decisiones.push(`Exploró ${vistas.length} ${vistas.length === 1 ? 'parte' : 'partes'}${nombres.length ? `: ${juntar(nombres.map((n) => n.toLowerCase()))}` : ''}.`);
  }
  if (d.ronda === 2) c.decisiones.push('Hizo una segunda corrida para comparar.');

  for (const [i, k] of corridas.entries()) c.variables.push(`Corrida ${i + 1}: temperatura ${k.t} °C y pH ${fmtPh(k.ph)}.`);
  for (const [i, k] of corridas.entries()) c.resultados.push(`Corrida ${i + 1}: ${(NOMBRE_RESULTADO[k.r] ?? k.r).toLowerCase()}.`);
  const marcadas = lista(d.marcadas).map((m) => CAMBIOS_VISIBLES.find((x) => x.id === m)?.texto).filter(Boolean);
  if (marcadas.length) c.resultados.push(`Lo que observó: ${juntar(marcadas.map((m) => m.toLowerCase()))}.`);

  if (d.cumplida === true) c.conclusiones.push('Su hipótesis se cumplió.');
  else if (d.cumplida === false) c.conclusiones.push('Su hipótesis no se cumplió: en ciencia, eso también enseña.');
  return c;
}

// ---------------------------------------------------------------------
// A3 · Bioimagenología
// ---------------------------------------------------------------------
// [una, varias]
const NOMBRE_ERROR_A3 = {
  borrosa: ['borrosa', 'borrosas'],
  lechosa: ['lechosa (sin aceite a 100x)', 'lechosas (sin aceite a 100x)'],
  oscura: ['negra (sin luz)', 'negras (sin luz)'],
  apagada: ['con la fluorescencia apagada', 'con la fluorescencia apagada'],
  vacia: ['sin muestra', 'sin muestra'],
};

function cuadernoA3(d) {
  const c = vacio();
  if (!d.muestra) return c;
  const muestra = MUESTRA[d.muestra];
  const mision = buscarMision(d.muestra, d.mision);
  if (mision) c.hipotesis.push(`Misión: ${mision.pregunta ?? mision.titulo}`);

  c.decisiones.push(`Eligió la muestra: ${muestra?.nombre ?? d.muestra}.`);
  const fotos = lista(d.fotos);
  const aumentos = [...new Set(fotos.map((f) => f.a).filter(Boolean))].sort((a, b) => a - b);
  const luces = [...new Set(fotos.flatMap((f) => String(f.l ?? '').split('')).filter(Boolean))];
  if (aumentos.length) c.variables.push(`Aumentos que usó: ${juntar(aumentos.map((a) => `${a}x`))}.`);
  if (luces.length) c.variables.push(`Luces: ${juntar(luces.map((l) => (muestra?.canales?.[l] ? `${LUCES.find((x) => x.id === l)?.nombre.toLowerCase() ?? l} (${muestra.canales[l].toLowerCase()})` : LUCES.find((x) => x.id === l)?.nombre.toLowerCase() ?? l)))}.`);
  if (fotos.some((f) => f.ac)) c.decisiones.push('Usó aceite de inmersión para el aumento más grande.');

  const n = d.nFotos ?? fotos.length;
  if (n) c.resultados.push(`Sacó ${n} ${n === 1 ? 'foto' : 'fotos'}.`);
  const errores = Object.entries(d.errores ?? {}).filter(([k, v]) => v > 0 && NOMBRE_ERROR_A3[k]);
  if (errores.length) c.resultados.push(`Fotos para repetir: ${juntar(errores.map(([k, v]) => `${v} ${NOMBRE_ERROR_A3[k][v === 1 ? 0 : 1]}`))}.`);
  for (const l of lista(d.logros)) {
    const m = buscarMision(l.m, l.mi);
    if (m) c.conclusiones.push(`Encontró: ${m.nombre.toLowerCase()} (${MUESTRA[l.m]?.nombre.toLowerCase() ?? l.m}). ${m.explicacion ?? ''}`.trim());
  }
  const pistas = Object.values(d.pistas ?? {}).reduce((s, v) => s + Math.max(0, Number(v) - 1), 0);
  if (pistas) c.resultados.push(`Pidió ${pistas} ${pistas === 1 ? 'pista extra' : 'pistas extra'}.`);
  return c;
}

const POR_ACTIVIDAD = { a1: cuadernoA1, a2: cuadernoA2, a3: cuadernoA3 };

/** El cuaderno de un chico en una actividad: { hipotesis, decisiones, variables, resultados, conclusiones }, cada una una lista de frases. */
export function cuadernoDe(actividad, datos) {
  const f = POR_ACTIVIDAD[actividad];
  if (!f || !datos || typeof datos !== 'object') return vacio();
  try {
    return f(datos);
  } catch {
    // Datos de una versión vieja de la actividad: mejor vacío que romper la pantalla de la maestra
    return vacio();
  }
}

/** ¿Hay algo para leer? */
export const cuadernoVacio = (c) => SECCIONES.every((s) => !c[s.id]?.length);
