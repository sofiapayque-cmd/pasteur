import { AMBIENTES, ambientePorId } from './datos';
import { TEMPERATURAS, ANTIBIOTICOS, LUGARES_DISCOS, resultadoPlaca, resultadoAntibiotico, masResistido, trazoZigzag } from './laboratorio';

export const ETAPAS = [
  { id: 'paisaje', nombre: 'Paisaje' },
  { id: 'explorar', nombre: 'Explorar' },
  { id: 'muestra', nombre: 'Muestra' },
  { id: 'mesa', nombre: 'Mesa' },
  { id: 'cultivo', nombre: 'Cultivo' },
  { id: 'comparar', nombre: 'Comparar' },
  { id: 'antibioticos', nombre: 'Antibióticos' },
  { id: 'conclusiones', nombre: 'Conclusiones' },
];

export const GUIA = {
  titulo: 'Microorganismos en todas partes',
  objetivos: [
    'Descubrir que hay microorganismos en el suelo y en los animales, aunque no los veamos.',
    'Entender que una placa de Petri solo muestra los que pueden crecer en esas condiciones.',
    'Observar que algunas bacterias resisten a un antibiótico y otras no.',
  ],
};

export const OPCIONES = [
  {
    clave: 'ambientes',
    etiqueta: 'Ambientes que ve la clase',
    items: AMBIENTES.map((a) => ({ id: a.id, nombre: a.nombre, detalle: a.detalle, color: a.color })),
  },
];

export const DESBLOQUEOS = [
  {
    clave: 'antibioticos',
    etiqueta: 'Antibióticos',
    etapa: 'antibioticos',
    accion: 'Habilitar antibióticos',
    recomendado: 'Los habilito yo durante la clase',
    explicacion: 'Recomendado: primero exploran, después experimentan',
  },
];

export const PREGUNTAS = [
  '¿Por qué no crecieron las mismas colonias en todos los ambientes?',
  '¿Todo lo que había en la muestra apareció en la placa?',
  '¿Qué pasó después del antibiótico? ¿Todas desaparecieron?',
];

/*
  Datos de alumnos de prueba. Misma forma que guarda la actividad:
  - muestras:  [{ id, ambiente, semilla }]
  - cultivos:  [{ id, muestra, ambiente, temp, semilla, contaminada, colonias, tipos, trazo }]
  - comparaciones: [{ a, b, mas, obs }]
  - antibioticos: [{ placa, ambiente, prediccion, discos: [{ id, x, y }], resultados: [{ id, halo, resistentes }], masResistido }]
*/
export function simularDatos(indice, sala) {
  const disponibles = sala.opciones?.ambientes?.length ? sala.opciones.ambientes : AMBIENTES.map((a) => a.id);
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  const primero = azar(disponibles);
  if (indice <= 0) return {};
  if (indice < 3) return { paisaje: ambientePorId(primero).paisaje, ambiente: indice === 2 ? primero : undefined };

  const n = 1 + Math.floor(Math.random() * 3);
  const muestras = Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, ambiente: i === 0 ? primero : azar(disponibles), semilla: 1 + Math.floor(Math.random() * 9000) }));
  const datos = { muestras, cultivos: [] };
  if (indice < 4) return datos;

  const aCultivar = indice >= 5 && muestras.length < 2 ? [...muestras, muestras[0]] : muestras;
  datos.cultivos = aCultivar.slice(0, indice === 4 ? 1 : 3).map((m, i) => {
    const temp = Math.random() < 0.6 ? azar(['frio', 'templado', 'tibio']) : 'templado';
    const contaminada = Math.random() < 0.15;
    const semilla = m.semilla + i;
    const { colonias, tipos } = resultadoPlaca({ ambiente: m.ambiente, temp, contaminada });
    return { id: `p${i + 1}`, muestra: m.id, ambiente: m.ambiente, temp, semilla, contaminada, colonias, tipos, trazo: trazoZigzag(semilla) };
  });
  if (indice >= 6 && datos.cultivos.length >= 2) {
    datos.comparaciones = [{ a: 'p1', b: 'p2', mas: datos.cultivos[0].colonias >= datos.cultivos[1].colonias ? 'a' : 'b', obs: ['colores'] }];
  }
  if (indice >= 7 || (indice === 6 && Math.random() < 0.5)) {
    const base = datos.cultivos.find((c) => !c.contaminada) || datos.cultivos[0];
    const resultados = ANTIBIOTICOS.map((a) => resultadoAntibiotico(base.ambiente, a.id));
    datos.antibioticos = [
      { placa: base.id, ambiente: base.ambiente, prediccion: 'halos', discos: ANTIBIOTICOS.map((a, i) => ({ id: a.id, ...LUGARES_DISCOS[i] })), resultados, masResistido: masResistido(resultados) },
    ];
  }
  return datos;
}

export function resumen(datos) {
  const m = datos?.muestras?.length || 0;
  if (!m) return datos?.ambiente ? `Explorando: ${ambientePorId(datos.ambiente)?.nombre}` : 'Sin muestras todavía';
  const partes = [`${m} ${m === 1 ? 'muestra' : 'muestras'}`];
  const p = datos.cultivos?.length || 0;
  if (p) partes.push(`${p} ${p === 1 ? 'placa' : 'placas'}`);
  const cont = (datos.cultivos || []).filter((c) => c.contaminada).length;
  if (cont) partes.push(`${cont} contaminada${cont > 1 ? 's' : ''}`);
  const ab = datos.antibioticos?.[datos.antibioticos.length - 1];
  if (ab) partes.push(`resistió más el ${ab.masResistido}`);
  return partes.join(' · ');
}

export const nombreTemperatura = (id) => TEMPERATURAS.find((t) => t.id === id)?.nombre || '';
