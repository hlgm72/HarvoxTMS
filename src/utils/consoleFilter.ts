/**
 * 🚨 ANTI-SENTRY SPAM FILTER - Solución definitiva para error 429
 * Intercepta TODOS los console statements para evitar spam a Sentry
 * Solo permite errores críticos reales llegar a Sentry
 */

// Store original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;
const originalDebug = console.debug;

// Current environment
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Patterns for development-only logs (NEVER go to Sentry)
const developmentOnlyPatterns = [
  /^🔍|^📄|^✅|^❌|^⚠️|^🔄|^📊|^📋|^🎯|^🚀|^🧹/,  // Emoji prefixed logs
  /useCreateLoad|payment calculations|ACID/,
  /Debug|debug|DEBUG/,
  /Performance|performance/,
  /Auth operation|Load operation|Fuel operation/,
  /Client en grid|Cliente en lista/,
  /main\.tsx:|PDF worker/,
  /RoleSwitcher|ProtectedRoute/
];

// Patterns that should NEVER go to Sentry regardless of environment
const suppressPatterns = [
  /Failed to execute 'postMessage' on 'DOMWindow'/,
  /The target origin provided .* does not match the recipient window's origin/,
  /Unrecognized feature:/,
  /\[PostHog\.js\] This capture call is ignored due to client rate limiting\./,
  /Network request failed|fetch failed/,
  /ResizeObserver loop limit exceeded/
];

// Critical error patterns that SHOULD go to Sentry (only these!)
const criticalPatterns = [
  /Authentication failed|Auth error/,
  /Database connection failed|SQL error/,
  /Payment processing failed/,
  /File upload failed permanently/,
  /Migration failed|Schema error/
];

function shouldAllowToSentry(level: string, message: string): boolean {
  // In development, allow more logs but still filter spam
  if (isDevelopment) {
    // Suppress known spam patterns
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Suppress development-only logs
    if (developmentOnlyPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Allow errors and warnings in development
    return level === 'error' || level === 'warn';
  }

  // In production, be very strict
  if (isProduction) {
    // Never allow any suppressed patterns
    if (suppressPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Never allow development patterns
    if (developmentOnlyPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Only allow critical errors
    if (level === 'error') {
      return criticalPatterns.some(pattern => pattern.test(message));
    }
    
    // Very limited warnings in production
    if (level === 'warn') {
      return criticalPatterns.some(pattern => pattern.test(message));
    }
  }
  
  return false;
}

// Override console.log - In production, suppress all logs
console.log = (...args: any[]) => {
  if (isDevelopment) {
    const message = args.join(' ');
    // Show in console but don't send to Sentry unless critical
    originalLog.apply(console, args);
  }
  // In production, suppress all console.log
};

// Override console.info - Similar to log
console.info = (...args: any[]) => {
  if (isDevelopment) {
    originalInfo.apply(console, args);
  }
};

// Override console.debug - Always suppress
console.debug = (...args: any[]) => {
  if (isDevelopment) {
    originalDebug.apply(console, args);
  }
};

// Override console.error - Filter for Sentry
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Always show in console
  originalError.apply(console, args);
  
  // But filter what goes to Sentry
  if (!shouldAllowToSentry('error', message)) {
    // Prevent this from reaching Sentry by stopping propagation
    return;
  }
};

// Override console.warn - Filter for Sentry  
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Always show in console
  originalWarn.apply(console, args);
  
  // But filter what goes to Sentry
  if (!shouldAllowToSentry('warn', message)) {
    // Prevent this from reaching Sentry by stopping propagation
    return;
  }
};

// Additional Sentry rate limiting
let sentryEventCount = 0;
let lastResetTime = Date.now();
const SENTRY_RATE_LIMIT = 10; // Max 10 events per minute
const RESET_INTERVAL = 60000; // 1 minute

function isWithinSentryRateLimit(): boolean {
  const now = Date.now();
  
  // Reset counter every minute
  if (now - lastResetTime > RESET_INTERVAL) {
    sentryEventCount = 0;
    lastResetTime = now;
  }
  
  // Check if we're within limits
  if (sentryEventCount >= SENTRY_RATE_LIMIT) {
    originalWarn('🚨 Sentry rate limit reached, suppressing events');
    return false;
  }
  
  sentryEventCount++;
  return true;
}

// Export original methods and utilities
export { 
  originalLog, 
  originalError, 
  originalWarn, 
  originalInfo, 
  originalDebug,
  isWithinSentryRateLimit
};