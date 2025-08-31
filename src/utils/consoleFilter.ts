/**
 * Console filter to suppress repetitive postMessage errors
 * These errors are typically caused by iframe communication issues in development
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Patterns to suppress
const suppressPatterns = [
  /Failed to execute 'postMessage' on 'DOMWindow'/,
  /The target origin provided .* does not match the recipient window's origin/,
  /Unrecognized feature:/,
  /\[PostHog\.js\] This capture call is ignored due to client rate limiting\./
];

// Enhanced console.error that filters unwanted messages
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if this message should be suppressed
  const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
  
  if (!shouldSuppress) {
    originalError.apply(console, args);
  }
};

// Enhanced console.warn that filters unwanted messages
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if this message should be suppressed
  const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
  
  if (!shouldSuppress) {
    originalWarn.apply(console, args);
  }
};

// Export original methods in case we need them
export { originalError, originalWarn };