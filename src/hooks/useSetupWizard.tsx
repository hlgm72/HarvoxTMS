import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useSetupWizard() {
  const { user, currentRole } = useAuth();
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentRole) {
      setIsLoading(false);
      return;
    }

    checkSetupStatus();
  }, [user, currentRole]);

  const checkSetupStatus = () => {
    if (!user || !currentRole) return;

    try {
      // Verificar si ya completó el setup usando localStorage
      const setupKey = `fleetnest_setup_${user.id}_${currentRole}`;
      const completed = localStorage.getItem(setupKey);
      
      // También verificar si completó el onboarding - USAR MISMA CLAVE que useOnboarding
      const onboardingKey = `onboarding_${user.id}_${currentRole}`;
      const onboardingCompleted = localStorage.getItem(onboardingKey);
      
      // Mostrar setup solo si completó onboarding pero no setup
      const shouldShow = onboardingCompleted && !completed;
      
      console.log('🔧 Setup wizard check:', {
        setupKey,
        onboardingKey,
        onboardingCompleted: !!onboardingCompleted,
        setupCompleted: !!completed,
        shouldShow,
        userExists: !!user,
        roleExists: !!currentRole,
        userId: user?.id,
        role: currentRole
      });
      
      console.log('🔧 Raw localStorage values:', {
        onboardingRaw: onboardingCompleted,
        setupRaw: completed
      });
      
      setShouldShowSetup(shouldShow);
    } catch (error) {
      console.error('Error checking setup status:', error);
      setShouldShowSetup(false);
    } finally {
      setIsLoading(false);
    }
  };

  const markSetupCompleted = () => {
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
  };

  const resetSetup = () => {
    if (!user || !currentRole) return;

    try {
      const setupKey = `fleetnest_setup_${user.id}_${currentRole}`;
      localStorage.removeItem(setupKey);
      setShouldShowSetup(true);
    } catch (error) {
      console.error('Error resetting setup:', error);
    }
  };

  return {
    shouldShowSetup,
    isLoading,
    markSetupCompleted,
    resetSetup,
    currentRole: currentRole || 'driver'
  };
}