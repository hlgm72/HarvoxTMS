import { format, getYear, differenceInDays } from 'date-fns';
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
  
  // ✅ USANDO FUNCIONES SEGURAS - Evitar problemas de zona horaria
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  // Crear fechas locales exactas sin conversión UTC automática
  const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0); // Mediodía para seguridad
  const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0); // Mediodía para seguridad
  const year = getYear(start);
  const language = getGlobalLanguage();
  
  console.log('🔍 Parsed dates:', { 
    startLocal: start.toLocaleDateString(),
    endLocal: end.toLocaleDateString(),
    year
  });
  
  // Calcular la duración del período
  const durationDays = differenceInDays(end, start) + 1;
  console.log('🔍 Duration days:', durationDays);
  
  // Si es semanal (7-10 días), mostrar número de semana usando cálculo consistente con BD
  if (durationDays <= 10) {
    // ✅ USAR MÉTODO COMPATIBLE CON POSTGRESQL EXTRACT(WEEK FROM date)
    // PostgreSQL calcula la semana donde el lunes es el primer día de la semana
    // y la primera semana del año es la que contiene el 4 de enero
    
    // Encontrar el lunes de la semana que contiene startDate
    const dayOfWeek = start.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convertir a lunes=0
    const mondayOfWeek = new Date(start);
    mondayOfWeek.setDate(start.getDate() - daysFromMonday);
    
    // Encontrar el lunes de la primera semana del año
    // La primera semana es la que contiene el 4 de enero
    const jan4 = new Date(year, 0, 4); // 4 de enero
    const jan4DayOfWeek = jan4.getDay();
    const jan4DaysFromMonday = jan4DayOfWeek === 0 ? 6 : jan4DayOfWeek - 1;
    const firstMondayOfYear = new Date(jan4);
    firstMondayOfYear.setDate(4 - jan4DaysFromMonday);
    
    // Calcular diferencia en días y convertir a semanas
    const daysDiff = Math.floor((mondayOfWeek.getTime() - firstMondayOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    
    console.log('🔍 Week calculation FIXED:', { 
      weekNumber, 
      year,
      startDate: start.toLocaleDateString(),
      mondayOfWeek: mondayOfWeek.toLocaleDateString(),
      firstMondayOfYear: firstMondayOfYear.toLocaleDateString(),
      daysDiff
    });
    
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