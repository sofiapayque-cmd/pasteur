/* Reloj de laboratorio: las agujas giran cuando pasa el tiempo. */
export default function Reloj({ vueltas = 0, tam = 120 }) {
  return (
    <svg viewBox="0 0 120 120" width={tam} height={tam} className="a1-reloj" aria-hidden="true">
      <circle cx="60" cy="64" r="50" fill="#FBF9F1" stroke="#2F4A85" strokeWidth="4" />
      <rect x="50" y="4" width="20" height="10" rx="4" fill="#2F4A85" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M60 20 L60 26" transform={`rotate(${i * 30} 60 64)`} stroke="#5E6070" strokeWidth={i % 3 ? 2 : 3.5} strokeLinecap="round" />
      ))}
      <g className="a1-reloj__aguja" style={{ transform: `rotate(${vueltas * 720}deg)` }}>
        <path d="M60 64 L60 28" stroke="#EF6F5E" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <g className="a1-reloj__aguja a1-reloj__aguja--hora" style={{ transform: `rotate(${vueltas * 60}deg)` }}>
        <path d="M60 64 L60 42" stroke="#22232A" strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="64" r="5" fill="#22232A" />
    </svg>
  );
}
