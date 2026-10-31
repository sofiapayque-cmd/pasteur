/*
  Modelo de A4 · Evolución Experimental de Virus.

  Es un modelo DIDÁCTICO (no reproduce datos de ningún laboratorio):
  - Cada virus lleva una "receta" de 8 letras (A, U, G, C), como un ARN cortito.
    · Letras 1 a 4: rasgos que se ven (color, punta de las espículas, cuántas espículas, cápsula).
    · Letras 5 a 8: instrucciones para copiarse y armarse. Si una de estas sale mal,
      la copia no funciona (no puede volver a copiarse).
  - Cada generación, cada virus deja en promedio R copias. Al copiar, cada letra
    puede salir cambiada con una probabilidad que depende de la FIDELIDAD de copia.
  - La placa tiene lugar para K virus como máximo (las células se acaban).
  - El ambiente cambia cuántas copias deja cada variante (selección).

  // VALIDAR: la proporción de mutaciones que "rompen" el virus (acá: 4 de cada 8 letras)
  //          es una simplificación; en virus de ARN reales una parte grande de las
  //          mutaciones es dañina o letal.
  // VALIDAR: la "catástrofe de error" (con demasiados errores la población se apaga) es
  //          un concepto real de la virología de virus de ARN; acá se muestra simplificado.
*/

export const LETRAS = ['A', 'U', 'G', 'C'];
export const K = 500; // capacidad de la placa (virus como máximo)
export const R = 2.5; // copias promedio por virus y por generación
export const INICIALES = 20; // virus iguales al empezar
export const UMBRAL_VARIANTE = 0.05; // una variante "cuenta" (y aparece en el árbol) si llegó a ser el 5% de los virus

// Lo que controla cada letra de la receta
export const RASGOS = [
  { id: 'color', nombre: 'Color', valores: ['rosa', 'amarillo', 'menta', 'celeste'] },
  { id: 'punta', nombre: 'Punta de las espículas', valores: ['redonda', 'doble', 'triángulo', 'anillo'] },
  { id: 'cantidad', nombre: 'Cantidad de espículas', valores: ['8', '6', '10', '12'] },
  { id: 'capsula', nombre: 'Cápsula', valores: ['fina', 'firme', 'ondulada', 'punteada'] },
];
export const COLORES_CUERPO = ['#F4A6BD', '#F2B13B', '#8ED5C3', '#93AEEB'];
export const CANTIDAD_ESPICULAS = [8, 6, 10, 12];

// Receta original: cada número es el índice de la letra en LETRAS
export const ORIGINAL = [0, 0, 0, 0, 2, 1, 3, 0];

/*
  Fidelidad de copia: mu = errores promedio por copia (en toda la receta de 8 letras).
  // VALIDAR: rangos ilustrativos; los virus de ARN reales suelen tener del orden de
  //          0,1 a 1 mutación por genoma en cada copia.
*/
export const FIDELIDADES = [
  { n: 1, id: 'muy-exacta', nombre: 'Muy exacta', corto: 'muy exacta', mu: 0.0005, dibujo: 'Calcando, muy despacio', errores: 'Casi nunca se equivoca' },
  { n: 2, id: 'exacta', nombre: 'Exacta', corto: 'exacta', mu: 0.03, dibujo: 'Despacio, mirando bien', errores: '1 error cada 30 copias' },
  { n: 3, id: 'intermedia', nombre: 'Intermedia', corto: 'intermedia', mu: 0.2, dibujo: 'Rápido', errores: '1 error cada 5 copias' },
  { n: 4, id: 'errores', nombre: 'Con muchos errores', corto: 'con muchos errores', mu: 1.2, dibujo: 'Muy rápido, mirando poco', errores: 'Más de 1 error en cada copia' },
  { n: 5, id: 'muchisimos', nombre: 'Con muchísimos errores', corto: 'con muchísimos errores', mu: 3, dibujo: 'A toda velocidad y sin mirar', errores: '3 errores en cada copia' },
];
export const fidelidadN = (n) => FIDELIDADES[Math.min(5, Math.max(1, n || 3)) - 1];

/*
  Ambientes: cuántas copias deja cada variante (1 = normal).
  // VALIDAR: "defensas que reconocen la forma de la espícula" (anticuerpos y escape
  //          antigénico) es ciencia general; "células nuevas" (receptor distinto) y
  //          "calor" (cápsula más estable) están simplificados a UN rasgo para que se vea.
*/
export const AMBIENTES = [
  {
    id: 'defensas',
    nombre: 'Llegan defensas',
    detalle: 'Anticuerpos que reconocen las espículas de punta redonda',
    favorece: 'las espículas que no son redondas',
    si: 'Punta no redonda',
    no: 'Punta redonda',
    color: '#7272EE',
    ayuda: (g) => g[1] !== 0,
  },
  {
    id: 'celulas',
    nombre: 'Células nuevas',
    detalle: 'Su cerradura solo se abre con espículas de punta doble',
    favorece: 'la punta doble',
    si: 'Punta doble',
    no: 'Otras puntas',
    color: '#8ED5C3',
    ayuda: (g) => g[1] === 1,
  },
  {
    id: 'calor',
    nombre: 'Hace más calor',
    detalle: 'Solo aguantan bien los de cápsula firme',
    favorece: 'la cápsula firme',
    si: 'Cápsula firme',
    no: 'Otras cápsulas',
    color: '#F2B13B',
    ayuda: (g) => g[3] === 1,
  },
];
export const ambientePorId = (id) => AMBIENTES.find((a) => a.id === id);
const CASTIGO = 0.15; // las variantes que no tienen el rasgo útil dejan muchas menos copias

export const clave = (g) => g.slice(0, 4).join('');
export const genomaDe = (k) => [...k.split('').map(Number), ...ORIGINAL.slice(4)];
export const texto = (g) => g.map((v) => LETRAS[v]).join('');

// Números pseudoaleatorios con semilla: la misma corrida se puede volver a armar igual
export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
  Copia una receta letra por letra. Devuelve { genoma, cambios: [posiciones], rota }.
*/
export function copiar(genoma, mu, rng = Math.random) {
  const p = mu / genoma.length;
  const nuevo = genoma.slice();
  const cambios = [];
  for (let i = 0; i < genoma.length; i++) {
    if (rng() < p) {
      nuevo[i] = (genoma[i] + 1 + Math.floor(rng() * 3)) % 4;
      cambios.push(i);
    }
  }
  const rota = nuevo.slice(4).some((v, i) => v !== ORIGINAL[4 + i]);
  return { genoma: nuevo, cambios, rota };
}

export function crearSim({ semilla = 1, fidelidad = 3 }) {
  const raiz = clave(ORIGINAL);
  const sim = {
    rng: azar(semilla),
    mu: fidelidadN(fidelidad).mu,
    gen: 0,
    pop: new Map([[raiz, INICIALES]]),
    nodos: new Map([[raiz, { k: raiz, padre: null, nace: 0, hist: [INICIALES], max: INICIALES, cuenta: 0 }]]),
    ambiente: null,
    genAmbiente: null,
    fallidas: 0,
    viables: INICIALES,
    total: INICIALES,
    minDesdeAmbiente: null,
    historia: [{ total: INICIALES, fallidas: 0, viables: INICIALES }],
    ultimos: [], // [{ k, padre }] variantes nuevas de la última generación
  };
  return sim;
}

export function cambiarAmbiente(sim, id) {
  sim.ambiente = id;
  sim.genAmbiente = sim.gen;
  sim.minDesdeAmbiente = sim.total;
}

/* Avanza una generación. */
export function paso(sim) {
  const { rng, mu } = sim;
  const amb = sim.ambiente ? ambientePorId(sim.ambiente) : null;
  const hijos = new Map();
  const nuevos = new Map();
  let fallidas = 0;
  let viables = 0;

  for (const [k, n] of sim.pop) {
    const g = genomaDe(k);
    const ajuste = amb && !amb.ayuda(g) ? CASTIGO : 1;
    const esperado = n * R * ajuste;
    let copias = Math.floor(esperado);
    if (rng() < esperado - copias) copias++;
    for (let c = 0; c < copias; c++) {
      const { genoma, rota, cambios } = copiar(g, mu, rng);
      if (rota) {
        fallidas++;
        continue;
      }
      viables++;
      const kh = cambios.length ? clave(genoma) : k;
      hijos.set(kh, (hijos.get(kh) || 0) + 1);
      if (kh !== k && !sim.nodos.has(kh) && !nuevos.has(kh)) nuevos.set(kh, k);
    }
  }

  /*
    Las células de la placa se acaban: entran K copias como máximo, y las copias
    que no funcionan también ocupan lugar (entran a células y las gastan).
  */
  let pop = hijos;
  const lugar = viables + fallidas > K ? Math.round((K * viables) / (viables + fallidas)) : viables;
  if (viables > lugar) {
    const lista = [];
    for (const [k, n] of hijos) for (let i = 0; i < n; i++) lista.push(k);
    for (let i = 0; i < lugar; i++) {
      const j = i + Math.floor(rng() * (lista.length - i));
      const t = lista[i];
      lista[i] = lista[j];
      lista[j] = t;
    }
    pop = new Map();
    for (let i = 0; i < lugar; i++) pop.set(lista[i], (pop.get(lista[i]) || 0) + 1);
  }

  sim.gen += 1;
  sim.pop = pop;
  sim.fallidas = fallidas;
  sim.viables = viables;
  sim.total = Math.min(viables, lugar);
  sim.ultimos = [];
  for (const [k, padre] of nuevos) {
    if (!pop.has(k)) continue; // apareció pero no llegó a quedarse
    sim.nodos.set(k, { k, padre, nace: sim.gen, hist: [], max: 0 });
    sim.ultimos.push({ k, padre });
  }
  for (const nodo of sim.nodos.values()) {
    const n = pop.get(nodo.k) || 0;
    if (nodo.hist.length || n) {
      // la historia arranca en la generación en que nace
      while (nodo.nace + nodo.hist.length < sim.gen) nodo.hist.push(0);
      nodo.hist.push(n);
      if (n > nodo.max) nodo.max = n;
      // pasa a "contar" como variante cuando llega a ser una parte visible de la placa
      if (nodo.cuenta == null && n >= (sim.total < 60 ? 2 : 3) && n >= UMBRAL_VARIANTE * sim.total) nodo.cuenta = sim.gen;
    }
  }
  if (sim.genAmbiente != null) sim.minDesdeAmbiente = Math.min(sim.minDesdeAmbiente, sim.total);
  sim.historia.push({ total: sim.total, fallidas, viables });
  return sim;
}

/* Vuelve a armar una corrida guardada (misma semilla → mismo resultado). */
export function reconstruir({ semilla, fidelidad, gen = 0, ambiente = null, genAmbiente = null }) {
  const sim = crearSim({ semilla, fidelidad });
  while (sim.gen < gen && sim.total > 0) {
    if (ambiente && genAmbiente === sim.gen) cambiarAmbiente(sim, ambiente);
    paso(sim);
  }
  if (ambiente && sim.ambiente == null && genAmbiente != null && genAmbiente <= sim.gen) cambiarAmbiente(sim, ambiente);
  return sim;
}

/* Variantes que "cuentan" (llegaron a ser el 5% de la placa), sin contar la original. */
export function variantes(sim, hastaGen = Infinity) {
  let n = 0;
  for (const nodo of sim.nodos.values()) if (nodo.padre != null && nodo.cuenta != null && nodo.cuenta <= hastaGen) n++;
  return n;
}

/* Cuántos virus vivos tienen el rasgo que ayuda en un ambiente. */
export function conRasgo(sim, ambienteId) {
  const amb = ambientePorId(ambienteId);
  let n = 0;
  for (const [k, c] of sim.pop) if (amb.ayuda(genomaDe(k))) n += c;
  return n;
}

/* Qué pasó en la corrida (para comparar con la hipótesis y para la maestra). */
export function resultado(sim) {
  if (sim.total === 0 && sim.genAmbiente == null) return 'catastrofe';
  if (sim.total === 0) return 'apagada';
  if (sim.genAmbiente == null) return 'sin-ambiente';
  if (sim.minDesdeAmbiente < K * 0.25) return 'casi';
  return 'resistio';
}

export const RESULTADOS = {
  catastrofe: { corto: 'se apagó por errores', largo: 'La población se apagó: casi ninguna copia funcionaba.' },
  apagada: { corto: 'se apagó con el ambiente', largo: 'Cuando cambió el ambiente, no había variantes preparadas y la población se apagó.' },
  casi: { corto: 'casi desaparece', largo: 'Casi desaparece, pero unos pocos virus distintos la salvaron.' },
  resistio: { corto: 'resistió', largo: 'Resistió el cambio: había variantes que ya servían para el nuevo ambiente.' },
  'sin-ambiente': { corto: 'sin cambio de ambiente', largo: 'Todavía no cambiaste el ambiente.' },
};

/* Lo que pasó ANTES del cambio de ambiente, para comparar con la hipótesis. */
export function queHubo(sim) {
  const hasta = sim.genAmbiente ?? sim.gen;
  if (sim.total === 0 && sim.genAmbiente == null) return 'apagar';
  return variantes(sim, hasta) >= 3 ? 'variantes' : 'iguales';
}

export const PASO = {
  variantes: 'Aparecieron muchas variantes distintas',
  iguales: 'Casi todos siguieron iguales',
  apagar: 'La población se apagó',
};

export const HIPOTESIS = [
  { id: 'variantes', texto: 'Van a aparecer muchas variantes distintas' },
  { id: 'iguales', texto: 'Casi todos van a seguir iguales' },
  { id: 'apagar', texto: 'La población se va a apagar' },
];
