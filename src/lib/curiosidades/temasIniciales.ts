/*
  Temas iniciales para agrupar preguntas y curiosidades (propuesta del 14/11,
  armada a partir de las 100 preguntas de docs/PREGUNTAS-PARA-APROBAR.md).
  La admin los carga con un clic desde /equipo/curiosidades y después Sofia y
  Eugenia los ajustan (nombre, descripción, apagar o agregar). La descripción
  importa: con ella se calcula a qué tema se parece cada pregunta.
*/
export type TemaInicial = { slug: string; nombre: string; descripcion: string; actividad: 'a1' | 'a2' | 'a3' };

export const TEMAS_INICIALES: TemaInicial[] = [
  // A1 · Genómica microbiana
  { actividad: 'a1', slug: 'que-es-una-bacteria', nombre: 'Qué es una bacteria', descripcion: 'Qué son las bacterias y los microorganismos, si están vivos y qué tamaño tienen.' },
  { actividad: 'a1', slug: 'bacterias-del-suelo', nombre: 'Bacterias del suelo', descripcion: 'Qué hacen las bacterias de la tierra, cuántas hay y cómo ayudan a las plantas y a convertir las hojas en tierra.' },
  { actividad: 'a1', slug: 'el-suelo-del-campo', nombre: 'El suelo del campo', descripcion: 'Cómo cambian los microorganismos del suelo con los cultivos, las lombrices y el pastizal natural.' },
  { actividad: 'a1', slug: 'vida-en-la-antartida', nombre: 'Vida en la Antártida', descripcion: 'Bacterias y otros seres vivos que aguantan el frío, el hielo y el suelo antártico; sus colores y pigmentos.' },
  { actividad: 'a1', slug: 'lugares-extremos', nombre: 'Lugares extremos', descripcion: 'Microorganismos y animales chiquitos que viven en lugares muy fríos, muy calientes o muy secos, como los tardígrados.' },
  { actividad: 'a1', slug: 'bacterias-de-la-vaca', nombre: 'Las bacterias de la vaca', descripcion: 'Microbios de la panza de la vaca y cómo la ayudan a digerir el pasto.' },
  { actividad: 'a1', slug: 'pinguinos', nombre: 'Pingüinos y sus bacterias', descripcion: 'Bacterias de los pingüinos, su caca rosada y el krill que comen.' },
  { actividad: 'a1', slug: 'microbioma', nombre: 'El microbioma', descripcion: 'Bacterias que viven en nuestro cuerpo y en los animales: cuáles ayudan y cuáles enferman.' },
  { actividad: 'a1', slug: 'bacterias-y-hongos', nombre: 'Bacterias y hongos', descripcion: 'Diferencias entre bacterias y hongos, y los hongos que viven en el suelo.' },
  { actividad: 'a1', slug: 'cultivar-bacterias', nombre: 'Cultivar bacterias', descripcion: 'Placas de Petri y colonias: por qué no todas las bacterias crecen y cómo influye la temperatura.' },
  { actividad: 'a1', slug: 'como-se-multiplican', nombre: 'Cómo se multiplican las bacterias', descripcion: 'Cómo se dividen las bacterias y cuánto tardan en duplicarse.' },
  { actividad: 'a1', slug: 'antibioticos', nombre: 'Antibióticos', descripcion: 'Qué son los antibióticos, de dónde salen, cómo frenan a las bacterias y por qué no sirven contra los virus.' },
  { actividad: 'a1', slug: 'resistencia-a-antibioticos', nombre: 'Resistencia a los antibióticos', descripcion: 'Cómo algunas bacterias aguantan los antibióticos y se pasan genes entre ellas.' },
  { actividad: 'a1', slug: 'adn-de-bacterias', nombre: 'El ADN de las bacterias', descripcion: 'Genomas de bacterias y cómo se estudia el ADN de las que no crecen en el laboratorio.' },
  // A2 · Simulaciones biomoleculares
  { actividad: 'a2', slug: 'moleculas', nombre: 'Moléculas', descripcion: 'Qué es una molécula y de qué están hechos los seres vivos.' },
  { actividad: 'a2', slug: 'proteinas', nombre: 'Proteínas', descripcion: 'Qué son las proteínas y los aminoácidos y para qué sirven.' },
  { actividad: 'a2', slug: 'forma-de-las-proteinas', nombre: 'La forma de las proteínas', descripcion: 'Cómo se doblan las proteínas y por qué su forma importa.' },
  { actividad: 'a2', slug: 'enzimas', nombre: 'Enzimas', descripcion: 'Proteínas que aceleran reacciones, como la lisozima de las lágrimas.' },
  { actividad: 'a2', slug: 'calor-y-acidez', nombre: 'Calor y acidez', descripcion: 'Qué les pasa a las proteínas con el calor o el ácido, como la clara del huevo al cocinarla.' },
  { actividad: 'a2', slug: 'que-es-un-virus', nombre: 'Qué es un virus', descripcion: 'Si los virus están vivos, cómo entran a las células y cómo se copian.' },
  { actividad: 'a2', slug: 'dengue', nombre: 'Dengue', descripcion: 'El virus del dengue, su proteína E y cómo cambia de forma para entrar a la célula.' },
  { actividad: 'a2', slug: 'zika', nombre: 'Zika', descripcion: 'El virus del zika y en qué se parece al del dengue.' },
  { actividad: 'a2', slug: 'mosquitos', nombre: 'Mosquitos', descripcion: 'El mosquito Aedes aegypti y cómo lleva virus de una persona a otra.' },
  { actividad: 'a2', slug: 'defensas-del-cuerpo', nombre: 'Las defensas del cuerpo', descripcion: 'Anticuerpos y vacunas: cómo el cuerpo reconoce a un virus.' },
  { actividad: 'a2', slug: 'simular-moleculas', nombre: 'Simular moléculas en la computadora', descripcion: 'Cómo los científicos usan computadoras para ver y mover moléculas.' },
  { actividad: 'a2', slug: 'ver-lo-muy-chiquito', nombre: 'Conocer la forma de una proteína', descripcion: 'Cómo se descubre la forma de una proteína, aunque sea muchísimo más chica que una célula.' },
  // A3 · Bioimagenología
  { actividad: 'a3', slug: 'que-es-una-celula', nombre: 'Qué es una célula', descripcion: 'Las células: su tamaño, sus formas y cuántas tiene el cuerpo.' },
  { actividad: 'a3', slug: 'adentro-de-la-celula', nombre: 'Adentro de una célula', descripcion: 'Membrana, núcleo, mitocondrias y otras partes de la célula.' },
  { actividad: 'a3', slug: 'adn', nombre: 'ADN', descripcion: 'Qué es el ADN y dónde lo guarda la célula.' },
  { actividad: 'a3', slug: 'como-se-divide-una-celula', nombre: 'Cómo se divide una célula', descripcion: 'División celular, células madre y cuánto vive una célula.' },
  { actividad: 'a3', slug: 'celulas-que-se-mueven', nombre: 'Células que se mueven', descripcion: 'Actina, citoesqueleto y células que se desplazan, como los fibroblastos.' },
  { actividad: 'a3', slug: 'cultivar-celulas', nombre: 'Cultivar células', descripcion: 'Cómo se cultivan células en el laboratorio para estudiarlas.' },
  { actividad: 'a3', slug: 'celulas-de-las-plantas', nombre: 'Células de las plantas', descripcion: 'Pared celular, cloroplastos y estomas de las hojas.' },
  { actividad: 'a3', slug: 'bacterias-del-yogur', nombre: 'Bacterias del yogur', descripcion: 'Bacterias de los alimentos y cómo se ve en el microscopio si están vivas o muertas.' },
  { actividad: 'a3', slug: 'microscopios', nombre: 'Microscopios', descripcion: 'Cómo funcionan los microscopios: el aumento, el enfoque y la diferencia con una lupa.' },
  { actividad: 'a3', slug: 'microscopios-especiales', nombre: 'Microscopios especiales', descripcion: 'Microscopio electrónico, confocal y otros para ver lo muy chiquito.' },
  { actividad: 'a3', slug: 'colorear-y-medir-celulas', nombre: 'Colorear y medir células', descripcion: 'Por qué se tiñen las células para mirarlas y cómo se mide algo tan chiquito.' },
  { actividad: 'a3', slug: 'fluorescencia', nombre: 'Fluorescencia', descripcion: 'La proteína verde fluorescente, la clorofila que brilla roja, el fotoblanqueo y el microscopio de fluorescencia.' },
  { actividad: 'a3', slug: 'seres-vivos-que-brillan', nombre: 'Seres vivos que brillan', descripcion: 'Luciérnagas, medusas y otros seres vivos que hacen luz.' },
  { actividad: 'a3', slug: 'historia-del-microscopio', nombre: 'Historia del microscopio', descripcion: 'Quién vio las células por primera vez y cómo empezó la microscopía.' },
];
