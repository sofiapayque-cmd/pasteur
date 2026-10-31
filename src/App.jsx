import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import Inicio from './pantallas/Inicio';
import Rol from './pantallas/Rol';
import PanelMaestra from './pantallas/maestra/Panel';
import Preparar from './pantallas/maestra/Preparar';
import SalaEspera from './pantallas/maestra/SalaEspera';
import Tablero from './pantallas/maestra/Tablero';
import Puesta from './pantallas/maestra/Puesta';
import Entrar from './pantallas/nino/Entrar';
import Apodo from './pantallas/nino/Apodo';
import Espera from './pantallas/nino/Espera';
import EnClase from './pantallas/nino/EnClase';
import Explorar from './pantallas/nino/Explorar';
import Solo from './pantallas/nino/Solo';

/*
  Mapa de la web (igual al mapa del flujo). :act es a1, a2, a3 o a4.

  /                        01 Inicio (el círculo)
  /rol                     02 ¿Quién explora?
  /maestra                 03 Panel de la maestra
  /maestra/:act/preparar   Preparar la clase
  /maestra/:act/sala       Sala de espera (proyectada)
  /maestra/:act/tablero    Tablero en vivo
  /maestra/:act/puesta     Puesta en común
  /clase                   Niño · Entrar con código
  /clase/K7RM              Niño · Entrar con el código ya puesto (link de CREA)
  /clase/apodo             Niño · Apodo y color
  /clase/espera            Niño · Espera
  /clase/actividad         Niño · La actividad de la clase
  /explorar                Modo individual: elegir actividad
  /explorar/:act           Modo individual: hacer una actividad
*/
/*
  Monta la pantalla de nuevo cada vez que cambia la actividad (:act).
  Sin esto, al pasar directo de /maestra/a2/preparar a /maestra/a3/preparar
  (atrás del navegador o cambiando la URL) quedaban las opciones de la
  actividad anterior y la pantalla se rompía.
*/
function PorActividad({ Pantalla }) {
  const { act } = useParams();
  return <Pantalla key={act} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/rol" element={<Rol />} />
      <Route path="/maestra" element={<PanelMaestra />} />
      <Route path="/maestra/:act/preparar" element={<PorActividad Pantalla={Preparar} />} />
      <Route path="/maestra/:act/sala" element={<SalaEspera />} />
      <Route path="/maestra/:act/tablero" element={<Tablero />} />
      <Route path="/maestra/:act/puesta" element={<Puesta />} />
      <Route path="/clase" element={<Entrar />} />
      <Route path="/clase/apodo" element={<Apodo />} />
      <Route path="/clase/espera" element={<Espera />} />
      <Route path="/clase/actividad" element={<EnClase />} />
      <Route path="/clase/:codigo" element={<Entrar />} />
      <Route path="/explorar" element={<Explorar />} />
      <Route path="/explorar/:act" element={<PorActividad Pantalla={Solo} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
