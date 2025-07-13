const CACHE_NAME = 'fleetnest-v1.0.0';
const STATIC_CACHE = 'fleetnest-static-v1.0.0';
const DYNAMIC_CACHE = 'fleetnest-dynamic-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/auth',
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/eagle-favicon.png',
  // CSS and JS files will be cached dynamically
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Installation failed', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip POST requests and API calls for now
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              
              // Determine which cache to use
              const cacheName = STATIC_ASSETS.includes(url.pathname) 
                ? STATIC_CACHE 
                : DYNAMIC_CACHE;
              
              caches.open(cacheName)
                .then((cache) => {
                  console.log('SW: Caching new resource:', request.url);
                  cache.put(request, responseClone);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('SW: Network request failed:', request.url, error);
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for future offline capabilities
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Here you can add background sync logic
      // For example, sync pending data when connection is restored
      Promise.resolve()
    );
  }
});

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de FleetNest',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/pwa-icon-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/pwa-icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FleetNest', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});