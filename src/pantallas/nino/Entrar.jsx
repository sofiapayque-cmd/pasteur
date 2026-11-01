'use client';

import { useRef, useState } from 'react';
import { useNavigate, useParams } from '@/navegacion';
import Moli from '../../components/Moli';
import FondoVivo from '../../components/FondoVivo';
import { codigoValido } from '../../sala/sala';
import VolverMaestra from '../../components/VolverMaestra';

/* NIÑO · ENTRAR — cuatro casillas grandes para el código de la clase. */
export default function Entrar() {
  const { codigo: delLink } = useParams();
  const navegar = useNavigate();
  const inicial = (delLink || '').toUpperCase().slice(0, 4).padEnd(4, ' ').split('');
  const [letras, setLetras] = useState(inicial.map((l) => l.trim()));
  const [error, setError] = useState('');
  const casillas = useRef([]);

  function escribir(i, valor) {
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // si pegaron el código entero, lo repartimos en las casillas
    if (limpio.length > 1) {
      const nuevas = limpio.slice(0, 4).padEnd(4, ' ').split('').map((l) => l.trim());
      setLetras(nuevas);
      casillas.current[Math.min(limpio.length, 4) - 1]?.focus();
      return;
    }
    const nuevas = [...letras];
    nuevas[i] = limpio;
    setLetras(nuevas);
    setError('');
    if (limpio && i < 3) casillas.current[i + 1]?.focus();
  }

  function tecla(i, e) {
    if (e.key === 'Backspace' && !letras[i] && i > 0) casillas.current[i - 1]?.focus();
  }

  function entrar(e) {
    e.preventDefault();
    const codigo = letras.join('');
    if (codigo.length < 4) return setError('Faltan letras del código.');
    if (!codigoValido(codigo)) return setError('Ese código no existe. Revisá el pizarrón.');
    navegar('/clase/apodo');
  }

  return (
    <main className="pantalla entrar">
      <VolverMaestra className="volver-maestra--esquina" />
      <FondoVivo semilla={4} />
      <Moli animo={error ? 'duda' : 'feliz'} tamano={320} />
      <form className="entrar__form" onSubmit={entrar}>
        <span className="etiqueta">La ciencia sin límites</span>
        <h1>¡Hola! Entrá a tu clase</h1>
        <label htmlFor="letra-0">Escribí el código que está en el pizarrón</label>
        <div className="entrar__casillas">
          {letras.map((l, i) => (
            <input
              key={i}
              id={`letra-${i}`}
              ref={(el) => (casillas.current[i] = el)}
              value={l}
              onChange={(e) => escribir(i, e.target.value)}
              onKeyDown={(e) => tecla(i, e)}
              aria-label={`Letra ${i + 1} del código`}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              className="casilla"
            />
          ))}
        </div>
        <p className="entrar__error" role="alert">
          {error}
        </p>
        <button className="btn btn--primario btn--grande" type="submit">
          Entrar
        </button>
        <button type="button" className="enlace" onClick={() => navegar('/explorar')}>
          No tengo código: explorar sin sala
        </button>
      </form>
    </main>
  );
}
