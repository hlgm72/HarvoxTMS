import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { getTodayInUserTimeZone } from '@/utils/dateUtils';

interface LoadsStats {
  totalActive: number;
  totalInTransit: number;
  pendingAssignment: number;
  totalAmount: number;
}

/**
 * Hook para obtener estadísticas en tiempo real de las cargas
 */
export const useLoadsStats = () => {
  const { user } = useAuth();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  return useQuery({
    queryKey: ['loads-stats', user?.id, userCompany?.company_id],
    enabled: !!user && !cacheLoading && !!userCompany && !cacheError && companyUsers.length > 0,
    retry: 1,
    staleTime: 120000, // 2 minutos
    gcTime: 300000, // 5 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    queryFn: async (): Promise<LoadsStats> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (cacheError) {
        throw new Error(`Error cargando estadísticas: ${cacheError.message || 'Error de base de datos'}`);
      }

      if (companyUsers.length === 0) {
        return {
          totalActive: 0,
          totalInTransit: 0,
          pendingAssignment: 0,
          totalAmount: 0
        };
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

        // Si no hay período actual, retornar valores en 0
        if (!currentPeriod) {
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // 2. Obtener todas las cargas del período actual
        const { data: loads, error: loadsError } = await supabase
          .from('loads')
          .select('status, driver_user_id, total_amount')
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`)
          .eq('payment_period_id', currentPeriod.id);

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error consultando cargas');
        }

        if (!loads) {
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // 3. Calcular estadísticas
        const stats = loads.reduce((acc, load) => {
          // Contar cargas activas (cualquier estado que no sea completed o cancelled)
          if (load.status && !['completed', 'cancelled'].includes(load.status)) {
            acc.totalActive++;
          }

          // Contar cargas en tránsito
          if (load.status === 'in_transit' || load.status === 'dispatched') {
            acc.totalInTransit++;
          }

          // Contar cargas pendientes de asignación (sin conductor asignado)
          if (!load.driver_user_id) {
            acc.pendingAssignment++;
          }

          // Sumar el total de ingresos en tránsito
          if (load.status === 'in_transit' || load.status === 'dispatched') {
            acc.totalAmount += load.total_amount || 0;
          }

          return acc;
        }, {
          totalActive: 0,
          totalInTransit: 0,
          pendingAssignment: 0,
          totalAmount: 0
        });

        return stats;

      } catch (error: any) {
        console.error('Error en useLoadsStats:', error);
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor');
        }
        throw error;
      }
    },
  });
};