/*
  Contenido de A3 · Bioimagenología (solo textos y datos chicos: lo usa también la maestra).
  Ciencia general bien establecida. Lo que hay que confirmar con el laboratorio va con VALIDAR.

  Cada muestra tiene tres canales de fluorescencia (azul, verde, rojo) y una luz blanca (campo claro).
  Cada misión es un "caso": una pregunta y pistas, NUNCA la ubicación de lo que hay que encontrar.
  - objetivo:    etiquetas de las estructuras que cuentan como acierto (ver motor.js)
  - aumentoMin:  con menos aumento "no se distingue"
  - luz:         luces que tienen que estar prendidas en la foto para confirmarlo (alguna de la lista)
  - distractores: lo que dice Moli si el niño señala otra cosa (por etiqueta)
*/

// VALIDAR: qué tinte corresponde a cada canal en cada muestra (hoy: los clásicos de cualquier laboratorio)
export const MUESTRAS = [
  {
    id: 'celulas',
    nombre: 'Células en cultivo',
    detalle: 'Células humanas que crecen pegadas al fondo de una placa, teñidas con tres colores.',
    codigo: 'CEL·01',
    color: '#7272EE',
    // VALIDAR: tipo celular (hoy: células de la piel, fibroblastos)
    canales: {
      w: 'Campo claro',
      b: 'ADN',
      g: 'Citoesqueleto',
      r: 'Mitocondrias',
    },
    misiones: [
      {
        id: 'mitosis',
        titulo: 'Una célula se está dividiendo',
        pregunta: 'En esta placa hay una célula partiéndose en dos. ¿La encontrás?',
        pistas: [
          'Antes de dividirse, la célula se pone redonda y se levanta un poco: buscala en un plano más alto.',
          'Su ADN no está redondo como en las demás: se ordena en una fila en el medio.',
          'El ADN brilla con la luz azul. Con 40x se ve mejor.',
        ],
        objetivo: ['mitosis'],
        aumentoMin: 10,
        luz: ['b'],
        sinLuz: '¡Esa célula redonda es sospechosa! Para confirmarlo, prendé la luz azul y mirá su ADN.',
        distractores: {
          nucleo: 'Ese ADN está redondo: esa célula está descansando. Buscá uno ordenado en fila.',
          mitocondria: 'Eso que brilla son mitocondrias, no ADN.',
          fibra: 'Esos son hilos de sostén. Lo que buscás se ve en el ADN.',
          celula: 'Ahí hay una célula, pero no se está dividiendo: es chata, no redonda.',
        },
        nombre: 'Célula en mitosis',
        explicacion: 'Antes de dividirse, la célula copia su ADN y lo ordena en el medio. Después lo reparte en dos células hijas iguales.',
      },
      {
        id: 'energia',
        titulo: 'La fábrica de energía',
        pregunta: 'Cada célula tiene muchas fabriquitas de energía, las mitocondrias. ¿Dónde están?',
        pistas: [
          'Son chiquitas y alargadas, como fideos cortitos, alrededor del núcleo.',
          'Hay un tinte que las hace brillar de rojo.',
          'Son tan chicas que necesitás 40x o más.',
        ],
        objetivo: ['mitocondria'],
        aumentoMin: 40,
        luz: ['r'],
        sinLuz: 'Puede que estén ahí, pero en esta foto no se ven. Prendé la luz que las hace brillar.',
        distractores: {
          nucleo: 'Eso es el núcleo, donde está el ADN. Las mitocondrias están alrededor.',
          fibra: 'Esos hilos largos son el citoesqueleto. Buscá algo más cortito.',
          celula: 'Estás en una célula, pero tocá justo sobre una mitocondria.',
          mitosis: 'Esa célula se está dividiendo. Lo que buscás está en todas las células.',
        },
        nombre: 'Mitocondrias',
        explicacion: 'Las mitocondrias usan el azúcar y el oxígeno para fabricar la energía que la célula necesita para vivir.',
      },
      {
        id: 'esqueleto',
        titulo: 'Los hilos que sostienen',
        pregunta: 'Las células tienen hilos por dentro que las sostienen, como los palos de una carpa. Encontralos.',
        pistas: [
          'Están pegados al piso de la placa: buscalos en el plano más bajo.',
          'Un tinte los pinta de verde.',
          'Son largos y finitos: probá con 10x o 40x.',
        ],
        objetivo: ['fibra'],
        aumentoMin: 10,
        luz: ['g'],
        sinLuz: 'Con esta luz no se ven los hilos. Probá con la luz que pinta el citoesqueleto.',
        distractores: {
          nucleo: 'Eso es el núcleo. Los hilos cruzan toda la célula de punta a punta.',
          mitocondria: 'Esos son cortitos: son mitocondrias. Los hilos son largos.',
          celula: 'Estás en una célula. Ahora tocá justo sobre uno de sus hilos.',
          mitosis: 'Esa célula se está dividiendo y se puso redonda. Buscá una chata, bien estirada.',
        },
        nombre: 'Citoesqueleto (fibras de actina)',
        explicacion: 'Son hilos de una proteína llamada actina. Le dan forma a la célula y la ayudan a moverse y a agarrarse al piso.',
      },
    ],
  },
  {
    id: 'hoja',
    nombre: 'Un trocito de hoja',
    detalle: 'Un pedacito finito de una hoja de planta, con sus capas de células.',
    codigo: 'HOJ·02',
    color: '#8ED5C3',
    // VALIDAR: especie de planta y tinte de paredes (hoy: genérico "colorante de paredes")
    canales: {
      w: 'Campo claro',
      b: 'ADN',
      g: 'Paredes',
      r: 'Clorofila',
    },
    misiones: [
      {
        id: 'estoma',
        titulo: 'Las puertitas de la hoja',
        pregunta: 'Las hojas tienen puertitas para que entre y salga el aire. ¿Encontrás una?',
        pistas: [
          'Están en la piel de la hoja, en el plano más bajo.',
          'Son dos células con forma de poroto, una frente a la otra, con una rendija en el medio.',
          'Con 10x ya se distinguen.',
        ],
        objetivo: ['estoma'],
        aumentoMin: 10,
        luz: ['w', 'b', 'g', 'r'],
        sinLuz: '',
        distractores: {
          piel: 'Esa es una célula de la piel de la hoja: parece una pieza de rompecabezas. Buscá dos con forma de poroto.',
          'nucleo-piel': 'Eso es el núcleo de una célula de la piel. Buscá dos células con forma de poroto.',
          cloroplasto: 'Eso es un cloroplasto, de las células de adentro. Las puertitas están en la piel.',
          'celula-hoja': 'Esa es una célula de adentro de la hoja. Las puertitas están en la piel, más abajo.',
          'nucleo-vegetal': 'Ese es un núcleo de adentro de la hoja. Las puertitas están en la piel.',
        },
        nombre: 'Estoma',
        explicacion: 'Por los estomas entra el dióxido de carbono que la planta usa para fabricar su alimento, y salen oxígeno y vapor de agua.',
      },
      {
        id: 'cloroplasto',
        titulo: 'Fábricas de alimento',
        pregunta: 'La planta fabrica su alimento con la luz del sol, adentro de unas bolitas. ¿Las encontrás?',
        pistas: [
          'Están en las células de adentro de la hoja: probá los planos del medio.',
          'Con luz blanca son verdes. Con luz de fluorescencia brillan rojo solitas, sin tinte.',
          'Hay muchas en cada célula, pegadas al borde.',
        ],
        objetivo: ['cloroplasto'],
        aumentoMin: 10,
        luz: ['w', 'r'],
        sinLuz: 'Con esta luz no se ven. Probá con luz blanca o con la que muestra la clorofila.',
        distractores: {
          'celula-hoja': 'Estás en una célula de adentro. Ahora tocá justo sobre una de sus bolitas.',
          'nucleo-vegetal': 'Ese es el núcleo, donde está el ADN. Buscá las bolitas verdes.',
          piel: 'Esa es la piel de la hoja: casi no tiene bolitas verdes. Buscá más adentro.',
          'nucleo-piel': 'Ese es el núcleo de una célula de la piel. Buscá las bolitas verdes, más adentro.',
          estoma: '¡Buen ojo, esa es una puertita de la hoja! Pero lo que buscás está en las células de adentro.',
        },
        nombre: 'Cloroplastos',
        explicacion: 'Tienen clorofila, que atrapa la luz. Con esa energía la planta fabrica azúcar a partir de agua y aire. La clorofila brilla rojo sola: se llama autofluorescencia.',
      },
      {
        id: 'nucleo-vegetal',
        titulo: '¿Dónde guarda el ADN?',
        pregunta: 'Las células de la hoja también tienen ADN, guardado en el núcleo. ¿Dónde está?',
        pistas: [
          'Hay un tinte que pinta el ADN de azul.',
          'No está en el centro: una bolsa de agua gigante, la vacuola, lo empuja contra el borde.',
          'Buscalo en las células del medio de la hoja, con 10x o más.',
        ],
        objetivo: ['nucleo-vegetal', 'nucleo-piel'],
        aumentoMin: 10,
        luz: ['b'],
        sinLuz: 'Puede ser, pero en esta foto no se ve el ADN. Prendé la luz azul para confirmarlo.',
        distractores: {
          cloroplasto: 'Eso es un cloroplasto. El ADN se ve con otra luz.',
          'celula-hoja': 'Estás en una célula. Ahora buscá su núcleo: está contra el borde.',
          piel: 'Estás en una célula de la piel. Buscá su núcleo con la luz azul.',
          estoma: 'Esa es una puertita de la hoja. Buscá el núcleo de una célula.',
        },
        nombre: 'Núcleo de una célula vegetal',
        explicacion: 'En el núcleo está el ADN, las instrucciones de la célula. En las plantas, la vacuola llena de agua ocupa el centro y empuja al núcleo hacia un costado.',
      },
    ],
  },
  {
    id: 'bacterias',
    nombre: 'Bacterias del yogur',
    detalle: 'Una gotita de yogur sobre un vidrio. Adentro viven bacterias que no ves a simple vista.',
    codigo: 'BAC·03',
    color: '#F4A6BD',
    // VALIDAR: tintes de vivas/muertas (hoy: verde para todas, rojo solo si la cubierta está rota)
    canales: {
      w: 'Campo claro',
      b: 'ADN',
      g: 'Todas',
      r: 'Cubierta rota',
    },
    misiones: [
      {
        id: 'cadena',
        titulo: 'Bacterias en fila',
        pregunta: 'En el yogur viven dos tipos de bacterias. Unas son redonditas y van en fila. ¿Las encontrás?',
        pistas: [
          'Primero encontrá el plano donde está la muestra: arriba y abajo solo hay vidrio.',
          'Las bacterias son tan chicas que necesitás 40x o 100x.',
          'Unas son bastones largos. Las que buscás son bolitas una atrás de otra, como un collar.',
        ],
        objetivo: ['cadena'],
        aumentoMin: 40,
        luz: ['w', 'b', 'g', 'r'],
        sinLuz: '',
        distractores: {
          bacilo: 'Ese es un bastón: es la otra bacteria del yogur. Buscá bolitas en fila.',
          division: 'Ese es un bastón partiéndose en dos. Buscá bolitas en fila, como un collar.',
          muerta: 'Esa tiene la cubierta rota. Buscá bolitas en fila.',
          pelusa: 'Eso es una pelusa en el vidrio de arriba: no está viva.',
        },
        nombre: 'Cocos en cadena',
        explicacion: 'Son bacterias redondas (cocos) que al dividirse quedan pegadas y forman cadenas. Junto con los bastones (bacilos) transforman la leche en yogur.',
      },
      {
        id: 'division',
        titulo: 'Una se parte en dos',
        pregunta: 'Las bacterias se multiplican partiéndose por la mitad. ¿Encontrás una en el momento justo?',
        pistas: [
          'Es un bastón con una cinturita en el medio, como un 8 estirado.',
          'Es un detalle muy chiquito: necesitás el aumento más grande, 100x.',
          'A 100x, los científicos ponen una gota de aceite entre el vidrio y la lente.',
        ],
        objetivo: ['division'],
        aumentoMin: 100,
        luz: ['w', 'b', 'g', 'r'],
        sinLuz: '',
        distractores: {
          bacilo: 'Ese bastón está entero. Buscá uno con una cinturita en el medio.',
          cadena: 'Esas bolitas en fila son otra bacteria. Buscá un bastón con cinturita.',
          muerta: 'Esa tiene la cubierta rota. Buscá un bastón con cinturita.',
          pelusa: 'Eso es una pelusa en el vidrio de arriba: no está viva.',
        },
        nombre: 'Bacteria dividiéndose',
        explicacion: 'La bacteria copia su ADN, se estira y se estrangula en el medio hasta separarse en dos bacterias hijas. Se llama fisión binaria.',
      },
      {
        id: 'muertas',
        titulo: '¿Vivas o no?',
        pregunta: 'Algunas bacterias de la gotita ya no están vivas. ¿Podés encontrar una?',
        pistas: [
          'Hay un tinte rojo que solo puede entrar cuando la cubierta de la bacteria está rota.',
          'Las vivas brillan verde con el otro tinte.',
          'Con 40x ya se ve el color.',
        ],
        objetivo: ['muerta'],
        aumentoMin: 40,
        luz: ['r'],
        sinLuz: 'Con esta luz no se sabe si está viva. Prendé el canal que muestra la cubierta rota.',
        distractores: {
          bacilo: 'Esa brilla verde: está viva. Buscá una que brille rojo.',
          cadena: 'Esas brillan verde: están vivas. Buscá una que brille rojo.',
          division: 'Esa se está dividiendo: ¡está bien viva! Buscá una que brille rojo.',
          pelusa: 'Eso es una pelusa en el vidrio de arriba: no es una bacteria.',
        },
        nombre: 'Bacteria con la cubierta rota',
        explicacion: 'La cubierta (membrana) de una bacteria viva no deja pasar el tinte rojo. Si entra, es porque se rompió y la bacteria murió.',
      },
    ],
  },
];

export const MUESTRA = Object.fromEntries(MUESTRAS.map((m) => [m.id, m]));

export function buscarMision(muestraId, misionId) {
  return MUESTRA[muestraId]?.misiones.find((x) => x.id === misionId) || null;
}

// Nombres de las luces (para metadatos de las fotos)
export const LUCES = [
  { id: 'w', nombre: 'Luz blanca', color: '#F6F2E4' },
  { id: 'b', nombre: 'Azul', color: '#5C8CFF' },
  { id: 'g', nombre: 'Verde', color: '#4FE38A' },
  { id: 'r', nombre: 'Rojo', color: '#FF5A4B' },
];

// Colores de los anillos de los objetivos (código de colores real de los fabricantes)
export const OBJETIVOS = [
  { a: 4, anillo: '#E0483C' },
  { a: 10, anillo: '#F2C230' },
  { a: 40, anillo: '#6FC3EA' },
  { a: 100, anillo: '#FFFFFF' },
];

export const ERRORES_FOTO = {
  borrosa: {
    titulo: 'Esta salió borrosa',
    texto: 'La lente no estaba enfocada en ese plano. Girá el tornillo de enfoque hasta que los bordes se vean finitos y sacala de nuevo.',
  },
  lechosa: {
    titulo: 'Salió lechosa',
    texto: 'A 100x la luz se desvía al pasar del vidrio al aire. Por eso se pone una gota de aceite de inmersión entre la lente y el vidrio.',
  },
  oscura: {
    titulo: 'Salió negra',
    texto: 'No había ninguna luz prendida. Prendé la luz blanca o un color de fluorescencia.',
  },
  apagada: {
    titulo: 'Se apagó la fluorescencia',
    texto: 'Se llama fotoblanqueo: la luz fuerte va gastando el tinte. Mové la muestra a una zona que no hayas iluminado.',
  },
  vacia: {
    titulo: 'Acá solo hay vidrio',
    texto: 'En este plano o en este lugar no hay muestra. Probá otra profundidad o mové la platina.',
  },
};
