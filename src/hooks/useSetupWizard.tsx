import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function useSetupWizard() {
  const { user, currentRole } = useAuth();
  const { preferences } = useUserPreferences();
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSetupStatus = useCallback(() => {
    if (!user || !currentRole) return;

    try {
      // Si el usuario ha deshabilitado el setup wizard, no mostrarlo
      if (preferences?.disable_setup_wizard) {
        setShouldShowSetup(false);
        setIsLoading(false);
        return;
      }

      // Verificar si ya completó el setup usando localStorage
      const setupKey = `fleetnest_setup_${user.id}_${currentRole}`;
      const completed = localStorage.getItem(setupKey);
      
      // También verificar si completó el onboarding - USAR MISMA CLAVE que useOnboarding
      const onboardingKey = `onboarding_${user.id}_${currentRole}`;
      const onboardingCompleted = localStorage.getItem(onboardingKey);
      
      // Mostrar setup solo si completó onboarding pero no setup
      const shouldShow = Boolean(onboardingCompleted) && !Boolean(completed);
      
      setShouldShowSetup(shouldShow);
    } catch (error) {
      console.error('Error checking setup status:', error);
      setShouldShowSetup(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentRole, preferences]);

  useEffect(() => {
    if (!user || !currentRole) {
      setIsLoading(false);
      setShouldShowSetup(false);
      return;
    }

    checkSetupStatus();
  }, [checkSetupStatus, user, currentRole]);

  // Listen for onboarding completion to immediately activate setup
  useEffect(() => {
    if (!user || !currentRole) return;
    
    const handleOnboardingCompleted = () => {
      checkSetupStatus();
    };
    
    const handleStorageChange = () => {
      checkSetupStatus();
    };
    
    // Listen for custom onboarding completion event (immediate)
    window.addEventListener('onboardingCompleted', handleOnboardingCompleted);
    
    // Listen for storage changes (fallback for cross-tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Much longer interval as final fallback - only check every 5 seconds
    const interval = setInterval(() => {
      checkSetupStatus();
    }, 5000);
    
    return () => {
      window.removeEventListener('onboardingCompleted', handleOnboardingCompleted);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [checkSetupStatus, user, currentRole]);

  const markSetupCompleted = useCallback(() => {
    if (!user || !currentRole) return;

    try {
      const setupKey = `fleetnest_setup_${user.id}_${currentRole}`;
      localStorage.setItem(setupKey, JSON.stringify({
        completed: true,
        completed_at: new Date().toISOString()
      }));

      setShouldShowSetup(false);
    } catch (error) {
      console.error('Error marking setup completed:', error);
    }
  }, [user, currentRole]);

  const resetSetup = useCallback(() => {
    if (!user || !currentRole) return;

    try {
      const setupKey = `fleetnest_setup_${user.id}_${currentRole}`;
      localStorage.removeItem(setupKey);
      setShouldShowSetup(true);
    } catch (error) {
      console.error('Error resetting setup:', error);
    }
  }, [user, currentRole]);

  return {
    shouldShowSetup,
    isLoading,
    markSetupCompleted,
    resetSetup,
    currentRole: currentRole || 'driver'
  };
}