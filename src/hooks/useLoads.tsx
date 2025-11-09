import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useMemo } from 'react';
import { useCompanyCache } from './useCompanyCache';
import { useCurrentPaymentPeriod, usePreviousPaymentPeriod, useNextPaymentPeriod, usePaymentPeriods } from './usePaymentPeriods';
import { getTodayInUserTimeZone, createDateInUserTimeZone } from '@/lib/dateFormatting';

export interface LoadStop {
  id?: string;
  load_id: string;
  stop_number: number;
  stop_type: 'pickup' | 'delivery';
  facility_id?: string | null;
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
  payment_status?: string;
  notes: string | null;
  customer_name?: string | null;
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
  client_contact_name?: string | null;
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
    type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'month' | 'quarter' | 'week' | 'year';
    periodId?: string;
    startDate?: string;
    endDate?: string;
    selectedYear?: number;
    selectedQuarter?: number;
    selectedMonth?: number;
    selectedWeek?: number;
  };
}


/**
 * Obtiene los period_ids relevantes según el filtro - NUEVA LÓGICA SIMPLE CONSISTENTE CON PAYMENT REPORTS
 */
const getRelevantPeriodIds = (
  periodFilter: LoadsFilters['periodFilter'],
  currentPeriod: any,
  previousPeriod: any, 
  nextPeriod: any,
  allPeriods: any[]
): { periodIds: string[], useDateFilter: boolean, startDate?: string, endDate?: string } => {
  if (!periodFilter) {
    return { periodIds: [], useDateFilter: false };
  }

  // MANEJAR PERÍODOS CALCULADOS QUE NO EXISTEN EN LA BD
  const isCalculatedPeriod = periodFilter.periodId?.startsWith('calculated-');
  
  if (isCalculatedPeriod && periodFilter.startDate && periodFilter.endDate) {
    return {
      periodIds: [],
      useDateFilter: true,
      startDate: periodFilter.startDate,
      endDate: periodFilter.endDate
    };
  }

  // USAR LA MISMA LÓGICA QUE PAYMENT REPORTS PARA PERÍODOS DE BD
  switch (periodFilter.type) {
    case 'current':
      // Si hay fechas específicas en el filtro (período calculado), usarlas
      if (periodFilter.startDate && periodFilter.endDate) {
        // Verificar si el período existe en la BD
        const periodExistsInDB = periodFilter.periodId && allPeriods.some(p => p.id === periodFilter.periodId);
        
        if (!periodExistsInDB) {
          return {
            periodIds: [],
            useDateFilter: true,
            startDate: periodFilter.startDate,
            endDate: periodFilter.endDate
          };
        }
        
        return {
          periodIds: [],
          useDateFilter: true,
          startDate: periodFilter.startDate,
          endDate: periodFilter.endDate
        };
      }
      return { 
        periodIds: currentPeriod?.company_payment_period_id ? [currentPeriod.company_payment_period_id] : [], 
        useDateFilter: false,
        startDate: currentPeriod?.period_start_date,
        endDate: currentPeriod?.period_end_date
      };
    
    case 'previous':
      // Si hay fechas específicas en el filtro (período calculado), usarlas
      if (periodFilter.startDate && periodFilter.endDate) {
        return {
          periodIds: [],
          useDateFilter: true,
          startDate: periodFilter.startDate,
          endDate: periodFilter.endDate
        };
      }
      return { 
        periodIds: previousPeriod?.company_payment_period_id ? [previousPeriod.company_payment_period_id] : [], 
        useDateFilter: false,
        startDate: previousPeriod?.period_start_date,
        endDate: previousPeriod?.period_end_date
      };
    
    case 'next':
      return { 
        periodIds: nextPeriod?.company_payment_period_id ? [nextPeriod.company_payment_period_id] : [], 
        useDateFilter: false,
        startDate: nextPeriod?.period_start_date,
        endDate: nextPeriod?.period_end_date
      };
    
    case 'specific':
      return { 
        periodIds: periodFilter.periodId ? [periodFilter.periodId] : [], 
        useDateFilter: false
      };
    
    case 'all':
      return { 
        periodIds: allPeriods ? allPeriods.map(p => p.company_payment_period_id).filter(Boolean) : [], 
        useDateFilter: false 
      };
    
    case 'month':
    case 'quarter':
    case 'week':
    case 'year':
    case 'custom':
      // ✅ PRIORIZAR periodId si está disponible
      if (periodFilter.periodId) {
        return {
          periodIds: [periodFilter.periodId],
          useDateFilter: false,
          startDate: periodFilter.startDate,
          endDate: periodFilter.endDate
        };
      }
      
      // Fallback a fechas si no hay periodId
      if (periodFilter.startDate && periodFilter.endDate) {
        return {
          periodIds: [],
          useDateFilter: true,
          startDate: periodFilter.startDate,
          endDate: periodFilter.endDate
        };
      }
      return { periodIds: [], useDateFilter: false };
    
    default:
      return { 
        periodIds: currentPeriod ? [currentPeriod.id] : [], 
        useDateFilter: false,
        startDate: currentPeriod?.period_start_date,
        endDate: currentPeriod?.period_end_date
      };
  }
};

export const useLoads = (filters?: LoadsFilters) => {
  const { user } = useAuth();
  const { userCompany, companyUsers, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Obtener períodos como en PaymentReports para consistencia
  const { data: currentPeriod } = useCurrentPaymentPeriod(userCompany?.company_id);
  const { data: previousPeriod } = usePreviousPaymentPeriod(userCompany?.company_id);
  const { data: nextPeriod } = useNextPaymentPeriod(userCompany?.company_id);
  const { data: allPeriods = [] } = usePaymentPeriods();

  // Memoizar el queryKey para evitar re-renders innecesarios y deduplicar queries
  const queryKey = useMemo(() => {
    return ['loads', user?.id, JSON.stringify(filters?.periodFilter)];
  }, [user?.id, filters?.periodFilter]);

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
    staleTime: 60000, // Reducir cache - 1 minuto para permitir actualizaciones más rápidas
    gcTime: 300000, // 5 minutos en cache
    refetchOnWindowFocus: false, // Evitar refetch innecesario
    refetchOnReconnect: false, // Evitar múltiples queries al reconectar
    refetchInterval: false, // Desactivar polling
    // Deduplicar queries - crucial para ERR_INSUFFICIENT_RESOURCES
    networkMode: 'online',
    queryFn: async (): Promise<Load[]> => {
      if (!user?.id || cacheLoading || !userCompany) {
        return [];
      }

      if (cacheError) {
        console.error('💥 useLoads - Error de cache:', cacheError);
        throw new Error(`Error de cache: ${cacheError.message}`);
      }

      // console.log('🚛 Cargando loads para compañía:', userCompany?.company_id);
      // console.log('🚛 Usuarios de la compañía:', companyUsers);

      // Obtener IDs de usuarios de la compañía (conductores)
      if (companyUsers.length === 0) {
        return [];
      }
      
      // Obtener configuración de la empresa para saber qué fecha usar
      const { data: companyData } = await supabase
        .from('companies')
        .select('load_assignment_criteria')
        .eq('id', userCompany.company_id)
        .single();
      
      const loadAssignmentCriteria = companyData?.load_assignment_criteria || 'delivery_date';

      try {
        // PASO 2: Obtener period_ids relevantes usando la misma lógica que PaymentReports
        const periodResult = getRelevantPeriodIds(
          filters?.periodFilter,
          currentPeriod,
          previousPeriod,
          nextPeriod,
          allPeriods
        );
        
        // ✅ OPTIMIZACIÓN: Query simplificada con límite reducido para mejorar performance
        const loadsQuery = supabase
          .from('loads')
          .select('*')
          .in('created_by', companyUsers)
          .order('payment_period_id', { ascending: true, nullsFirst: false })
          .order('load_number', { ascending: true})
          .limit(200); // Reducido de 500 a 200 para mejorar performance inicial

        const { data: allLoads, error: loadsError } = await loadsQuery;

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        // PASO 4: Filtrar cargas por período en el cliente
        let loads = allLoads || [];
        
        // Priorizar payment_period_id sobre fechas para cargas con período asignado
        if (periodResult.periodIds.length > 0) {
          loads = loads.filter(load => {
            // Si la carga tiene un payment_period_id asignado, usar ese criterio
            if (load.payment_period_id) {
              return periodResult.periodIds.includes(load.payment_period_id);
            }
            
            // Para cargas sin período asignado, filtrar por fechas
            if (periodResult.startDate && periodResult.endDate) {
              const relevantDate = loadAssignmentCriteria === 'pickup_date' ? load.pickup_date : load.delivery_date;
              return relevantDate && relevantDate >= periodResult.startDate && relevantDate <= periodResult.endDate;
            }
            
            return false;
          });
        } else if (periodResult.useDateFilter && periodResult.startDate && periodResult.endDate) {
          loads = loads.filter(load => {
            // Usar el criterio de la empresa para determinar qué fecha filtrar
            const relevantDate = loadAssignmentCriteria === 'pickup_date' ? load.pickup_date : load.delivery_date;
            if (!relevantDate) return false;
            return relevantDate >= periodResult.startDate && relevantDate <= periodResult.endDate;
          });
        } else if (filters?.periodFilter?.type === 'all') {
          // Mostrar todas las cargas sin filtro
          loads = allLoads || [];
        } else if (periodResult.startDate && periodResult.endDate) {
          // Si hay fechas disponibles aunque no haya periodIds, filtrar por fechas
          loads = loads.filter(load => {
            const relevantDate = loadAssignmentCriteria === 'pickup_date' ? load.pickup_date : load.delivery_date;
            if (!relevantDate) return false;
            return relevantDate >= periodResult.startDate && relevantDate <= periodResult.endDate;
          });
        }

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        if (!loads || loads.length === 0) {
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
              .select('id, load_id, stop_type, stop_number, facility_id, scheduled_date, scheduled_time, eta_date, eta_time, driver_notes, special_instructions')
              .in('load_id', loadIds)
              .order('stop_number', { ascending: true })
          : { data: [], error: null };

        if (stopsResult.error) {
          console.error('Error obteniendo paradas:', stopsResult.error);
        }

        const stopsData = stopsResult.data || [];
        
        // Obtener facility_ids únicos de los stops
        const facilityIds = [...new Set(stopsData.map(s => s.facility_id).filter(Boolean))];
        
        // Obtener información de facilities
        const facilitiesResult = facilityIds.length > 0
          ? await supabase
              .from('facilities')
              .select('id, name, address, city, state, zip_code, contact_name, contact_phone')
              .in('id', facilityIds)
          : { data: [], error: null };

        if (facilitiesResult.error) {
          console.error('Error obteniendo facilities:', facilitiesResult.error);
        }

        const facilitiesData = facilitiesResult.data || [];
        
        // Obtener city UUIDs de facilities para buscar nombres
        const cityUUIDs = [...new Set(
          facilitiesData
            .map(f => f.city)
            .filter(city => city && city.length === 36 && city.includes('-'))
        )];
        
        // Obtener nombres de ciudades desde state_cities
        let cities: any[] = [];
        if (cityUUIDs.length > 0) {
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

        if (documentsResult.error) {
          console.error('Error obteniendo documentos:', documentsResult.error);
        }

        if (companiesResult.error) {
          console.error('Error obteniendo información de la compañía:', companiesResult.error);
        }

        if (statusHistoryResult.error) {
          console.error('Error obteniendo historial de estado:', statusHistoryResult.error);
        }

        const documentsData = documentsResult.data || [];
        const companyData = companiesResult.data;
        const statusHistoryData = statusHistoryResult.data || [];
        
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
            ? supabase
                .from('company_payment_periods')
                .select('id, period_start_date, period_end_date, period_frequency')
                .in('id', periodIds)
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

          // Función auxiliar para obtener el display de la ciudad desde facility
          const getCityDisplay = (stop: any) => {
            if (!stop || !stop.facility_id) {
              return 'Sin definir';
            }

            // Buscar facility correspondiente
            const facility = facilitiesData.find(f => f.id === stop.facility_id);
            if (!facility || !facility.city || !facility.state) {
              return 'Sin definir';
            }

            // Si es un UUID, buscar en la tabla de ciudades
            if (facility.city.length === 36 && facility.city.includes('-')) {
              const cityFromDB = cities.find(c => c.id === facility.city);
              if (cityFromDB) {
                return `${cityFromDB.name}, ${facility.state}`;
              } else {
                console.warn(`🚛 Load ${load.load_number} - City UUID not found:`, facility.city);
                return 'Ciudad no encontrada';
              }
            } else {
              // Es texto directo
              return `${facility.city}, ${facility.state}`;
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

          // Procesar paradas para esta carga específica con información de facilities
          const processedStops = loadStops.map(stop => {
            const facility = facilitiesData.find(f => f.id === stop.facility_id);
            let cityDisplay = 'Sin definir';
            let stateDisplay = '';
            
            if (facility) {
              // Si es un UUID, buscar en la tabla de ciudades
              if (facility.city && facility.city.length === 36 && facility.city.includes('-')) {
                const cityFromDB = cities.find(c => c.id === facility.city);
                if (cityFromDB) {
                  cityDisplay = cityFromDB.name;
                }
              } else if (facility.city) {
                cityDisplay = facility.city;
              }
              stateDisplay = facility.state || '';
            }
            
            return {
              ...stop,
              city: cityDisplay,
              state: stateDisplay
            };
          });

          // Obtener el historial de estado más reciente para esta carga
          const latestStatusHistory = statusHistoryData
            .filter(h => h.load_id === load.id)
            .filter(h => h.eta_provided) // Solo considerar registros con ETA
            .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];

          return {
            ...load,
            broker_id: load.client_id, // Compatibility field
            driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar',
            driver_avatar_url: profile?.avatar_url || null,
            broker_name: brokerDisplayName,
            broker_alias: broker?.alias || null,
            broker_logo_url: broker?.logo_url || null,
            client_contact_name: contact?.name || null,
            internal_dispatcher_name: dispatcher ? `${dispatcher.first_name} ${dispatcher.last_name}` : null,
            pickup_city: pickupCityDisplay,
            delivery_city: deliveryCityDisplay,
            period_start_date: period?.period_start_date || null,
            period_end_date: period?.period_end_date || null,
            period_frequency: period?.period_frequency || null,
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
