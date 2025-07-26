import { supabase } from '@/integrations/supabase/client';

// Enhanced auth state cleanup utility
export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth state...');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  }
  
  // Remove additional auth-related keys
  const authKeys = [
    'supabase.auth.token',
    'sb-auth-token',
    'currentRole'
  ];
  
  authKeys.forEach(key => {
    localStorage.removeItem(key);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  });
};

// Global auth error handler
export const handleAuthError = (error: any, context: string = '') => {
  console.error(`🚨 Auth error in ${context}:`, error);
  
  // Check if this is a refresh token error
  if (
    error?.message?.includes('refresh token') ||
    error?.message?.includes('Invalid Refresh Token') ||
    error?.message?.includes('Refresh Token Not Found') ||
    error?.message?.includes('JWT') ||
    error?.message?.includes('Invalid') ||
    error?.code === 'PGRST301'
  ) {
    console.log('🔧 Detected auth token error, initiating cleanup...');
    
    // Clean up auth state
    cleanupAuthState();
    
    // Clear any pending auth operations
    setTimeout(() => {
      // Force redirect to auth page
      console.log('🔄 Redirecting to auth page due to token error...');
      window.location.href = '/auth';
    }, 100);
    
    return true; // Indicates the error was handled
  }
  
  return false; // Error was not handled
};

// Setup global error listener for unhandled auth errors
export const setupGlobalAuthErrorHandler = () => {
  // Listen for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && handleAuthError(event.reason, 'unhandled rejection')) {
      event.preventDefault(); // Prevent default error handling
    }
  });
  
  // Listen for general errors
  window.addEventListener('error', (event) => {
    if (event.error && handleAuthError(event.error, 'window error')) {
      event.preventDefault(); // Prevent default error handling
    }
  });
  
  console.log('🛡️ Global auth error handler setup complete');
};

// Recovery function to attempt to restore valid session
export const attemptAuthRecovery = async () => {
  try {
    console.log('🔄 Attempting auth recovery...');
    
    // First clean up any corrupted state
    cleanupAuthState();
    
    // Try to get a fresh session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Session recovery failed:', error);
      return false;
    }
    
    if (session) {
      console.log('✅ Session recovered successfully');
      return true;
    }
    
    console.log('ℹ️ No valid session found');
    return false;
  } catch (error) {
    console.error('❌ Auth recovery attempt failed:', error);
    handleAuthError(error, 'auth recovery');
    return false;
  }
};