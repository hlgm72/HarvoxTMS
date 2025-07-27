import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { getTodayInUserTimeZone } from '@/utils/dateUtils';

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
        // 1. Obtener el período actual de la compañía
        const today = getTodayInUserTimeZone();
        
        const { data: currentPeriod, error: periodError } = await supabase
          .from('company_payment_periods')
          .select('id')
          .eq('company_id', userCompany.company_id)
          .lte('period_start_date', today)
          .gte('period_end_date', today)
          .eq('status', 'open')
          .maybeSingle();

        if (periodError) {
          console.error('Error obteniendo período actual:', periodError);
          throw new Error('Error consultando período actual');
        }

        // Si no hay período actual, retornar 0
        if (!currentPeriod) {
          return 0;
        }

        // 2. Contar cargas del período actual
        const { count, error: loadsError } = await supabase
          .from('loads')
          .select('*', { count: 'exact', head: true })
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`)
          .eq('payment_period_id', currentPeriod.id);

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