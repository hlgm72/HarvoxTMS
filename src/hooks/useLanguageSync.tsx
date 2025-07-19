import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from './useUserProfile';

/**
 * Hook que sincroniza el idioma preferido del perfil del usuario con i18n
 * Se asegura de que el idioma se mantenga después de refrescar la página
 */
export const useLanguageSync = () => {
  const { i18n } = useTranslation();
  const { profile, loading } = useUserProfile();

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

  return {
    currentLanguage: i18n.language,
    changeLanguage: (language: string) => {
      i18n.changeLanguage(language);
    }
  };
};