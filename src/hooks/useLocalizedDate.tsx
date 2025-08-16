import { useTranslation } from 'react-i18next';
import { formatDateAuto, formatDateTimeAuto, getGlobalLanguage } from '@/lib/dateFormatting';
import { es, enUS } from 'date-fns/locale';

/**
 * Hook para formateo automático de fechas según el idioma activo
 */
export const useLocalizedDate = () => {
  const { i18n } = useTranslation();
  
  const currentLanguage = i18n.language || 'en';
  const locale = currentLanguage === 'es' ? es : enUS;
  const dateFormat = currentLanguage === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
  const dateTimeFormat = currentLanguage === 'es' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm';
  
  return {
    currentLanguage,
    locale,
    dateFormat,
    dateTimeFormat,
    formatDate: formatDateAuto,
    formatDateTime: formatDateTimeAuto,
  };
};