import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function useOnboarding() {
  const { user, currentRole } = useAuth();
  const { preferences } = useUserPreferences();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentRole) {
      setIsLoading(false);
      return;
    }

    checkOnboardingStatus();
  }, [user, currentRole, preferences]);

  const checkOnboardingStatus = () => {
    if (!user || !currentRole) return;

    try {
      // Verificar si ya completó el onboarding usando localStorage
      const onboardingKey = `onboarding_${user.id}_${currentRole}`;
      const completed = localStorage.getItem(onboardingKey);
      
      // Si ya completó el onboarding, no mostrarlo más
      // Solo se vuelve a mostrar si se resetea explícitamente
      setShouldShowOnboarding(!completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setShouldShowOnboarding(true); // Mostrar por defecto si hay error
    } finally {
      setIsLoading(false);
    }
  };

  const markOnboardingCompleted = (skipped = false) => {
    console.log('🎯 markOnboardingCompleted called:', { user: !!user, currentRole, skipped });
    
    if (!user || !currentRole) {
      console.log('❌ Cannot mark onboarding completed - missing user or role');
      return;
    }

    try {
      const onboardingKey = `onboarding_${user.id}_${currentRole}`;
      const dataToSave = {
        completed: true,
        skipped,
        completed_at: new Date().toISOString()
      };
      
      console.log('💾 Saving to localStorage:', { key: onboardingKey, data: dataToSave });
      localStorage.setItem(onboardingKey, JSON.stringify(dataToSave));

      // Disparar evento inmediatamente para activar setup wizard
      window.dispatchEvent(new CustomEvent('onboardingCompleted', { 
        detail: { userId: user.id, role: currentRole } 
      }));

      console.log('✅ Onboarding marked as completed, setting shouldShowOnboarding to false');
      setShouldShowOnboarding(false);
    } catch (error) {
      console.error('Error marking onboarding completed:', error);
    }
  };

  const resetOnboarding = () => {
    if (!user || !currentRole) return;

    try {
      const onboardingKey = `onboarding_${user.id}_${currentRole}`;
      localStorage.removeItem(onboardingKey);
      setShouldShowOnboarding(true);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return {
    shouldShowOnboarding,
    isLoading,
    markOnboardingCompleted,
    resetOnboarding,
    currentRole: currentRole || 'driver'
  };
}