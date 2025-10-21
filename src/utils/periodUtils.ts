import { format, getYear, differenceInDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { calculateWeekNumberFromString } from './weekCalculation';

/**
 * Obtiene el idioma global de la aplicación
 */
const getGlobalLanguage = (): string => {
  try {
    const i18n = (window as any).i18n;
    return i18n?.language || 'en';
  } catch {
    return 'en';
  }
};

/**
 * Genera el formato de período para mostrar en las tarjetas
 * Ejemplos: "WK32 - 2025" para semanal, "AGO - 2025" para mensual
 */
export const formatPeriodLabel = (startDate: string, endDate: string): string => {
  // ✅ USANDO FUNCIONES SEGURAS - Evitar problemas de zona horaria
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  // Crear fechas locales exactas sin conversión UTC automática
  const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0); // Mediodía para seguridad
  const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0); // Mediodía para seguridad
  const year = getYear(start);
  const language = getGlobalLanguage();
  
  // Calcular la duración del período
  const durationDays = differenceInDays(end, start) + 1;
  
  // Si es semanal (7-10 días), mostrar número de semana usando cálculo unificado
  if (durationDays <= 10) {
    const weekNumber = calculateWeekNumberFromString(startDate);
    return `W${weekNumber.toString().padStart(2, '0')}/${year}`;
  }
  
  // Si es mensual (25-35 días), mostrar nombre del mes
  if (durationDays >= 25 && durationDays <= 35) {
    const locale = language === 'es' ? es : enUS;
    const monthName = format(start, 'MMM', { locale }).toUpperCase();
    return `${monthName} - ${year}`;
  }
  
  // Para otros períodos (quincenales, etc.), mostrar mes y parte del período
  if (durationDays >= 10 && durationDays < 25) {
    const locale = language === 'es' ? es : enUS;
    const monthName = format(start, 'MMM', { locale }).toUpperCase();
    const startDay = format(start, 'dd');
    return `${monthName}${startDay} - ${year}`;
  }
  
  // Fallback para períodos atípicos
  const locale = language === 'es' ? es : enUS;
  const monthName = format(start, 'MMM', { locale }).toUpperCase();
  return `${monthName} - ${year}`;
};