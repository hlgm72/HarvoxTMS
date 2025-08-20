import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserPreferences {
  id: string;
  user_id: string;
  preferred_language: string;
  timezone: string;
  disable_welcome_modal: boolean;
  disable_onboarding_tour: boolean;
  disable_setup_wizard: boolean;
  theme: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreferences = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      // If no preferences exist, create defaults
      if (!data) {
        const defaultPreferences = {
          user_id: user.id,
          preferred_language: 'en',
          timezone: 'America/New_York',
          disable_welcome_modal: false,
          disable_onboarding_tour: false,
          disable_setup_wizard: false,
          theme: 'system',
          notifications_enabled: true,
        };

        const { data: newData, error: createError } = await supabase
          .from('user_preferences')
          .upsert(defaultPreferences, { onConflict: 'user_id' })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default preferences:', createError);
          return;
        }

        setPreferences(newData);
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return { success: false, error: 'Usuario no encontrado' };

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating preferences:', error);
        return { success: false, error: error.message };
      }

      await fetchPreferences();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error desconocido' };
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    } else {
      setPreferences(null);
    }
  }, [user?.id]);

  return {
    preferences,
    loading,
    fetchPreferences,
    updatePreferences,
  };
};