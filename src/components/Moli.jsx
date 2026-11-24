/* eslint-disable @next/next/no-img-element -- fotos ya optimizadas (WebP de 640 px, ~17 KB) que se animan con CSS; next/image no suma nada acá */
import './Moli.css';

/*
  Moli: la molécula de agua que guía la plataforma.
  Un oxígeno grande (el cuerpo, con la cara) y dos hidrógenos chicos que
  hacen de manos, a 104,5° (el ángulo real de la molécula).

  Desde el 14/11 (pedido de Sofia: "Moli debería ser la de 3D que hicimos
  siempre que aparece") es en todas las pantallas la Moli 3D del modelo
  public/models/moli.glb, la misma de "elegir rol". Para que no pese en las
  Ceibal no se dibuja en 3D en cada pantalla: son fotos de ese modelo, con
  la misma luz, una por ánimo (public/illustrations/moli/moli-<ánimo>.webp,
  todas con el mismo encuadre). Encima van los detalles de cada ánimo
  (estrellitas, el signo de pregunta, las burbujas de pensar, las ondas de
  escuchar) y se mueve con las animaciones de siempre (Moli.css).

  Props:
  - animo:  'feliz' | 'escucha' | 'piensa' | 'eureka' | 'duda' | 'alegria'
  - fase:   'liquido' | 'hielo' | 'vapor'
  - tamano: ancho en px (el alto es el 90%)
  - estilo y patas: ya no cambian nada (siempre es la Moli 3D, con sus
    piernitas); se aceptan para no tener que tocar cada pantalla.
*/

const ANIMOS = ['feliz', 'escucha', 'piensa', 'eureka', 'duda', 'alegria'];

const ANIMACION = {
  feliz: 'moli--respira',
  escucha: 'moli--inclina',
  piensa: 'moli--respira',
  eureka: 'moli--salta',
  duda: 'moli--duda',
  alegria: 'moli--rebota',
};

const DESCRIPCION = {
  feliz: 'saluda',
  escucha: 'escucha',
  piensa: 'piensa',
  eureka: 'descubre algo',
  duda: 'duda',
  alegria: 'festeja',
};

/**
 * @param {{ animo?: string, fase?: string, tamano?: number, estilo?: string, patas?: boolean }} props
 */
export default function Moli({ animo = 'feliz', fase = 'liquido', tamano = 240 }) {
  const a = ANIMOS.includes(animo) ? animo : 'feliz';
  const enLiquido = fase === 'liquido';

  let animacion = ANIMACION[a];
  if (fase === 'hielo') animacion = 'moli--tiembla';
  if (fase === 'vapor') animacion = 'moli--flota';

  return (
    <span
      className={`moli moli--${fase}`}
      style={{ width: tamano, height: Math.round(tamano * 0.9) }}
      role="img"
      aria-label={`Moli, la molécula de agua, ${DESCRIPCION[a]}`}
    >
      <span className="moli__sombra" aria-hidden="true" />
      <span className={`moli__cuerpo ${animacion}`} aria-hidden="true">
        <img className="moli__foto" src={`/illustrations/moli/moli-${a}.webp`} alt="" width={640} height={575} draggable={false} decoding="async" />
      </span>

      {/* Los detalles de cada ánimo, con el mismo dibujo de siempre */}
      <svg className="moli__detalles" viewBox="0 50 200 180" aria-hidden="true">
        {(a === 'eureka' || a === 'alegria') && (
          <g stroke="#F2B13B" strokeWidth="3" strokeLinecap="round">
            <path d="M42 63 L42 77 M35 70 L49 70" />
            <path d="M160 56 L160 68 M154 62 L166 62" />
            <path d="M176 88 L176 96 M172 92 L180 92" />
          </g>
        )}
        {a === 'duda' && enLiquido && (
          <text x="158" y="80" fill="#2F4A85" fontFamily="'Boldonse', sans-serif" fontSize="34" fontWeight="800">
            ?
          </text>
        )}
        {a === 'piensa' && enLiquido && (
          <g fill="#D4DCF7" stroke="#2F4A85" strokeWidth="1.5">
            <circle cx="148" cy="74" r="3" />
            <circle cx="159" cy="64" r="4.5" />
            <circle cx="173" cy="52" r="6" />
          </g>
        )}
        {a === 'escucha' && enLiquido && (
          <g stroke="#7272EE" strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M182 104 Q190 114 182 124" />
            <path d="M191 98 Q203 114 191 130" />
          </g>
        )}
        {fase === 'hielo' && (
          <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
            <path d="M68 96 L76 96 M72 92 L72 100" />
            <path d="M134 150 L140 150 M137 147 L137 153" />
            <path d="M140 92 L146 92 M143 89 L143 95" />
          </g>
        )}
        {fase === 'vapor' && (
          <g stroke="#B9C8F5" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M80 62 Q88 54 80 46 Q72 38 80 30" />
            <path d="M122 60 Q114 52 122 44 Q130 36 122 28" />
          </g>
        )}
      </svg>
    </span>
  );
}
