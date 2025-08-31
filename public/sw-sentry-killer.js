/**
 * 🚨 ULTIMATE SENTRY KILLER - Service Worker Level
 * Intercepta TODAS las requests de red antes de que salgan del navegador
 */

const SENTRY_DOMAINS = [
  'sentry.io',
  'ingest.sentry.io',
  'o4506071217143808.ingest.sentry.io'
];

const isSentryUrl = (url) => {
  return SENTRY_DOMAINS.some(domain => url.includes(domain));
};

// Interceptar TODAS las requests de red
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Si es una request a Sentry, BLOQUEARLA COMPLETAMENTE
  if (isSentryUrl(url)) {
    console.log('🚨 SERVICE WORKER: Sentry request DESTROYED at network level:', url);
    
    // Retornar respuesta fake exitosa
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
  
  // Para todas las demás requests, continuar normal
  event.respondWith(fetch(event.request));
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

console.log('🚨 SENTRY KILLER SERVICE WORKER LOADED - Network level blocking active');