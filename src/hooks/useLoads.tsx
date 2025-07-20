import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo } from 'react';
import { useCompanyCache } from './useCompanyCache';

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
  client_id: string | null;
  factoring_percentage: number | null;
  dispatching_percentage: number | null;
  leasing_percentage: number | null;
  currency: string;
  payment_period_id: string | null;
  created_by: string | null;
  
  // Datos relacionados calculados
  driver_name?: string;
  broker_name?: string;
  broker_alias?: string;
  dispatcher_name?: string | null;
  internal_dispatcher_name?: string | null;
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
 * Obtiene los period_ids relevantes según el filtro de fechas (ACTUALIZADO para company_payment_periods)
 */
const getRelevantPeriodIds = async (
  companyId: string, 
  periodFilter: LoadsFilters['periodFilter']
): Promise<string[]> => {
  if (!periodFilter) {
    return [];
  }

  // Caso específico: período único
  if (periodFilter.type === 'specific' && periodFilter.periodId) {
    return [periodFilter.periodId];
  }

  // Calcular rango de fechas según el tipo de filtro
  let dateRange: DateRange | null = null;
  
  if (periodFilter.type === 'custom' && periodFilter.startDate && periodFilter.endDate) {
    dateRange = {
      startDate: periodFilter.startDate,
      endDate: periodFilter.endDate
    };
  } else {
    dateRange = calculateDateRange(periodFilter.type);
  }

  // Sin filtro de fechas para 'all'
  if (!dateRange) {
    return [];
  }

  // Buscar períodos que se solapen con el rango de fechas (NUEVA LÓGICA para períodos por empresa)
  const { data: periodsInRange, error } = await supabase
    .from('company_payment_periods')
    .select('id')
    .eq('company_id', companyId)
    .lte('period_start_date', dateRange.endDate)
    .gte('period_end_date', dateRange.startDate);

  if (error) {
    console.error('❌ Error obteniendo períodos:', error);
    throw new Error('Error consultando períodos de pago');
  }

  const periodIds = periodsInRange?.map(p => p.id) || [];
  return periodIds;
};

export const useLoads = (filters?: LoadsFilters) => {
  const { user } = useAuth();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Memoizar el queryKey para evitar re-renders innecesarios y deduplicar queries
  const queryKey = useMemo(() => {
    return ['loads', user?.id, filters?.periodFilter?.type, filters?.periodFilter?.periodId, filters?.periodFilter?.startDate, filters?.periodFilter?.endDate];
  }, [user?.id, filters?.periodFilter?.type, filters?.periodFilter?.periodId, filters?.periodFilter?.startDate, filters?.periodFilter?.endDate]);

  return useQuery({
    queryKey,
    enabled: !!user && !cacheLoading && !!userCompany && !cacheError && companyUsers.length > 0, // Solo ejecutar cuando el cache esté listo
    retry: 1, // Reducir reintentos para evitar ERR_INSUFFICIENT_RESOURCES
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    staleTime: 300000, // Cache muy agresivo - 5 minutos
    gcTime: 600000, // 10 minutos en cache
    refetchOnWindowFocus: false, // Evitar refetch innecesario
    refetchOnReconnect: false, // Evitar múltiples queries al reconectar
    refetchInterval: false, // Desactivar polling
    // Deduplicar queries - crucial para ERR_INSUFFICIENT_RESOURCES
    networkMode: 'online',
    queryFn: async (): Promise<Load[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error(`Error cargando cargas: ${cacheError.message || 'Error de base de datos'}`);
      }

      console.log('🚛 Cargando loads para compañía:', userCompany.company_id);

      // Obtener IDs de usuarios de la compañía (conductores)
      if (companyUsers.length === 0) {
        console.log('⚠️ No hay usuarios en la compañía');
        return [];
      }

      try {
        // PASO 2: Obtener period_ids relevantes según el filtro (OPTIMIZACIÓN CLAVE)
        const relevantPeriodIds = await getRelevantPeriodIds(userCompany.company_id, filters?.periodFilter);
        
        // PASO 3: Construir query optimizada de cargas
        let loadsQuery = supabase
          .from('loads')
          .select('*')
          .in('driver_user_id', companyUsers)
          .order('created_at', { ascending: false });

        // Aplicar filtro de períodos si hay alguno
        if (relevantPeriodIds.length > 0) {
          loadsQuery = loadsQuery.in('payment_period_id', relevantPeriodIds);
        } else if (filters?.periodFilter?.type !== 'all' && filters?.periodFilter) {
          loadsQuery = loadsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }

        // Aplicar límites inteligentes
        const isHistoricalView = filters?.periodFilter?.type === 'all';
        const limit = isHistoricalView ? 50 : 200;
        loadsQuery = loadsQuery.limit(limit);

        const { data: loads, error: loadsError } = await loadsQuery;

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        if (!loads || loads.length === 0) {
          return [];
        }

        // PASO 4: Enriquecer datos relacionados en paralelo
        const [driverIds, brokerIds, contactIds, dispatcherIds, periodIds, loadIds] = [
          [...new Set(loads.map(l => l.driver_user_id))],
          [...new Set(loads.map(l => l.client_id).filter(Boolean))],
          [...new Set(loads.map(l => l.client_contact_id).filter(Boolean))],
          [...new Set(loads.map(l => l.internal_dispatcher_id).filter(Boolean))],
          [...new Set(loads.map(l => l.payment_period_id).filter(Boolean))],
          loads.map(l => l.id)
        ];

        // Obtener ciudades de las paradas para resolver los UUIDs
        const stopsResult = loadIds.length > 0 
          ? await supabase
              .from('load_stops')
              .select('load_id, stop_type, stop_number, city, state')
              .in('load_id', loadIds)
              .in('stop_type', ['pickup', 'delivery'])
          : { data: [], error: null };

        if (stopsResult.error) {
          console.error('Error obteniendo paradas:', stopsResult.error);
        }

        const stopsData = stopsResult.data || [];
        
        // Obtener combinaciones únicas de ciudad y estado desde load_stops
        const cityStateMap = new Map();
        stopsData.forEach(stop => {
          if (stop.city && stop.state) {
            cityStateMap.set(`${stop.city}|${stop.state}`, { city: stop.city, state: stop.state });
          }
        });
        
        const cityStatePairs = Array.from(cityStateMap.values());

        // Obtener información de las ciudades (buscar por nombre Y estado)
        let cities: any[] = [];
        
        if (cityStatePairs.length > 0) {
          // Hacer consultas individuales para cada combinación ciudad-estado
          const cityPromises = cityStatePairs.map(async ({ city, state }) => {
            const { data, error } = await supabase
              .from('state_cities')
              .select('id, name, state_id')
              .eq('name', city)
              .eq('state_id', state)
              .limit(1);
            
            return data?.[0] || null;
          });
          
          const cityResults = await Promise.all(cityPromises);
          cities = cityResults.filter(Boolean);
        }
        
        const [profilesResult, brokersResult, contactsResult, dispatchersResult, periodsResult] = await Promise.allSettled([
          driverIds.length > 0 
            ? supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', driverIds)
            : Promise.resolve({ data: [] }),
          brokerIds.length > 0 
            ? supabase.from('company_clients').select('id, name, alias').in('id', brokerIds)
            : Promise.resolve({ data: [] }),
          contactIds.length > 0 
            ? supabase.from('company_client_contacts').select('id, name, client_id').in('id', contactIds)
            : Promise.resolve({ data: [] }),
          dispatcherIds.length > 0 
            ? supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', dispatcherIds)
            : Promise.resolve({ data: [] }),
          periodIds.length > 0 
            ? supabase.from('company_payment_periods').select('id, period_start_date, period_end_date, period_frequency, status').in('id', periodIds)
             : Promise.resolve({ data: [] })
        ]);

        // PASO 5: Procesar y enriquecer datos
        const [profiles, brokers, contacts, dispatchers, periods] = [
          profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [],
          brokersResult.status === 'fulfilled' ? brokersResult.value.data || [] : [],
          contactsResult.status === 'fulfilled' ? contactsResult.value.data || [] : [],
          dispatchersResult.status === 'fulfilled' ? dispatchersResult.value.data || [] : [],
          periodsResult.status === 'fulfilled' ? periodsResult.value.data || [] : []
        ];

        return loads.map(load => {
          const profile = profiles.find(p => p.user_id === load.driver_user_id);
          const broker = brokers.find(b => b.id === load.client_id);
          const contact = contacts.find(c => c.id === load.client_contact_id);
          const dispatcher = dispatchers.find(d => d.user_id === load.internal_dispatcher_id);
          const period = periods.find(p => p.id === load.payment_period_id);
          
          const loadStops = stopsData.filter(s => s.load_id === load.id);
          const pickupStop = loadStops
            .filter(s => s.stop_type === 'pickup')
            .sort((a, b) => a.stop_number - b.stop_number)[0];
          const deliveryStop = loadStops
            .filter(s => s.stop_type === 'delivery')
            .sort((a, b) => b.stop_number - a.stop_number)[0];

          // Resolver nombres de ciudades (usar ciudad Y estado para match exacto)
          const pickupCity = pickupStop ? cities.find(c => c.name === pickupStop.city && c.state_id === pickupStop.state) : null;
          const deliveryCity = deliveryStop ? cities.find(c => c.name === deliveryStop.city && c.state_id === deliveryStop.state) : null;

          // Priorizar alias sobre nombre para el broker
          const brokerDisplayName = broker ? (broker.alias && broker.alias.trim() ? broker.alias : broker.name) : 'Sin cliente';

          return {
            ...load,
            broker_id: load.client_id, // Compatibility field
            driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar',
            broker_name: brokerDisplayName,
            broker_alias: broker?.alias,
            dispatcher_name: contact?.name || null,
            internal_dispatcher_name: dispatcher ? `${dispatcher.first_name} ${dispatcher.last_name}` : null,
            pickup_city: pickupCity ? `${pickupCity.name}, ${pickupCity.state_id}` : 'Sin definir',
            delivery_city: deliveryCity ? `${deliveryCity.name}, ${deliveryCity.state_id}` : 'Sin definir',
            period_start_date: period?.period_start_date,
            period_end_date: period?.period_end_date,
            period_frequency: period?.period_frequency,
            period_status: period?.status
          };
        });

      } catch (error: any) {
        console.error('Error en useLoads:', error);
        
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
        }
        throw error;
      }
    },
  });
};
