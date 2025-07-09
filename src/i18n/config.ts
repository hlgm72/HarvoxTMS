import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEn from './locales/en/common.json';
import landingEn from './locales/en/landing.json';
import authEn from './locales/en/auth.json';

import commonEs from './locales/es/common.json';
import landingEs from './locales/es/landing.json';
import authEs from './locales/es/auth.json';

const resources = {
  en: {
    common: commonEn,
    landing: landingEn,
    auth: authEn,
  },
  es: {
    common: commonEs,
    landing: landingEs,
    auth: authEs,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language (English)
    fallbackLng: 'en',
    
    // Namespaces
    ns: ['common', 'landing', 'auth'],
    defaultNS: 'common',
    
    // Configuration
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;