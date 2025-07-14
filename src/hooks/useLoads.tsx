import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Load {
  id: string;
  load_number: string;
  driver_user_id: string;
  total_amount: number;
  commodity: string | null;
  weight_lbs: number | null;
  status: string;
  notes: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
  broker_id: string | null;
  factoring_percentage: number | null;
  dispatching_percentage: number | null;
  leasing_percentage: number | null;
  currency: string;
  payment_period_id: string | null;
  created_by: string | null;
  
  // Datos relacionados calculados
  driver_name?: string;
  broker_name?: string;
  pickup_city?: string;
  delivery_city?: string;
  period_start_date?: string;
  period_end_date?: string;
  period_frequency?: string;
  period_status?: string;
}

interface LoadsFilters {
  periodFilter?: {
    type: 'current' | 'all' | 'specific' | 'custom' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
    periodId?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Calcula el rango de fechas según el tipo de filtro de período
 */
const calculateDateRange = (filterType: LoadsFilters['periodFilter']['type']): DateRange | null => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  switch (filterType) {
    case 'current':
      // Para período actual, usar un rango amplio que capture cualquier período activo
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: thirtyDaysFromNow.toISOString().split('T')[0]
      };

    case 'this_month':
      return {
        startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
      };

    case 'last_month':
      return {
        startDate: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
      };

    case 'this_quarter':
      const quarterStart = currentQuarter * 3;
      return {
        startDate: new Date(currentYear, quarterStart, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear, quarterStart + 3, 0).toISOString().split('T')[0]
      };

    case 'last_quarter':
      const lastQuarterStart = (currentQuarter - 1) * 3;
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
      const adjustedQuarterStart = currentQuarter === 0 ? 9 : lastQuarterStart;
      return {
        startDate: new Date(lastQuarterYear, adjustedQuarterStart, 1).toISOString().split('T')[0],
        endDate: new Date(lastQuarterYear, adjustedQuarterStart + 3, 0).toISOString().split('T')[0]
      };

    case 'this_year':
      return {
        startDate: new Date(currentYear, 0, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear, 11, 31).toISOString().split('T')[0]
      };

    case 'last_year':
      return {
        startDate: new Date(currentYear - 1, 0, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear - 1, 11, 31).toISOString().split('T')[0]
      };

    case 'all':
    default:
      return null; // Sin filtro de fechas
  }
};

/**
 * Obtiene los period_ids relevantes según el filtro de fechas
 */
const getRelevantPeriodIds = async (
  userIds: string[], 
  periodFilter: LoadsFilters['periodFilter']
): Promise<string[]> => {
  console.log('🔍 getRelevantPeriodIds iniciando con:', { userIds: userIds.length, periodFilter });
  console.time('getRelevantPeriodIds');
  
  if (!periodFilter) {
    console.log('📤 Sin filtro de período');
    console.timeEnd('getRelevantPeriodIds');
    return [];
  }

  // Caso específico: período único
  if (periodFilter.type === 'specific' && periodFilter.periodId) {
    console.log('📤 Período específico:', periodFilter.periodId);
    console.timeEnd('getRelevantPeriodIds');
    return [periodFilter.periodId];
  }

  // Calcular rango de fechas según el tipo de filtro
  console.time('calculateDateRange');
  let dateRange: DateRange | null = null;
  
  if (periodFilter.type === 'custom' && periodFilter.startDate && periodFilter.endDate) {
    dateRange = {
      startDate: periodFilter.startDate,
      endDate: periodFilter.endDate
    };
  } else {
    dateRange = calculateDateRange(periodFilter.type);
  }
  console.timeEnd('calculateDateRange');

  // Sin filtro de fechas para 'all'
  if (!dateRange) {
    console.log('📤 Sin rango de fechas para "all"');
    console.timeEnd('getRelevantPeriodIds');
    return [];
  }

  console.log('📅 Rango calculado:', dateRange);

  // Buscar períodos que se solapen con el rango de fechas
  console.time('supabase-payment-periods-query');
  const { data: periodsInRange, error } = await supabase
    .from('payment_periods')
    .select('id')
    .in('driver_user_id', userIds)
    .lte('period_start_date', dateRange.endDate)
    .gte('period_end_date', dateRange.startDate);
  console.timeEnd('supabase-payment-periods-query');

  if (error) {
    console.error('❌ Error obteniendo períodos:', error);
    console.timeEnd('getRelevantPeriodIds');
    throw new Error('Error consultando períodos de pago');
  }

  const periodIds = periodsInRange?.map(p => p.id) || [];
  console.log(`📤 Períodos encontrados: ${periodIds.length}`);
  console.timeEnd('getRelevantPeriodIds');
  
  return periodIds;
};

export const useLoads = (filters?: LoadsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loads', user?.id, JSON.stringify(filters)], // Serializar filtros para evitar problemas de referencia
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // Reducir stale time
    gcTime: 120000, // Reducir garbage collection time
    queryFn: async (): Promise<Load[]> => {
      console.log('🔄 useLoads iniciando con filtros:', filters);
      console.time('useLoads-TOTAL-TIME');
      
      if (!user) {
        console.log('❌ Usuario no autenticado');
        throw new Error('User not authenticated');
      }

      try {
        // PASO 1: Obtener compañía y usuarios
        console.time('step-1-company-users');
        const { data: userCompanyRole, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (companyError || !userCompanyRole) {
          console.timeEnd('step-1-company-users');
          console.timeEnd('useLoads-TOTAL-TIME');
          throw new Error('No se pudo obtener la compañía del usuario');
        }

        const { data: companyUsers, error: usersError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompanyRole.company_id)
          .eq('is_active', true);

        if (usersError) {
          console.timeEnd('step-1-company-users');
          console.timeEnd('useLoads-TOTAL-TIME');
          throw new Error('Error obteniendo usuarios de la compañía');
        }

        const userIds = companyUsers.map(u => u.user_id);
        console.log(`👥 Usuarios encontrados: ${userIds.length}`);
        console.timeEnd('step-1-company-users');

        // PASO 2: Obtener period_ids relevantes según el filtro (OPTIMIZACIÓN CLAVE)
        console.time('step-2-period-filtering');
        const relevantPeriodIds = await getRelevantPeriodIds(userIds, filters?.periodFilter);
        console.timeEnd('step-2-period-filtering');
        
        // PASO 3: Construir query optimizada de cargas
        console.time('step-3-loads-query');
        let loadsQuery = supabase
          .from('loads')
          .select('*')
          .in('driver_user_id', userIds)
          .order('created_at', { ascending: false });

        // Aplicar filtro de períodos si hay alguno
        if (relevantPeriodIds.length > 0) {
          console.log(`🎯 Filtrando por ${relevantPeriodIds.length} period_ids`);
          loadsQuery = loadsQuery.in('payment_period_id', relevantPeriodIds);
        } else if (filters?.periodFilter?.type !== 'all' && filters?.periodFilter) {
          console.log('🚫 No hay períodos relevantes, devolviendo consulta vacía');
          loadsQuery = loadsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Aplicar límites inteligentes
        const isHistoricalView = filters?.periodFilter?.type === 'all';
        const limit = isHistoricalView ? 50 : 200;
        loadsQuery = loadsQuery.limit(limit);

        const { data: loads, error: loadsError } = await loadsQuery;
        console.timeEnd('step-3-loads-query');

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        if (!loads || loads.length === 0) {
          console.timeEnd('useLoads-TOTAL-TIME');
          console.log('✅ useLoads completado: Sin cargas encontradas');
          return [];
        }

        console.log(`📊 Procesando ${loads.length} cargas encontradas`);

        // PASO 4: Enriquecer datos relacionados en paralelo
        const [driverIds, brokerIds, periodIds, loadIds] = [
          [...new Set(loads.map(l => l.driver_user_id))],
          [...new Set(loads.map(l => l.broker_id).filter(Boolean))],
          [...new Set(loads.map(l => l.payment_period_id).filter(Boolean))],
          loads.map(l => l.id)
        ];

        console.time('parallel-queries');
        
        const [profilesResult, brokersResult, periodsResult, stopsResult] = await Promise.allSettled([
          driverIds.length > 0 
            ? supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', driverIds)
            : Promise.resolve({ data: [] }),
          brokerIds.length > 0 
            ? supabase.from('company_brokers').select('id, name').in('id', brokerIds)
            : Promise.resolve({ data: [] }),
          periodIds.length > 0 
            ? supabase.from('payment_periods').select('id, period_start_date, period_end_date, period_frequency, status').in('id', periodIds)
            : Promise.resolve({ data: [] }),
          loadIds.length > 0 
            ? supabase.from('load_stops').select('load_id, stop_type, city, stop_number').in('load_id', loadIds).in('stop_type', ['pickup', 'delivery'])
            : Promise.resolve({ data: [] })
        ]);

        console.timeEnd('parallel-queries');

        // PASO 5: Procesar y enriquecer datos
        const [profiles, brokers, periods, stops] = [
          profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [],
          brokersResult.status === 'fulfilled' ? brokersResult.value.data || [] : [],
          periodsResult.status === 'fulfilled' ? periodsResult.value.data || [] : [],
          stopsResult.status === 'fulfilled' ? stopsResult.value.data || [] : []
        ];

        console.time('data-enrichment');

        const enrichedLoads: Load[] = loads.map(load => {
          const profile = profiles.find(p => p.user_id === load.driver_user_id);
          const broker = brokers.find(b => b.id === load.broker_id);
          const period = periods.find(p => p.id === load.payment_period_id);
          
          const loadStops = stops.filter(s => s.load_id === load.id);
          const pickupStop = loadStops
            .filter(s => s.stop_type === 'pickup')
            .sort((a, b) => a.stop_number - b.stop_number)[0];
          const deliveryStop = loadStops
            .filter(s => s.stop_type === 'delivery')
            .sort((a, b) => b.stop_number - a.stop_number)[0];

          return {
            ...load,
            driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar',
            broker_name: broker?.name || 'Sin broker',
            pickup_city: pickupStop?.city || 'Sin definir',
            delivery_city: deliveryStop?.city || 'Sin definir',
            period_start_date: period?.period_start_date,
            period_end_date: period?.period_end_date,
            period_frequency: period?.period_frequency,
            period_status: period?.status
          };
        });

        console.timeEnd('data-enrichment');
        console.timeEnd('useLoads-TOTAL-TIME');
        console.log(`✅ useLoads completado: ${enrichedLoads.length} cargas procesadas`);

        return enrichedLoads;

      } catch (error: any) {
        console.error('Error en useLoads:', error);
        console.timeEnd('useLoads-TOTAL-TIME');
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
        }
        throw error;
      }
    },
    enabled: !!user,
  });
};
