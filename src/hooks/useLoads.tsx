import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo } from 'react';
import { useCompanyCache } from './useCompanyCache';
import { getTodayInUserTimeZone, createDateInUserTimeZone } from '@/utils/dateUtils';

export interface LoadStop {
  id?: string;
  load_id: string;
  stop_number: number;
  stop_type: 'pickup' | 'delivery';
  company_name?: string;
  address?: string;
  city: string;
  state: string;
  zip_code?: string;
  contact_name?: string;
  contact_phone?: string;
  reference_number?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  special_instructions?: string;
}

export interface Load {
  id: string;
  load_number: string;
  po_number?: string | null;
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
  driver_avatar_url?: string;
  broker_name?: string;
  broker_alias?: string;
  broker_logo_url?: string;
  dispatcher_name?: string | null;
  internal_dispatcher_name?: string | null;
  pickup_city?: string;
  delivery_city?: string;
  period_start_date?: string;
  period_end_date?: string;
  period_frequency?: string;
  period_status?: string;
  stops?: LoadStop[];
  documents?: any[];
  company_name?: string | null;
  has_load_order?: boolean;
}

interface LoadsFilters {
  periodFilter?: {
    type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
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
    case 'previous':
    case 'next':
      // Para períodos actual, anterior y siguiente, usar la fecha de hoy en la zona horaria del usuario
      // El filtrado específico se hace por period_id, no por rango de fechas
      const today = getTodayInUserTimeZone();
      return {
        startDate: today,
        endDate: today
      };

    case 'this_month':
      return {
        startDate: createDateInUserTimeZone(currentYear, currentMonth, 1),
        endDate: createDateInUserTimeZone(currentYear, currentMonth + 1, 0)
      };

    case 'last_month':
      return {
        startDate: createDateInUserTimeZone(currentYear, currentMonth - 1, 1),
        endDate: createDateInUserTimeZone(currentYear, currentMonth, 0)
      };

    case 'this_quarter':
      const quarterStart = currentQuarter * 3;
      return {
        startDate: createDateInUserTimeZone(currentYear, quarterStart, 1),
        endDate: createDateInUserTimeZone(currentYear, quarterStart + 3, 0)
      };

    case 'last_quarter':
      const lastQuarterStart = (currentQuarter - 1) * 3;
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
      const adjustedQuarterStart = currentQuarter === 0 ? 9 : lastQuarterStart;
      return {
        startDate: createDateInUserTimeZone(lastQuarterYear, adjustedQuarterStart, 1),
        endDate: createDateInUserTimeZone(lastQuarterYear, adjustedQuarterStart + 3, 0)
      };

    case 'this_year':
      return {
        startDate: createDateInUserTimeZone(currentYear, 0, 1),
        endDate: createDateInUserTimeZone(currentYear, 11, 31)
      };

    case 'last_year':
      return {
        startDate: createDateInUserTimeZone(currentYear - 1, 0, 1),
        endDate: createDateInUserTimeZone(currentYear - 1, 11, 31)
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

  // Caso específico: período único (incluyendo current, previous, next y specific)
  if ((periodFilter.type === 'specific' || periodFilter.type === 'current' || periodFilter.type === 'previous' || periodFilter.type === 'next') && periodFilter.periodId) {
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

  // console.log('🎯 useLoads hook - Estado antes del query:', {
  //   user: !!user,
  //   userId: user?.id,
  //   cacheLoading,
  //   userCompany,
  //   cacheError: cacheError?.message,
  //   companyUsersLength: companyUsers.length,
  //   enabled: !!user && !cacheLoading && !!userCompany && !cacheError && companyUsers.length > 0
  // });

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
      console.log('🔍 DEBUG useLoads queryFn - INICIANDO con estado:', {
        user: !!user,
        userId: user?.id,
        userCompany: userCompany,
        companyUsersCount: companyUsers.length,
        cacheError: cacheError?.message,
        filters: filters
      });

      if (!user) {
        console.error('❌ useLoads - Usuario no autenticado');
        throw new Error('User not authenticated');
      }

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error(`Error cargando cargas: ${cacheError.message || 'Error de base de datos'}`);
      }

      // console.log('🚛 Cargando loads para compañía:', userCompany?.company_id);
      // console.log('🚛 Usuarios de la compañía:', companyUsers);

      // Obtener IDs de usuarios de la compañía (conductores)
      if (companyUsers.length === 0) {
        console.log('⚠️ No hay usuarios en la compañía');
        return [];
      }

      try {
        // PASO 2: Obtener period_ids relevantes según el filtro (OPTIMIZACIÓN CLAVE)
        console.log('🔍 DEBUG useLoads - Obteniendo period_ids relevantes:', {
          companyId: userCompany.company_id,
          periodFilter: filters?.periodFilter
        });
        
        const relevantPeriodIds = await getRelevantPeriodIds(userCompany.company_id, filters?.periodFilter);
        
        console.log('🔍 DEBUG useLoads - Period IDs obtenidos:', relevantPeriodIds);
        
        // PASO 3: Construir query optimizada de cargas
        let loadsQuery = supabase
          .from('loads')
          .select('*')
          .or(`driver_user_id.in.(${companyUsers.join(',')}),and(driver_user_id.is.null,created_by.in.(${companyUsers.join(',')}))`)
          .order('created_at', { ascending: false });

        console.log('🔍 DEBUG useLoads - Query inicial construida para usuarios:', companyUsers);

        // Aplicar filtro de períodos si hay alguno
        if (relevantPeriodIds.length > 0) {
          loadsQuery = loadsQuery.in('payment_period_id', relevantPeriodIds);
          console.log('🔍 DEBUG useLoads - Aplicando filtro de períodos:', relevantPeriodIds);
        } else if (filters?.periodFilter?.type !== 'all' && filters?.periodFilter) {
          loadsQuery = loadsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
          console.log('🔍 DEBUG useLoads - No hay períodos relevantes, aplicando filtro imposible para devolver vacío');
        }

        // Aplicar límites inteligentes
        const isHistoricalView = filters?.periodFilter?.type === 'all';
        const limit = isHistoricalView ? 50 : 200;
        loadsQuery = loadsQuery.limit(limit);

        console.log('🔍 DEBUG useLoads - Ejecutando query final...');
        const { data: loads, error: loadsError } = await loadsQuery;

        console.log('🔍 DEBUG useLoads - Query ejecutada, resultado:', {
          loadsCount: loads?.length || 0,
          error: loadsError?.message || 'No error',
          sampleLoads: loads?.slice(0, 3).map(load => ({
            id: load.id,
            load_number: load.load_number,
            driver_user_id: load.driver_user_id,
            payment_period_id: load.payment_period_id
          }))
        });

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        if (!loads || loads.length === 0) {
          console.log('🔍 DEBUG useLoads - No se encontraron cargas, retornando array vacío');
          return [];
        }

        // PASO 4: Enriquecer datos relacionados en paralelo
        const [driverIds, brokerIds, contactIds, dispatcherIds, periodIds, loadIds] = [
          [...new Set(loads.map(l => l.driver_user_id).filter(Boolean))],
          [...new Set(loads.map(l => l.client_id).filter(Boolean))],
          [...new Set(loads.map(l => l.client_contact_id).filter(Boolean))],
          [...new Set(loads.map(l => l.internal_dispatcher_id).filter(Boolean))],
          [...new Set(loads.map(l => l.payment_period_id).filter(Boolean))],
          loads.map(l => l.id)
        ];

        // Obtener paradas con información de ETA y notas
        const stopsResult = loadIds.length > 0 
          ? await supabase
              .from('load_stops')
              .select('id, load_id, stop_type, stop_number, company_name, address, city, state, zip_code, contact_name, contact_phone, reference_number, scheduled_date, scheduled_time, eta_date, eta_time, driver_notes, special_instructions')
              .in('load_id', loadIds)
              .order('stop_number', { ascending: true })
          : { data: [], error: null };

        // Obtener documentos de las cargas
        const documentsResult = loadIds.length > 0
          ? await supabase
              .from('load_documents')
              .select('load_id, document_type')
              .in('load_id', loadIds)
              .is('archived_at', null) // Usar 'is' en lugar de 'eq' para valores null
          : { data: [], error: null };

        // Obtener información de la compañía asignadora
        const companiesResult = userCompany.company_id
          ? await supabase
              .from('companies')
              .select('id, name')
              .eq('id', userCompany.company_id)
              .single()
          : { data: null, error: null };

        // Obtener historial de estado más reciente para cada carga
        const statusHistoryResult = loadIds.length > 0
          ? await supabase
              .from('load_status_history')
              .select('load_id, stop_id, notes, eta_provided, new_status, changed_at')
              .in('load_id', loadIds)
              .order('changed_at', { ascending: false })
          : { data: [], error: null };

        if (stopsResult.error) {
          console.error('Error obteniendo paradas:', stopsResult.error);
        }

        if (documentsResult.error) {
          console.error('Error obteniendo documentos:', documentsResult.error);
        }

        if (companiesResult.error) {
          console.error('Error obteniendo información de la compañía:', companiesResult.error);
        }

        if (statusHistoryResult.error) {
          console.error('Error obteniendo historial de estado:', statusHistoryResult.error);
        }

        const stopsData = stopsResult.data || [];
        const documentsData = documentsResult.data || [];
        const companyData = companiesResult.data;
        const statusHistoryData = statusHistoryResult.data || [];
        // Processing stops data
        
        // Separar paradas con UUIDs vs nombres de texto
        const stopsWithUUIDs = stopsData.filter(stop => {
          // Un UUID tiene 36 caracteres con guiones
          return stop.city && stop.city.length === 36 && stop.city.includes('-');
        });

        const stopsWithTextNames = stopsData.filter(stop => {
          // No es un UUID, es texto directo
          return stop.city && (stop.city.length !== 36 || !stop.city.includes('-'));
        });

        // Processing UUID vs text names

        // Obtener nombres de ciudades solo para los UUIDs
        let cities: any[] = [];
        
        if (stopsWithUUIDs.length > 0) {
          const cityUUIDs = [...new Set(stopsWithUUIDs.map(s => s.city))];
          
          const { data: citiesFromDB, error: citiesError } = await supabase
            .from('state_cities')
            .select('id, name, state_id')
            .in('id', cityUUIDs);
          
          if (citiesError) {
            console.error('Error obteniendo ciudades:', citiesError);
          } else {
            cities = citiesFromDB || [];
          }
        }
        
        const [profilesResult, brokersResult, contactsResult, dispatchersResult, periodsResult] = await Promise.allSettled([
          driverIds.length > 0 
            ? supabase.from('profiles').select('user_id, first_name, last_name, avatar_url').in('user_id', driverIds)
            : Promise.resolve({ data: [] }),
          brokerIds.length > 0 
            ? supabase.from('company_clients').select('id, name, alias, logo_url').in('id', brokerIds)
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
          const loadDocuments = documentsData.filter(d => d.load_id === load.id);
          
          // Check if load has Load Order document
          const hasLoadOrder = loadDocuments.some(doc => doc.document_type === 'load_order');
          
          // Load stops processing
          
          const pickupStop = loadStops
            .filter(s => s.stop_type === 'pickup')
            .sort((a, b) => a.stop_number - b.stop_number)[0];
          const deliveryStop = loadStops
            .filter(s => s.stop_type === 'delivery')
            .sort((a, b) => b.stop_number - a.stop_number)[0];

          // Processing pickup and delivery stops

          // Función auxiliar para obtener el display de la ciudad
          const getCityDisplay = (stop: any) => {
            if (!stop || !stop.city || !stop.state) {
              return 'Sin definir';
            }

            // Si es un UUID, buscar en la tabla de ciudades
            if (stop.city.length === 36 && stop.city.includes('-')) {
              const cityFromDB = cities.find(c => c.id === stop.city);
              if (cityFromDB) {
                return `${cityFromDB.name}, ${cityFromDB.state_id}`;
              } else {
                console.warn(`🚛 Load ${load.load_number} - City UUID not found:`, stop.city);
                return 'Ciudad no encontrada';
              }
            } else {
              // Es texto directo
              return `${stop.city}, ${stop.state}`;
            }
          };

          const pickupCityDisplay = getCityDisplay(pickupStop);
          const deliveryCityDisplay = getCityDisplay(deliveryStop);

          // Final display processing

          // Priorizar alias sobre nombre para el broker, pero si hay Load Order mostrar compañía
          let brokerDisplayName = broker ? (broker.alias && broker.alias.trim() ? broker.alias : broker.name) : 'Sin cliente';
          
          // Si hay Load Order y información de la compañía, mostrar el nombre de la compañía
          if (hasLoadOrder && companyData?.name) {
            brokerDisplayName = companyData.name;
          }

          // Procesar paradas para esta carga específica
          const processedStops = loadStops.map(stop => {
            // Si es un UUID, buscar en la tabla de ciudades
            let cityDisplay = stop.city;
            if (stop.city && stop.city.length === 36 && stop.city.includes('-')) {
              const cityFromDB = cities.find(c => c.id === stop.city);
              if (cityFromDB) {
                cityDisplay = cityFromDB.name;
              }
            }
            
            return {
              ...stop,
              city: cityDisplay
            };
          });

          // Obtener el historial de estado más reciente para esta carga
          const latestStatusHistory = statusHistoryData
            .filter(h => h.load_id === load.id)
            .filter(h => h.eta_provided) // Solo considerar registros con ETA
            .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];

          console.log(`📊 Load ${load.load_number} - Status: ${load.status}, Latest ETA:`, latestStatusHistory?.eta_provided);

          return {
            ...load,
            broker_id: load.client_id, // Compatibility field
            driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar',
            driver_avatar_url: profile?.avatar_url || null,
            broker_name: brokerDisplayName,
            broker_alias: broker?.alias || null,
            broker_logo_url: broker?.logo_url || null,
            dispatcher_name: contact?.name || null,
            internal_dispatcher_name: dispatcher ? `${dispatcher.first_name} ${dispatcher.last_name}` : null,
            pickup_city: pickupCityDisplay,
            delivery_city: deliveryCityDisplay,
            period_start_date: period?.period_start_date || null,
            period_end_date: period?.period_end_date || null,
            period_frequency: period?.period_frequency || null,
            period_status: period?.status || null,
            stops: processedStops,
            documents: loadDocuments, // Add documents to the load object
            company_name: companyData?.name || null, // Add company name
            has_load_order: hasLoadOrder, // Add flag for Load Order presence
            // Información del estado más reciente
            latest_status_notes: latestStatusHistory?.notes,
            latest_status_eta: latestStatusHistory?.eta_provided,
            latest_status_stop_id: latestStatusHistory?.stop_id
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
