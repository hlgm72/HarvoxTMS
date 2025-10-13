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
    type: 'current' | 'previous' | 'next' | 'all' | 'specific' | 'custom' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
    periodId?: string;
    startDate?: string;
    endDate?: string;
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
    
    case 'this_month':
    case 'last_month':
    case 'this_quarter':
    case 'last_quarter':
    case 'this_year':
    case 'last_year':
    case 'custom':
      // Para filtros basados en fechas, usar las fechas directamente
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
        
        // PASO 3: Query SIMPLIFICADA - traer todas las cargas creadas por usuarios de la compañía
        // Esto incluye cargas con o sin conductor asignado
        const loadsQuery = supabase
          .from('loads')
          .select('*')
          .in('created_by', companyUsers)
          .order('payment_period_id', { ascending: true, nullsFirst: false })
          .order('load_number', { ascending: true})
          .limit(500);

        const { data: allLoads, error: loadsError } = await loadsQuery;

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas');
        }

        // PASO 4: Filtrar cargas por período en el cliente
        let loads = allLoads || [];
        
        if (periodResult.useDateFilter && periodResult.startDate && periodResult.endDate) {
          loads = loads.filter(load => {
            // Usar el criterio de la empresa para determinar qué fecha filtrar
            const relevantDate = loadAssignmentCriteria === 'pickup_date' ? load.pickup_date : load.delivery_date;
            if (!relevantDate) return false;
            return relevantDate >= periodResult.startDate && relevantDate <= periodResult.endDate;
          });
        } else if (periodResult.periodIds.length > 0) {
          loads = loads.filter(load => {
            // Cargas con período asignado
            if (load.payment_period_id && periodResult.periodIds.includes(load.payment_period_id)) {
              return true;
            }
            
            // Cargas sin período pero con fechas en el rango
            if (!load.payment_period_id && periodResult.startDate && periodResult.endDate) {
              const relevantDate = loadAssignmentCriteria === 'pickup_date' ? load.pickup_date : load.delivery_date;
              return relevantDate && relevantDate >= periodResult.startDate && relevantDate <= periodResult.endDate;
            }
            
            return false;
          });
        } else if (filters?.periodFilter?.type !== 'all') {
          return [];
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
