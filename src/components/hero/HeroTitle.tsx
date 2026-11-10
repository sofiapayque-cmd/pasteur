import Link from 'next/link';

/*
  Título y subtítulo, como en la referencia 1.
  «Comenzá a experimentar» es el enlace para entrar (lleva a "¿Quién explora
  hoy?"): se ve igual que en la referencia y se subraya al pasar el mouse o
  con el teclado.
*/
export default function HeroTitle({ entrarA }: { entrarA: string }) {
  return (
    <div className="hero-titulo">
      <h1 className="hero-titulo__principal">La Ciencia sin Límites</h1>
      <Link className="hero-titulo__entrar" href={entrarA}>
        Comenzá a experimentar
      </Link>
    </div>
  );
}
