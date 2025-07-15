import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
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
  broker_id: string;
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
  const { toast } = useToast();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Memoizar queryKey para cache eficiente
  const queryKey = useMemo(() => {
    return ['company-brokers', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  const brokersQuery = useQuery({
    queryKey,
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

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      // Esperar a que el cache esté listo
      if (cacheLoading || !userCompany) {
        console.log('⏳ Esperando cache de compañía...');
        throw new Error('Cargando datos de compañía...');
      }

      try {
        // Obtener brokers y dispatchers en paralelo
        const [brokersResult, dispatchersResult] = await Promise.allSettled([
          supabase
            .from('company_brokers')
            .select('*')
            .eq('company_id', userCompany.company_id)
            .eq('is_active', true)
            .order('name'),
          
          supabase
            .from('company_broker_dispatchers')
            .select(`
              id,
              broker_id,
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

        const brokers = brokersResult.status === 'fulfilled' ? brokersResult.value.data || [] : [];
        const dispatchers = dispatchersResult.status === 'fulfilled' ? dispatchersResult.value.data || [] : [];

        // Enriquecer brokers con sus dispatchers
        const enrichedBrokers: CompanyBroker[] = brokers.map(broker => ({
          ...broker,
          dispatchers: dispatchers.filter(d => d.broker_id === broker.id)
        }));

        console.log(`👥 Brokers encontrados: ${enrichedBrokers.length}`);
        
        return enrichedBrokers;

      } catch (error: any) {
        console.error('Error en useCompanyBrokers:', error);
        
        throw error;
      }
    },
    enabled: !!user,
  });

  return { 
    brokers: brokersQuery.data || [], 
    loading: brokersQuery.isLoading, 
    error: brokersQuery.error,
    refetch: brokersQuery.refetch 
  };
};