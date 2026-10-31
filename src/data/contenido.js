/*
  Contenido de la plataforma.
  Lo que está entre corchetes todavía hay que definirlo y validarlo
  con el Institut Pasteur.
*/

export const ACTIVIDADES = [
  { id: 'a1', numero: '01', nombre: 'Genómica Microbiana', bajada: 'Tomá muestras en la Antártida y en el campo, y descubrí qué crece en tu placa.', color: 'var(--cultivo)', fondo: 'var(--a1-fondo)', disponible: true,
    placa: 'radial-gradient(circle at 40% 40%, #F4A6BD 0 10%, #F2B13B 11% 34%, #F6E8CF 35% 100%)' },
  { id: 'a2', numero: '02', nombre: 'Simulaciones Biomoleculares', bajada: 'Girá una molécula de un virus y probá qué le pasa con el calor y la acidez.', color: 'var(--cilio)', fondo: 'var(--a2-fondo)', disponible: true,
    placa: 'radial-gradient(circle at 45% 45%, #2F4A85 0 12%, #8ED5C3 13% 45%, #E3F3EE 46% 100%)' },
  { id: 'a3', numero: '03', nombre: 'Bioimagenología', bajada: 'Manejá un microscopio de verdad: enfocá, cambiá el aumento y encendé luces de colores.', color: 'var(--filamento)', fondo: 'var(--a3-fondo)', disponible: true,
    placa: 'radial-gradient(circle at 50% 45%, #FBF9F1 0 10%, #9C9CF5 11% 44%, #EEEEFD 45% 100%)' },
  { id: 'a4', numero: '04', nombre: 'Evolución de Virus', bajada: 'Mirá cómo un virus se copia, se equivoca y forma un árbol de variantes.', color: 'var(--tincion)', fondo: 'var(--a4-fondo)', disponible: false, pausa: 'En pausa: la estamos rediseñando para que se entienda mejor.',
    placa: 'radial-gradient(circle at 55% 45%, #EF6F5E 0 14%, #F4A6BD 15% 46%, #FBE6EC 47% 100%)' },
];

// Apodos científicos: los chicos eligen uno, nunca escriben su nombre
export const APODOS = [
  'Coco curioso', 'Bacilo veloz', 'Hifa valiente', 'Espora tranquila', 'Colonia brillante',
  'Cilio inquieto', 'Flagelo rápido', 'Gota exploradora', 'Núcleo sabio', 'Lupa atenta',
  'Agar dorado', 'Célula saltarina', 'Microbio amable', 'Pipeta paciente', 'Cultivo curioso',
  'Moho artista', 'Muestra secreta', 'Placa feliz', 'Membrana elástica', 'Vacuola soñadora',
  'Probeta audaz', 'Espiral viajera', 'Levadura alegre', 'Molécula risueña',
];

export const COLORES_ALUMNO = [
  { id: 'coral', nombre: 'Coral', valor: '#EF6F5E' },
  { id: 'rosa', nombre: 'Rosa', valor: '#F4A6BD' },
  { id: 'amarillo', nombre: 'Amarillo', valor: '#F2B13B' },
  { id: 'menta', nombre: 'Menta', valor: '#8ED5C3' },
  { id: 'azul', nombre: 'Azul', valor: '#93AEEB' },
];

export const TEXTO_INICIO =
  'Muchos científicos imaginan el infinito como un círculo: sin principio ni final. ¿Y si la ciencia también fuera así? Un mundo de descubrimientos que nunca termina. ¡Comenzá a explorar la infinidad de la ciencia!';
