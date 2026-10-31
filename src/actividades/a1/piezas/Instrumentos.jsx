/*
  Instrumentos de laboratorio ilustrados (planos, con la punta hacia abajo).
  Todos aceptan `alto` en px y un estado (cargado, caliente, abierto…).
*/

export function Espatula({ alto = 170, cargado, color = '#8A6A4A' }) {
  return (
    <svg viewBox="0 0 60 200" height={alto} width={alto * 0.3} aria-hidden="true" className="a1-instr">
      <rect x="22" y="6" width="16" height="70" rx="8" fill="#2F4A85" />
      <rect x="25" y="14" width="4" height="50" rx="2" fill="#FFFFFF" opacity=".35" />
      <rect x="27" y="74" width="6" height="84" rx="3" fill="#B7C0D0" />
      <path d="M20 156 L40 156 L44 186 Q30 196 16 186 Z" fill="#CBD3E1" stroke="#9AA6BC" strokeWidth="2" />
      <path d="M24 162 L26 184" stroke="#FFFFFF" strokeWidth="2.5" opacity=".7" strokeLinecap="round" />
      {cargado && <path d="M18 182 Q24 172 32 178 Q40 172 44 182 Q30 194 18 182 Z" fill={color} className="a1-carga" />}
    </svg>
  );
}

export function Hisopo({ alto = 170, cargado, color = '#6E5238' }) {
  return (
    <svg viewBox="0 0 60 200" height={alto} width={alto * 0.3} aria-hidden="true" className="a1-instr">
      <rect x="27" y="6" width="6" height="160" rx="3" fill="#F2E3C2" stroke="#D8C49A" strokeWidth="1.2" />
      <ellipse cx="30" cy="176" rx="11" ry="18" fill="#FFFFFF" stroke="#DCE1EA" strokeWidth="2" />
      <path d="M24 168 q6 -4 12 0 M23 178 q7 -4 14 0" stroke="#E4E7EC" strokeWidth="2" fill="none" />
      {cargado && <ellipse cx="30" cy="184" rx="10" ry="9" fill={color} className="a1-carga" />}
    </svg>
  );
}

export function Mano({ alto = 170 }) {
  return (
    <svg viewBox="0 0 120 200" height={alto} width={alto * 0.6} aria-hidden="true" className="a1-instr">
      <path
        d="M40 190 L36 120 Q22 100 16 84 Q12 72 22 70 Q30 70 38 86 L40 92 L38 40 Q38 30 46 30 Q54 30 54 40 L56 86 L58 26 Q58 16 66 16 Q74 16 74 26 L74 86 L78 34 Q78 24 86 24 Q94 26 92 36 L90 92 L96 56 Q98 48 106 50 Q112 54 110 62 L102 120 Q98 150 84 168 L84 190 Z"
        fill="#F1D3B8"
        stroke="#C79C7A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M56 86 L56 96 M74 86 L74 96" stroke="#C79C7A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Asa({ alto = 180, caliente, cargado, color = '#8A6A4A' }) {
  return (
    <svg viewBox="0 0 60 200" height={alto} width={alto * 0.3} aria-hidden="true" className="a1-instr">
      <rect x="21" y="4" width="18" height="74" rx="9" fill="#7272EE" />
      <rect x="25" y="12" width="4" height="54" rx="2" fill="#FFFFFF" opacity=".35" />
      <path d="M30 78 L30 160" stroke="#9AA6BC" strokeWidth="3" />
      <path d="M30 140 L30 160" stroke={caliente ? '#EF6F5E' : '#9AA6BC'} strokeWidth="3" className="a1-asa__metal" />
      <circle cx="30" cy="172" r="12" fill="none" stroke={caliente ? '#EF6F5E' : '#9AA6BC'} strokeWidth="3.5" className="a1-asa__metal" />
      {caliente && <circle cx="30" cy="172" r="20" fill="#F2B13B" opacity=".35" className="a1-asa__brillo" />}
      {cargado && <circle cx="30" cy="172" r="9" fill={color} opacity=".75" className="a1-carga" />}
    </svg>
  );
}

export function Mechero({ alto = 220, encendido = true }) {
  return (
    <svg viewBox="0 0 120 220" height={alto} width={alto * 0.55} aria-hidden="true" className="a1-instr a1-mechero">
      {encendido && (
        <g className="a1-mechero__llama">
          <path d="M60 18 Q84 64 74 92 Q68 106 60 106 Q52 106 46 92 Q36 64 60 18 Z" fill="#93AEEB" opacity=".55" />
          <path d="M60 46 Q74 74 68 94 Q64 102 60 102 Q56 102 52 94 Q46 74 60 46 Z" fill="#7272EE" opacity=".85" />
          <path d="M60 70 Q66 84 64 96 Q60 100 56 96 Q54 84 60 70 Z" fill="#D4DCF7" />
        </g>
      )}
      <rect x="50" y="104" width="20" height="74" rx="4" fill="#9AA6BC" />
      <rect x="54" y="110" width="4" height="60" rx="2" fill="#FFFFFF" opacity=".5" />
      <rect x="46" y="140" width="28" height="8" rx="3" fill="#7D8FAE" />
      <path d="M74 166 Q100 168 112 160" stroke="#EF6F5E" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M22 196 Q22 176 60 176 Q98 176 98 196 Z" fill="#5E6B85" />
      <rect x="16" y="194" width="88" height="14" rx="7" fill="#3E4A63" />
    </svg>
  );
}

/* Tubo de muestra con tapa a rosca. */
export function Tubo({ alto = 200, color = '#8A6A4A', tapa = '#2F4A85', lleno = true, abierto = false, codigo, destacar }) {
  return (
    <svg viewBox="0 0 90 230" height={alto} width={alto * 0.39} aria-hidden="true" className={`a1-tubo-svg ${destacar ? 'a1-tubo-svg--destacar' : ''}`}>
      {/* cuerpo */}
      <path d="M22 50 L68 50 L68 176 Q68 186 62 194 L50 214 Q45 220 40 214 L28 194 Q22 186 22 176 Z" fill="#FFFFFF" fillOpacity=".7" stroke="#AEB9D0" strokeWidth="2.5" />
      {lleno && (
        <path className="a1-tubo__contenido" d="M24 150 Q45 144 66 150 L66 176 Q66 185 60 193 L49 211 Q45 216 41 211 L30 193 Q24 185 24 176 Z" fill={color} opacity=".85" />
      )}
      <path d="M30 60 L30 170" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity=".8" />
      {/* etiqueta */}
      <rect x="25" y="82" width="40" height="50" rx="4" fill="#FBF9F1" stroke="#D4DCF7" />
      <rect x="25" y="82" width="40" height="8" rx="3" fill={color} opacity=".8" />
      {codigo && (
        <text x="45" y="107" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8" fill="#22232A">
          {codigo.split('·').map((p, i) => (
            <tspan key={i} x="45" dy={i ? 11 : 0}>
              {p}
            </tspan>
          ))}
        </text>
      )}
      {/* rosca */}
      <rect x="20" y="40" width="50" height="12" rx="2" fill="#E4E7EC" stroke="#AEB9D0" strokeWidth="2" />
      {/* tapa */}
      <g className={`a1-tubo__tapa ${abierto ? 'a1-tubo__tapa--abierta' : ''}`}>
        <rect x="16" y="14" width="58" height="30" rx="6" fill={tapa} />
        <path d="M24 18 L24 40 M34 18 L34 40 M44 18 L44 40 M54 18 L54 40 M64 18 L64 40" stroke="#FFFFFF" strokeWidth="2" opacity=".22" />
      </g>
    </svg>
  );
}

/* Disco de antibiótico (papel redondo con una letra). */
export function Disco({ letra, color, tam = 46 }) {
  return (
    <svg viewBox="0 0 40 40" width={tam} height={tam} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="#FFFFFF" stroke={color} strokeWidth="3" />
      <text x="20" y="25.5" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="15" fill="#22232A">
        {letra}
      </text>
    </svg>
  );
}
