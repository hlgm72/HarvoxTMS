import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { useMemo } from 'react';

export const useDriversCount = () => {
  const { user } = useAuth();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Memoizar queryKey para cache eficiente
  const queryKey = useMemo(() => {
    return ['drivers-count', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  const driversCountQuery = useQuery({
    queryKey,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 300000, // Cache agresivo - 5 minutos
    gcTime: 600000, // 10 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    networkMode: 'online',
    queryFn: async (): Promise<number> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verificar errores de cache
      if (cacheError) {
        console.error('❌ Error en cache de compañía:', cacheError);
        throw new Error('Error obteniendo datos de compañía');
      }

      // Esperar a que el cache esté listo
      if (cacheLoading || !userCompany) {
        throw new Error('Cargando datos de compañía...');
      }

      try {
        // Get count of active drivers using company from cache
        const { count, error: countError } = await supabase
          .from('user_company_roles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true);

        if (countError) {
          console.error('Error obteniendo conteo de drivers:', countError);
          throw countError;
        }

        const finalCount = count || 0;
        return finalCount;

      } catch (error: any) {
        console.error('Error en useDriversCount:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  return { 
    driversCount: driversCountQuery.data || 0, 
    loading: driversCountQuery.isLoading, 
    refreshCount: driversCountQuery.refetch 
  };
};