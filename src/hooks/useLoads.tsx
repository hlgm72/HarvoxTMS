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
  
  // Datos relacionados
  driver_name?: string;
  broker_name?: string;
  pickup_city?: string;
  delivery_city?: string;
}

export const useLoads = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['loads', user?.id],
    queryFn: async (): Promise<Load[]> => {
      if (!user) throw new Error('User not authenticated');

      // Obtener la compañía del usuario
      const { data: userCompanyRole, error: companyError } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (companyError || !userCompanyRole) {
        throw new Error('No se pudo obtener la compañía del usuario');
      }

      // Obtener todos los usuarios de la compañía para filtrar cargas
      const { data: companyUsers, error: usersError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompanyRole.company_id)
        .eq('is_active', true);

      if (usersError) {
        throw new Error('Error obteniendo usuarios de la compañía');
      }

      const userIds = companyUsers.map(u => u.user_id);

      // Obtener cargas
      const { data: loads, error: loadsError } = await supabase
        .from('loads')
        .select('*')
        .in('driver_user_id', userIds)
        .order('created_at', { ascending: false });

      if (loadsError) {
        throw loadsError;
      }

      // Obtener información adicional para enriquecer las cargas
      const driverIds = [...new Set(loads.map(l => l.driver_user_id))];
      const brokerIds = [...new Set(loads.map(l => l.broker_id).filter(Boolean))];

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

        return {
          ...load,
          driver_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Sin asignar',
          broker_name: broker?.name || 'Sin broker',
          pickup_city: pickupStop?.city || 'Sin definir',
          delivery_city: deliveryStop?.city || 'Sin definir'
        };
      });

      return enrichedLoads;
    },
    enabled: !!user,
  });
};