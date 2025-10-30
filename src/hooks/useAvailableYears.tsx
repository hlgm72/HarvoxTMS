import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateWeekYearFromString } from '@/utils/weekCalculation';
import { differenceInDays } from 'date-fns';

/**
 * Hook para obtener los años disponibles con datos en company_payment_periods
 * Usa año ISO de la semana para períodos semanales (consistente con formatPeriodLabel)
 */
export function useAvailableYears(companyId?: string) {
  return useQuery({
    queryKey: ['available-years', companyId],
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
        console.error('Error fetching available years:', error);
        throw error;
      }

      // Extraer años únicos usando la misma lógica que formatPeriodLabel
      const years = new Set<number>();
      data?.forEach(period => {
        if (period.period_start_date && period.period_end_date) {
          // Calcular duración del período
          const [startYear, startMonth, startDay] = period.period_start_date.split('-').map(Number);
          const [endYear, endMonth, endDay] = period.period_end_date.split('-').map(Number);
          const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
          const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
          const durationDays = differenceInDays(end, start) + 1;
          
          // Si es semanal (7-10 días), usar año ISO de la semana
          if (durationDays <= 10) {
            const weekYear = calculateWeekYearFromString(period.period_start_date);
            years.add(weekYear);
          } else {
            // Para períodos mensuales/quincenales, usar año de la fecha de inicio
            years.add(startYear);
          }
        }
      });

      // Convertir a array y ordenar descendente (más reciente primero)
      return Array.from(years).sort((a, b) => b - a);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
