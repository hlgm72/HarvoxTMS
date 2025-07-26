import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useFleetNotifications } from '@/components/notifications';
import { useCompanyCache } from './useCompanyCache';
import { useMemo } from 'react';

export interface CompanyBroker {
  id: string;
  name: string;
  alias?: string;
  logo_url?: string;
  address?: string;
  email_domain?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  // Campos adicionales para búsqueda
  dot_number?: string;
  mc_number?: string;
  dispatchers?: BrokerDispatcher[];
}

export interface BrokerDispatcher {
  id: string;
  client_id: string;
  name: string;
  email?: string;
  phone_office?: string;
  phone_mobile?: string;
  extension?: string;
  notes?: string;
  is_active: boolean;
}

export const useCompanyBrokers = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Memoizar queryKey para cache eficiente
  const queryKey = useMemo(() => {
    return ['company-brokers', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  const brokersQuery = useQuery({
    queryKey,
    enabled: !!user && !cacheLoading && !!userCompany && !cacheError, // Solo ejecutar cuando el cache esté listo
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 300000, // Cache agresivo - 5 minutos
    gcTime: 600000, // 10 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'online',
    queryFn: async (): Promise<CompanyBroker[]> => {
      console.log('🔄 useCompanyBrokers iniciando...');
      
      if (!user) {
        console.log('❌ Usuario no autenticado');
        throw new Error('User not authenticated');
      }

      if (!userCompany) {
        console.log('❌ No hay datos de compañía');
        throw new Error('No company data available');
      }

      try {
        // Obtener brokers y dispatchers en paralelo
        const [brokersResult, dispatchersResult] = await Promise.allSettled([
          supabase
            .from('company_clients')
            .select('*')
            .eq('company_id', userCompany.company_id)
            .eq('is_active', true)
            .order('name'),
          
          supabase
            .from('company_client_contacts')
            .select(`
              id,
              client_id,
              name,
              email,
              phone_office,
              phone_mobile,
              extension,
              notes,
              is_active
            `)
            .eq('is_active', true)
        ]);

        const clients = brokersResult.status === 'fulfilled' ? brokersResult.value.data || [] : [];
        const contacts = dispatchersResult.status === 'fulfilled' ? dispatchersResult.value.data || [] : [];

        // Enriquecer clientes con sus contactos
        const enrichedClients: CompanyBroker[] = clients.map(client => ({
          ...client,
          dispatchers: contacts.filter(c => c.client_id === client.id)
        }));

        console.log(`👥 Clientes encontrados: ${enrichedClients.length}`);
        
        return enrichedClients;

      } catch (error: any) {
        console.error('Error en useCompanyBrokers:', error);
        
        throw error;
      }
    },
  });

  return { 
    brokers: brokersQuery.data || [], 
    loading: brokersQuery.isLoading, 
    error: brokersQuery.error,
    refetch: brokersQuery.refetch 
  };
};