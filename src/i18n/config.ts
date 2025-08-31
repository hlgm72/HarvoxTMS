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
import documentsEn from './locales/en/documents.json';
import fuelEn from './locales/en/fuel.json';
import usersEn from './locales/en/users.json';
import settingsEn from './locales/en/settings.json';
import invitationEn from './locales/en/invitation.json';
import errorsEn from './locales/en/errors.json';

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
import dashboardEs from './locales/es/dashboard.json';
import paymentsEs from './locales/es/payments.json';
import loadsEs from './locales/es/loads.json';
import onboardingEs from './locales/es/onboarding.json';
import clientsEs from './locales/es/clients.json';
import documentsEs from './locales/es/documents.json';
import fuelEs from './locales/es/fuel.json';
import usersEs from './locales/es/users.json';
import settingsEs from './locales/es/settings.json';
import invitationEs from './locales/es/invitation.json';
import errorsEs from './locales/es/errors.json';

// Import Spanish admin sub-modules
import adminPagesEs from './locales/es/admin/pages.json';
import adminNavigationEs from './locales/es/admin/navigation.json';
import adminCommonEs from './locales/es/admin/common.json';

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
    documents: documentsEn,
    fuel: fuelEn,
    users: usersEn,
    settings: settingsEn,
    invitation: invitationEn,
    errors: errorsEn,
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
    documents: documentsEs,
    fuel: fuelEs,
    users: usersEs,
    settings: settingsEs,
    invitation: invitationEs,
    errors: errorsEs,
    admin: {
      pages: adminPagesEs,
      navigation: adminNavigationEs,
      common: adminCommonEs,
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // Default language (Spanish)
    fallbackLng: 'es',
    
    // Namespaces
    ns: ['common', 'landing', 'auth', 'fleet', 'equipment', 'dashboard', 'admin', 'legal', 'payments', 'loads', 'onboarding', 'clients', 'documents', 'fuel', 'users', 'settings', 'invitation', 'errors'],
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