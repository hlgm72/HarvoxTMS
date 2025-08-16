import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

/**
 * Hook para formateo de fechas usando date-fns con internacionalización automática
 */
export const useInternationalizedFormat = () => {
  const { i18n } = useTranslation();
  
  const locale = i18n.language === 'es' ? es : enUS;
  
  const formatDate = (date: Date, pattern: string) => {
    return format(date, pattern, { locale });
  };
  
  const formatDateWithPattern = (date: Date, esPattern: string, enPattern: string) => {
    const pattern = i18n.language === 'es' ? esPattern : enPattern;
    return format(date, pattern, { locale });
  };
  
  return {
    formatDate,
    formatDateWithPattern,
    locale,
    currentLanguage: i18n.language,
  };
};