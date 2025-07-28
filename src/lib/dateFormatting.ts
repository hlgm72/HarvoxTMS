/**
 * Módulo central para formateo de fechas
 * Este archivo centraliza todas las funciones de formateo de fechas para asegurar consistencia
 */

import { 
  formatDateSafe,
  formatDatabaseDate,
  formatDateTime,
  formatDateOnly,
  getYearSafe,
  formatDateInUserTimeZone,
  getUserTimeZone,
  getTodayInUserTimeZone,
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
  SHORT_DATE: 'dd/MM/yyyy',
  LONG_DATE: 'dd \'de\' MMMM \'de\' yyyy',
  DATE_TIME: 'dd/MM/yyyy HH:mm',
  DATE_TIME_SECONDS: 'dd/MM/yyyy HH:mm:ss',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: 'yyyy-MM-dd\'T\'HH:mm:ss',
  DISPLAY_DATE: 'dd MMM yyyy',
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
  if (!startDate || !endDate) return 'Período no definido';
  
  const start = formatDateOnly(startDate);
  const end = formatDateOnly(endDate);
  
  if (start === 'No definida' || end === 'No definida') {
    return 'Período incompleto';
  }
  
  return `${start} - ${end}`;
};

/**
 * Formateo compacto para períodos de pago (para filtros y espacios reducidos)
 */
export const formatPaymentPeriodCompact = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) return 'No definido';
  
  const start = formatDateSafe(startDate, 'dd/MM/yy');
  const end = formatDateSafe(endDate, 'dd/MM/yy');
  
  if (start === 'No definida' || end === 'No definida') {
    return 'Incompleto';
  }
  
  return `${start} - ${end}`;
};

/**
 * Formateo ultra compacto para badges (omite año si es el mismo)
 */
export const formatPaymentPeriodBadge = (startDate: string | null, endDate: string | null): string => {
  if (!startDate || !endDate) return 'No definido';
  
  const startYear = getYearSafe(startDate);
  const endYear = getYearSafe(endDate);
  
  // Si es el mismo año, omitir el año en ambas fechas
  if (startYear === endYear) {
    const start = formatDateSafe(startDate, 'dd/MM');
    const end = formatDateSafe(endDate, 'dd/MM');
    return `${start} - ${end}`;
  }
  
  // Si son años diferentes, mostrar año solo en la fecha final
  const start = formatDateSafe(startDate, 'dd/MM');
  const end = formatDateSafe(endDate, 'dd/MM/yy');
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
export const getExpiryInfo = (date: string | null | undefined): { 
  text: string; 
  isExpiring: boolean; 
  isExpired: boolean; 
} => {
  if (!date) return { text: 'Sin vencimiento', isExpiring: false, isExpired: false };
  
  const expiryDate = new Date(date);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isExpired = diffDays < 0;
  const isExpiring = diffDays >= 0 && diffDays <= 90; // Menos de 3 meses (90 días)
  
  return {
    text: formatDateOnly(date),
    isExpiring,
    isExpired
  };
};