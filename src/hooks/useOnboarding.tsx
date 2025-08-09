import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingProgress {
  user_id: string;
  role: string;
  completed: boolean;
  skipped?: boolean;
  completed_at?: string;
  created_at?: string;
}

export function useOnboarding() {
  const { user, currentRole } = useAuth();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !currentRole) {
      setIsLoading(false);
      return;
    }

    checkOnboardingStatus();
  }, [user, currentRole]);

  const checkOnboardingStatus = async () => {
    if (!user || !currentRole) return;

    try {
      // Verificar si ya completó el onboarding para este rol
      const { data: progress, error } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', currentRole)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error);
        setIsLoading(false);
        return;
      }

      // Si no hay registro o no está completado, mostrar onboarding
      const shouldShow = !progress || (!progress.completed && !progress.skipped);
      setShouldShowOnboarding(shouldShow);
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markOnboardingCompleted = async (skipped = false) => {
    if (!user || !currentRole) return;

    try {
      await supabase
        .from('user_onboarding_progress')
        .upsert({
          user_id: user.id,
          role: currentRole,
          completed: true,
          skipped,
          completed_at: new Date().toISOString()
        });

      setShouldShowOnboarding(false);
    } catch (error) {
      console.error('Error marking onboarding completed:', error);
    }
  };

  const resetOnboarding = async () => {
    if (!user || !currentRole) return;

    try {
      await supabase
        .from('user_onboarding_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('role', currentRole);

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