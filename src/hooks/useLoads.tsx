import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Load {
  id: string;
  load_number: string;
  driver_user_id: string;
  total_amount: number;
  commodity: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
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
  
  // Datos relacionados
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async (): Promise<Load[]> => {
      if (!user) throw new Error('User not authenticated');

      try {
        // Obtener la compañía del usuario
        const { data: userCompanyRole, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (companyError) {
          console.error('Error obteniendo compañía del usuario:', companyError);
          throw new Error('Error de conexión. Por favor intenta nuevamente.');
        }

        if (!userCompanyRole) {
          throw new Error('No se encontró información de la compañía para este usuario.');
        }

        // Obtener todos los usuarios de la compañía para filtrar cargas
        const { data: companyUsers, error: usersError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompanyRole.company_id)
          .eq('is_active', true);

        if (usersError) {
          console.error('Error obteniendo usuarios de la compañía:', usersError);
          throw new Error('Error de conexión obteniendo usuarios. Por favor intenta nuevamente.');
        }

        const userIds = companyUsers.map(u => u.user_id);

        // Obtener cargas primero
        const { data: loads, error: loadsError } = await supabase
          .from('loads')
          .select('*')
          .in('driver_user_id', userIds)
          .order('created_at', { ascending: false });

        if (loadsError) {
          console.error('Error obteniendo cargas:', loadsError);
          throw new Error('Error de conexión obteniendo cargas. Por favor intenta nuevamente.');
        }

        // Obtener información adicional para enriquecer las cargas
        const driverIds = [...new Set(loads.map(l => l.driver_user_id))];
        const brokerIds = [...new Set(loads.map(l => l.broker_id).filter(Boolean))];
        const periodIds = [...new Set(loads.map(l => l.payment_period_id).filter(Boolean))];

        // Obtener nombres de conductores
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', driverIds);

        // Obtener nombres de brokers
        const { data: brokers } = brokerIds.length > 0 ? await supabase
          .from('company_brokers')
          .select('id, name')
          .in('id', brokerIds) : { data: [] };

        // Obtener información de períodos de pago
        const { data: paymentPeriods } = periodIds.length > 0 ? await supabase
          .from('payment_periods')
          .select('id, period_start_date, period_end_date, period_frequency, status')
          .in('id', periodIds) : { data: [] };

        // Obtener paradas de carga para pickup/delivery
        const loadIds = loads.map(l => l.id);
        const { data: stops } = await supabase
          .from('load_stops')
          .select('load_id, stop_type, city, stop_number')
          .in('load_id', loadIds);

        // Enriquecer cargas con información adicional
        const enrichedLoads: Load[] = loads.map(load => {
          const profile = profiles?.find(p => p.user_id === load.driver_user_id);
          const broker = brokers?.find(b => b.id === load.broker_id);
          const loadStops = stops?.filter(s => s.load_id === load.id) || [];
          
          const pickupStop = loadStops
            .filter(s => s.stop_type === 'pickup')
            .sort((a, b) => a.stop_number - b.stop_number)[0];
          
          const deliveryStop = loadStops
            .filter(s => s.stop_type === 'delivery')
            .sort((a, b) => b.stop_number - a.stop_number)[0];

          // Obtener información del período de pago
          const paymentPeriod = paymentPeriods?.find(p => p.id === load.payment_period_id);

          return {
            ...load,
            driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar',
            broker_name: broker?.name || 'Sin broker',
            pickup_city: pickupStop?.city || 'Sin definir',
            delivery_city: deliveryStop?.city || 'Sin definir',
            period_start_date: paymentPeriod?.period_start_date,
            period_end_date: paymentPeriod?.period_end_date,
            period_frequency: paymentPeriod?.period_frequency,
            period_status: paymentPeriod?.status
          };
        });

        // Aplicar filtros por período si se especifican
        if (filters?.periodFilter) {
          const { periodFilter } = filters;
          
          switch (periodFilter.type) {
            case 'current':
              // Filtrar solo cargas del período actual
              const currentDate = new Date().toISOString().split('T')[0];
              return enrichedLoads.filter(load => {
                if (!load.period_start_date || !load.period_end_date) return false;
                return load.period_start_date <= currentDate && load.period_end_date >= currentDate;
              });
              
            case 'specific':
              // Filtrar cargas de un período específico
              if (periodFilter.periodId) {
                return enrichedLoads.filter(load => load.payment_period_id === periodFilter.periodId);
              }
              break;
              
            case 'this_month':
            case 'last_month':
            case 'this_quarter':
            case 'last_quarter':
            case 'this_year':
            case 'last_year':
            case 'custom':
              // Filtrar por rango de fechas personalizado o predefinido
              if (periodFilter.startDate && periodFilter.endDate) {
                return enrichedLoads.filter(load => {
                  if (!load.pickup_date) return false;
                  return load.pickup_date >= periodFilter.startDate! && load.pickup_date <= periodFilter.endDate!;
                });
              }
              break;
              
            case 'all':
            default:
              // No filtrar, devolver todas las cargas
              break;
          }
        }

        return enrichedLoads;
      } catch (error: any) {
        console.error('Error en useLoads:', error);
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet e intenta nuevamente.');
        }
        throw error;
      }
    },
    enabled: !!user,
  });
};
