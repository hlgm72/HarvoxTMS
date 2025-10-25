import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para obtener los años disponibles con datos en company_payment_periods
 * Extrae años únicos desde las fechas de inicio de los períodos de pago
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
        .select('period_start_date')
        .eq('company_id', companyId)
        .order('period_start_date', { ascending: false });

      if (error) {
        console.error('Error fetching available years:', error);
        throw error;
      }

      // Extraer años únicos
      const years = new Set<number>();
      data?.forEach(period => {
        if (period.period_start_date) {
          const year = new Date(period.period_start_date).getFullYear();
          years.add(year);
        }
      });

      // Convertir a array y ordenar descendente (más reciente primero)
      return Array.from(years).sort((a, b) => b - a);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
