import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MonthData {
  year: number;
  months: number[]; // [1, 2, 3, ..., 12]
}

/**
 * Hook para obtener los años y meses disponibles con datos en company_payment_periods
 */
export function useAvailableMonths(companyId?: string) {
  return useQuery({
    queryKey: ['available-months', companyId],
    queryFn: async () => {
      if (!companyId) {
        return [];
      }

      const { data, error } = await supabase
        .from('company_payment_periods')
        .select('period_start_date')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (error) {
        console.error('Error fetching available months:', error);
        throw error;
      }

      // Extraer años y meses únicos
      const monthsMap = new Map<number, Set<number>>();
      
      data?.forEach(period => {
        if (period.period_start_date) {
          const date = new Date(period.period_start_date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1; // 1-12
          
          if (!monthsMap.has(year)) {
            monthsMap.set(year, new Set());
          }
          monthsMap.get(year)?.add(month);
        }
      });

      // Convertir a array y ordenar
      const result: MonthData[] = Array.from(monthsMap.entries())
        .map(([year, months]) => ({
          year,
          months: Array.from(months).sort((a, b) => b - a) // 12, 11, ..., 1
        }))
        .sort((a, b) => b.year - a.year); // Años más recientes primero

      return result;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
