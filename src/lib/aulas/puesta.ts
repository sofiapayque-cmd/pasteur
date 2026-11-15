import { AMBIENTES, ambientePorId } from '@/actividades/a1/datos';
import { ANTIBIOTICOS, TEMPERATURAS, puntajeResistencia, temperaturaPorId } from '@/actividades/a1/laboratorio';
import { CAMBIOS_VISIBLES, PREDICCIONES, estructura, fmtPh, forma, textoHipotesis } from '@/actividades/a2/ciencia';
import { MUESTRA } from '@/actividades/a3/contenido';

/*
  PUESTA EN COMÚN · la parte sin red (se prueba con npm run test:puesta).
  Pedido de Sofia (8/11): una vista para la maestra con los resultados de toda
  la clase, comparaciones de los experimentos y las conclusiones de cada chico,
  para elegir algunas y proyectarlas sin nombres.

  Tres tipos de contenido, siempre separados y con su etiqueta:
    · DATOS DE LA CLASE: lo que midieron los chicos, tal cual (números y tablas).
    · RESUMEN AUTOMÁTICO: frases armadas SOLO con esos números, con reglas
      fijas (sin IA). Si no hay datos suficientes, no se arma ninguna frase.
    · (La explicación científica la da "Preguntale al Pasteur": solo respuestas
      aprobadas por las investigadoras, en el panel de al lado.)
  Las conclusiones salen de lo que cada chico registró en la actividad
  (comparaciones, hipótesis, observaciones). No llevan apodo ni número: así
  se pueden proyectar.
*/
export type AlumnoPuesta = { id: string; datos: Record<string, unknown> | null | undefined };
export type Dato = { etiqueta: string; valor: string };
export type Comparacion = { titulo: string; columnas: string[]; filas: { nombre: string; valores: string[] }[]; nota?: string };
/** id: solo para la selección en pantalla (lleva el id interno del alumno, nunca se muestra). */
export type Conclusion = { id: string; texto: string };
export type ResumenPuesta = {
  participantes: number;
  datos: Dato[];
  comparaciones: Comparacion[];
  automatico: string[];
  conclusiones: Conclusion[];
  /** si la actividad no tiene conclusiones escritas (A3), por qué */
  sinConclusiones?: string;
};

type Cultivo = { id?: string; ambiente?: string; temp?: string; colonias?: number; contaminada?: boolean };
type PruebaAb = { ambiente?: string; resultados?: { id: string; halo: string; resistentes: number }[]; masResistido?: string };
type Comparada = { a?: string; b?: string; mas?: 'a' | 'b'; obs?: string[] };
type Corrida = { t: number; ph: number; r: string };

const lista = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
const promedio = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const OBS_A1: Record<string, string> = {
  colores: 'colores distintos',
  formas: 'formas distintas',
  tamanos: 'colonias más grandes en una',
  raro: 'algo raro (¿contaminación?)',
  iguales: 'que se veían casi iguales',
};

// ---------------------------------------------------------------------
// A1 · Genómica microbiana
// ---------------------------------------------------------------------
function puestaA1(alumnos: AlumnoPuesta[]): ResumenPuesta {
  const cultivos = alumnos.flatMap((a) => lista<Cultivo>(a.datos?.cultivos));
  const muestras = alumnos.reduce((n, a) => n + lista(a.datos?.muestras).length, 0);
  const pruebas = alumnos.flatMap((a) => {
    const ab = lista<PruebaAb>(a.datos?.antibioticos);
    return ab.length ? [ab[ab.length - 1]] : [];
  });
  const sanas = cultivos.filter((c) => !c.contaminada && typeof c.colonias === 'number');
  const contaminadas = cultivos.filter((c) => c.contaminada).length;

  // Colonias por ambiente y temperatura (solo placas sin contaminar)
  const ambientes = AMBIENTES.filter((amb) => sanas.some((c) => c.ambiente === amb.id));
  const temperaturas = TEMPERATURAS.filter((t) => sanas.some((c) => c.temp === t.id));
  const comparaciones: Comparacion[] = [];
  if (ambientes.length && temperaturas.length) {
    comparaciones.push({
      titulo: 'Colonias por placa, según el ambiente y la temperatura',
      columnas: temperaturas.map((t) => t.nombre),
      filas: ambientes.map((amb) => ({
        nombre: amb.nombre,
        valores: temperaturas.map((t) => {
          const xs = sanas.filter((c) => c.ambiente === amb.id && c.temp === t.id).map((c) => c.colonias as number);
          return xs.length ? `${promedio(xs)} (${plural(xs.length, 'placa', 'placas')})` : '—';
        }),
      })),
      nota: 'Promedio de colonias por placa. No se cuentan las placas contaminadas.',
    });
  }
  const porAntibiotico = ANTIBIOTICOS.map((ab) => {
    let sinHalo = 0;
    let resistentes = 0;
    let probadas = 0;
    let puntaje = 0;
    for (const p of pruebas) {
      const r = (p.resultados ?? []).find((x) => x.id === ab.id);
      if (!r) continue;
      probadas += 1;
      if (r.halo === 'nada') sinHalo += 1;
      resistentes += r.resistentes || 0;
      puntaje += puntajeResistencia(r);
    }
    return { ...ab, sinHalo, resistentes, probadas, puntaje };
  });
  if (pruebas.length) {
    comparaciones.push({
      titulo: 'Antibióticos',
      columnas: ['Placas probadas', 'Placas sin halo', 'Colonias que resistieron'],
      filas: porAntibiotico.map((a) => ({ nombre: a.nombre, valores: [String(a.probadas), String(a.sinHalo), String(a.resistentes)] })),
    });
  }

  // Resumen automático: solo con los números de arriba
  const automatico: string[] = [];
  const porAmbiente = ambientes
    .map((amb) => ({ amb, prom: promedio(sanas.filter((c) => c.ambiente === amb.id).map((c) => c.colonias as number)) }))
    .sort((a, b) => b.prom - a.prom);
  if (porAmbiente.length >= 2 && porAmbiente[0].prom > porAmbiente[1].prom) {
    automatico.push(`Las placas de ${porAmbiente[0].amb.nombre.toLowerCase()} tuvieron en promedio más colonias: ${porAmbiente[0].prom} por placa, sumando todas las temperaturas.`);
  }
  // Mismo criterio que el gráfico de la puesta de A1 (puntajeResistencia)
  const [masResistido, segundo] = [...porAntibiotico].filter((a) => a.probadas).sort((a, b) => b.puntaje - a.puntaje);
  if (masResistido && masResistido.puntaje > 0 && masResistido.puntaje !== segundo?.puntaje) {
    const halo = masResistido.sinHalo ? ` y ${plural(masResistido.sinHalo, 'placa quedó', 'placas quedaron')} sin halo` : '';
    automatico.push(`Con el ${masResistido.nombre} resistieron más bacterias: ${plural(masResistido.resistentes, 'colonia resistió', 'colonias resistieron')}${halo}.`);
  }
  if (contaminadas) automatico.push(`${plural(contaminadas, 'placa se contaminó', 'placas se contaminaron')} y no entran en los promedios.`);

  // Conclusiones de cada chico: las mismas frases de su cuaderno
  const conclusiones: Conclusion[] = [];
  alumnos.forEach((a) => {
    const suyas = lista<Cultivo>(a.datos?.cultivos);
    const nombrePlaca = (id?: string) => {
      const p = suyas.find((c) => c.id === id);
      const amb = p && ambientePorId(p.ambiente)?.nombre;
      return amb ? `${amb.toLowerCase()} (${temperaturaPorId(p.temp).nombre.toLowerCase()})` : null;
    };
    for (const [j, c] of lista<Comparada>(a.datos?.comparaciones).slice(-3).entries()) {
      const na = nombrePlaca(c.a);
      const nb = nombrePlaca(c.b);
      const obs = (c.obs ?? []).map((o) => OBS_A1[o]).filter(Boolean);
      if (!na || !nb || !obs.length) continue;
      const quien = c.mas === 'a' ? `Creció más en ${na}` : c.mas === 'b' ? `Creció más en ${nb}` : `En ${na} y ${nb} creció parecido`;
      conclusiones.push({ id: `${a.id}-c${j}`, texto: `${quien}. Vi ${obs.join(', ')}.` });
    }
    const ab = lista<PruebaAb>(a.datos?.antibioticos).at(-1);
    const nombre = ANTIBIOTICOS.find((x) => x.id === ab?.masResistido)?.nombre;
    const amb = ambientePorId(ab?.ambiente)?.nombre;
    if (nombre && amb) conclusiones.push({ id: `${a.id}-ab`, texto: `En la placa de ${amb.toLowerCase()}, con el ${nombre} resistieron más bacterias.` });
  });

  return {
    participantes: alumnos.length,
    datos: [
      { etiqueta: 'Muestras tomadas', valor: String(muestras) },
      { etiqueta: 'Placas sembradas', valor: String(cultivos.length) },
      { etiqueta: 'Placas contaminadas', valor: String(contaminadas) },
      { etiqueta: 'Pruebas con antibióticos', valor: String(pruebas.length) },
    ],
    comparaciones,
    automatico,
    conclusiones,
  };
}

// ---------------------------------------------------------------------
// A2 · Simulaciones biomoleculares
// ---------------------------------------------------------------------
function puestaA2(alumnos: AlumnoPuesta[]): ResumenPuesta {
  const corridas = alumnos.flatMap((a) => (a.datos?.estructura ? lista<Corrida>(a.datos.corridas).map((c) => ({ ...c, est: String(a.datos?.estructura) })) : []));
  const conHipotesis = alumnos.filter((a) => typeof a.datos?.cumplida === 'boolean');
  const cumplidas = conHipotesis.filter((a) => a.datos?.cumplida === true).length;

  // Resultados por molécula y condición
  const grupos = new Map<string, { nombre: string; orden: [string, number, number]; cuenta: Record<string, number> }>();
  for (const c of corridas) {
    const clave = `${c.est}|${c.t}|${c.ph}`;
    const nombre = estructura(c.est).corto;
    const g = grupos.get(clave) ?? { nombre: `${nombre} · ${c.t} °C · pH ${fmtPh(c.ph)}`, orden: [nombre, c.t, c.ph], cuenta: {} };
    const f = forma(c.r);
    g.cuenta[f] = (g.cuenta[f] ?? 0) + 1;
    grupos.set(clave, g);
  }
  const comparaciones: Comparacion[] = [];
  if (grupos.size) {
    comparaciones.push({
      titulo: 'Qué le pasó a la molécula en cada condición',
      columnas: PREDICCIONES.map((p) => p.texto.charAt(0).toUpperCase() + p.texto.slice(1)),
      filas: [...grupos.values()]
        .sort((x, y) => x.orden[0].localeCompare(y.orden[0]) || x.orden[1] - y.orden[1] || y.orden[2] - x.orden[2])
        .map((g) => ({ nombre: g.nombre, valores: PREDICCIONES.map((p) => String(g.cuenta[p.id] ?? 0)) })),
      nota: 'Cantidad de corridas de la simulación.',
    });
  }

  const automatico: string[] = [];
  if (conHipotesis.length) automatico.push(`${cumplidas} de ${conHipotesis.length} hipótesis se cumplieron.`);
  if (corridas.length) {
    const cuenta = (f: string) => corridas.filter((c) => forma(c.r) === f).length;
    automatico.push(
      `De ${plural(corridas.length, 'corrida', 'corridas')}: en ${cuenta('desarma')} la molécula se desnaturalizó, en ${cuenta('cambia')} cambió de forma y en ${cuenta('igual')} siguió igual.`,
    );
  }

  const conclusiones: Conclusion[] = [];
  alumnos.forEach((a) => {
    const h = a.datos?.hipotesis as { cambio?: string; prediccion?: string } | null | undefined;
    const mol = a.datos?.estructura ? estructura(String(a.datos.estructura)).corto : null;
    if (mol && h?.cambio && h?.prediccion && typeof a.datos?.cumplida === 'boolean') {
      const hipotesis = textoHipotesis(h).replace(/^Si /, 'si ');
      conclusiones.push({ id: `${a.id}-h`, texto: `${mol}. Hipótesis: ${hipotesis} ${a.datos.cumplida ? 'Se cumplió.' : 'No se cumplió.'}` });
    }
    const vistos = lista<string>(a.datos?.marcadas)
      .map((m) => CAMBIOS_VISIBLES.find((x) => x.id === m)?.texto.toLowerCase())
      .filter(Boolean);
    const ultima = lista<Corrida>(a.datos?.corridas).at(-1);
    if (mol && vistos.length && ultima) {
      conclusiones.push({ id: `${a.id}-v`, texto: `${mol} a ${ultima.t} °C y pH ${fmtPh(ultima.ph)}: ${vistos.join(', ')}.` });
    }
  });

  return {
    participantes: alumnos.length,
    datos: [
      { etiqueta: 'Corridas de la simulación', valor: String(corridas.length) },
      { etiqueta: 'Hipótesis puestas a prueba', valor: String(conHipotesis.length) },
      { etiqueta: 'Hipótesis que se cumplieron', valor: String(cumplidas) },
      { etiqueta: 'Moléculas estudiadas', valor: String(new Set(corridas.map((c) => c.est).filter(Boolean)).size) },
    ],
    comparaciones,
    automatico,
    conclusiones,
  };
}

// ---------------------------------------------------------------------
// A3 · Bioimagenología (no tiene etapa de conclusión escrita)
// ---------------------------------------------------------------------
function puestaA3(alumnos: AlumnoPuesta[]): ResumenPuesta {
  type Logro = { m?: string; mi?: string };
  const porMuestra = new Map<string, { nombre: string; chicos: number; fotos: number; misiones: number }>();
  let fotos = 0;
  let borrosas = 0;
  let misiones = 0;
  for (const a of alumnos) {
    const m = String(a.datos?.muestra ?? '');
    if (!m || !(MUESTRA as Record<string, { nombre: string }>)[m]) continue;
    const g = porMuestra.get(m) ?? { nombre: (MUESTRA as Record<string, { nombre: string }>)[m].nombre, chicos: 0, fotos: 0, misiones: 0 };
    const f = Number(a.datos?.nFotos ?? 0) || 0;
    const l = lista<Logro>(a.datos?.logros).length;
    g.chicos += 1;
    g.fotos += f;
    g.misiones += l;
    porMuestra.set(m, g);
    fotos += f;
    misiones += l;
    borrosas += Number((a.datos?.errores as { borrosa?: number } | undefined)?.borrosa ?? 0) || 0;
  }
  const comparaciones: Comparacion[] = porMuestra.size
    ? [
        {
          titulo: 'Por muestra',
          columnas: ['Chicos', 'Fotos', 'Misiones logradas'],
          filas: [...porMuestra.values()].map((g) => ({ nombre: g.nombre, valores: [String(g.chicos), String(g.fotos), String(g.misiones)] })),
        },
      ]
    : [];
  const automatico: string[] = [];
  if (fotos) automatico.push(`La clase sacó ${plural(fotos, 'foto', 'fotos')}${misiones ? ` y logró ${plural(misiones, 'misión', 'misiones')}` : ''}.`);
  if (borrosas) automatico.push(`${plural(borrosas, 'foto salió borrosa', 'fotos salieron borrosas')}.`);
  return {
    participantes: alumnos.length,
    datos: [
      { etiqueta: 'Fotos sacadas', valor: String(fotos) },
      { etiqueta: 'Misiones logradas', valor: String(misiones) },
      { etiqueta: 'Fotos borrosas', valor: String(borrosas) },
    ],
    comparaciones,
    automatico,
    conclusiones: [],
    sinConclusiones: 'Esta actividad no tiene una etapa de conclusiones escritas: se muestran los resultados de la clase.',
  };
}

export function resumenPuesta(actividad: string, alumnos: AlumnoPuesta[]): ResumenPuesta {
  if (actividad === 'a1') return puestaA1(alumnos);
  if (actividad === 'a2') return puestaA2(alumnos);
  if (actividad === 'a3') return puestaA3(alumnos);
  return { participantes: alumnos.length, datos: [], comparaciones: [], automatico: [], conclusiones: [], sinConclusiones: 'Esta actividad todavía no tiene puesta en común.' };
}

/**
 * Las conclusiones elegidas, en un orden mezclado que no depende de quién
 * las escribió (para proyectar). Mismo resultado para la misma selección.
 */
export function ordenParaProyectar(conclusiones: Conclusion[], elegidas: Set<string>): Conclusion[] {
  const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return conclusiones.filter((c) => elegidas.has(c.id)).sort((a, b) => h(a.texto) - h(b.texto) || a.texto.localeCompare(b.texto));
}
