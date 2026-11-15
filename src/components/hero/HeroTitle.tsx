import Link from 'next/link';

/*
  Título y subtítulo, como en la referencia 1.
  «Comenzá a experimentar» es el enlace para entrar (lleva a "¿Quién explora
  hoy?"): se ve como texto, sin subrayado. Con el teclado se ve el recuadro
  de foco y la lupa se levanta.
  data-hero-evitar: las células no se acercan a estos textos.
*/
export default function HeroTitle({ entrarA }: { entrarA: string }) {
  return (
    <div className="hero-titulo">
      <h1 className="hero-titulo__principal" data-hero-evitar="texto">
        La Ciencia sin Límites
      </h1>
      <Link className="hero-titulo__entrar" href={entrarA} data-entrar data-hero-evitar>
        Comenzá a experimentar
      </Link>
    </div>
  );
}
