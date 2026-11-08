import { Navigate } from '@/navegacion';

/*
  Cualquier dirección que no existe vuelve al inicio, como en la versión anterior
  (react-router: path="*" → "/"). El servidor responde 404 igual.
*/
export default function NoEncontrada() {
  return <Navigate to="/" replace />;
}
