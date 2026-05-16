const CACHE_NAME = 'viajeros-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/map.css',
  './css/pages/auth.css',
  './css/pages/itinerary.css',
  './css/pages/gallery.css',
  './js/main.js',
  './js/map.js',
  './img/apple-touch-icon-sinfondo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // No cachear peticiones de Firestore (Firestore tiene su propia persistencia)
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear las respuestas exitosas de assets
        if (response.status === 200 && (
            event.request.url.includes('.css') || 
            event.request.url.includes('.js') || 
            event.request.url.includes('.png') ||
            event.request.url.includes('fonts.googleapis.com') ||
            event.request.url.includes('unpkg.com') ||
            event.request.url.includes('cdnjs.cloudflare.com') ||
            event.request.url.includes('ucarecdn.com')
        )) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
