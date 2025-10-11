/**
 * 🛡️ SENTRY NUCLEAR BLOCKER - Eliminación TOTAL del error 429
 * Intercepta y destruye TODA comunicación con Sentry de forma agresiva
 * Última versión - Sin escapatoria posible para Sentry
 */

// MODO NUCLEAR: Destruir completamente Sentry en todos los niveles
const NUCLEAR_SENTRY_DESTRUCTION = true;
const SENTRY_DOMAINS = ['sentry.io', 'ingest.sentry', 'o4506071217143808.ingest.sentry.io'];
const VERBOSE_LOGGING = false; // Cambiar a true para debug

// ⚡ INTERCEPTOR TEMPRANO - Ejecutar antes que cualquier cosa
(() => {

if (NUCLEAR_SENTRY_DESTRUCTION) {
  // 🚀 1. INTERCEPTOR FETCH NUCLEAR - Más agresivo
  const originalFetch = globalThis.fetch;
  globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Bloquear CUALQUIER URL que contenga dominios de Sentry
    const isSentryRequest = SENTRY_DOMAINS.some(domain => url && url.includes(domain));
    
    if (isSentryRequest) {
      if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: Fetch to', url);
      
      // Retornar Promise que resuelve inmediatamente con respuesta falsa exitosa
      return Promise.resolve(new Response(JSON.stringify({
        success: true,
        blocked: true,
        reason: 'Sentry nuclear blocker active'
      }), {
        status: 200,
        statusText: 'OK',
        headers: { 
          'Content-Type': 'application/json',
          'X-Sentry-Blocked': 'true' 
        }
      }));
    }
    
    // Solo llamar fetch original si NO es Sentry
    try {
      return originalFetch.call(this, input, init);
    } catch (error) {
      // Si hay error, evitar que vaya a Sentry
      return Promise.resolve(new Response('{"error":"blocked"}', { status: 500 }));
    }
  };

  // 🚀 2. DESTRUCTOR XMLHttpRequest NUCLEAR
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    const urlString = typeof url === 'string' ? url : url.href;
    const isSentryRequest = SENTRY_DOMAINS.some(domain => urlString.includes(domain));
    
    if (isSentryRequest) {
      if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: XHR open to', urlString);
      
      // Marcar esta request como bloqueada
      (this as any)._sentryBlocked = true;
      
      // Simular que funcionó pero no hacer nada
      Object.defineProperty(this, 'readyState', { value: 4, writable: false });
      Object.defineProperty(this, 'status', { value: 200, writable: false });
      Object.defineProperty(this, 'responseText', { value: '{"blocked":true}', writable: false });
      
      return;
    }
    
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  XMLHttpRequest.prototype.send = function(data?: any) {
    if ((this as any)._sentryBlocked) {
      if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: XHR send blocked');
      
      // Simular evento de éxito
      setTimeout(() => {
        if (this.onreadystatechange) {
          this.onreadystatechange(new Event('readystatechange'));
        }
        if (this.onload) {
          this.onload(new Event('load'));
        }
      }, 0);
      
      return;
    }
    
    return originalXHRSend.call(this, data);
  };

  // 🚀 3. ANIQUILADOR sendBeacon NUCLEAR
  if (navigator.sendBeacon) {
    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url: string | URL, data?: BodyInit | null): boolean {
      const urlString = typeof url === 'string' ? url : url.href;
      const isSentryRequest = SENTRY_DOMAINS.some(domain => urlString.includes(domain));
      
      if (isSentryRequest) {
        if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: sendBeacon to', urlString);
        return true; // Mentir que se envió exitosamente
      }
      
      return originalSendBeacon(url, data);
    };
  }
  
  // 🚀 4. DESTRUCTOR DE TODOS LOS TIPOS DE REQUEST
  const originalCreateElement = document.createElement;
  document.createElement = function<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElementCreationOptions
  ): HTMLElementTagNameMap[K] {
    const element = originalCreateElement.call(this, tagName, options) as HTMLElementTagNameMap[K];
    
    // Interceptar scripts, images, y cualquier elemento que pueda cargar Sentry
    if (tagName === 'script' || tagName === 'img' || tagName === 'iframe' || tagName === 'link') {
      const interceptSrc = (el: any) => {
        const originalSetAttribute = el.setAttribute;
        el.setAttribute = function(name: string, value: string) {
          if ((name === 'src' || name === 'href') && SENTRY_DOMAINS.some(domain => value.includes(domain))) {
            if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: Element attribute', name, value);
            return; // No setear el atributo
          }
          return originalSetAttribute.call(this, name, value);
        };
        
        // Interceptar property assignment para src
        if (tagName === 'script' || tagName === 'img' || tagName === 'iframe') {
          const srcDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'src');
          if (srcDesc && srcDesc.set) {
            Object.defineProperty(el, 'src', {
              set: function(value: string) {
                if (SENTRY_DOMAINS.some(domain => String(value).includes(domain))) {
                  if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: src property', value);
                  return; // No setear la propiedad
                }
                srcDesc.set!.call(this, value);
              },
              get: srcDesc.get,
              configurable: true
            });
          }
        }
        
        // Interceptar property assignment para href
        if (tagName === 'link') {
          const hrefDesc = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
          if (hrefDesc && hrefDesc.set) {
            Object.defineProperty(el, 'href', {
              set: function(value: string) {
                if (SENTRY_DOMAINS.some(domain => String(value).includes(domain))) {
                  if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: href property', value);
                  return; // No setear la propiedad
                }
                hrefDesc.set!.call(this, value);
              },
              get: hrefDesc.get,
              configurable: true
            });
          }
        }
      };
      
      interceptSrc(element);
    }
    
    return element;
  };


  // 🚀 5. EXTERMINADOR GLOBAL DE SENTRY - Más completo
  const sentryMock = new Proxy({}, {
    get: () => () => {
      if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: Sentry method call intercepted');
      return undefined;
    },
    set: () => true,
    defineProperty: () => true,
    deleteProperty: () => true,
    has: () => true,
    ownKeys: () => [],
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true })
  });
  
  // Sobrescribir Sentry global de todas las formas posibles
  try {
    Object.defineProperty(globalThis, 'Sentry', {
      value: sentryMock,
      writable: false,
      configurable: false,
      enumerable: false
    });
  } catch {}
  
  try {
    (globalThis as any).Sentry = sentryMock;
  } catch {}
  
  try {
    (window as any).Sentry = sentryMock;
  } catch {}
  
  // Interceptar intentos de definir Sentry
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(target: any, key: string | symbol, descriptor: PropertyDescriptor) {
    if (key === 'Sentry') {
      if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: Prevented Sentry definition');
      return target;
    }
    return originalDefineProperty.call(this, target, key, descriptor);
  };

  // 🚀 6. INTERCEPTOR DE ERRORES NUCLEAR - Para evitar que lleguen a Sentry
  const originalAddEventListener = globalThis.addEventListener;
  
  globalThis.addEventListener = function(type: string, listener: any, options?: any) {
    if (type === 'error' || type === 'unhandledrejection') {
      // Interceptar SOLO eventos que vayan a Sentry
      const wrappedListener = function(event: any) {
        // Solo permitir nuestros listeners, bloquear los de Sentry
        if (listener.toString().includes('Sentry') || listener.toString().includes('captureException')) {
          if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: Sentry error listener blocked');
          return;
        }
        
        // Permitir otros listeners normales
        return listener.call(this, event);
      };
      
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // 🚀 7. OVERRIDE COMPLETO DE URL Y LOCATION - Último recurso
  const originalURL = globalThis.URL;
  globalThis.URL = class extends originalURL {
    constructor(url: string | URL, base?: string | URL) {
      const urlStr = typeof url === 'string' ? url : url.href;
      
      if (SENTRY_DOMAINS.some(domain => urlStr.includes(domain))) {
        if (VERBOSE_LOGGING) console.log('🛡️ NUCLEAR BLOCK: URL constructor blocked', urlStr);
        // Devolver una URL dummy
        super('about:blank');
        return;
      }
      
      super(url, base);
    }
  };
}

})();