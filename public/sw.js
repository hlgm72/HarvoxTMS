
const CACHE_VERSION = 'v4.0.0-' + Date.now(); // Force complete cache reset
const STATIC_CACHE = 'fleetnest-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fleetnest-dynamic-' + CACHE_VERSION;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/auth',
  '/manifest.json',
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
            try {
              console.log('🔄 SW: Sending reload message to client');
              // Use postMessage without expecting a response to avoid the error
              if (client.postMessage) {
                client.postMessage({ type: 'CACHE_UPDATED' });
              }
            } catch (error) {
              console.log('⚠️ SW: Could not send message to client:', error);
            }
          });
        });
      })
  );
});

// Fetch event - Network first strategy with better error handling
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

  // For JS/CSS files, always try network first and don't cache 404s
  if (url.pathname.includes('.js') || url.pathname.includes('.css') || url.pathname.includes('index-')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            console.log('🌐 SW: Fresh JS/CSS from network:', request.url);
            // Only cache successful responses
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
            return networkResponse;
          } else {
            console.log('⚠️ SW: Non-200 response for:', request.url, 'Status:', networkResponse.status);
            // Don't cache non-200 responses, just return them
            return networkResponse;
          }
        })
        .catch((error) => {
          console.log('❌ SW: Network failed for:', request.url, error);
          // For JS/CSS files, if network fails, don't try cache - let it fail
          // This prevents serving stale JS/CSS that might break the app
          throw error;
        })
    );
    return;
  }

  // For other assets, try cache first, then network
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
    icon: '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png',
    badge: '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/lovable-uploads/ec4495b7-2147-4fca-93d5-3dbdafbef98a.png'
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
