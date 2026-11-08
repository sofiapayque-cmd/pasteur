'use client';

import { useState } from 'react';
import { palabras } from '@/lib/equipo/comun';

/* Área de texto con contador de palabras (el límite es un máximo: más corto está bien). */
export default function ContadorPalabras({
  name,
  defaultValue,
  limite,
  maxLength,
  filas = 4,
  disabled,
}: {
  name: string;
  defaultValue: string;
  limite?: number;
  maxLength: number;
  filas?: number;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(defaultValue);
  const n = palabras(texto);
  const pasado = limite !== undefined && n > limite;
  return (
    <>
      <textarea
        className="campo__entrada"
        name={name}
        rows={filas}
        maxLength={maxLength}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={disabled}
      />
      <span className={`eq-contador ${pasado ? 'eq-contador--pasado' : ''}`} aria-live="polite">
        {n} {n === 1 ? 'palabra' : 'palabras'}
        {limite !== undefined && ` · máximo ${limite}`}
        {pasado && ' · así no se puede mandar a revisión'}
      </span>
    </>
  );
}
