/**
 * Módulo central para formateo de fechas
 * Este archivo centraliza todas las funciones de formateo de fechas para asegurar consistencia
 */

import { format, parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es, enUS } from 'date-fns/locale';

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

// Exportar constantes para que otros componentes puedan acceder
export const getDateFormats = () => DATE_PATTERNS;

// Helper para obtener el formato de fecha para DatePicker
export const getDatePickerFormat = (language?: string): string => {
  const lang = language || getGlobalLanguage();
  return lang === 'es' ? DATE_PATTERNS.SHORT_DATE_ES : DATE_PATTERNS.SHORT_DATE_EN;
};

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
 * Calcula el número de período (semana, quincena, mes) y año para mostrar en paréntesis
 */
export const getPeriodNumber = (
  startDate: string | null, 
  endDate: string | null, 
  frequency: string | null
): string => {
  if (!startDate || !endDate || !frequency) {
    return '';
  }

  try {
    const start = new Date(startDate);
    const year = start.getFullYear();
    const language = getGlobalLanguage();

    switch (frequency) {
      case 'weekly': {
        // Calcular número de semana del año (1-53)
        const startOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.floor((start.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
        
        const weekText = language === 'es' ? 'Semana' : 'Week';
        return `${weekText} ${weekNumber}, ${year}`;
      }
      
      case 'biweekly': {
        // Calcular número de quincena del año (1-26)
        const startOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.floor((start.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        const biweekNumber = Math.ceil(dayOfYear / 14);
        
        const biweekText = language === 'es' ? 'Quincena' : 'Biweek';
        return `${biweekText} ${biweekNumber}, ${year}`;
      }
      
      case 'monthly': {
        // Calcular mes del año (1-12)
        const month = start.getMonth() + 1;
        const monthText = language === 'es' ? 'Mes' : 'Month';
        return `${monthText} ${month}, ${year}`;
      }
      
      default:
        return '';
    }
  } catch (error) {
    console.error('Error calculating period number:', error);
    return '';
  }
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
 * Core date utilities (moved from dateUtils to break circular dependency)
 */
export const getUserTimeZone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const formatDateInUserTimeZone = (date: Date): string => {
  const userTimeZone = getUserTimeZone();
  return formatInTimeZone(date, userTimeZone, 'yyyy-MM-dd');
};

export const getTodayInUserTimeZone = (): string => {
  return formatDateInUserTimeZone(new Date());
};

export const createDateInUserTimeZone = (year: number, month: number, day: number): string => {
  const date = new Date(year, month, day);
  return formatDateInUserTimeZone(date);
};

export const formatDateSafe = (
  dateInput: string | Date | null | undefined, 
  formatPattern?: string,
  options: { locale?: any } = {}
): string => {
  // ✅ VALIDACIÓN MEJORADA - Detectar todos los casos de valores no válidos
  if (!dateInput || 
      dateInput === 'N/A' || 
      dateInput === 'n/a' ||
      dateInput === 'NA' ||
      (typeof dateInput === 'string' && dateInput.trim() === '')) {
    return 'No definida';
  }
  
  if (!formatPattern) {
    // ✅ EVITAR RECURSIÓN - No usar formatDateAuto aquí para prevenir ciclos infinitos
    const language = getGlobalLanguage();
    return formatDateOnlyWithLocale(dateInput, language);
  }
  
  try {
    let dateToFormat: Date;
    
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T') && (dateInput.includes(':') || dateInput.includes('Z'))) {
        dateToFormat = parseISO(dateInput);
        if (!isValid(dateToFormat)) {
          return 'Fecha inválida';
        }
      } else {
        let year: number, month: number, day: number;
        
        if (dateInput.includes('T')) {
          const datePart = dateInput.split('T')[0];
          [year, month, day] = datePart.split('-').map(Number);
        } else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
          [year, month, day] = dateInput.split('-').map(Number);
        } else {
          // Si no es un formato reconocido, intentar crear fecha local como fallback
          console.warn('Formato de fecha no reconocido:', dateInput, 'usando fecha local como fallback');
          const currentDate = new Date();
          dateToFormat = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 0, 0, 0);
        }
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return 'Fecha inválida';
        }
        
        dateToFormat = new Date(year, month - 1, day, 12, 0, 0, 0);
      }
    } else {
      dateToFormat = dateInput;
    }
    
    if (!isValid(dateToFormat)) {
      return 'Fecha inválida';
    }
    
    return format(dateToFormat, formatPattern, options);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateInput);
    return 'Error en fecha';
  }
};

export const formatDatabaseDate = (
  dateString: string | null | undefined,
  formatPattern?: string
): string => {
  if (!formatPattern) {
    return formatDateAuto(dateString);
  }
  return formatDateSafe(dateString, formatPattern);
};

export const formatDateTime = (
  dateInput: string | Date | null | undefined,
  formatPattern?: string
): string => {
  if (!formatPattern) {
    return formatDateTimeAuto(dateInput);
  }
  return formatDateSafe(dateInput, formatPattern);
};

export const formatDateOnly = (
  dateInput: string | Date | null | undefined
): string => {
  if (!dateInput || dateInput === 'N/A') return 'No definida';
  
  try {
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T00:00:00') && dateInput.includes('+00')) {
        const datePart = dateInput.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return 'Fecha inválida';
        }
        
        const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        return formatDateAuto(localDate);
      }
    }
    
    return formatDateAuto(dateInput);
  } catch (error) {
    console.error('Error formatting date only:', error, 'Input:', dateInput);
    return 'Error en fecha';
  }
};

export const getYearSafe = (dateInput: string | Date | null | undefined): number | null => {
  if (!dateInput) return null;
  
  try {
    const formatted = formatDateSafe(dateInput, 'yyyy');
    return parseInt(formatted, 10);
  } catch {
    return null;
  }
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
  if (!date || date === 'N/A') return 'Sin vencimiento';
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
  
  if (!date || date === 'N/A') return { text: noExpiryText, isExpiring: false, isExpired: false };
  
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
  // ✅ VALIDACIÓN MEJORADA - Detectar todos los casos de valores no válidos
  if (!dateInput || 
      dateInput === 'N/A' || 
      dateInput === 'n/a' ||
      dateInput === 'NA' ||
      (typeof dateInput === 'string' && dateInput.trim() === '')) {
    return language === 'es' ? 'No definida' : 'Not defined';
  }
  
  try {
    const locale = language === 'es' ? es : enUS;
    // ✅ CORREGIDO: Usar patrones centralizados y evitar recursión
    const pattern = language === 'es' ? DATE_PATTERNS.SHORT_DATE_ES : DATE_PATTERNS.SHORT_DATE_EN;
    
    // ✅ LLAMAR DIRECTAMENTE A format() PARA EVITAR RECURSIÓN
    let dateToFormat: Date;
    
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T') && (dateInput.includes(':') || dateInput.includes('Z'))) {
        dateToFormat = parseISO(dateInput);
        if (!isValid(dateToFormat)) {
          return language === 'es' ? 'Fecha inválida' : 'Invalid date';
        }
      } else {
        let year: number, month: number, day: number;
        
        if (dateInput.includes('T')) {
          const datePart = dateInput.split('T')[0];
          [year, month, day] = datePart.split('-').map(Number);
        } else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
          [year, month, day] = dateInput.split('-').map(Number);
        } else {
          return language === 'es' ? 'Fecha inválida' : 'Invalid date';
        }
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          return language === 'es' ? 'Fecha inválida' : 'Invalid date';
        }
        
        dateToFormat = new Date(year, month - 1, day, 12, 0, 0, 0);
      }
    } else {
      dateToFormat = dateInput;
    }
    
    if (!isValid(dateToFormat)) {
      return language === 'es' ? 'Fecha inválida' : 'Invalid date';
    }
    
    return format(dateToFormat, pattern, { locale });
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
export const formatCurrency = (
  amount: number, 
  options: { 
    minimumFractionDigits?: number, 
    maximumFractionDigits?: number,
    style?: 'currency' | 'decimal'
  } = {}
): string => {
  const language = getGlobalLanguage();
  
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    style = 'decimal'
  } = options;
  
  try {
    if (style === 'currency') {
      const formatter = new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits,
        maximumFractionDigits
      });
      return formatter.format(amount);
    } else {
      // Format as decimal with currency symbol prefix
      const formatted = amount.toLocaleString(language === 'es' ? 'es-US' : 'en-US', { 
        minimumFractionDigits, 
        maximumFractionDigits 
      });
      return `$${formatted}`;
    }
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `$${amount.toFixed(minimumFractionDigits)}`;
  }
};

// Función para formatear números respetando idioma
export const formatNumber = (
  number: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  const language = getGlobalLanguage();
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;
  
  try {
    return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return number.toString();
  }
};

export const formatDateTimeAuto = (dateInput: string | Date | null | undefined): string => {
  const language = getGlobalLanguage();
  const locale = language === 'es' ? es : enUS;
  // ✅ CORREGIDO: Usar patrones centralizados
  const pattern = language === 'es' ? DATE_PATTERNS.DATE_TIME_ES : DATE_PATTERNS.DATE_TIME_EN;
  
  if (!dateInput || dateInput === 'N/A') return language === 'es' ? 'No definida' : 'Not defined';
  
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

export const formatDateTimeShort = (dateInput: string | Date | null | undefined): string => {
  const language = getGlobalLanguage();
  const locale = language === 'es' ? es : enUS;
  const pattern = language === 'es' ? 'dd/MM HH:mm' : 'MM/dd HH:mm';
  
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
    console.error('Error formatting datetime short:', error);
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