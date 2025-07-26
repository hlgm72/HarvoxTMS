// Security utilities for input validation and sanitization

/**
 * Email validation with enhanced security checks
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Length checks
  if (email.length > 254) return false; // RFC 5321 limit
  
  // Check for common attack patterns
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  return !maliciousPatterns.some(pattern => pattern.test(email));
};

/**
 * Sanitize text input to prevent XSS
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/data:/gi, '') // Remove data protocol
    .replace(/vbscript:/gi, '') // Remove vbscript protocol
    .trim();
};

/**
 * Validate UUID format
 */
export const validateUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check length (7-15 digits is reasonable for international numbers)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript/i,
    /<script/i,
    /data:/i
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(phone));
};

/**
 * Validate file upload security
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 10MB limit' };
  }
  
  // Check allowed file types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed' };
  }
  
  // Check file name for suspicious patterns
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.pif$/i,
    /\.com$/i,
    /\.js$/i,
    /\.jar$/i,
    /<script/i,
    /javascript:/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return { isValid: false, error: 'File name contains suspicious patterns' };
  }
  
  return { isValid: true };
};

/**
 * Rate limiting helper
 */
interface RateLimitConfig {
  maxAttempts: number;
  timeWindow: number; // in milliseconds
}

const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

export const checkRateLimit = (key: string, config: RateLimitConfig): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      attempts: 1,
      resetTime: now + config.timeWindow
    });
    return true;
  }
  
  if (entry.attempts >= config.maxAttempts) {
    return false; // Rate limit exceeded
  }
  
  entry.attempts++;
  return true;
};

/**
 * Generate secure random string for tokens
 */
export const generateSecureToken = (length: number = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues for cryptographically secure randomness
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  
  return result;
};

/**
 * Validate and sanitize URL
 */
export const validateURL = (url: string): { isValid: boolean; sanitized?: string; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      return { isValid: false, error: 'URL contains suspicious patterns' };
    }
    
    return { isValid: true, sanitized: urlObj.toString() };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};