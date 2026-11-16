/*
  Temas para agrupar preguntas y curiosidades. Desde el 15/11 son 6 temas
  grandes, dos por actividad (pedido de Sofia: "si son de bacterias, todas
  deberían estar en un tema"); antes eran 40 (migración 24 los junta).
  La admin los carga con un clic desde /equipo/curiosidades si la base está
  vacía. La descripción importa: con ella se calcula a qué tema se parece
  cada pregunta, por eso nombra todo lo que entra en el tema.
*/
export type TemaInicial = { slug: string; nombre: string; descripcion: string; actividad: 'a1' | 'a2' | 'a3' };

export const TEMAS_INICIALES: TemaInicial[] = [
  { actividad: 'a1', slug: 'bacterias', nombre: 'Bacterias', descripcion: 'Qué son las bacterias y los microorganismos, cómo viven, se multiplican y se cultivan en placas, su ADN y en qué se diferencian de los hongos. Dónde viven: en el suelo y el campo, en la Antártida y otros lugares extremos, en la panza de la vaca, en los pingüinos, en nuestro cuerpo (el microbioma) y en alimentos como el yogur.' },
  { actividad: 'a1', slug: 'antibioticos-y-resistencia', nombre: 'Antibióticos', descripcion: 'Qué son los antibióticos, de dónde salen (bacterias y hongos como el de la penicilina), cómo frenan a las bacterias, por qué no sirven contra los virus y cómo algunas bacterias se vuelven resistentes.' },
  { actividad: 'a2', slug: 'virus', nombre: 'Virus, dengue y zika', descripcion: 'Qué es un virus y si está vivo, cómo entra a una célula y se copia. El dengue y el zika, su proteína E, el mosquito Aedes aegypti que los lleva, y las defensas del cuerpo: anticuerpos y vacunas.' },
  { actividad: 'a2', slug: 'proteinas-y-moleculas', nombre: 'Proteínas y moléculas', descripcion: 'Qué son las moléculas, las proteínas y los aminoácidos, cómo se doblan y por qué su forma importa. Las enzimas, qué les pasa con el calor o el ácido, y cómo los científicos descubren su forma y las simulan en la computadora.' },
  { actividad: 'a3', slug: 'celulas', nombre: 'Células', descripcion: 'Qué es una célula, su tamaño y sus partes (membrana, núcleo, mitocondrias), dónde guarda el ADN, cómo se divide y se mueve, cómo se cultivan células en el laboratorio y cómo son las células de las plantas (pared, cloroplastos, estomas).' },
  { actividad: 'a3', slug: 'microscopios-y-luz', nombre: 'Microscopios y luz', descripcion: 'Cómo funcionan los microscopios y en qué se diferencian de una lupa, los microscopios especiales (electrónico, confocal, de fluorescencia), por qué se tiñen las células y cómo se miden, la historia del microscopio, la fluorescencia y los seres vivos que brillan, como luciérnagas y medusas.' },
];
