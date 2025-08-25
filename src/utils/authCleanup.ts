/**
 * Utility functions for cleaning up authentication state to prevent limbo states
 */

export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up authentication state...');
  
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log(`🗑️ Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log(`🗑️ Removing sessionStorage key: ${key}`);
        sessionStorage.removeItem(key);
      }
    });
  }
  
  // Remove any app-specific auth keys
  const appAuthKeys = [
    'loginSuccess',
    'user-role',
    'currentRole',
    'selectedCompanyId'
  ];
  
  appAuthKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🗑️ Removing app key: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Authentication state cleaned');
};

export const forceSignOut = async () => {
  console.log('🚪 Forcing sign out...');
  
  // Import supabase here to avoid circular imports
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    // Clean up state first
    cleanupAuthState();
    
    // Attempt global sign out
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      console.warn('⚠️ Sign out error (ignoring):', error);
    }
  } catch (error) {
    console.warn('⚠️ Force sign out error (ignoring):', error);
  }
  
  console.log('✅ Force sign out completed');
};

export const debugAuthState = () => {
  console.log('🔍 Debugging authentication state...');
  
  // Check localStorage for auth-related keys
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('auth') || key.includes('supabase') || key.includes('sb-')
  );
  
  console.log('📦 Auth-related localStorage keys:', authKeys);
  
  // Check for conflicting projects
  const supabaseKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('supabase.auth.')
  );
  
  if (supabaseKeys.length > 1) {
    console.warn('⚠️ Multiple Supabase auth keys detected - possible project conflict:', supabaseKeys);
  }
  
  return {
    authKeys,
    supabaseKeys,
    hasConflicts: supabaseKeys.length > 1
  };
};