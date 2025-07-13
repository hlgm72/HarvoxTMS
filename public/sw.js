const CACHE_VERSION = 'v2.1.0-' + Date.now(); // Force cache bust with timestamp
const STATIC_CACHE = 'fleetnest-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fleetnest-dynamic-' + CACHE_VERSION;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/auth',
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/eagle-favicon.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🚀 SW: Installing new version...', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ SW: Installation complete, forcing update');
        return self.skipWaiting(); // Force immediate activation
      })
      .catch((error) => {
        console.error('❌ SW: Installation failed', error);
      })
  );
});

// Activate event - clean ALL old caches aggressively
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Activating new version...', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('🗑️ SW: Found caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete ALL caches except current ones
              return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('🗑️ SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ SW: All old caches cleared, taking control');
        return self.clients.claim(); // Take control immediately
      })
      .then(() => {
        // Force reload all clients to get fresh content
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            console.log('🔄 SW: Sending reload message to client');
            client.postMessage({ type: 'CACHE_UPDATED' });
          });
        });
      })
  );
});

// Fetch event - Network first for JS/CSS, cache for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip POST requests and API calls
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // For JS/CSS files, always try network first to avoid stale code
  if (url.pathname.includes('.js') || url.pathname.includes('.css')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            console.log('🌐 SW: Fresh JS/CSS from network:', request.url);
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('📱 SW: Network failed, trying cache for:', request.url);
          return caches.match(request);
        })
    );
    return;
  }

  // For other assets, cache first
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('📦 SW: Serving from cache:', request.url);
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              const cacheName = STATIC_ASSETS.includes(url.pathname) 
                ? STATIC_CACHE 
                : DYNAMIC_CACHE;
              
              caches.open(cacheName)
                .then((cache) => {
                  console.log('💾 SW: Caching new resource:', request.url);
                  cache.put(request, responseClone);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('❌ SW: Network request failed:', request.url, error);
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