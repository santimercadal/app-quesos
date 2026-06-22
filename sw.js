// Service Worker — App Quesos
// Permite instalar la app en el celular y que cargue rápido

const CACHE = 'quesos-v2';
const ARCHIVOS = ['./', './index.html', './style.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

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

// Al pedir recursos: para la API siempre ir a la red; para el resto, caché primero
self.addEventListener('fetch', e => {
  // Llamadas al Apps Script: siempre red (datos en tiempo real)
  if (e.request.url.includes('script.google.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});
