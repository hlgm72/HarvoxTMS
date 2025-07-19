import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCompanyCache } from './useCompanyCache';
import { useMemo } from 'react';

export interface CompanyClient {
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
  contacts?: ClientContact[];
}

export interface ClientContact {
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

export const useCompanyClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Memoizar queryKey para cache eficiente
  const queryKey = useMemo(() => {
    return ['company-clients', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  const clientsQuery = useQuery({
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
    queryFn: async (): Promise<CompanyClient[]> => {
      console.log('🔄 useCompanyClients iniciando...');
      
      if (!user) {
        console.log('❌ Usuario no autenticado');
        throw new Error('User not authenticated');
      }

      if (!userCompany) {
        console.log('❌ No hay datos de compañía');
        throw new Error('No company data available');
      }

      try {
        // Obtener clientes y contactos en paralelo
        const [clientsResult, contactsResult] = await Promise.allSettled([
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

        const clients = clientsResult.status === 'fulfilled' ? clientsResult.value.data || [] : [];
        const contacts = contactsResult.status === 'fulfilled' ? contactsResult.value.data || [] : [];

        // Enriquecer clientes con sus contactos
        const enrichedClients: CompanyClient[] = clients.map(client => ({
          ...client,
          contacts: contacts.filter(c => c.client_id === client.id)
        }));

        console.log(`👥 Clientes encontrados: ${enrichedClients.length}`);
        
        return enrichedClients;

      } catch (error: any) {
        console.error('Error en useCompanyClients:', error);
        
        throw error;
      }
    },
  });

  return { 
    clients: clientsQuery.data || [], 
    loading: clientsQuery.isLoading, 
    error: clientsQuery.error,
    refetch: clientsQuery.refetch 
  };
};