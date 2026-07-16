// Service Worker — App Quesos
// Permite instalar la app en el celular y que funcione offline.

const CACHE = 'quesos-v15';
const ARCHIVOS = ['./', './index.html', './style.css', './js/core.js', './js/ventas.js', './js/compras.js', './js/deudas.js', './js/catalogo.js', './js/reportes.js', './js/gestion.js', './js/extras.js', './js/tickets.js', './js/init.js', './manifest.json', './logo-192.png', './logo-512.png'];

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
//  - App shell (HTML/CSS/JS/iconos): NETWORK-FIRST. Si hay red, trae la version
//    nueva y la cachea (asi una actualizacion llega siempre a la PWA instalada
//    y nunca queda codigo viejo). Si no hay red, sirve lo cacheado.
self.addEventListener('fetch', e => {
  // Llamadas al Apps Script: siempre red (datos en tiempo real)
  if (e.request.url.includes('script.google.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() =>
        caches.match(e.request).then(cached => cached || caches.match('./index.html'))
      )
  );
});
