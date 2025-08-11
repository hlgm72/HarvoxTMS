import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from './useUserProfile';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook que sincroniza el idioma preferido del perfil del usuario con i18n
 * Se asegura de que el idioma se mantenga después de refrescar la página
 * y mantiene la sincronización bidireccional entre perfil y switcher
 */
export const useLanguageSync = () => {
  const { i18n } = useTranslation();
  const { profile, loading, user, refreshProfile } = useUserProfile();

  useEffect(() => {
    // Solo ejecutar cuando ya se haya cargado el perfil
    if (loading) return;

    if (profile?.preferred_language) {
      // Si el usuario tiene un idioma preferido en su perfil, usarlo
      if (profile.preferred_language !== i18n.language) {
        i18n.changeLanguage(profile.preferred_language);
      }
    } else {
      // Si no hay idioma preferido en el perfil, usar el detectado por i18n (localStorage/navegador)
      // Esto permite que usuarios nuevos usen el idioma de su navegador
      const detectedLanguage = localStorage.getItem('i18nextLng') || 'en';
      if (detectedLanguage !== i18n.language) {
        i18n.changeLanguage(detectedLanguage);
      }
    }
  }, [profile?.preferred_language, loading, i18n]);

  // Escuchar cambios en i18n y actualizar el perfil en la BD
  useEffect(() => {
    const handleLanguageChange = async (language: string) => {
      // Si hay usuario autenticado y el idioma cambió
      if (user && profile && profile.preferred_language !== language) {
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              preferred_language: language,
            }, {
              onConflict: 'user_id'
            });

          if (!error) {
            // Refrescar el perfil para obtener los datos actualizados
            await refreshProfile();
          }
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
  }, [user, profile, i18n, refreshProfile]);

  return {
    currentLanguage: i18n.language,
    changeLanguage: async (language: string) => {
      await i18n.changeLanguage(language);
    }
  };
};