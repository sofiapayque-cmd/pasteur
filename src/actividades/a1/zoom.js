/*
  ZOOM REALISTA de A1: del paisaje al microscopio en tres niveles.
  Cada ambiente tiene lo que se ve a simple vista, con lupa y con microscopio.
  - puntos: cosas que se pueden tocar (x, y en % del visor) con un dato breve.
    El dibujo de cada nivel (piezas/Niveles.jsx) usa estas mismas posiciones.
  VALIDAR con el Laboratorio de Genómica Microbiana: qué se ve en cada nivel y cada dato.
*/

export const NIVELES = [
  { id: 'ojo', nombre: 'A simple vista', escala: '10 cm', icono: 'ojo' },
  { id: 'lupa', nombre: 'Con lupa', escala: '1 mm', icono: 'lupa' },
  { id: 'micro', nombre: 'Con microscopio', escala: '10 µm', icono: 'micro' },
];

export const ZOOM = {
  'antartida-suelo': {
    ojo: {
      frase: 'Piedras, un poco de nieve y manchas de colores sobre las rocas.',
      puntos: [
        { id: 'liquen', x: 30, y: 34, nombre: 'Liquen', dato: 'Parece una mancha, pero está vivo: es un hongo y un alga viviendo juntos.' },
        { id: 'musgo', x: 68, y: 62, nombre: 'Musgo', dato: 'En la Antártida casi no hay plantas. Los musgos y los líquenes son de lo poco que crece.' },
        { id: 'nieve', x: 74, y: 24, nombre: 'Nieve', dato: 'Gran parte del año el suelo está helado y tapado de nieve.' },
      ],
    },
    lupa: {
      frase: 'Granitos de roca y… ¡bichitos que se mueven!',
      puntos: [
        // VALIDAR: tardígrados y colémbolos viven en suelos y musgos antárticos.
        { id: 'tardigrado', x: 36, y: 40, nombre: 'Tardígrado', dato: 'Un "osito de agua". Mide menos de 1 milímetro y aguanta un frío tremendo.' },
        { id: 'colembolo', x: 66, y: 66, nombre: 'Colémbolo', dato: 'Un bichito de 1 o 2 milímetros que salta. Vive en el suelo antártico.' },
        { id: 'grano', x: 70, y: 28, nombre: 'Grano de roca', dato: 'La tierra antártica es casi toda roca rota en pedacitos.' },
      ],
    },
    micro: {
      frase: 'Ahora sí: miles de seres de una sola célula. Hilos verdes, bolitas y bastoncitos.',
      puntos: [
        { id: 'ciano', x: 34, y: 36, nombre: 'Hilos verdes', dato: 'Son cianobacterias: hacen fotosíntesis como las plantas.' },
        { id: 'bacterias', x: 64, y: 60, nombre: 'Bastoncitos', dato: 'Bacterias. Hay muchísimas, incluso con este frío.' },
      ],
    },
  },
  'antartida-pinguino': {
    ojo: {
      frase: 'Al lado del nido: piedritas, una pluma y caca… ¡rosada!',
      puntos: [
        { id: 'caca', x: 46, y: 50, nombre: 'Caca rosada', dato: 'Es rosada porque el pingüino come krill, un camarón chiquito de color rosado.' },
        { id: 'piedras', x: 24, y: 70, nombre: 'Piedritas', dato: 'Algunos pingüinos arman su nido con piedritas.' },
        { id: 'pluma', x: 72, y: 30, nombre: 'Plumón', dato: 'Las plumas cortitas y apretadas lo protegen del frío.' },
      ],
    },
    lupa: {
      frase: 'Pedacitos de lo que comió el pingüino.',
      puntos: [
        { id: 'krill', x: 38, y: 38, nombre: 'Cáscara de krill', dato: 'El krill tiene una cáscara dura. Algunos pedacitos salen enteros.' },
        { id: 'grano', x: 70, y: 64, nombre: 'Grano de roca', dato: 'Se pega a la caca cuando cae al suelo.' },
      ],
    },
    micro: {
      frase: 'Está llena de bacterias. Vienen de adentro de la panza del pingüino.',
      puntos: [
        { id: 'bacterias', x: 50, y: 44, nombre: 'Bacterias', dato: 'En la panza de cada animal viven bacterias. Las del pingüino son distintas a las de la vaca.' },
      ],
    },
  },
  'campo-suelo': {
    ojo: {
      frase: 'Tierra oscura, raíces de pasto y una lombriz.',
      puntos: [
        { id: 'lombriz', x: 62, y: 66, nombre: 'Lombriz', dato: 'Las lombrices mezclan la tierra y le hacen túneles para que entre aire.' },
        { id: 'raices', x: 30, y: 30, nombre: 'Raíces', dato: 'Alrededor de las raíces viven muchísimas bacterias. Algunas ayudan a la planta.' },
        { id: 'hoja', x: 76, y: 28, nombre: 'Hoja seca', dato: 'Hongos y bacterias la van deshaciendo hasta que se vuelve tierra.' },
      ],
    },
    lupa: {
      frase: 'Grumos de tierra, hilos blancos y bichitos.',
      puntos: [
        { id: 'hifas', x: 34, y: 36, nombre: 'Hilos blancos', dato: 'Son de hongos. Crecen como una red entre la tierra.' },
        { id: 'acaro', x: 66, y: 62, nombre: 'Ácaro', dato: 'Un pariente chiquito de las arañas. Hay millones en el suelo.' },
        { id: 'nematodo', x: 72, y: 30, nombre: 'Gusanito', dato: 'Un nematodo: un gusano de menos de 1 milímetro.' },
      ],
    },
    micro: {
      frase: 'Tubos de hongos, granos y bacterias por todos lados.',
      puntos: [
        { id: 'hifa', x: 32, y: 40, nombre: 'Tubo de hongo', dato: 'Es una hifa. Con el microscopio se ve que es un tubo largo.' },
        { id: 'bacterias', x: 64, y: 58, nombre: 'Bacterias', dato: 'En una cucharita de tierra hay millones y millones de bacterias.' },
      ],
    },
  },
  'campo-vaca': {
    ojo: {
      frase: 'Bosta seca por arriba, con pasto mezclado.',
      puntos: [
        { id: 'bosta', x: 48, y: 50, nombre: 'Bosta', dato: 'Es lo que queda del pasto después de que la vaca lo digiere.' },
        { id: 'pasto', x: 24, y: 28, nombre: 'Pasto', dato: 'La vaca come pasto todo el día.' },
      ],
    },
    lupa: {
      frase: 'Fibras de pasto que la vaca no llegó a digerir.',
      puntos: [
        { id: 'fibras', x: 40, y: 40, nombre: 'Fibras', dato: 'El pasto es duro. Algunas fibras salen casi enteras.' },
        { id: 'semilla', x: 68, y: 64, nombre: 'Semilla', dato: 'Algunas semillas pasan por la panza y después pueden germinar.' },
      ],
    },
    micro: {
      frase: 'Restos de plantas y una multitud de bacterias.',
      puntos: [
        { id: 'resto', x: 34, y: 40, nombre: 'Resto de pasto', dato: 'Se ven las paredes de las células de la planta, como cuadraditos.' },
        // VALIDAR: microbios del rumen ayudan a digerir la celulosa del pasto.
        { id: 'bacterias', x: 64, y: 62, nombre: 'Bacterias', dato: 'En la panza de la vaca viven microbios que la ayudan a digerir el pasto.' },
      ],
    },
  },
};

export const zoomDe = (ambienteId) => ZOOM[ambienteId] || ZOOM['antartida-suelo'];
