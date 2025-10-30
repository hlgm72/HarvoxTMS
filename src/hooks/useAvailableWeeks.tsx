import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { calculateWeekNumberFromString, calculateWeekYearFromString } from '@/utils/weekCalculation';

interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
}

interface MonthWeeks {
  month: number;
  weeks: WeekData[];
}

interface YearWeeks {
  year: number;
  months: MonthWeeks[];
}

/**
 * Hook para obtener los años, meses y semanas disponibles con datos en company_payment_periods
 * Agrupa semanas por año y mes para navegación de 3 niveles
 */
export function useAvailableWeeks(companyId?: string) {
  return useQuery({
    queryKey: ['available-weeks', companyId],
    queryFn: async () => {
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('period_start_date, period_end_date')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (error) {
        console.error('Error fetching available weeks:', error);
        throw error;
      }

      // Estructura: Map<year, Map<month, Set<weekData>>>
      const weeksMap = new Map<number, Map<number, Map<number, WeekData>>>();
      
      data?.forEach(period => {
        if (period.period_start_date && period.period_end_date) {
          // Calcular duración del período
          const [startYear, startMonth, startDay] = period.period_start_date.split('-').map(Number);
          const [endYear, endMonth, endDay] = period.period_end_date.split('-').map(Number);
          const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
          const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
          const durationDays = differenceInDays(end, start) + 1;
          
          // Solo incluir períodos semanales (7-10 días)
          if (durationDays <= 10) {
            // Usar año ISO de la semana (consistente con formatPeriodLabel)
            const weekYear = calculateWeekYearFromString(period.period_start_date);
            const weekNumber = calculateWeekNumberFromString(period.period_start_date);
            
            // Para el mes de navegación: usar el punto medio de la semana para determinar el mes
            // Esto evita que W01/2025 (30-dic-2024 a 5-ene-2025) aparezca en Diciembre 2025
            const midDate = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
            const month = midDate.getMonth() + 1; // 1-12
            
            if (!weeksMap.has(weekYear)) {
              weeksMap.set(weekYear, new Map());
            }
            
            const yearMap = weeksMap.get(weekYear)!;
            if (!yearMap.has(month)) {
              yearMap.set(month, new Map());
            }
            
            const monthMap = yearMap.get(month)!;
            
            // Solo agregar si no existe
            if (!monthMap.has(weekNumber)) {
              monthMap.set(weekNumber, {
                weekNumber,
                startDate: period.period_start_date,
                endDate: period.period_end_date
              });
            }
          }
        }
      });

      // Convertir a array estructurado
      const result: YearWeeks[] = Array.from(weeksMap.entries())
        .map(([year, monthsMap]) => ({
          year,
          months: Array.from(monthsMap.entries())
            .map(([month, weeksMap]) => ({
              month,
              weeks: Array.from(weeksMap.values())
                .sort((a, b) => b.weekNumber - a.weekNumber) // Semanas más recientes primero
            }))
            .sort((a, b) => b.month - a.month) // Meses más recientes primero
        }))
        .sort((a, b) => b.year - a.year); // Años más recientes primero

      return result;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
