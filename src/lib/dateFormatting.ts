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