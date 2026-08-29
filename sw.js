// Service Worker — App Quesos
// Permite instalar la app en el celular y que funcione offline.

const CACHE = 'quesos-v20';
const ARCHIVOS = ['./', './index.html', './style.css', './tema.css', './iso.png', './js/core.js', './js/ventas.js', './js/compras.js', './js/deudas.js', './js/catalogo.js', './js/reportes.js', './js/gestion.js', './js/extras.js', './js/tickets.js', './js/init.js', './manifest.json', './logo-192.png', './logo-512.png'];

// Archivos de texto: son los únicos que comparamos para detectar una versión
// nueva. Las imágenes se sirven del caché y se renuevan cuando sube CACHE.
const ES_TEXTO = /\.(html|css|js|json)$|\/$/i;

// Al instalar: guardar archivos en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).catch(() => {})
  );
  self.skipWaiting();
});

// Al activar: limpiar cachés viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia de red:
//  - API (Apps Script): siempre red, datos en tiempo real.
//  - App shell (HTML/CSS/JS/iconos): CACHE-FIRST con revalidacion.
//    Antes era network-first: la app bajaba sus 13 archivos de GitHub Pages
//    ANTES de arrancar, y con senal floja se quedaba esperando timeouts. Ahora
//    abre al instante con lo guardado y compara contra el servidor por atras;
//    si algun archivo cambio, lo guarda y le avisa a la pantalla, que muestra
//    la barra "Hay una version nueva". O sea: sigue llegando toda
//    actualizacion, pero no se paga la espera en cada apertura.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Llamadas al Apps Script: siempre red (datos en tiempo real)
  if (req.url.includes('script.google.com')) return;
  e.respondWith(responder(req));
});

async function responder(req) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(req);

  if (guardado) {
    // Ojo: hay que clonar ANTES de devolverlo. El cuerpo de una Response se
    // puede leer una sola vez, y el original se lo lleva la pantalla.
    if (ES_TEXTO.test(new URL(req.url).pathname)) revalidar(cache, req, guardado.clone());
    return guardado;
  }

  try {
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
    return resp;
  } catch (err) {
    return (await cache.match('./index.html')) || Response.error();
  }
}

// Baja el archivo por atras y lo compara con el guardado. Solo avisa si de
// verdad cambio el contenido: si no, cada apertura mostraria la barra.
async function revalidar(cache, req, copiaGuardada) {
  try {
    const resp = await fetch(req, { cache: 'no-cache' });
    if (!resp || !resp.ok) return;
    const nuevo = await resp.clone().text();
    const viejo = await copiaGuardada.text();
    if (nuevo === viejo) return;
    await cache.put(req, resp);
    avisarVersionNueva();
  } catch (err) { /* sin red: seguimos con lo guardado */ }
}

let _yaAvise = false;
async function avisarVersionNueva() {
  if (_yaAvise) return;
  _yaAvise = true;
  const ventanas = await self.clients.matchAll({ type: 'window' });
  ventanas.forEach(c => c.postMessage({ tipo: 'version-nueva' }));
}
