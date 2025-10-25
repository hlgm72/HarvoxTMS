import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getISOWeek } from 'date-fns';

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
          // CRÍTICO: Usar la fecha de inicio del período para calcular año/mes/semana
          const startDate = new Date(period.period_start_date + 'T12:00:00Z');
          const year = startDate.getUTCFullYear();
          const month = startDate.getUTCMonth() + 1; // 1-12
          const weekNumber = getISOWeek(startDate); // ISO week (1-53)
          
          if (!weeksMap.has(year)) {
            weeksMap.set(year, new Map());
          }
          
          const yearMap = weeksMap.get(year)!;
          if (!yearMap.has(month)) {
            yearMap.set(month, new Map());
          }
          
          const monthMap = yearMap.get(month)!;
          
          // Solo agregar si no existe o actualizar con el rango más amplio
          if (!monthMap.has(weekNumber)) {
            monthMap.set(weekNumber, {
              weekNumber,
              startDate: period.period_start_date,
              endDate: period.period_end_date
            });
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
