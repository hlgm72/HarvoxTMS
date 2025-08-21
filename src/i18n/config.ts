import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';
import landingEn from './locales/en/landing.json';
import authEn from './locales/en/auth.json';
import fleetEn from './locales/en/fleet.json';
import equipmentEn from './locales/en/equipment.json';
import legalEn from './locales/en/legal.json';
import dashboardEn from './locales/en/dashboard.json';
import paymentsEn from './locales/en/payments.json';
import loadsEn from './locales/en/loads.json';
import onboardingEn from './locales/en/onboarding.json';
import clientsEn from './locales/en/clients.json';

// Import admin sub-modules
import adminPagesEn from './locales/en/admin/pages.json';
import adminNavigationEn from './locales/en/admin/navigation.json';
import adminCommonEn from './locales/en/admin/common.json';

import commonEs from './locales/es/common.json';
import landingEs from './locales/es/landing.json';
import authEs from './locales/es/auth.json';
import fleetEs from './locales/es/fleet.json';
import equipmentEs from './locales/es/equipment.json';
import legalEs from './locales/es/legal.json';
import adminEs from './locales/es/admin.json';
import dashboardEs from './locales/es/dashboard.json';
import paymentsEs from './locales/es/payments.json';
import loadsEs from './locales/es/loads.json';
import onboardingEs from './locales/es/onboarding.json';
import clientsEs from './locales/es/clients.json';

const resources = {
  en: {
    common: commonEn,
    landing: landingEn,
    auth: authEn,
    fleet: fleetEn,
    equipment: equipmentEn,
    legal: legalEn,
    dashboard: dashboardEn,
    payments: paymentsEn,
    loads: loadsEn,
    onboarding: onboardingEn,
    clients: clientsEn,
    admin: {
      pages: adminPagesEn,
      navigation: adminNavigationEn,
      common: adminCommonEn,
    },
  },
  es: {
    common: commonEs,
    landing: landingEs,
    auth: authEs,
    fleet: fleetEs,
    equipment: equipmentEs,
    legal: legalEs,
    dashboard: dashboardEs,
    payments: paymentsEs,
    loads: loadsEs,
    onboarding: onboardingEs,
    clients: clientsEs,
    admin: adminEs,
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
    ns: ['common', 'landing', 'auth', 'fleet', 'equipment', 'dashboard', 'admin', 'legal', 'payments', 'loads', 'onboarding', 'clients'],
    defaultNS: 'common',
    
    // Configuration
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'],
    },
  });

export default i18n;