// A4 · Evolución Experimental de Virus
import { AMBIENTES, RESULTADOS, fidelidadN, reconstruir, resultado, variantes } from './modelo';

export const ETAPAS = [
  { id: 'poblacion', nombre: 'Un virus' },
  { id: 'fidelidad', nombre: 'Fidelidad' },
  { id: 'generaciones', nombre: 'Generaciones' },
  { id: 'arbol', nombre: 'Árbol' },
  { id: 'ambiente', nombre: 'Ambiente' },
  { id: 'observar', nombre: 'Observar' },
  { id: 'conclusion', nombre: 'Conclusión' },
];

export const GUIA = {
  titulo: 'Evolución de virus: copias, errores y ambiente',
  objetivos: [
    'Comprender que al copiarse la información genética pueden aparecer errores (mutaciones) al azar.',
    'Relacionar la fidelidad de copia con la variación: muy exacta casi no varía; con demasiados errores la población se apaga.',
    'Entender que el ambiente no crea las variantes: favorece a algunas que ya existían.',
  ],
};

export const OPCIONES = [
  {
    clave: 'ambientes',
    etiqueta: 'Cambios de ambiente que puede elegir la clase',
    items: AMBIENTES.map((a) => ({ id: a.id, nombre: a.nombre, detalle: a.detalle, color: a.color })),
  },
];

export const DESBLOQUEOS = [
  {
    clave: 'ambiente',
    etiqueta: 'Cambio de ambiente',
    etapa: 'ambiente',
    accion: 'Habilitar cambio de ambiente',
    recomendado: 'Lo habilito yo durante la clase',
    explicacion: 'Recomendado: primero miran crecer el árbol, después cambian el ambiente todos juntos',
  },
];

export const PREGUNTAS = [
  '¿Las variantes aparecieron porque el virus las necesitaba, o aparecieron antes?',
  '¿Qué pasó con las copias muy exactas? ¿Y con muchísimos errores? ¿Cuál funcionó mejor?',
  'Cuando cambió el ambiente, ¿por qué algunas ramas crecieron y otras se cortaron?',
];

// Datos plausibles para alumnos de prueba: se calculan con el mismo modelo
export function simularDatos(indice, sala) {
  if (indice <= 0) return {};
  if (indice === 1) return { copias: 4 };
  const habilitados = sala?.opciones?.ambientes?.length ? sala.opciones.ambientes : AMBIENTES.map((a) => a.id);
  const azar = (l) => l[Math.floor(Math.random() * l.length)];
  const hip = azar(['variantes', 'iguales', 'apagar']);
  const corridaDe = (n, fid, conAmbiente) => {
    const sem = Math.floor(Math.random() * 1e9);
    const amb = conAmbiente ? azar(habilitados) : null;
    const sim = reconstruir({ semilla: sem, fidelidad: fid, gen: conAmbiente ? 30 : 16, ambiente: amb, genAmbiente: amb ? 16 : null });
    return { n, fid, hip: azar(['variantes', 'iguales', 'apagar']), amb: sim.ambiente, genAmb: sim.genAmbiente, gen: sim.gen, res: resultado(sim), var: variantes(sim), sem };
  };
  const fid = azar([1, 2, 3, 3, 4, 5]);
  const base = { copias: 5, fidelidad: fid, hipotesis: hip, semilla: Math.floor(Math.random() * 1e9), corrida: 1, gen: 0 };
  if (indice === 2) return { ...base, gen: 6 };
  if (indice === 3) return { ...base, gen: 12 };
  if (indice === 4) return { ...base, gen: 16 };
  if (indice === 5) return { ...base, gen: 22, ambiente: azar(habilitados), genAmbiente: 16 };
  const corridas = [corridaDe(1, azar([1, 5]), true), corridaDe(2, 3, true)];
  if (Math.random() < 0.5) corridas.push(corridaDe(3, azar([2, 4]), true));
  return { ...base, corridas, corrida: corridas.length, entendio: Math.random() < 0.8 ? 'azar' : 'necesidad' };
}

export function resumen(datos) {
  const c = datos?.corridas || [];
  if (!c.length) {
    if (datos?.fidelidad) return `Primera corrida · fidelidad ${fidelidadN(datos.fidelidad).corto}`;
    return datos?.copias ? `Copió ${datos.copias} virus` : 'Empezando';
  }
  const u = c[c.length - 1];
  const fids = new Set(c.map((x) => x.fid)).size;
  return `${c.length} ${c.length === 1 ? 'corrida' : 'corridas'} (${fids} ${fids === 1 ? 'fidelidad' : 'fidelidades'}) · última: ${fidelidadN(u.fid).corto}, ${u.var} ${u.var === 1 ? 'variante' : 'variantes'}, ${RESULTADOS[u.res]?.corto || ''}`;
}

