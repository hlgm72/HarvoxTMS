import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        .select('period_start_date')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (error) {
        console.error('Error fetching available quarters:', error);
        throw error;
      }

      // Extraer años y trimestres únicos
      const quartersMap = new Map<number, Set<number>>();
      
      data?.forEach(period => {
        if (period.period_start_date) {
          const date = new Date(period.period_start_date);
          const year = date.getFullYear();
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          
          if (!quartersMap.has(year)) {
            quartersMap.set(year, new Set());
          }
          quartersMap.get(year)?.add(quarter);
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
