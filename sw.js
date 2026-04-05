// THE ESTATE — Service Worker v1
// Stratégie : Cache-first pour les assets locaux, network-only pour l'externe

const CACHE_NAME = 'estate-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/map.html',
  '/faq.html',
  '/concierge.html',
  '/reservations.html',
  '/vouchers.html',
  '/scout.html',
  '/api.js',
  '/favicon.svg',
  '/manifest.json',
  '/assets/css/font-awesome.min.css',
  '/assets/css/leaflet.css',
  '/assets/css/maplibre-gl.css',
  '/assets/js/leaflet.js',
  '/assets/js/maplibre-gl.js',
  '/assets/js/chart.umd.min.js',
  '/assets/fonts/fonts.css'
];

// Installation : mise en cache des assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch : cache-first pour les ressources locales, réseau pour le reste
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non-GET et les ressources externes (CDN, tuiles carte, etc.)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Retourner le cache immédiatement si disponible
      if (cached) {
        // Rafraîchir en arrière-plan (stale-while-revalidate)
        fetch(event.request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }

      // Sinon aller sur le réseau et mettre en cache
      return fetch(event.request).then(response => {
        if (!response || !response.ok || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Fallback offline : retourner index.html pour les navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
