/**
 * 🛡️ SENTRY EVENT BLOCKER - Protección definitiva contra error 429
 * Intercepta y bloquea eventos de Sentry en el nivel de red
 */

// Patterns for events that should NEVER reach Sentry
const blockedEventPatterns = [
  // Development/Debug logs
  /useCreateLoad|payment calculations|ACID|PDF worker/,
  /Client en grid|Cliente en lista|RoleSwitcher|ProtectedRoute/,
  /Debug|debug|DEBUG|Performance|performance/,
  
  // UI/UX related
  /ResizeObserver|postMessage|DOMWindow/,
  /Unrecognized feature|PostHog\.js/,
  
  // Network/Connection issues (not critical)
  /Network request failed|fetch failed|Connection refused/,
  /timeout|TIMEOUT|TimeoutError/,
  
  // Development emojis and prefixes
  /^🔍|^📄|^✅|^❌|^⚠️|^🔄|^📊|^📋|^🎯|^🚀|^🧹|^ℹ️/
];

// Override fetch to intercept Sentry requests
const originalFetch = globalThis.fetch;

globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Check if this is a Sentry request
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  if (url && url.includes('sentry.io')) {
    // Parse the request body to check if we should block it
    if (init?.body && typeof init.body === 'string') {
      try {
        // Sentry sends data in various formats, try to parse
        const body = init.body;
        
        // Check if the body contains any blocked patterns
        const shouldBlock = blockedEventPatterns.some(pattern => pattern.test(body));
        
        if (shouldBlock) {
          console.log('🛡️ Blocked Sentry event:', body.substring(0, 200) + '...');
          
          // Return a fake successful response to prevent retries
          return Promise.resolve(new Response('{"success":true}', {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      } catch (e) {
        // If we can't parse the body, let it through (might be critical)
        console.log('🛡️ Unable to parse Sentry body, allowing through');
      }
    }
    
    // For non-blocked Sentry requests, add rate limiting
    const now = Date.now();
    const rateLimitKey = 'sentry_last_send';
    const lastSend = parseInt(localStorage.getItem(rateLimitKey) || '0');
    
    // Only allow one Sentry request per 5 seconds
    if (now - lastSend < 5000) {
      console.log('🛡️ Sentry rate limited - too frequent');
      return Promise.resolve(new Response('{"success":true}', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    localStorage.setItem(rateLimitKey, now.toString());
  }
  
  // For all other requests, proceed normally
  return originalFetch.call(this, input, init);
};

// Override XMLHttpRequest for older Sentry SDK versions
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
  // Check if this is a Sentry request
  if (this.responseURL && this.responseURL.includes('sentry.io')) {
    // Block the request
    console.log('🛡️ Blocked Sentry XHR request');
    return;
  }
  
  return originalXHRSend.call(this, body);
};

// Override BeaconAPI for Sentry's sendBeacon usage
if (navigator.sendBeacon) {
  const originalSendBeacon = navigator.sendBeacon.bind(navigator);
  
  navigator.sendBeacon = function(url: string | URL, data?: BodyInit | null): boolean {
    const urlString = typeof url === 'string' ? url : url.href;
    
    if (urlString.includes('sentry.io')) {
      console.log('🛡️ Blocked Sentry beacon request');
      return true; // Return true to indicate "success"
    }
    
    return originalSendBeacon(url, data);
  };
}

// Emergency kill switch - completely disable Sentry if too many errors
let errorCount = 0;
const MAX_ERRORS_PER_MINUTE = 5;
const ERROR_RESET_INTERVAL = 60000;
let lastErrorReset = Date.now();

function shouldKillSentry(): boolean {
  const now = Date.now();
  
  // Reset error count every minute
  if (now - lastErrorReset > ERROR_RESET_INTERVAL) {
    errorCount = 0;
    lastErrorReset = now;
  }
  
  errorCount++;
  
  if (errorCount > MAX_ERRORS_PER_MINUTE) {
    console.error('🚨 EMERGENCY: Too many errors, killing all Sentry communication');
    return true;
  }
  
  return false;
}

// Override global error handler to catch Sentry errors
const originalErrorHandler = globalThis.onerror;

globalThis.onerror = function(message, source, lineno, colno, error) {
  if (shouldKillSentry()) {
    return true; // Prevent default handling
  }
  
  // Check if this error should be blocked
  const errorMessage = typeof message === 'string' ? message : String(message);
  const shouldBlock = blockedEventPatterns.some(pattern => pattern.test(errorMessage));
  
  if (shouldBlock) {
    console.log('🛡️ Blocked error from reaching Sentry:', errorMessage.substring(0, 100));
    return true; // Prevent default handling
  }
  
  // Allow critical errors through
  if (originalErrorHandler) {
    return originalErrorHandler.call(this, message, source, lineno, colno, error);
  }
  
  return false;
};

console.log('🛡️ Sentry blocker activated - Network level protection enabled');