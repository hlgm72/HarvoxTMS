import { format, getISOWeek, getISOWeekYear, getYear, differenceInDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

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
  console.log('🔍 formatPeriodLabel input:', { startDate, endDate });
  
  // Crear fechas locales para evitar problemas de zona horaria
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  const start = new Date(startYear, startMonth - 1, startDay); // Fecha local
  const end = new Date(endYear, endMonth - 1, endDay); // Fecha local
  const year = getYear(start);
  const language = getGlobalLanguage();
  
  console.log('🔍 Parsed dates:', { 
    start: start.toISOString(), 
    end: end.toISOString(),
    year,
    startLocal: start.toLocaleDateString(),
    endLocal: end.toLocaleDateString()
  });
  
  // Calcular la duración del período
  const durationDays = differenceInDays(end, start) + 1;
  console.log('🔍 Duration days:', durationDays);
  
  // Si es semanal (7-10 días), mostrar número de semana
  if (durationDays <= 10) {
    const weekNumber = getISOWeek(start); // Semana ISO estándar (lunes como primer día)
    const weekYear = getISOWeekYear(start); // Año ISO de la semana (puede diferir del año calendario)
    
    console.log('🔍 Week calculation:', { 
      weekNumber, 
      weekYear,
      startDate: start.toISOString(),
      startDateLocalString: start.toLocaleDateString()
    });
    
    return `WK${weekNumber.toString().padStart(2, '0')} - ${weekYear}`;
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