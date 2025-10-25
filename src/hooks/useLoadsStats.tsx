import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { getTodayInUserTimeZone } from '@/lib/dateFormatting';

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
        // console.log('🔍 useLoadsStats - Input periodFilter:', periodFilter);
        
        // Obtener configuración de la empresa para saber qué fecha usar
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('load_assignment_criteria')
          .eq('id', userCompany.company_id)
          .single();
        
        if (companyError) {
          console.error('Error obteniendo configuración de empresa:', companyError);
        }
        
        const loadAssignmentCriteria = companyData?.load_assignment_criteria || 'delivery_date';
        
        let targetPeriodId: string | string[] | null = null;

        // Determinar el período objetivo basado en el filtro
        if (periodFilter?.type === 'specific' && periodFilter.periodId) {
          targetPeriodId = periodFilter.periodId;
          // console.log('📅 Using specific period:', targetPeriodId);
        } else if (periodFilter?.periodId && !periodFilter.periodId.startsWith('calculated-')) {
          // Para períodos reales de BD (no calculados)
          targetPeriodId = periodFilter.periodId;
          // console.log('📅 Using period with periodId:', targetPeriodId, 'type:', periodFilter.type);
        } else if (periodFilter?.periodId?.startsWith('calculated-')) {
          // Para períodos calculados, usar filtro de fechas en lugar de payment_period_id
          if (periodFilter.startDate && periodFilter.endDate) {
            targetPeriodId = 'date-filter';
            // console.log('📅 Using date filter for calculated period:', periodFilter.startDate, 'to', periodFilter.endDate);
          } else {
            // Sin fechas, no se puede filtrar
            return {
              totalActive: 0,
              totalInTransit: 0,
              pendingAssignment: 0,
              totalAmount: 0
            };
          }
        } else if (periodFilter?.type === 'current' || !periodFilter?.type) {
          // Get user payment periods for current date range
          const today = getTodayInUserTimeZone();
          // console.log('📅 Getting current period for today:', today);
          
          // First get payroll IDs for the company - use ts-ignore to bypass TypeScript recursion error
          // @ts-ignore - TypeScript has recursion issues with complex Supabase types
          const payrollQuery = await supabase
            .from('user_payrolls')
            .select('id, company_payment_period_id')
            .eq('company_id', userCompany.company_id)
            .eq('status', 'open');
          
          const payrollIds: any[] = payrollQuery.data;
          const payrollError: any = payrollQuery.error;

          if (payrollError) {
            console.error('Error obteniendo payrolls:', payrollError);
            throw new Error('Error consultando períodos actuales');
          }

          if (!payrollIds || payrollIds.length === 0) {
            targetPeriodId = [];
          } else {
            // Get the period dates
            const periodIds: string[] = [...new Set(payrollIds.map((p: any) => p.company_payment_period_id))];
            // @ts-ignore - TypeScript has recursion issues with complex Supabase types
            const periodQuery = await supabase
              .from('company_payment_periods')
              .select('id, period_start_date, period_end_date')
              .in('id', periodIds);
            
            const periods: any[] = periodQuery.data;
            const periodError: any = periodQuery.error;

            if (periodError) {
              console.error('Error obteniendo períodos:', periodError);
              throw new Error('Error consultando períodos actuales');
            }

            // Filter payrolls by period dates that match today
            const matchingPayrolls = payrollIds.filter((payroll: any) => {
              const period = periods?.find((p: any) => p.id === payroll.company_payment_period_id);
              return period && 
                     period.period_start_date && 
                     period.period_end_date && 
                     today >= period.period_start_date && 
                     today <= period.period_end_date;
            });

            targetPeriodId = matchingPayrolls.map((p: any) => p.id);
          }
          // console.log('📅 Current period found:', targetPeriodId);
        } else if (periodFilter?.type === 'previous' || periodFilter?.type === 'month' || periodFilter?.type === 'quarter' || periodFilter?.type === 'week' || periodFilter?.type === 'year') {
          // Para filtros basados en fechas, usar date-filter
          if (periodFilter.startDate && periodFilter.endDate) {
            targetPeriodId = 'date-filter';
            // console.log('📅 Using date filter:', periodFilter.startDate, 'to', periodFilter.endDate);
          } else {
            return {
              totalActive: 0,
              totalInTransit: 0,
              pendingAssignment: 0,
              totalAmount: 0
            };
          }
        } else if (periodFilter?.type === 'all') {
          // Para 'all', no filtrar por período específico
          targetPeriodId = 'all';
          // console.log('📅 Using all periods');
        } else {
          // Para tipos no implementados, retornar 0s
          // console.log('❌ Unsupported period type:', periodFilter?.type);
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // Si no hay período objetivo, retornar valores en 0
        if (!targetPeriodId || (Array.isArray(targetPeriodId) && targetPeriodId.length === 0)) {
          // console.log('❌ No target period found, returning 0s');
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // console.log('🚀 Building loads query with targetPeriodId:', targetPeriodId);
        // console.log('👥 Company users:', companyUsers);

        // 2. Obtener todas las cargas del período objetivo
        let loadsQuery = supabase
          .from('loads')
          .select('status, driver_user_id, total_amount, payment_period_id, load_number')
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`);

        // Aplicar filtro según el tipo de período
        if (targetPeriodId === 'date-filter' && periodFilter?.startDate && periodFilter?.endDate) {
          // Para períodos calculados, usar filtro de fechas basado en configuración de empresa
          const dateField = loadAssignmentCriteria === 'pickup_date' ? 'pickup_date' : 'delivery_date';
          loadsQuery = loadsQuery
            .gte(dateField, periodFilter.startDate)
            .lte(dateField, periodFilter.endDate);
          // console.log(`📅 Applied ${dateField} filter:`, periodFilter.startDate, 'to', periodFilter.endDate);
        } else if (targetPeriodId !== 'all' && targetPeriodId !== 'date-filter') {
          // Para períodos de BD, usar payment_period_id (array o single)
          if (Array.isArray(targetPeriodId)) {
            if (targetPeriodId.length > 0) {
              loadsQuery = loadsQuery.in('payment_period_id', targetPeriodId);
              // console.log('🎯 Added period filter for multiple IDs:', targetPeriodId);
            }
          } else {
            loadsQuery = loadsQuery.eq('payment_period_id', targetPeriodId);
            // console.log('🎯 Added period filter for:', targetPeriodId);
          }
        }

        const { data: loads, error: loadsError } = await loadsQuery;

        // console.log('📊 Loads query result:', { loads, loadsError });

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error consultando cargas');
        }

        if (!loads) {
          // console.log('❌ No loads data returned');
          return {
            totalActive: 0,
            totalInTransit: 0,
            pendingAssignment: 0,
            totalAmount: 0
          };
        }

        // console.log(`📈 Found ${loads.length} loads, processing stats...`);

        // 3. Calcular estadísticas
        const stats = loads.reduce((acc, load) => {
          // console.log('🔍 Processing load:', { 
          //   load_number: load.load_number, 
          //   status: load.status, 
          //   driver_user_id: load.driver_user_id, 
          //   payment_period_id: load.payment_period_id,
          //   total_amount: load.total_amount 
          // });

          // Contar cargas activas (cualquier estado que no sea completed o cancelled)
          if (load.status && !['completed', 'cancelled'].includes(load.status)) {
            acc.totalActive++;
          } else {
            // Load NOT counted as active
          }

          // Contar cargas en tránsito
          if (load.status === 'in_transit' || load.status === 'dispatched') {
            acc.totalInTransit++;
            // Load counted as in transit
          }

          // Contar cargas pendientes de asignación (sin conductor asignado)
          if (!load.driver_user_id) {
            acc.pendingAssignment++;
            // Load counted as pending assignment
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

        // console.log('📊 Final stats calculated:', stats);

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