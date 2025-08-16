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

interface UseLoadsStatsProps {
  periodFilter?: {
    type: string;
    periodId?: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Hook para obtener estadísticas en tiempo real de las cargas
 */
export const useLoadsStats = ({ periodFilter }: UseLoadsStatsProps = {}) => {
  const { user } = useAuth();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  return useQuery({
    queryKey: ['loads-stats', user?.id, userCompany?.company_id, periodFilter?.type, periodFilter?.periodId, periodFilter?.startDate, periodFilter?.endDate],
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
        let targetPeriodId: string | null = null;

        // Determinar el período objetivo basado en el filtro
        if (periodFilter?.type === 'specific' && periodFilter.periodId) {
          targetPeriodId = periodFilter.periodId;
        } else if (periodFilter?.type === 'current' || !periodFilter?.type) {
          // Obtener el período actual de la compañía
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

          targetPeriodId = currentPeriod?.id || null;
        } else if (periodFilter?.type === 'all') {
          // Para 'all', no filtrar por período específico
          targetPeriodId = 'all';
        } else {
          // Para otros tipos (previous, next, custom, etc.), retornar 0s por ahora
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // Si no hay período objetivo, retornar valores en 0
        if (!targetPeriodId) {
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // 2. Obtener todas las cargas del período objetivo
        let loadsQuery = supabase
          .from('loads')
          .select('status, driver_user_id, total_amount')
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`);

        // Aplicar filtro de período solo si no es 'all'
        if (targetPeriodId !== 'all') {
          loadsQuery = loadsQuery.eq('payment_period_id', targetPeriodId);
        }

        const { data: loads, error: loadsError } = await loadsQuery;

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