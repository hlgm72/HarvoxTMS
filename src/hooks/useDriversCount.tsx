import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompanyCache } from './useCompanyCache';
import { useMemo, useEffect } from 'react';

export const useDriversCount = () => {
  const { user } = useAuth();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();
  const queryClient = useQueryClient();

  // Memoizar queryKey para cache eficiente
  const queryKey = useMemo(() => {
    return ['drivers-count', user?.id, userCompany?.company_id];
  }, [user?.id, userCompany?.company_id]);

  // Configurar escucha en tiempo real
  useEffect(() => {
    if (!userCompany?.company_id) return;

    const channel = supabase
      .channel('drivers-count-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_company_roles',
          filter: `company_id=eq.${userCompany.company_id}`
        },
        () => {
          console.log('🔄 Roles actualizados, invalidando contador de conductores');
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'user_invitations',
          filter: `company_id=eq.${userCompany.company_id}`
        },
        () => {
          console.log('🔄 Invitaciones actualizadas, invalidando contador de conductores');
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userCompany?.company_id, queryClient, queryKey]);

  const driversCountQuery = useQuery({
    queryKey,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000, // Cache menos agresivo - 30 segundos  
    gcTime: 300000, // 5 minutos en cache
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
        // 1. Contar drivers en user_company_roles (activos e inactivos)
        const { count: rolesCount, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver');

        if (rolesError) {
          console.error('Error contando roles de drivers:', rolesError);
          throw rolesError;
        }

        // 2. Obtener los user_ids que ya tienen roles de driver activos
        const { data: existingDrivers, error: existingError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true);

        if (existingError) {
          console.error('Error obteniendo drivers existentes:', existingError);
          throw existingError;
        }

        const existingDriverIds = existingDrivers?.map(d => d.user_id) || [];

        // 3. Contar invitaciones pendientes con target_user_id (pre-registrados)
        // Excluir usuarios que ya tienen rol activo de driver
        let pendingQuery = supabase
          .from('user_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userCompany.company_id)
          .eq('role', 'driver')
          .eq('is_active', true)
          .is('accepted_at', null)
          .not('target_user_id', 'is', null);

        // Solo aplicar filtro si hay drivers existentes
        if (existingDriverIds.length > 0) {
          pendingQuery = pendingQuery.not('target_user_id', 'in', `(${existingDriverIds.join(',')})`);
        }

        const { count: pendingCount, error: pendingError } = await pendingQuery;

        if (pendingError) {
          console.error('Error contando invitaciones pendientes:', pendingError);
          throw pendingError;
        }

        const totalCount = (rolesCount || 0) + (pendingCount || 0);
        console.log(`🚛 Contador drivers: ${rolesCount || 0} en roles + ${pendingCount || 0} pendientes = ${totalCount}`);
        
        return totalCount;

      } catch (error: any) {
        console.error('Error en useDriversCount:', error);
        throw error;
      }
    },
    enabled: !!user,
  });

  // Función para invalidar manualmente el cache
  const invalidateCount = () => {
    console.log('🔄 Invalidando contador de conductores manualmente', queryKey);
    queryClient.invalidateQueries({ queryKey });
  };

  return { 
    driversCount: driversCountQuery.data || 0, 
    loading: driversCountQuery.isLoading, 
    refreshCount: driversCountQuery.refetch,
    invalidateCount
  };
};