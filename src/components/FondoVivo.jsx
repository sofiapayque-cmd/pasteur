import './FondoVivo.css';

/*
  Fondo vivo: microorganismos que flotan despacio detrás de la pantalla.
  Solo usa transform y opacity (liviano para las Ceibal) y se queda quieto
  si el niño tiene activado "reducir movimiento".

  Props:
  - colores: lista de colores (por defecto, la paleta de la marca)
  - cantidad: cuántos organismos (por defecto 12)
  - semilla: cambia la distribución (cada pantalla puede tener la suya)
*/
const PALETA = ['#93AEEB', '#F4A6BD', '#F2B13B', '#8ED5C3', '#EF6F5E', '#D4DCF7'];

function azar(semilla) {
  let s = semilla;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Redondeo a milésimas: Math.cos/Math.sin pueden diferir en el último decimal entre
// el servidor (Node) y el navegador, y eso da error de hidratación. A esta escala no se ve.
const r3 = (v) => Math.round(v * 1000) / 1000;

function Organismo({ tipo, color }) {
  if (tipo === 'bacilo')
    return (
      <svg viewBox="-40 -20 80 40" aria-hidden="true">
        <rect x="-28" y="-11" width="56" height="22" rx="11" fill={color} />
        <path d="M28 0 q6 -5 12 0" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="-6" cy="0" r="4" fill="#2F4A85" opacity=".25" />
      </svg>
    );
  if (tipo === 'espiculado')
    return (
      <svg viewBox="-30 -30 60 60" aria-hidden="true">
        {Array.from({ length: 10 }, (_, k) => {
          const a = (k / 10) * Math.PI * 2;
          return <line key={k} x1={r3(Math.cos(a) * 14)} y1={r3(Math.sin(a) * 14)} x2={r3(Math.cos(a) * 24)} y2={r3(Math.sin(a) * 24)} stroke={color} strokeWidth="2.5" strokeLinecap="round" />;
        })}
        <circle r="15" fill={color} />
        <circle r="5" fill="#2F4A85" opacity=".25" />
      </svg>
    );
  if (tipo === 'colonia')
    return (
      <svg viewBox="-30 -30 60 60" aria-hidden="true">
        {Array.from({ length: 9 }, (_, k) => (
          <circle key={k} cx={r3(Math.cos(k * 2.4) * Math.sqrt(k) * 7)} cy={r3(Math.sin(k * 2.4) * Math.sqrt(k) * 7)} r={r3(6 - k * 0.3)} fill={color} />
        ))}
      </svg>
    );
  return (
    <svg viewBox="-30 -30 60 60" aria-hidden="true">
      <circle r="22" fill={color} />
      <circle r="7" cx="3" cy="2" fill="#2F4A85" opacity=".22" />
      <circle r="3" cx="-8" cy="-7" fill="#FFFFFF" opacity=".5" />
    </svg>
  );
}

export default function FondoVivo({ colores = PALETA, cantidad = 12, semilla = 3, opacidad = 0.5 }) {
  const r = azar(semilla);
  const tipos = ['coco', 'bacilo', 'espiculado', 'colonia'];
  const items = Array.from({ length: cantidad }, (_, i) => ({
    tipo: tipos[Math.floor(r() * tipos.length)],
    color: colores[i % colores.length],
    x: r() * 100,
    y: r() * 100,
    tam: 28 + r() * 46,
    dur: 18 + r() * 22,
    retraso: -r() * 30,
    giro: r() * 360,
    desenfoque: r() < 0.3,
  }));
  return (
    <div className="fondo-vivo" aria-hidden="true" style={{ opacity: opacidad }}>
      {items.map((o, i) => (
        <span
          key={i}
          className={`fondo-vivo__org ${o.desenfoque ? 'fondo-vivo__org--lejos' : ''}`}
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: o.tam,
            height: o.tam,
            animationDuration: `${o.dur}s`,
            animationDelay: `${o.retraso}s`,
            '--giro': `${o.giro}deg`,
          }}
        >
          <Organismo tipo={o.tipo} color={o.color} />
        </span>
      ))}
    </div>
  );
}
