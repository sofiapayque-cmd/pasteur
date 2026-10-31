import { Routes, Route, Navigate } from 'react-router-dom';

import Inicio from './pages/Inicio';
import Rol from './pages/Rol';
import PanelMaestra from './pages/maestra/Panel';
import Preparar from './pages/maestra/Preparar';
import SalaEspera from './pages/maestra/SalaEspera';
import Tablero from './pages/maestra/Tablero';
import Puesta from './pages/maestra/Puesta';
import Entrar from './pages/nino/Entrar';
import Apodo from './pages/nino/Apodo';
import Espera from './pages/nino/Espera';
import EnClase from './pages/nino/EnClase';
import Explorar from './pages/nino/Explorar';
import Solo from './pages/nino/Solo';

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
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/rol" element={<Rol />} />
      <Route path="/maestra" element={<PanelMaestra />} />
      <Route path="/maestra/:act/preparar" element={<Preparar />} />
      <Route path="/maestra/:act/sala" element={<SalaEspera />} />
      <Route path="/maestra/:act/tablero" element={<Tablero />} />
      <Route path="/maestra/:act/puesta" element={<Puesta />} />
      <Route path="/clase" element={<Entrar />} />
      <Route path="/clase/apodo" element={<Apodo />} />
      <Route path="/clase/espera" element={<Espera />} />
      <Route path="/clase/actividad" element={<EnClase />} />
      <Route path="/clase/:codigo" element={<Entrar />} />
      <Route path="/explorar" element={<Explorar />} />
      <Route path="/explorar/:act" element={<Solo />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
