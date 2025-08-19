/**
 * Módulo central para formateo de fechas
 * Este archivo centraliza todas las funciones de formateo de fechas para asegurar consistencia
 */

import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es, enUS } from 'date-fns/locale';
import { 
  formatDateSafe,
  formatDateTime,
  formatDateOnly,
  formatDatabaseDate,
  getTodayInUserTimeZone,
  formatDateInUserTimeZone,
  getYearSafe,
  getUserTimeZone,
  createDateInUserTimeZone
} from '@/utils/dateUtils';

export { 
  formatDateSafe,
  formatDatabaseDate,
  formatDateTime,
  formatDateOnly,
  getYearSafe,
  formatDateInUserTimeZone,
  getUserTimeZone,
  getTodayInUserTimeZone,
  createDateInUserTimeZone
};

/**
 * Constantes para patrones de fecha comunes
 */
export const DATE_PATTERNS = {
  // Patrones en español
  SHORT_DATE_ES: 'dd/MM/yyyy',
  LONG_DATE_ES: 'dd \'de\' MMMM \'de\' yyyy',
  DATE_TIME_ES: 'dd/MM/yyyy HH:mm',
  DATE_TIME_SECONDS_ES: 'dd/MM/yyyy HH:mm:ss',
  DISPLAY_DATE_ES: 'dd MMM yyyy',
  
  // Patrones en inglés
  SHORT_DATE_EN: 'MM/dd/yyyy',
  LONG_DATE_EN: 'MMMM dd, yyyy',
  DATE_TIME_EN: 'MM/dd/yyyy HH:mm',
  DATE_TIME_SECONDS_EN: 'MM/dd/yyyy HH:mm:ss',
  DISPLAY_DATE_EN: 'MMM dd, yyyy',
  
  // Patrones universales
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: 'yyyy-MM-dd\'T\'HH:mm',
  MONTH_YEAR: 'MMM yyyy',
  YEAR_ONLY: 'yyyy'
} as const;

/**
 * Funciones específicas para contextos comunes
 */

/**
 * Formateo específico para períodos de pago
 */
export const formatPaymentPeriod = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) {
    const language = getGlobalLanguage();
    return language === 'es' ? 'Período no definido' : 'Period not defined';
  }
  
  const start = formatDateAuto(startDate);
  const end = formatDateAuto(endDate);
  
  const language = getGlobalLanguage();
  const invalidText = language === 'es' ? 'Período incompleto' : 'Incomplete period';
  const notDefinedText = language === 'es' ? 'No definida' : 'Not defined';
  
  if (start === notDefinedText || end === notDefinedText) {
    return invalidText;
  }
  
  return `${start} - ${end}`;
};

/**
 * Formateo compacto para períodos de pago (para filtros y espacios reducidos)
 */
export const formatPaymentPeriodCompact = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) {
    const language = getGlobalLanguage();
    return language === 'es' ? 'No definido' : 'Not defined';
  }
  
  const language = getGlobalLanguage();
  const pattern = language === 'es' ? 'dd/MM/yy' : 'MM/dd/yy';
  
  const start = formatDateSafe(startDate, pattern);
  const end = formatDateSafe(endDate, pattern);
  
  const notDefinedText = language === 'es' ? 'No definida' : 'Not defined';
  const incompleteText = language === 'es' ? 'Incompleto' : 'Incomplete';
  
  if (start === notDefinedText || end === notDefinedText) {
    return incompleteText;
  }
  
  return `${start} - ${end}`;
};

/**
 * Formateo ultra compacto para badges (omite año si es el mismo)
 */
export const formatPaymentPeriodBadge = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) {
    const language = getGlobalLanguage();
    return language === 'es' ? 'No definido' : 'Not defined';
  }
  
  const startYear = getYearSafe(startDate);
  const endYear = getYearSafe(endDate);
  const language = getGlobalLanguage();
  
  // Si es el mismo año, omitir el año en ambas fechas
  if (startYear === endYear) {
    const pattern = language === 'es' ? 'dd/MM' : 'MM/dd';
    const start = formatDateSafe(startDate, pattern);
    const end = formatDateSafe(endDate, pattern);
    return `${start} - ${end}`;
  }
  
  // Si son años diferentes, mostrar año solo en la fecha final
  const startPattern = language === 'es' ? 'dd/MM' : 'MM/dd';
  const endPattern = language === 'es' ? 'dd/MM/yy' : 'MM/dd/yy';
  const start = formatDateSafe(startDate, startPattern);
  const end = formatDateSafe(endDate, endPattern);
  return `${start} - ${end}`;
};

/**
 * Formateo específico para deducciones
 */
export const formatDeductionDate = (date: string | Date | null | undefined): string => {
  return formatDateOnly(date);
};

/**
 * Formateo específico para documentos con fecha de vencimiento
 */
export const formatExpiryDate = (date: string | null | undefined): string => {
  if (!date) return 'Sin vencimiento';
  return formatDateOnly(date);
};

/**
 * Función para obtener información de vencimiento con advertencias
 */
export const getExpiryInfo = (date: string | null | undefined, currentLanguage?: string): { 
  text: string; 
  isExpiring: boolean; 
  isExpired: boolean; 
} => {
  // Detectar idioma actual desde i18n si no se proporciona
  let detectedLanguage = currentLanguage;
  if (!detectedLanguage) {
    try {
      // Intentar acceder al idioma actual desde i18n global
      const i18n = (window as any).i18n;
      detectedLanguage = i18n?.language || 'en';
    } catch {
      detectedLanguage = 'en'; // fallback por defecto
    }
  }
  
  const noExpiryText = detectedLanguage === 'es' ? 'Sin vencimiento' : 'No expiry';
  
  if (!date) return { text: noExpiryText, isExpiring: false, isExpired: false };
  
  try {
    // Parsear fecha de forma segura evitando problemas de zona horaria
    let year: number, month: number, day: number;
    
    if (date.includes('T') || date.includes('Z')) {
      // Formato ISO: extraer solo la parte de fecha
      const datePart = date.split('T')[0];
      [year, month, day] = datePart.split('-').map(Number);
    } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Formato solo fecha: YYYY-MM-DD
      [year, month, day] = date.split('-').map(Number);
    } else {
      return { text: formatDateOnlyWithLocale(date, detectedLanguage), isExpiring: false, isExpired: false };
    }
    
    // Crear fechas locales evitando zona horaria UTC
    const expiryDate = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para seguridad
    const today = new Date();
    today.setHours(12, 0, 0, 0); // También establecer mediodía para comparación justa
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isExpired = diffDays < 0;
    const isExpiring = diffDays >= 0 && diffDays <= 90; // Menos de 3 meses (90 días)
    
    return {
      text: formatDateOnlyWithLocale(date, detectedLanguage),
      isExpiring,
      isExpired
    };
  } catch (error) {
    console.error('Error processing expiry date:', error);
    return { text: formatDateOnlyWithLocale(date, detectedLanguage), isExpiring: false, isExpired: false };
  }
};

// Nueva función para formatear fechas según el idioma
const formatDateOnlyWithLocale = (dateInput: string | Date | null | undefined, language: string = 'en'): string => {
  if (!dateInput) return language === 'es' ? 'No definida' : 'Not defined';
  
  try {
    const locale = language === 'es' ? es : enUS;
    // Usar diferentes patrones según el idioma
    const pattern = language === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    return formatDateSafe(dateInput, pattern, { locale });
  } catch (error) {
    console.error('Error formatting date with locale:', error);
    return language === 'es' ? 'Fecha inválida' : 'Invalid date';
  }
};

// Función global para detectar idioma automáticamente desde i18n
export const getGlobalLanguage = (): string => {
  try {
    // Intentar acceder al idioma actual desde i18n global
    const i18n = (window as any).i18n;
    return i18n?.language || 'en';
  } catch {
    return 'en'; // fallback por defecto
  }
};

// Funciones de formateo que detectan idioma automáticamente
export const formatDateAuto = (dateInput: string | Date | null | undefined): string => {
  const language = getGlobalLanguage();
  return formatDateOnlyWithLocale(dateInput, language);
};

// Funciones de formateo mejoradas con date-fns que respetan internacionalización
export const formatInternationalized = (date: Date, pattern: string): string => {
  const language = getGlobalLanguage();
  const locale = language === 'es' ? es : enUS;
  
  try {
    return format(date, pattern, { locale });
  } catch (error) {
    console.error('Error formatting date with pattern:', pattern, error);
    return language === 'es' ? 'Fecha inválida' : 'Invalid date';
  }
};

// Función para formatear fechas PPP (Pretty Print)
export const formatPrettyDate = (date: Date | null | undefined): string => {
  if (!date) return getGlobalLanguage() === 'es' ? 'Seleccionar fecha' : 'Select date';
  return formatInternationalized(date, 'PPP');
};

// Función para formatear fechas cortas
export const formatShortDate = (date: Date | null | undefined): string => {
  if (!date) return '';
  const language = getGlobalLanguage();
  const pattern = language === 'es' ? 'dd/MM/yy' : 'MM/dd/yy';
  return formatInternationalized(date, pattern);
};

// Función para formatear fechas medianas
export const formatMediumDate = (date: Date | null | undefined): string => {
  if (!date) return '';
  const language = getGlobalLanguage();
  const pattern = language === 'es' ? 'dd MMM yyyy' : 'MMM dd, yyyy';
  return formatInternationalized(date, pattern);
};

// Función para nombres de meses
export const formatMonthName = (date: Date): string => {
  return formatInternationalized(date, 'MMMM');
};

// Función para formatear dinero respetando idioma
export const formatCurrency = (amount: number): string => {
  const language = getGlobalLanguage();
  
  try {
    if (language === 'es') {
      return amount.toLocaleString('es-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else {
      return amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
  } catch (error) {
    console.error('Error formatting currency:', error);
    return amount.toFixed(2);
  }
};

export const formatDateTimeAuto = (dateInput: string | Date | null | undefined): string => {
  const language = getGlobalLanguage();
  const locale = language === 'es' ? es : enUS;
  const pattern = language === 'es' ? 'dd/MM/yyyy HH:mm' : 'MM/dd/yyyy HH:mm';
  
  if (!dateInput) return language === 'es' ? 'No definida' : 'Not defined';
  
  try {
    // Obtener zona horaria del usuario
    const userTimeZone = getUserTimeZone();
    
    // Si es un string, parsearlo como fecha ISO (UTC)
    let date: Date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = dateInput;
    }
    
    // Verificar que la fecha sea válida
    if (!date || isNaN(date.getTime())) {
      return language === 'es' ? 'Fecha inválida' : 'Invalid date';
    }
    
    // Formatear en la zona horaria del usuario usando date-fns-tz
    return formatInTimeZone(date, userTimeZone, pattern, { locale });
  } catch (error) {
    console.error('Error formatting datetime auto:', error);
    return language === 'es' ? 'Fecha inválida' : 'Invalid date';
  }
};

/**
 * Convierte fecha de usuario a UTC para consultas a base de datos
 * Uso: Para filtros y búsquedas que necesitan enviar fecha en UTC
 */
export const convertUserDateToUTC = (userDate: Date): string => {
  return new Date(userDate.getTime() - (userDate.getTimezoneOffset() * 60000)).toISOString();
};

/**
 * Obtiene fecha actual en UTC para consultas
 * Uso: Para comparaciones y consultas que requieren timestamp actual en UTC
 */
export const getCurrentUTC = (): string => {
  return new Date().toISOString();
};

/**
 * Convierte rango de fechas del usuario a UTC para consultas
 * Uso: Para filtros de periodo que necesitan convertir fechas locales a UTC
 */
export const convertDateRangeToUTC = (startDate: Date, endDate: Date): { start: string; end: string } => {
  return {
    start: convertUserDateToUTC(startDate),
    end: convertUserDateToUTC(endDate)
  };
};