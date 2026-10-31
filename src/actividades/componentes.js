import { lazy } from 'react';

/*
  Las pantallas de cada actividad se cargan recién cuando se usan (lazy):
  así la web arranca rápido en las Ceibal aunque las actividades sean grandes.
*/
export const EXPERIENCIAS = {
  a1: lazy(() => import('./a1/index.jsx')),
  a2: lazy(() => import('./a2/index.jsx')),
  a3: lazy(() => import('./a3/index.jsx')),
  a4: lazy(() => import('./a4/index.jsx')),
};

// Vista especial para la puesta en común (si una actividad no la tiene, se usa la genérica)
export const PUESTAS = {
  a1: lazy(() => import('./a1/Puesta.jsx')),
};
