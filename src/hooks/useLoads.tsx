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

export const useLoads = (filters?: LoadsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loads', user?.id, filters],
    retry: 2,
    retryDelay: 1000,
    queryFn: async (): Promise<Load[]> => {
      if (!user) throw new Error('User not authenticated');

      try {
        console.time('useLoads-total');

        // PASO 1: Obtener compañía del usuario (más rápido)
        const { data: userCompanyRole, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (companyError || !userCompanyRole) {
          throw new Error('No se pudo obtener la compañía del usuario');
        }

        // PASO 2: Obtener usuarios de la compañía
        const { data: companyUsers, error: usersError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompanyRole.company_id)
          .eq('is_active', true);

        if (usersError) {
          throw new Error('Error obteniendo usuarios de la compañía');
        }

        const userIds = companyUsers.map(u => u.user_id);

        // PASO 3: Construir query de cargas con filtros optimizados
        let loadsQuery = supabase
          .from('loads')
          .select('*')
          .in('driver_user_id', userIds)
          .order('created_at', { ascending: false });

        // Aplicar límites según el tipo de filtro
        const isHistoricalView = filters?.periodFilter?.type === 'all';
        const limit = isHistoricalView ? 50 : 200; // Menos cargas para vista histórica
        loadsQuery = loadsQuery.limit(limit);

        // PASO 4: Aplicar filtros de período ANTES de la consulta para optimizar
        if (filters?.periodFilter) {
          const { periodFilter } = filters;
          
          if (periodFilter.type === 'specific' && periodFilter.periodId) {
            loadsQuery = loadsQuery.eq('payment_period_id', periodFilter.periodId);
          } else if (periodFilter.type === 'current') {
            // Para período actual, buscar por fechas del período actual
            const currentDate = new Date().toISOString().split('T')[0];
            // Buscar cargas que tengan payment_period_id de un período que contenga la fecha actual
            // Esto es más eficiente que filtrar todas las cargas después
            const { data: currentPeriods } = await supabase
              .from('payment_periods')
              .select('id')
              .in('driver_user_id', userIds)
              .lte('period_start_date', currentDate)
              .gte('period_end_date', currentDate);
            
            if (currentPeriods && currentPeriods.length > 0) {
              const currentPeriodIds = currentPeriods.map(p => p.id);
              loadsQuery = loadsQuery.in('payment_period_id', currentPeriodIds);
            } else {
              // Si no hay período actual, no devolver nada
              loadsQuery = loadsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // ID imposible
            }
          } else if (periodFilter.startDate && periodFilter.endDate) {
            // Para rangos de fechas, buscar períodos que se solapen con el rango
            const { data: periodsInRange } = await supabase
              .from('payment_periods')
              .select('id')
              .in('driver_user_id', userIds)
              .lte('period_start_date', periodFilter.endDate)
              .gte('period_end_date', periodFilter.startDate);
            
            if (periodsInRange && periodsInRange.length > 0) {
              const periodIds = periodsInRange.map(p => p.id);
              loadsQuery = loadsQuery.in('payment_period_id', periodIds);
            } else {
              // Si no hay períodos en el rango, no devolver nada
              loadsQuery = loadsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
            }
          }
          // Para 'all', no aplicar filtros
        }

        const { data: loads, error: loadsError } = await loadsQuery;

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        if (!loads || loads.length === 0) {
          console.timeEnd('useLoads-total');
          console.log('✅ useLoads completado: Sin cargas encontradas');
          return [];
        }

        console.log(`📊 Procesando ${loads.length} cargas encontradas`);

        // PASO 5: Obtener datos relacionados EN PARALELO solo si hay cargas
        const driverIds = [...new Set(loads.map(l => l.driver_user_id))];
        const brokerIds = [...new Set(loads.map(l => l.broker_id).filter(Boolean))];
        const periodIds = [...new Set(loads.map(l => l.payment_period_id).filter(Boolean))];
        const loadIds = loads.map(l => l.id);

        console.time('parallel-queries');
        
        // Optimización: Solo hacer consultas si hay IDs para consultar
        const queries = [];
        
        // Perfiles de conductores
        if (driverIds.length > 0) {
          queries.push(supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', driverIds));
        } else {
          queries.push(Promise.resolve({ data: [] }));
        }
        
        // Brokers
        if (brokerIds.length > 0) {
          queries.push(supabase.from('company_brokers').select('id, name').in('id', brokerIds));
        } else {
          queries.push(Promise.resolve({ data: [] }));
        }
        
        // Períodos de pago
        if (periodIds.length > 0) {
          queries.push(supabase.from('payment_periods').select('id, period_start_date, period_end_date, period_frequency, status').in('id', periodIds));
        } else {
          queries.push(Promise.resolve({ data: [] }));
        }
        
        // Paradas (solo pickup y delivery cities)
        if (loadIds.length > 0) {
          queries.push(supabase.from('load_stops').select('load_id, stop_type, city, stop_number').in('load_id', loadIds).in('stop_type', ['pickup', 'delivery']));
        } else {
          queries.push(Promise.resolve({ data: [] }));
        }

        const [profilesResult, brokersResult, periodsResult, stopsResult] = await Promise.allSettled(queries);

        console.timeEnd('parallel-queries');

        // Extraer datos de los resultados
        const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];
        const brokers = brokersResult.status === 'fulfilled' ? brokersResult.value.data || [] : [];
        const periods = periodsResult.status === 'fulfilled' ? periodsResult.value.data || [] : [];
        const stops = stopsResult.status === 'fulfilled' ? stopsResult.value.data || [] : [];

        console.time('data-enrichment');

        // PASO 6: Enriquecer cargas con datos relacionados (optimizado)
        const enrichedLoads: Load[] = loads.map(load => {
          const profile = profiles.find(p => p.user_id === load.driver_user_id);
          const broker = brokers.find(b => b.id === load.broker_id);
          const period = periods.find(p => p.id === load.payment_period_id);
          
          // Optimización: pre-filtrar paradas por load_id
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

        // PASO 7: Aplicar filtros de período finales si es necesario
        const filteredLoads = applyPeriodFilter(enrichedLoads, filters?.periodFilter);

        console.timeEnd('useLoads-total');
        console.log(`✅ useLoads completado: ${filteredLoads.length} cargas procesadas`);

        return filteredLoads;

      } catch (error: any) {
        console.error('Error en useLoads:', error);
        console.timeEnd('useLoads-total');
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
        }
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 60000, // Cachear por 1 minuto
    gcTime: 300000, // Mantener en cache por 5 minutos
  });
};

// Función auxiliar para aplicar filtros de período
function applyPeriodFilter(loads: Load[], periodFilter?: LoadsFilters['periodFilter']): Load[] {
  if (!periodFilter) return loads;
  
  switch (periodFilter.type) {
    case 'current':
      // Ya filtrado por SQL usando payment_period_id
      return loads;
      
    case 'specific':
      // Ya filtrado por SQL usando payment_period_id
      return loads;
      
    case 'this_month':
    case 'last_month':
    case 'this_quarter':
    case 'last_quarter':
    case 'this_year':
    case 'last_year':
    case 'custom':
      // Ya filtrado por SQL usando payment_period_id
      return loads;
      
    case 'all':
    default:
      return loads;
  }
}
