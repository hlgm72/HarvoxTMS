import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from './useUserProfile';
import { useUserPreferences } from './useUserPreferences';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook que sincroniza el idioma preferido del perfil del usuario con i18n
 * Se asegura de que el idioma se mantenga después de refrescar la página
 * y mantiene la sincronización bidireccional entre perfil y switcher
 */
export const useLanguageSync = () => {
  const { i18n } = useTranslation();
  const { user } = useUserProfile();
  const { preferences, loading, updatePreferences } = useUserPreferences();

  useEffect(() => {
    // Solo ejecutar cuando ya se haya cargado las preferencias
    if (loading) return;

    if (preferences?.preferred_language) {
      // Si el usuario tiene un idioma preferido en sus preferencias, usarlo
      if (preferences.preferred_language !== i18n.language) {
        i18n.changeLanguage(preferences.preferred_language);
      }
    } else {
      // Si no hay idioma preferido en las preferencias, usar el detectado por i18n (localStorage/navegador)
      // Esto permite que usuarios nuevos usen el idioma de su navegador
      const detectedLanguage = localStorage.getItem('i18nextLng') || 'en';
      if (detectedLanguage !== i18n.language) {
        i18n.changeLanguage(detectedLanguage);
      }
    }
  }, [preferences?.preferred_language, loading, i18n]);

  // Escuchar cambios en i18n y actualizar las preferencias en la BD
  useEffect(() => {
    const handleLanguageChange = async (language: string) => {
      // Si hay usuario autenticado y el idioma cambió
      if (user && preferences && preferences.preferred_language !== language) {
        try {
          await updatePreferences({
            preferred_language: language,
          });
        } catch (error) {
          console.error('Error updating language preference:', error);
        }
      }
    };

    // Escuchar eventos de cambio de idioma
    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [user, preferences, i18n, updatePreferences]);

  return {
    currentLanguage: i18n.language,
    changeLanguage: async (language: string) => {
      await i18n.changeLanguage(language);
    }
  };
};