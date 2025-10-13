import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { getTodayInUserTimeZone } from '@/lib/dateFormatting';

/**
 * Hook para obtener el contador de cargas del período actual
 * Optimizado para el sidebar - solo cuenta, no trae los datos completos
 */
export const useLoadsCount = () => {
  const { user } = useAuth();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  return useQuery({
    queryKey: ['loads-count', user?.id, userCompany?.company_id],
    enabled: !!user && !cacheLoading && !!userCompany && !cacheError && companyUsers.length > 0,
    retry: 1,
    staleTime: 180000, // 3 minutos - actualización más frecuente que useLoads
    gcTime: 300000, // 5 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    queryFn: async (): Promise<number> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (cacheError) {
        throw new Error(`Error cargando cargas: ${cacheError.message || 'Error de base de datos'}`);
      }

      if (companyUsers.length === 0) {
        return 0;
      }

      try {
        // 1. Get user payment periods for the current date range
        const today = getTodayInUserTimeZone();
        
        const { data: currentPeriods, error: periodError } = await supabase
          .from('user_payrolls')
          .select(`
            id,
            period:company_payment_periods!company_payment_period_id(
              period_start_date,
              period_end_date
            )
          `)
          .eq('company_id', userCompany.company_id)
          .eq('status', 'open');

        if (periodError) {
          console.error('Error obteniendo períodos actuales:', periodError);
          throw new Error('Error consultando períodos actuales');
        }

        // Filter in client for date range
        const filteredPeriods = (currentPeriods || []).filter((p: any) => {
          const startDate = p.period?.period_start_date;
          const endDate = p.period?.period_end_date;
          return startDate && endDate && today >= startDate && today <= endDate;
        });

        // Si no hay períodos actuales, retornar 0
        if (!filteredPeriods || filteredPeriods.length === 0) {
          return 0;
        }

        // 2. Contar cargas del período actual usando los IDs de user_payment_periods
        const periodIds = filteredPeriods.map((p: any) => p.id);
        const { count, error: loadsError } = await supabase
          .from('loads')
          .select('*', { count: 'exact', head: true })
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`)
          .in('payment_period_id', periodIds);

        if (loadsError) {
          console.error('Error contando cargas:', loadsError);
          throw new Error('Error consultando cargas');
        }

        return count || 0;

      } catch (error: any) {
        console.error('Error en useLoadsCount:', error);
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor');
        }
        throw error;
      }
    },
  });
};