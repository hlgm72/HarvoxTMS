import { supabase } from '@/integrations/supabase/client';

export const cleanupAuthState = () => {
  // Enhanced cleanup: Clear all auth-related keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || 
        key.includes('sb-') || 
        key === 'currentRole' || 
        key === 'lastActiveRole' ||
        key === 'loginSuccess' ||
        key === 'profile_refresh_needed') {
      localStorage.removeItem(key);
    }
  });
  
  // Enhanced cleanup: Clear from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || 
        key.includes('sb-') || 
        key === 'activeRole') {
      sessionStorage.removeItem(key);
    }
  });

  // Clear any custom role-related keys
  localStorage.removeItem('i18nextLng'); // Optional: reset language on logout
};

export const refreshAuthSession = async () => {
  try {
    // Force refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
};

export const forceReauth = async () => {
  try {
    // Clean up state
    cleanupAuthState();
    
    // Try to sign out globally
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
      console.warn('Global signout failed:', err);
    }
    
    // Force page reload for clean state
    window.location.href = '/auth';
  } catch (error) {
    console.error('Error during force reauth:', error);
    // Force reload anyway
    window.location.href = '/auth';
  }
};