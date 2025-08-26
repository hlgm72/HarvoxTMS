import { useTranslation } from 'react-i18next';
import { formatDateAuto, formatDateTimeAuto, getGlobalLanguage, getDateFormats } from '@/lib/dateFormatting';
import { es, enUS } from 'date-fns/locale';

/**
 * Hook para formateo automático de fechas según el idioma activo
 * ✅ CORREGIDO: Usar funciones centralizadas en lugar de patrones hardcodeados
 */
export const useLocalizedDate = () => {
  const { i18n } = useTranslation();
  
  const currentLanguage = i18n.language || 'en';
  const locale = currentLanguage === 'es' ? es : enUS;
  
  // ✅ Usar funciones centralizadas en lugar de patrones hardcodeados
  const formats = getDateFormats();
  const dateFormat = currentLanguage === 'es' ? formats.SHORT_DATE_ES : formats.SHORT_DATE_EN;
  const dateTimeFormat = currentLanguage === 'es' ? formats.DATE_TIME_ES : formats.DATE_TIME_EN;
  
  return {
    currentLanguage,
    locale,
    dateFormat,
    dateTimeFormat,
    formatDate: formatDateAuto,
    formatDateTime: formatDateTimeAuto,
  };
};