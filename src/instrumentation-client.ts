/*
  Se ejecuta en el navegador antes de que la web sea interactiva
  (convención oficial de Next.js: instrumentation-client.ts).

  Direcciones viejas con # (links y QR del prototipo Vite: …/#/clase/K7RM).
  El # nunca llega al servidor, así que se resuelve acá:
  …/#/clase/K7RM → /clase/K7RM   ·   …/#/maestra → /maestra   ·   …/#/ → /
  También si alguien cambia solo el # con la página ya abierta.
*/
function resolverHashViejo() {
  try {
    const { hash } = window.location;
    if (hash.startsWith('#/')) window.location.replace(hash.slice(1) || '/');
  } catch {
    // si algo falla, la web sigue normal
  }
}

resolverHashViejo();
window.addEventListener('hashchange', resolverHashViejo);
