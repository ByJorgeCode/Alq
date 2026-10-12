// Funciona sin conexión: guarda la app en caché y la actualiza en segundo plano.
const CACHE = 'alquileres-v1';
const ARCHIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/db.js', 'js/store.js', 'js/fechas.js', 'js/moneda.js', 'js/calculos.js', 'js/ics.js',
  'js/compartir.js', 'js/ui.js', 'js/form-reserva.js', 'js/form-gastos.js',
  'js/vista-inicio.js', 'js/vista-calendario.js', 'js/vista-gastos.js', 'js/vista-mas.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la red (para tener siempre la última versión); si no hay conexión, la caché.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
