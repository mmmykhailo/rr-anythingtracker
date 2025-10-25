// Service Worker for AnythingTracker PWA
// Strategy: Stale-while-revalidate with conservative 1-hour cache

const CACHE_VERSION = 'v1';
const CACHE_NAME = `anythingtracker-${CACHE_VERSION}`;
const CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour in milliseconds

// Icons to precache for offline support
const PRECACHE_URLS = [
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/manifest.json',
  '/favicon.svg'
];

// Install event: precache icons
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching icons and manifest');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  return self.clients.claim();
});

// Helper: Check if cache entry is expired (> 1 hour old)
async function isCacheExpired(response) {
  if (!response) return true;

  const cachedDate = response.headers.get('sw-cached-date');
  if (!cachedDate) return true;

  const cacheAge = Date.now() - parseInt(cachedDate, 10);
  return cacheAge > CACHE_MAX_AGE;
}

// Helper: Add cache timestamp to response
function addCacheTimestamp(response) {
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.set('sw-cached-date', Date.now().toString());

  return new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: headers
  });
}

// Fetch event: stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for:
  // 1. External domains (like GitHub API)
  // 2. Chrome extensions
  if (url.origin !== location.origin || url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip caching for API calls (if you add any /api routes later)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to get from cache
      const cachedResponse = await cache.match(request);

      // If we have a cached response that's not expired, use it
      if (cachedResponse && !(await isCacheExpired(cachedResponse))) {
        // Stale-while-revalidate: serve cache, update in background
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, addCacheTimestamp(networkResponse));
            }
          }).catch(() => {
            // Network fetch failed, but we already served from cache
            console.log('[SW] Background update failed for:', request.url);
          })
        );

        return cachedResponse;
      }

      // Cache miss or expired: try network first
      try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, addCacheTimestamp(networkResponse.clone()));
        }

        return networkResponse;
      } catch (error) {
        // Network failed: return stale cache if available
        if (cachedResponse) {
          console.log('[SW] Network failed, serving stale cache for:', request.url);
          return cachedResponse;
        }

        // No cache available either
        throw error;
      }
    })
  );
});

// Message event: allow manual cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared manually');
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});
