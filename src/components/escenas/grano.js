/*
  Grano de papel para las escenas: una textura de ruido que se dibuja UNA vez
  (imagen de fondo) en vez de un filtro SVG que se recalcula en cada cuadro.
*/
const ruido = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .13  0 0 0 0 .14  0 0 0 0 .16  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

export const GRANO = {
  backgroundImage: `url("data:image/svg+xml;utf8,${ruido.replace(/#/g, '%23').replace(/"/g, "'")}")`,
  backgroundSize: '220px 220px',
};
