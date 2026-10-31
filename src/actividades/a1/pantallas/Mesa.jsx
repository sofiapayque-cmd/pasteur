import { useState } from 'react';
import GloboMoli from '../../../components/GloboMoli';
import { ambientePorId } from '../datos';
import { temperaturaPorId } from '../laboratorio';
import { Cabeza } from '../piezas/comunes';
import Placa from '../piezas/Placa';
import { Tubo, Mechero } from '../piezas/Instrumentos';
import { colorMuestra } from './Muestra';

function Icono({ tipo }) {
  const comun = { width: 44, height: 44, viewBox: '0 0 48 48', 'aria-hidden': true };
  if (tipo === 'muestra')
    return (
      <svg {...comun}>
        <path d="M18 6h12v4h-2v26a4 4 0 0 1-8 0V10h-2z" fill="#FBF9F1" stroke="#2F4A85" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M20 26h8v10a4 4 0 0 1-8 0z" fill="#8ED5C3" />
      </svg>
    );
  if (tipo === 'cultivar')
    return (
      <svg {...comun}>
        <ellipse cx="24" cy="26" rx="19" ry="13" fill="#F3E2B3" stroke="#2F4A85" strokeWidth="2.5" />
        <circle cx="17" cy="24" r="3" fill="#F2B13B" />
        <circle cx="27" cy="29" r="4" fill="#F4A6BD" />
        <circle cx="31" cy="21" r="2" fill="#EF6F5E" />
      </svg>
    );
  if (tipo === 'comparar')
    return (
      <svg {...comun}>
        <circle cx="15" cy="24" r="11" fill="#F3E2B3" stroke="#2F4A85" strokeWidth="2.5" />
        <circle cx="33" cy="24" r="11" fill="#F3E2B3" stroke="#2F4A85" strokeWidth="2.5" />
        <circle cx="13" cy="21" r="2.5" fill="#F2B13B" />
        <circle cx="35" cy="27" r="3" fill="#F4A6BD" />
      </svg>
    );
  if (tipo === 'antibioticos')
    return (
      <svg {...comun}>
        <circle cx="24" cy="24" r="19" fill="#F3E2B3" stroke="#2F4A85" strokeWidth="2.5" />
        <circle cx="24" cy="24" r="10" fill="#FBF9F1" />
        <circle cx="24" cy="24" r="4.5" fill="#fff" stroke="#7272EE" strokeWidth="2" />
      </svg>
    );
  if (tipo === 'candado')
    return (
      <svg {...comun}>
        <path d="M16 22v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#5E6070" strokeWidth="3" />
        <rect x="11" y="22" width="26" height="20" rx="5" fill="#D4DCF7" stroke="#5E6070" strokeWidth="2.5" />
        <circle cx="24" cy="31" r="2.6" fill="#5E6070" />
      </svg>
    );
  return (
    <svg {...comun}>
      <path d="M10 8h22l6 6v26H10z" fill="#FBF9F1" stroke="#2F4A85" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 20h16M16 26h16M16 32h10" stroke="#7272EE" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Accion({ icono, titulo, detalle, onClick, disabled, tipo = '' }) {
  return (
    <button className={`a1-accion ${tipo}`} onClick={onClick} disabled={disabled}>
      <span className="a1-accion__icono">
        <Icono tipo={icono} />
      </span>
      <span className="a1-accion__textos">
        <b>{titulo}</b>
        {detalle && <small>{detalle}</small>}
      </span>
    </button>
  );
}

/* 4 · MESA: el centro del laboratorio. Desde acá se va a cualquier lado. */
export default function Mesa({ progreso }) {
  const muestras = progreso.datos.muestras || [];
  const cultivos = progreso.datos.cultivos || [];
  const cultivada = (m) => cultivos.some((c) => c.muestra === m.id);
  const primeraSin = muestras.find((m) => !cultivada(m));
  const [sel, setSel] = useState(primeraSin?.id || muestras[muestras.length - 1]?.id);
  const seleccionada = muestras.find((m) => m.id === sel);
  const habilitado = progreso.desbloqueado('antibioticos');
  const limpias = cultivos.filter((c) => !c.contaminada);
  const yaAntibioticos = (progreso.datos.antibioticos || []).length > 0;

  let moli = '¡Bienvenido al laboratorio! Elegí qué hacer.';
  let animo = 'feliz';
  if (!muestras.length) {
    moli = 'Tu gradilla está vacía. ¡Vamos a buscar muestras!';
    animo = 'piensa';
  } else if (!cultivos.length) {
    moli = `Tenés ${muestras.length === 1 ? 'una muestra' : `${muestras.length} muestras`}. ¿Vemos qué crece si la cultivamos?`;
    animo = 'piensa';
  } else if (cultivos.length === 1) {
    moli = 'Con dos placas vas a poder comparar. ¿Otra muestra, u otra temperatura?';
  } else if (habilitado && !yaAntibioticos) {
    moli = '¡Ya podés comparar placas y probar antibióticos!';
    animo = 'eureka';
  } else if (!habilitado) {
    moli = '¡Ya podés comparar tus placas!';
    animo = 'eureka';
  }

  return (
    <section className="a1-mesa">
      <Cabeza
        etiqueta="Laboratorio"
        titulo="Tu mesa de laboratorio"
        extra={
          <button className="btn btn--primario a1-btn-fin" disabled={!muestras.length} onClick={() => progreso.ir('conclusiones')}>
            Terminar y ver mi cuaderno
          </button>
        }
      >
        Elegí qué hacer. Podés ir y volver cuando quieras.
      </Cabeza>

      <div className="a1-mesa__cuerpo">
        <div className="a1-mesa__superficie">
          <div className="a1-mesa__estante">
            <span className="etiqueta etiqueta--oscura">Gradilla · tus muestras</span>
            <div className="a1-gradilla" role="radiogroup" aria-label="Tus muestras">
              {muestras.map((m, i) => {
                const a = ambientePorId(m.ambiente);
                if (!a) return null;
                return (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={sel === m.id}
                    className={`a1-gradilla__tubo anim-crecer ${sel === m.id ? 'a1-gradilla__tubo--sel' : ''}`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                    onClick={() => setSel(m.id)}
                    title={a.nombre}
                  >
                    <Tubo alto={150} color={colorMuestra(a)} tapa={a.color} codigo={a.codigo} />
                    <span className="a1-gradilla__nombre">{a.nombre}</span>
                    <span className={`a1-gradilla__estado ${cultivada(m) ? 'hecho' : ''}`}>{cultivada(m) ? 'Cultivada' : 'Sin cultivar'}</span>
                  </button>
                );
              })}
              {Array.from({ length: Math.max(0, 4 - muestras.length) }, (_, i) => (
                <span key={`v${i}`} className="a1-gradilla__vacio" aria-hidden="true" />
              ))}
              <span className="a1-gradilla__barra" aria-hidden="true" />
            </div>
          </div>

          <div className="a1-mesa__placas">
            <span className="etiqueta etiqueta--oscura">Tus placas</span>
            {cultivos.length ? (
              <ul>
                {cultivos.map((c, i) => {
                  const a = ambientePorId(c.ambiente);
                  return (
                    <li key={c.id} className="anim-crecer" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
                      <Placa placa={c} tamano={92} etiqueta={`Placa de ${a?.nombre}, ${temperaturaPorId(c.temp).nombre}`} />
                      <span className="a1-mesa__placa-nombre">
                        <i style={{ background: a?.color }} aria-hidden="true" />
                        {temperaturaPorId(c.temp).nombre}
                        {c.contaminada && <em> · contaminada</em>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="a1-mesa__vacio">Todavía no hay placas. Cultivá una muestra para ver qué crece.</p>
            )}
          </div>
          <div className="a1-mesa__mechero" aria-hidden="true">
            <Mechero alto={120} />
          </div>
        </div>

        <nav className="a1-mesa__acciones" aria-label="Qué querés hacer">
          <Accion icono="muestra" titulo="Tomar otra muestra" detalle="Volver de expedición" onClick={() => progreso.ir('paisaje')} />
          <Accion
            icono="cultivar"
            tipo="a1-accion--experimentar"
            titulo="Cultivar en placa"
            detalle={
              !muestras.length
                ? 'Primero tomá una muestra'
                : cultivos.length >= 8
                  ? 'La mesa está llena de placas'
                  : seleccionada && cultivada(seleccionada)
                    ? `Otra placa de ${ambientePorId(seleccionada.ambiente)?.nombre}`
                    : `La muestra de ${ambientePorId(seleccionada?.ambiente)?.nombre || '…'}`
            }
            disabled={!seleccionada || cultivos.length >= 8}
            onClick={() => progreso.ir('cultivo', { cultivando: seleccionada.id })}
          />
          <Accion icono="comparar" titulo="Comparar placas" detalle={cultivos.length < 2 ? 'Necesitás 2 placas' : `${cultivos.length} placas para elegir`} disabled={cultivos.length < 2} onClick={() => progreso.ir('comparar')} />
          {habilitado ? (
            <Accion
              icono="antibioticos"
              titulo="Probar antibióticos"
              detalle={limpias.length ? '¿Qué bacterias resisten?' : 'Necesitás una placa sin contaminar'}
              disabled={!limpias.length}
              onClick={() => progreso.ir('antibioticos')}
            />
          ) : (
            <div className="a1-accion a1-accion--candado" role="note">
              <span className="a1-accion__icono">
                <Icono tipo="candado" />
              </span>
              <span className="a1-accion__textos">
                <b>Probar antibióticos</b>
                <small>Tu maestra lo va a habilitar</small>
              </span>
            </div>
          )}
        </nav>
      </div>

      <GloboMoli texto={moli} animo={animo} />
    </section>
  );
}
