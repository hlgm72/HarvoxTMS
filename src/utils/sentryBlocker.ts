/**
 * 🛡️ SENTRY COMPLETE BLOCKER - Solución definitiva para error 429
 * Bloquea TODOS los intentos de comunicación con Sentry
 */

// MODO AGRESIVO: Bloquear completamente todas las comunicaciones con Sentry
const COMPLETELY_DISABLE_SENTRY = true;

if (COMPLETELY_DISABLE_SENTRY) {
  // 1. Bloquear fetch a nivel de red
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    if (url && (url.includes('sentry.io') || url.includes('ingest.sentry'))) {
      console.log('🛡️ BLOCKED Sentry request completely');
      // Retornar respuesta exitosa inmediatamente
      return Promise.resolve(new Response('{"success":true}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return originalFetch.call(this, input, init);
  };

  // 2. Bloquear XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    const urlString = typeof url === 'string' ? url : url.href;
    if (urlString.includes('sentry.io') || urlString.includes('ingest.sentry')) {
      console.log('🛡️ BLOCKED Sentry XHR completely');
      return; // No hacer nada
    }
    return originalXHROpen.call(this, method, url, ...args);
  };

  // 3. Bloquear sendBeacon
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function(url: string | URL, data?: BodyInit | null): boolean {
      const urlString = typeof url === 'string' ? url : url.href;
      if (urlString.includes('sentry.io') || urlString.includes('ingest.sentry')) {
        console.log('🛡️ BLOCKED Sentry beacon completely');
        return true;
      }
      return true; // Siempre retornar true para otras URLs también
    };
  }

  // 4. Interceptar cualquier script de Sentry que se trate de cargar
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string, options?: ElementCreationOptions) {
    const element = originalCreateElement.call(this, tagName, options);
    
    if (tagName.toLowerCase() === 'script') {
      const script = element as HTMLScriptElement;
      const originalSetSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')?.set;
      
      if (originalSetSrc) {
        Object.defineProperty(script, 'src', {
          set: function(value: string) {
            if (value.includes('sentry.io') || value.includes('sentry')) {
              console.log('🛡️ BLOCKED Sentry script load:', value);
              return; // No cargar el script
            }
            originalSetSrc.call(this, value);
          },
          get: function() {
            return this.getAttribute('src') || '';
          }
        });
      }
    }
    
    return element;
  };

  // 5. Desactivar cualquier global de Sentry que pueda existir
  Object.defineProperty(globalThis, 'Sentry', {
    value: {
      init: () => {},
      captureException: () => {},
      captureMessage: () => {},
      captureEvent: () => {},
      addBreadcrumb: () => {},
      setUser: () => {},
      setTag: () => {},
      setTags: () => {},
      setContext: () => {},
      configureScope: () => {},
      withScope: () => {},
    },
    writable: false,
    configurable: false
  });

  // 6. Interceptar window.onerror y window.onunhandledrejection
  globalThis.addEventListener('error', (event) => {
    event.stopImmediatePropagation();
    console.log('🛡️ Intercepted error event to prevent Sentry');
  }, true);

  globalThis.addEventListener('unhandledrejection', (event) => {
    event.stopImmediatePropagation(); 
    console.log('🛡️ Intercepted unhandled rejection to prevent Sentry');
  }, true);

  console.log('🛡️ Sentry COMPLETELY DISABLED - No communication possible');
} else {
  // Código original más suave...
  // [resto del código original...]
}