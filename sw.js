const CACHE_NAME = 'viajeros-v5';
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
  './js/config/firebase.js',
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
  const url = event.request.url;

  // No cachear peticiones de Firestore o backend, pero SÍ los archivos JS de Firebase SDK
  if (
    url.includes('firestore.googleapis.com') || 
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    (url.includes('firebase') && !url.includes('gstatic.com/firebasejs'))
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear las respuestas exitosas de assets
        if (response.status === 200 && (
            url.includes('.css') || 
            url.includes('.js') || 
            url.includes('.png') ||
            url.includes('fonts.googleapis.com') ||
            url.includes('gstatic.com') ||
            url.includes('unpkg.com') ||
            url.includes('cdnjs.cloudflare.com') ||
            url.includes('ucarecdn.com')
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
