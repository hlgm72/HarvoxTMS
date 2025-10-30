import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

interface QuarterData {
  year: number;
  quarters: number[]; // [1, 2, 3, 4]
}

/**
 * Hook para obtener los años y trimestres disponibles con datos en company_payment_periods
 */
export function useAvailableQuarters(companyId?: string) {
  return useQuery({
    queryKey: ['available-quarters', companyId],
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
        console.error('Error fetching available quarters:', error);
        throw error;
      }

      // Extraer años y trimestres únicos (solo para períodos no semanales)
      const quartersMap = new Map<number, Set<number>>();
      
      data?.forEach(period => {
        if (period.period_start_date && period.period_end_date) {
          // Calcular duración del período
          const [startYear, startMonth, startDay] = period.period_start_date.split('-').map(Number);
          const [endYear, endMonth, endDay] = period.period_end_date.split('-').map(Number);
          const start = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);
          const end = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
          const durationDays = differenceInDays(end, start) + 1;
          
          // Excluir períodos semanales (7-10 días)
          if (durationDays > 10) {
            const year = startYear;
            const quarter = Math.ceil(startMonth / 3);
            
            if (!quartersMap.has(year)) {
              quartersMap.set(year, new Set());
            }
            quartersMap.get(year)?.add(quarter);
          }
        }
      });

      // Convertir a array y ordenar
      const result: QuarterData[] = Array.from(quartersMap.entries())
        .map(([year, quarters]) => ({
          year,
          quarters: Array.from(quarters).sort((a, b) => b - a) // Q4, Q3, Q2, Q1
        }))
        .sort((a, b) => b.year - a.year); // Años más recientes primero

      return result;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
