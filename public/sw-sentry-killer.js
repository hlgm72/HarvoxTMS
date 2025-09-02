/**
 * 🚨 ULTIMATE SENTRY KILLER - Service Worker Level
 * Intercepta SOLO las requests de Sentry para evitar conflictos con otros SW
 */

const SENTRY_DOMAINS = [
  'sentry.io',
  'ingest.sentry.io',
  'o4506071217143808.ingest.sentry.io'
];

const isSentryUrl = (url) => {
  return SENTRY_DOMAINS.some(domain => url.includes(domain));
};

// Interceptar SOLO las requests de Sentry (no interferir con otras)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Solo interceptar requests a Sentry
  if (isSentryUrl(url)) {
    console.log('🚨 SERVICE WORKER: Sentry request BLOCKED at network level:', url);
    
    // Retornar respuesta fake exitosa solo para Sentry
    event.respondWith(
      new Response(JSON.stringify({ success: true, blocked: true }), {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    );
    return;
  }
  
  // Para todas las demás requests, NO INTERFERIR - dejar que el navegador/otros SW manejen
  // No llamar event.respondWith() aquí para evitar conflictos con otros service workers
});

// Instalar el service worker inmediatamente
self.addEventListener('install', (event) => {
  console.log('🚨 Sentry Killer Service Worker INSTALLED');
  self.skipWaiting();
});

// Activar inmediatamente
self.addEventListener('activate', (event) => {
  console.log('🚨 Sentry Killer Service Worker ACTIVATED');
  event.waitUntil(self.clients.claim());
});

console.log('🚨 SENTRY KILLER SERVICE WORKER LOADED - Selective Sentry blocking active');