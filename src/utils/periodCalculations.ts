import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addWeeks, 
  subWeeks, 
  addDays, 
  subDays,
  addMonths,
  subMonths,
  format,
  parseISO
} from 'date-fns';
import { formatDateInUserTimeZone, getUserTimeZone } from '@/lib/dateFormatting';

export interface CalculatedPeriod {
  startDate: string;
  endDate: string;
  frequency: string;
  type: 'current' | 'previous' | 'next';
}

interface CompanyConfig {
  default_payment_frequency: 'weekly' | 'biweekly' | 'monthly';
  payment_cycle_start_day: number; // 1-7 (Monday = 1, Sunday = 7)
}

/**
 * Calcula períodos dinámicamente basado en configuración de empresa
 */
export class PeriodCalculator {
  private config: CompanyConfig;

  constructor(config: CompanyConfig) {
    this.config = config;
  }

  /**
   * Obtiene el período actual basado en la fecha de hoy y configuración de empresa
   */
  getCurrentPeriod(): CalculatedPeriod {
    const today = new Date();
    
    switch (this.config.default_payment_frequency) {
      case 'weekly':
        return this.getWeeklyPeriod(today, 'current');
      case 'biweekly':
        return this.getBiweeklyPeriod(today, 'current');
      case 'monthly':
        return this.getMonthlyPeriod(today, 'current');
      default:
        return this.getWeeklyPeriod(today, 'current');
    }
  }

  /**
   * Obtiene el período anterior
   */
  getPreviousPeriod(): CalculatedPeriod {
    const today = new Date();
    
    // Primero obtenemos el período actual, luego calculamos el anterior
    const currentPeriod = this.getCurrentPeriod();
    
    switch (this.config.default_payment_frequency) {
      case 'weekly':
        // Para semanal: restar 7 días del inicio del período actual
        const prevWeekStart = subDays(parseISO(currentPeriod.startDate + 'T00:00:00'), 7);
        return this.getWeeklyPeriod(prevWeekStart, 'previous');
      case 'biweekly':
        // Para quincenal: restar 14 días del inicio del período actual
        const prevBiweekStart = subDays(parseISO(currentPeriod.startDate + 'T00:00:00'), 14);
        return this.getBiweeklyPeriod(prevBiweekStart, 'previous');
      case 'monthly':
        // Para mensual: restar 1 mes del inicio del período actual
        const prevMonthStart = subMonths(parseISO(currentPeriod.startDate + 'T00:00:00'), 1);
        return this.getMonthlyPeriod(prevMonthStart, 'previous');
      default:
        const defaultPrevStart = subDays(parseISO(currentPeriod.startDate + 'T00:00:00'), 7);
        return this.getWeeklyPeriod(defaultPrevStart, 'previous');
    }
  }

  /**
   * Obtiene el próximo período
   */
  getNextPeriod(): CalculatedPeriod {
    const today = new Date();
    
    // Primero obtenemos el período actual, luego calculamos el siguiente
    const currentPeriod = this.getCurrentPeriod();
    
    switch (this.config.default_payment_frequency) {
      case 'weekly':
        // Para semanal: agregar 7 días al final del período actual
        const nextWeekStart = addDays(parseISO(currentPeriod.endDate + 'T00:00:00'), 1);
        return this.getWeeklyPeriod(nextWeekStart, 'next');
      case 'biweekly':
        // Para quincenal: agregar 1 día al final del período actual
        const nextBiweekStart = addDays(parseISO(currentPeriod.endDate + 'T00:00:00'), 1);
        return this.getBiweeklyPeriod(nextBiweekStart, 'next');
      case 'monthly':
        // Para mensual: agregar 1 mes al inicio del período actual
        const nextMonthStart = addMonths(parseISO(currentPeriod.startDate + 'T00:00:00'), 1);
        return this.getMonthlyPeriod(nextMonthStart, 'next');
      default:
        const defaultNextStart = addDays(parseISO(currentPeriod.endDate + 'T00:00:00'), 1);
        return this.getWeeklyPeriod(defaultNextStart, 'next');
    }
  }

  /**
   * Calcula período semanal respetando el día de inicio configurado
   */
  private getWeeklyPeriod(referenceDate: Date, type: 'current' | 'previous' | 'next'): CalculatedPeriod {
    // Convertir payment_cycle_start_day (1=Monday, 7=Sunday) a weekStartsOn (0=Sunday, 1=Monday, etc.)
    const weekStartsOn = (this.config.payment_cycle_start_day === 7 ? 0 : this.config.payment_cycle_start_day) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    
    const periodStart = startOfWeek(referenceDate, { weekStartsOn });
    const periodEnd = endOfWeek(referenceDate, { weekStartsOn });

    return {
      startDate: formatDateInUserTimeZone(periodStart),
      endDate: formatDateInUserTimeZone(periodEnd),
      frequency: 'weekly',
      type
    };
  }

  /**
   * Calcula período quincenal (cada 14 días)
   */
  private getBiweeklyPeriod(referenceDate: Date, type: 'current' | 'previous' | 'next'): CalculatedPeriod {
    // Para quincenal, usamos un punto de referencia fijo y calculamos períodos de 14 días
    // Usar el primer día del año como punto de referencia
    const yearStart = new Date(referenceDate.getFullYear(), 0, 1);
    
    // Calcular cuántos días han pasado desde el inicio del año
    const daysSinceYearStart = Math.floor((referenceDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular en qué período quincenal estamos (0-based)
    const biweeklyPeriod = Math.floor(daysSinceYearStart / 14);
    
    // Calcular las fechas del período actual
    const periodStart = addDays(yearStart, biweeklyPeriod * 14);
    const periodEnd = addDays(periodStart, 13); // 14 días total (0-13)

    return {
      startDate: formatDateInUserTimeZone(periodStart),
      endDate: formatDateInUserTimeZone(periodEnd),
      frequency: 'biweekly',
      type
    };
  }

  /**
   * Calcula período mensual
   */
  private getMonthlyPeriod(referenceDate: Date, type: 'current' | 'previous' | 'next'): CalculatedPeriod {
    const periodStart = startOfMonth(referenceDate);
    const periodEnd = endOfMonth(referenceDate);

    return {
      startDate: formatDateInUserTimeZone(periodStart),
      endDate: formatDateInUserTimeZone(periodEnd),
      frequency: 'monthly',
      type
    };
  }
}

/**
 * Función utilitaria para crear un calculador de períodos
 */
export const createPeriodCalculator = (companyConfig: CompanyConfig): PeriodCalculator => {
  return new PeriodCalculator(companyConfig);
};

/**
 * Funciones de conveniencia para usar sin instanciar la clase
 */
export const calculateCurrentPeriod = (companyConfig: CompanyConfig): CalculatedPeriod => {
  return new PeriodCalculator(companyConfig).getCurrentPeriod();
};

export const calculatePreviousPeriod = (companyConfig: CompanyConfig): CalculatedPeriod => {
  return new PeriodCalculator(companyConfig).getPreviousPeriod();
};

export const calculateNextPeriod = (companyConfig: CompanyConfig): CalculatedPeriod => {
  return new PeriodCalculator(companyConfig).getNextPeriod();
};